const { EventEmitter } = require("events");

class EventEngine extends EventEmitter {
  constructor({ expectedRateHz = 10 } = {}) {
    super();
    this.expectedRateHz = expectedRateHz;
    this.count = 0;
    this.lastSequence = null;
    this.lastValues = new Map();
    this.flatline = new Map();
    this.recentReceipts = [];
    this.rateDropActive = false;
  }

  process(record, channels, validation) {
    const events = [];
    const now = record.receivedAt;
    this.recentReceipts.push(now);
    this.recentReceipts = this.recentReceipts.filter((time) => now - time <= 5000);

    if (this.lastSequence != null && record.sequence > this.lastSequence + 1) {
      events.push(this.createEvent("LINK", "CAUTION", "TM", "FRAME GAP", {
        expected: this.lastSequence + 1,
        received: record.sequence,
        missingFrames: record.sequence - this.lastSequence - 1
      }));
    }
    this.lastSequence = record.sequence;

    validation.invalidChannels.forEach((field) => {
      events.push(this.createEvent("DATA", "WARNING", field, "INVALID SAMPLE", { channel: field, value: record.packet.channels[field] }));
    });

    channels.forEach((channel) => {
      const value = record.packet.channels[channel.field];
      if (typeof value !== "number" || !Number.isFinite(value)) return;
      const previous = this.lastValues.get(channel.field);
      if (previous != null) {
        const delta = value - previous;
        if (Math.abs(delta) > channel.rapidChangeThreshold) {
          events.push(this.createEvent("DATA", "ADVISORY", channel.label, "RAPID VALUE CHANGE", {
            channel: channel.label,
            previous,
            current: value,
            delta
          }));
        }
        const flat = Math.abs(delta) <= channel.flatlineTolerance;
        const streak = flat ? (this.flatline.get(channel.field) || 0) + 1 : 0;
        this.flatline.set(channel.field, streak);
        if (streak === 30) {
          events.push(this.createEvent("DATA", "ADVISORY", channel.label, "POSSIBLE CHANNEL FLATLINE", {
            channel: channel.label,
            tolerance: channel.flatlineTolerance,
            samples: streak
          }));
        }
      }
      this.lastValues.set(channel.field, value);
    });

    const spanMs = this.recentReceipts.at(-1) - this.recentReceipts[0];
    const rate = spanMs > 0 ? (this.recentReceipts.length - 1) / (spanMs / 1000) : this.expectedRateHz;
    if (spanMs >= 3000 && rate < this.expectedRateHz * 0.75 && !this.rateDropActive) {
      this.rateDropActive = true;
      events.push(this.createEvent("LINK", "CAUTION", "TM", "FRAME RATE BELOW EXPECTED RANGE", {
        expectedHz: this.expectedRateHz,
        observedHz: rate
      }));
    }
    if (rate >= this.expectedRateHz * 0.85) this.rateDropActive = false;

    events.forEach((event) => this.emit("event", event));
    return events;
  }

  createEvent(eventClass, severity, source, description, data = {}) {
    const now = Date.now();
    this.count += 1;
    return {
      id: `EVT-${String(this.count).padStart(5, "0")}`,
      metMs: null,
      utc: new Date(now).toISOString(),
      class: eventClass,
      severity,
      source,
      description,
      data
    };
  }
}

module.exports = { EventEngine };
