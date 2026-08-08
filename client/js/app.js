import { socket } from "./socket.js";
import { state, fmt, met, pad, shortUtc, hms } from "./state.js";
import { initCharts, addSample, updateCharts } from "./charts.js";
import { renderChannels } from "./channels.js";
import { addEvent, renderEvents } from "./events.js";
import { addPacket } from "./packets.js";
import { addConsole } from "./console.js";
import { renderSessions } from "./sessions.js";
import "./replay.js";
import "./simulator-ui.js";

const rules = [
  ["RULE 01", "SEQUENCE GAP", "Expected sequence = previous sequence + 1; if received is greater, create LINK event."],
  ["RULE 02", "INVALID SAMPLE", "Null, undefined, NaN, infinite, or non-numeric numeric fields are invalid."],
  ["RULE 03", "FLATLINE", "A channel unchanged within tolerance for consecutive samples creates a possible flatline advisory."],
  ["RULE 04", "RAPID VALUE CHANGE", "Absolute delta above the channel threshold creates a rapid value change event."],
  ["RULE 05", "PACKET RATE DROP", "Rolling packet rate below expected range creates a link caution."]
];

function boot() {
  initCharts();
  bindNavigation();
  bindModes();
  document.getElementById("ruleRows").innerHTML = rules.map(([id, name, text]) => `<div class="rule"><strong>${id} / ${name}</strong><span>${text}</span></div>`).join("");
  setTimeout(() => document.getElementById("startup").classList.add("hidden"), 1600);
  setInterval(tickClocks, 50);
}

function bindNavigation() {
  document.querySelectorAll("#nav button").forEach((button) => button.addEventListener("click", () => {
    document.querySelectorAll("#nav button").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".screen").forEach((screen) => screen.classList.remove("active"));
    button.classList.add("active");
    document.getElementById(`screen-${button.dataset.screen}`).classList.add("active");
  }));
}

function bindModes() {
  document.getElementById("holdBtn").addEventListener("click", (event) => {
    state.hold = !state.hold;
    event.currentTarget.classList.toggle("active", state.hold);
    document.getElementById("holdState").textContent = state.hold ? "DISPLAY HOLD / DATA INGEST ACTIVE" : "LIVE FOLLOW / DATA INGEST ACTIVE";
  });
  document.getElementById("bigBoardBtn").addEventListener("click", () => { document.getElementById("bigBoard").hidden = false; updateBigBoard(); });
  document.getElementById("closeBigBoard").addEventListener("click", () => { document.getElementById("bigBoard").hidden = true; });
}

function tickClocks() {
  const now = Date.now();
  const uptime = now - (state.server.startedAt || now);
  document.getElementById("utcClock").textContent = shortUtc(now);
  document.getElementById("metClock").textContent = met(uptime);
  document.getElementById("telemetryMet").textContent = met(uptime);
  document.getElementById("bigMet").textContent = met(uptime);
}

function renderState() {
  const s = state.server;
  document.getElementById("topSource").textContent = s.sourceMode;
  document.getElementById("topSession").textContent = s.sessionActive ? "ACTIVE" : "IDLE";
  document.getElementById("topRec").textContent = s.sessionActive ? `● REC ${s.sessionId}` : "REC / IDLE";
  document.getElementById("topRec").className = `state ${s.sessionActive ? "state-warn" : "state-caut"}`;
  document.getElementById("navRate").textContent = `${fmt(s.packetRate, 2)} Hz`;
  document.getElementById("navFrame").textContent = `FRAME ${pad(s.lastFrame)}`;
  document.getElementById("clockFrame").textContent = pad(s.lastFrame);
  document.getElementById("clockSource").textContent = `${s.sourceMode} / ${s.sourceMode === "REPLAY" ? "TEST-004" : s.sourceMode === "SIM" ? "SYNTHETIC" : "DEVICE"}`;
  document.getElementById("clockRate").textContent = `${fmt(s.packetRate, 2)} Hz`;
  document.getElementById("graphRate").textContent = `${fmt(s.packetRate, 2)} Hz`;
  document.getElementById("graphSamples").textContent = String((state.histories.get(state.selectedChannel) || []).length);
  document.getElementById("sessionStart").textContent = `${shortUtc(s.startedAt)} UTC`;
  document.getElementById("linkRate").textContent = `${fmt(s.packetRate, 2)} Hz`;
  document.getElementById("linkFrame").textContent = pad(s.lastFrame);
  document.getElementById("seqGaps").textContent = String(s.sequenceGaps || 0);
  const loss = s.received ? ((s.sequenceGaps || 0) / (s.received + (s.sequenceGaps || 0))) * 100 : 0;
  document.getElementById("frameLoss").textContent = `${fmt(loss, 2)} %`;
  renderLinkMetrics();
  renderSystemRows();
  renderChannels();
  updateBigBoard();
}

