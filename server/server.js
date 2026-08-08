const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const { TelemetryIngest } = require("./telemetry/ingest");
const { SessionRecorder } = require("./sessions/recorder");
const { SessionStore } = require("./sessions/session-store");
const { TelemetrySimulator } = require("../simulator/telemetry-simulator");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = process.env.PORT || 3000;

app.use(express.json({ limit: "8mb" }));
app.use(express.static(path.join(__dirname, "..", "client")));
app.use("/vendor/chart.js", express.static(path.join(__dirname, "..", "node_modules", "chart.js", "dist", "chart.umd.js")));

const store = new SessionStore(path.join(__dirname, "..", "data", "sessions"));
const recorder = new SessionRecorder(store);
const ingest = new TelemetryIngest({ expectedRateHz: 10, recorder });
const simulator = new TelemetrySimulator((packet) => ingest.accept(packet, "SIM"));

function emitState() {
  io.emit("server:state", ingest.getState());
}

ingest.on("packet", (packet) => io.emit("telemetry:packet", packet));
ingest.on("event", (event) => io.emit("mission:event", event));
ingest.on("console", (line) => io.emit("console:line", line));
ingest.on("state", emitState);
recorder.on("session:started", (session) => io.emit("session:started", session));
recorder.on("session:completed", (summary) => io.emit("session:completed", summary));

io.on("connection", (socket) => {
  socket.emit("server:state", ingest.getState());
  socket.emit("session:history", store.listSessions());

  socket.on("sim:start", (config = {}) => {
    simulator.start(config);
    recorder.start({ sourceMode: "SIM", channelRegistry: ingest.getChannelRegistry(), operatorNotes: [] });
    ingest.setSourceMode("SIM");
  });

  socket.on("sim:stop", () => {
    simulator.stop();
    const summary = recorder.stop();
    ingest.setSourceMode("SIM");
    if (summary) io.emit("session:history", store.listSessions());
  });

  socket.on("sim:inject", (kind) => simulator.inject(kind));

  socket.on("record:start", ({ sourceMode = ingest.getState().sourceMode } = {}) => {
    recorder.start({ sourceMode, channelRegistry: ingest.getChannelRegistry(), operatorNotes: [] });
  });

  socket.on("record:stop", () => {
    const summary = recorder.stop();
    if (summary) io.emit("session:history", store.listSessions());
  });

  socket.on("telemetry:ingest", ({ packet, sourceMode = "LIVE" }) => {
    ingest.setSourceMode(sourceMode);
    ingest.accept(packet, sourceMode);
  });

  socket.on("replay:packet", ({ packet }) => {
    ingest.setSourceMode("REPLAY");
    ingest.accept(packet, "REPLAY");
  });
});

app.get("/api/sessions", (req, res) => res.json(store.listSessions()));
app.get("/api/sessions/:id", (req, res) => {
  const session = store.readSession(req.params.id);
  if (!session) return res.status(404).json({ error: "SESSION_NOT_FOUND" });
  res.json(session);
});
app.get("/api/sessions/:id/export.json", (req, res) => {
  const session = store.readSession(req.params.id);
  if (!session) return res.status(404).json({ error: "SESSION_NOT_FOUND" });
  res.setHeader("Content-Disposition", `attachment; filename="${req.params.id}.json"`);
  res.json(session);
});
app.get("/api/sessions/:id/export.csv", (req, res) => {
  const session = store.readSession(req.params.id);
  if (!session) return res.status(404).send("SESSION_NOT_FOUND");
  const fields = new Set(["receivedAt", "sequence", "deviceId", "valid"]);
  session.packets.forEach((record) => {
    Object.keys(record.packet.channels || {}).forEach((field) => fields.add(field));
  });
  const headers = Array.from(fields);
  const lines = [headers.join(",")];
  session.packets.forEach((record) => {
    const row = headers.map((field) => {
      const value = field in record ? record[field] : field in record.packet ? record.packet[field] : record.packet.channels?.[field];
      return value == null ? "" : JSON.stringify(value);
    });
    lines.push(row.join(","));
  });
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${req.params.id}.csv"`);
  res.send(lines.join("\n"));
});

server.listen(port, () => {
  console.log(`ASTRA Mission Control listening on http://localhost:${port}`);
});

function shutdown() {
  simulator.stop();
  const forceExit = setTimeout(() => process.exit(0), 500);
  forceExit.unref();
  server.close(() => process.exit(0));
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
