function validatePacket(packet) {
  const errors = [];
  if (!packet || typeof packet !== "object") errors.push("PACKET_NOT_OBJECT");
  if (!packet.deviceId || typeof packet.deviceId !== "string") errors.push("DEVICE_ID_MISSING");
  if (!Number.isInteger(packet.sequence)) errors.push("SEQUENCE_INVALID");
  if (typeof packet.timestamp !== "number" && typeof packet.timestamp !== "string") errors.push("TIMESTAMP_INVALID");
  if (!packet.channels || typeof packet.channels !== "object") errors.push("CHANNELS_MISSING");

  const invalidChannels = [];
  if (packet?.channels && typeof packet.channels === "object") {
    Object.entries(packet.channels).forEach(([field, value]) => {
      if (typeof value !== "number" || Number.isNaN(value) || !Number.isFinite(value)) invalidChannels.push(field);
    });
  }
  if (invalidChannels.length) errors.push(`INVALID_SAMPLE:${invalidChannels.join("|")}`);
  return { valid: errors.length === 0, errors, invalidChannels };
}

module.exports = { validatePacket };
