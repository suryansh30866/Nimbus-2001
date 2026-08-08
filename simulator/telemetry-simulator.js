class TelemetrySimulator {
  constructor(emitPacket) {
    this.emitPacket = emitPacket;
    this.timer = null;
    this.sequence = 4800;
    this.rateHz = 10;
    this.deviceId = "SIM-001";
    this.pending = null;
    this.values = {
      temperature: 31.2,
      accelerationX: 0.12,
      accelerationY: -0.04,
      accelerationZ: 9.71,
      batteryVoltage: 11.84
    };
  }

  start(config = {}) {
    this.stop();
    this.rateHz = Number(config.rateHz) || 10;
    this.deviceId = config.deviceId || "SIM-001";
    this.timer = setInterval(() => this.tick(), 1000 / this.rateHz);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  inject(kind) {
    this.pending = kind;
  }

  tick() {
    if (this.pending === "missing") this.sequence += 2;
    else this.sequence += 1;

    const packet = {
      deviceId: this.deviceId,
      sequence: this.sequence,
      timestamp: Date.now(),
      channels: this.nextChannels()
    };

    if (this.pending === "invalid") packet.channels.accelerationZ = Number.NaN;
    if (this.pending === "spike") packet.channels.accelerationZ += 3.2;
    if (this.pending === "flatline") packet.channels.accelerationY = -0.04;
    this.pending = this.pending === "flatline" ? "flatline" : null;
    this.emitPacket(packet);
  }

  nextChannels() {
    const drift = (amount) => (Math.random() - 0.5) * amount;
    this.values.temperature += drift(0.03);
    this.values.accelerationX += drift(0.02);
    this.values.accelerationY += this.pending === "flatline" ? 0 : drift(0.02);
    this.values.accelerationZ += drift(0.035);
    this.values.batteryVoltage -= 0.0008 + Math.random() * 0.0004;
    return {
      temperature: Number(this.values.temperature.toFixed(3)),
      accelerationX: Number(this.values.accelerationX.toFixed(3)),
      accelerationY: Number(this.values.accelerationY.toFixed(3)),
      accelerationZ: Number(this.values.accelerationZ.toFixed(3)),
      batteryVoltage: Number(this.values.batteryVoltage.toFixed(3))
    };
  }
}

module.exports = { TelemetrySimulator };
