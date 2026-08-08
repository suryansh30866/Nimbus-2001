const DEFAULT_META = {
  temperature: { label: "TEMP-A", unit: "C", precision: 3, threshold: 2.5, flatlineTolerance: 0.001 },
  accelerationX: { label: "ACC-X", unit: "", precision: 3, threshold: 2.2, flatlineTolerance: 0.0005 },
  accelerationY: { label: "ACC-Y", unit: "", precision: 3, threshold: 2.2, flatlineTolerance: 0.0005 },
  accelerationZ: { label: "ACC-Z", unit: "", precision: 3, threshold: 2.5, flatlineTolerance: 0.0005 },
  batteryVoltage: { label: "VBAT", unit: "V", precision: 3, threshold: 0.25, flatlineTolerance: 0.0005 }
};

class ChannelRegistry {
  constructor() {
    this.channels = new Map();
    this.nextId = 1;
  }

  registerOrUpdate(field, value) {
    if (!this.channels.has(field)) {
      const meta = DEFAULT_META[field] || {
        label: field.replace(/([A-Z])/g, "-$1").toUpperCase().slice(0, 12),
        unit: "",
        precision: 3,
        threshold: 5,
        flatlineTolerance: 0.001
      };
      this.channels.set(field, {
        id: `CH-${String(this.nextId++).padStart(2, "0")}`,
        field,
        label: meta.label,
        unit: meta.unit,
        precision: meta.precision,
        expectedType: "number",
        rapidChangeThreshold: meta.threshold,
        flatlineTolerance: meta.flatlineTolerance,
        samples: 0,
        min: null,
        max: null,
        mean: 0,
        m2: 0,
        invalid: 0,
        lastValue: null,
        lastUpdate: null,
        deltaPerSec: 0,
        state: "NOM"
      });
    }
    const channel = this.channels.get(field);
    const numeric = typeof value === "number" && Number.isFinite(value);
    if (!numeric) {
      channel.invalid += 1;
      channel.state = "INV";
      return channel;
    }
    const previous = channel.lastValue;
    const previousUpdate = channel.lastUpdate;
    channel.samples += 1;
    channel.min = channel.min == null ? value : Math.min(channel.min, value);
    channel.max = channel.max == null ? value : Math.max(channel.max, value);
    const diff = value - channel.mean;
    channel.mean += diff / channel.samples;
    channel.m2 += diff * (value - channel.mean);
    channel.lastValue = value;
    channel.lastUpdate = Date.now();
    channel.deltaPerSec = previous != null && previousUpdate ? (value - previous) / Math.max((channel.lastUpdate - previousUpdate) / 1000, 0.001) : 0;
    if (channel.state === "INV") channel.state = "NOM";
    return channel;
  }

  toJSON() {
    return Array.from(this.channels.values()).map((channel) => ({
      ...channel,
      stdDev: channel.samples > 1 ? Math.sqrt(channel.m2 / (channel.samples - 1)) : 0
    }));
  }
}

module.exports = { ChannelRegistry };
