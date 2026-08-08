export const state = {
  server: { sourceMode: "SIM", startedAt: Date.now(), packetRate: 0, lastFrame: 0, channels: [] },
  packets: [],
  events: [],
  console: [],
  histories: new Map(),
  arrivals: [],
  selectedChannel: "accelerationZ",
  selectedPacket: null,
  selectedEvent: null,
  channelSelection: new Set(["accelerationX", "accelerationY", "accelerationZ"]),
  hold: false,
  packetPaused: false,
  consolePaused: false,
  sessions: [],
  replay: { rows: [], index: 0, timer: null, rate: 1, playing: false, startedAt: 0, durationMs: 0 }
};

export function fmt(n, digits = 3) {
  return typeof n === "number" && Number.isFinite(n) ? n.toFixed(digits) : "--";
}

export function pad(n, len = 6) {
  return String(n || 0).padStart(len, "0");
}

export function met(ms) {
  const safe = Math.max(0, ms || 0);
  const h = Math.floor(safe / 3600000);
  const m = Math.floor((safe % 3600000) / 60000);
  const s = Math.floor((safe % 60000) / 1000);
  const x = Math.floor(safe % 1000);
  return `T+ ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(x).padStart(3, "0")}`;
}

export function hms(ms) {
  return met(ms).replace("T+ ", "");
}

export function shortUtc(value = Date.now()) {
  return new Date(value).toISOString().slice(11, 23);
}
