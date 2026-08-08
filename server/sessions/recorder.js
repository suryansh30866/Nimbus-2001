const { EventEmitter } = require("events");

class SessionRecorder extends EventEmitter {
  constructor(store) {
    super();
    this.store = store;
    this.active = false;
    this.current = null;
    this.counter = 1;
  }

  start({ sourceMode = "SIM", channelRegistry = [], operatorNotes = [] } = {}) {
    if (this.active) return this.current;
    const stamp = new Date().toISOString().slice(0, 10).replaceAll("-", "-");
    this.current = {
      id: `SESSION-${stamp}-${String(this.counter++).padStart(3, "0")}`,
      sourceMode,
      startTime: Date.now(),
      endTime: null,
      packets: [],
      events: [],
      channelRegistry,
      operatorNotes
    };
    this.active = true;
    this.emit("session:started", this.current);
    return this.current;
  }

  record(record, events, channelRegistry) {
    if (!this.active || !this.current) return;
    this.current.packets.push(record);
    this.current.events.push(...events);
    this.current.channelRegistry = channelRegistry;
  }

  stop() {
    if (!this.active || !this.current) return null;
    this.current.endTime = Date.now();
    const invalid = this.current.packets.filter((packet) => !packet.valid).length;
    this.current.summary = {
      id: this.current.id,
      date: this.current.startTime,
      sourceMode: this.current.sourceMode,
      durationMs: this.current.endTime - this.current.startTime,
      packets: this.current.packets.length,
      accepted: this.current.packets.length - invalid,
      invalid,
      sequenceGaps: this.current.events.filter((event) => event.description === "FRAME GAP").reduce((sum, event) => sum + (event.data?.missingFrames || 0), 0),
      avgRate: this.current.packets.length / Math.max((this.current.endTime - this.current.startTime) / 1000, 1),
      events: this.current.events.length,
      state: "COMPLETE"
    };
    this.store.saveSession(this.current);
    this.active = false;
    const completed = this.current.summary;
    this.emit("session:completed", completed);
    this.current = null;
    return completed;
  }
}

module.exports = { SessionRecorder };