function renderLinkMetrics() {
  const recent = state.arrivals.slice(-120);
  const avg = recent.reduce((sum, p) => sum + p.ms, 0) / Math.max(recent.length, 1);
  const jitter = Math.sqrt(recent.reduce((sum, p) => sum + Math.pow(p.ms - avg, 2), 0) / Math.max(recent.length, 1));
  document.getElementById("avgArrival").textContent = `${fmt(avg, 1)} ms`;
  document.getElementById("jitter").textContent = `${fmt(jitter, 1)} ms`;
  const frames = state.packets.slice(0, 24).reverse();
  document.getElementById("continuity").innerHTML = frames.map((p) => `<div class="frame-cell ${p.valid ? "" : "miss"}"><span>${pad(p.sequence)}</span><span>${p.valid ? "● RX" : "× INV"}</span></div>`).join("");
}

function renderSystemRows() {
  const s = state.server;
  const rows = [
    ["TELEMETRY SERVER", "ONLINE"],
    ["WEBSOCKET", socket.connected ? "CONNECTED" : "OFFLINE"],
    ["SESSION STORE", "READY"],
    ["EVENT ENGINE", "ACTIVE"],
    ["UPTIME", hms(s.uptimeMs)],
    ["CONNECTED CLIENTS", "1"],
    ["ACTIVE SOURCE", s.sourceMode],
    ["ACTIVE SESSION", s.sessionId || "NONE"],
    ["RECEIVED", s.received],
    ["ACCEPTED", s.accepted],
    ["REJECTED", s.rejected],
    ["MEMORY BUFFER", `${Math.min(99, Math.round((state.packets.length / 250) * 100))}%`]
  ];
  document.getElementById("systemRows").innerHTML = rows.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join("");
}

function updateBigBoard() {
  document.getElementById("bigLink").textContent = `TM LINK / CONNECTED / SOURCE ${state.server.sourceMode}`;
  document.getElementById("bigValues").innerHTML = state.server.channels.slice(0, 6).map((c) => `<div><span>${c.label}</span><strong>${fmt(c.lastValue, c.precision)} ${c.unit || ""}</strong></div>`).join("") +
    `<div><span>RATE</span><strong>${fmt(state.server.packetRate, 2)} Hz</strong></div><div><span>FRAME</span><strong>${pad(state.server.lastFrame)}</strong></div>`;
}

socket.on("server:state", (serverState) => {
  state.server = serverState;
  renderState();
});
socket.on("telemetry:packet", (record) => {
  const prev = state.packets[0];
  if (prev) state.arrivals.push({ sequence: record.sequence, ms: record.receivedAt - prev.receivedAt });
  state.arrivals = state.arrivals.slice(-160);
  addPacket(record);
  addSample(record);
});
socket.on("mission:event", addEvent);
socket.on("console:line", addConsole);
socket.on("session:history", (sessions) => {
  state.sessions = sessions;
  renderSessions();
});
socket.on("session:completed", () => fetch("/api/sessions").then((r) => r.json()).then((sessions) => { state.sessions = sessions; renderSessions(); }));

boot();
renderEvents();
