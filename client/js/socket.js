export const socket = io();

export function startSimulator(deviceId, rateHz) {
  socket.emit("sim:start", { deviceId, rateHz });
}

export function stopSimulator() {
  socket.emit("sim:stop");
}

export function inject(kind) {
  socket.emit("sim:inject", kind);
}

export function sendReplayPacket(packet) {
  socket.emit("replay:packet", { packet });
}
