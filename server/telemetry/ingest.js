const { EventEmitter } = require("events");
const { ChannelRegistry } = require("./channel-registry");
const { validatePacket } = require("./validator");
const { EventEngine } = require("../events/event-engine");

class TelemetryIngest extends EventEmitter {
  constructor({ expectedRateHz = 10, recorder } = {}) {
    super();
    this.expectedRateHz = expectedRateHz;
    this.recorder = recorder;
    this.registry = new ChannelRegistry();
    this.events = new EventEngine({ expectedRateHz });
    this.sourceMode = "SIM";
    this.startedAt = Date.now();
    this.frames = [];
    this.lastFrame = 0;
    this.received = 0;
    this.accepted = 0;
    this.rejected = 0;
    this.sequenceGaps = 0;
    this.events.on("event", (event) => this.emit("event", { ...event, metMs: Date.now() - this.startedAt }));
  }

  setSourceMode(sourceMode) {
    this.sourceMode = sourceMode;
    this.emit("state");
  }

  accept(packet, sourceMode = this.sourceMode) {
    this.sourceMode = sourceMode;
    const receivedAt = Date.now();
    this.received += 1;
    const validation = validatePacket(packet);
    Object.entries(packet.channels || {}).forEach(([field, value]) => this.registry.registerOrUpdate(field, value));
    const record = {
      receivedAt,
      sourceMode,
      packet,
      sequence: packet.sequence,
      deviceId: packet.deviceId,
      valid: validation.valid,
      validation
    };
    if (validation.valid) this.accepted += 1;
    else this.rejected += 1;
    const channels = this.registry.toJSON();
    const events = this.events.process(record, channels, validation);
    this.sequenceGaps += events.filter((event) => event.description === "FRAME GAP").reduce((sum, event) => sum + (event.data.missingFrames || 0), 0);
    record.events = events;
    this.frames.push(receivedAt);
    this.frames = this.frames.filter((time) => receivedAt - time <= 5000);
    this.lastFrame = packet.sequence || this.lastFrame;
    if (this.recorder?.active) this.recorder.record(record, events, channels);
    this.emit("packet", { ...record, channels, mission: this.getState() });
    this.emit("console", this.consoleLine(record, validation, events));
    this.emit("state");
  }

  consoleLine(record, validation, events) {
    if (!validation.valid) return { utc: new Date(record.receivedAt).toISOString(), code: "DATA", text: `FRAME ${String(record.sequence).padStart(6, "0")} INVALID / ${validation.errors.join(" ")}` };
    if (events.length) return { utc: new Date(record.receivedAt).toISOString(), code: events[0].class, text: `${events[0].source} ${events[0].description}` };
    return { utc: new Date(record.receivedAt).toISOString(), code: "TM", text: `FRAME ${String(record.sequence).padStart(6, "0")} ACCEPTED` };
  }

  getRate() {
    return this.frames.length / 5;
  }

  getState() {
    return {
      sourceMode: this.sourceMode,
      sessionActive: !!this.recorder?.active,
      sessionId: this.recorder?.current?.id || null,
      startedAt: this.startedAt,
      uptimeMs: Date.now() - this.startedAt,
      packetRate: this.getRate(),
      expectedRateHz: this.expectedRateHz,
      lastFrame: this.lastFrame,
      received: this.received,
      accepted: this.accepted,
      rejected: this.rejected,
      sequenceGaps: this.sequenceGaps,
      channels: this.registry.toJSON()
    };
  }

  getChannelRegistry() {
    return this.registry.toJSON();
  }
}

module.exports = { TelemetryIngest };
