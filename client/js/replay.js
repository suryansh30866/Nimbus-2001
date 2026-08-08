import { state, hms, met, pad } from "./state.js";
import { sendReplayPacket } from "./socket.js";

const csvInput = document.getElementById("csvInput");
const datasetInfo = document.getElementById("datasetInfo");
const emptyDataset = document.getElementById("emptyDataset");
const scrub = document.getElementById("replayScrub");

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines.shift().split(",").map((h) => h.trim());
  return lines.map((line, index) => {
    const values = line.split(",");
    const obj = Object.fromEntries(headers.map((header, i) => [header, values[i]]));
    const timestamp = Number(obj.timestamp ?? obj.time ?? index * 100);
    const sequence = Number(obj.sequence ?? index + 1);
    const channels = {};
    headers.forEach((header) => {
      if (!["timestamp", "time", "sequence", "deviceId"].includes(header)) {
        const value = Number(obj[header]);
        if (Number.isFinite(value)) channels[header] = value;
      }
    });
    return { timestampMs: timestamp, packet: { deviceId: obj.deviceId || "ASTRA-01", sequence, timestamp, channels } };
  }).sort((a, b) => a.timestampMs - b.timestampMs);
}

csvInput.addEventListener("change", async () => {
  const file = csvInput.files[0];
  if (!file) return;
  state.replay.rows = parseCsv(await file.text());
  state.replay.index = 0;
  state.replay.durationMs = state.replay.rows.at(-1)?.timestampMs - state.replay.rows[0]?.timestampMs || 0;
  emptyDataset.hidden = true;
  datasetInfo.hidden = false;
  const fields = Object.keys(state.replay.rows[0]?.packet.channels || {});
  datasetInfo.innerHTML = `
    <dt>DATASET</dt><dd>${file.name}</dd>
    <dt>SAMPLES</dt><dd>${state.replay.rows.length}</dd>
    <dt>DURATION</dt><dd>${hms(state.replay.durationMs)}</dd>
    <dt>CHANNELS</dt><dd>${fields.length}</dd>
    <dt>TIMESTAMP FIELD</dt><dd>timestamp</dd>
    <dt>STATUS</dt><dd>READY</dd>`;
  scrub.max = String(Math.max(state.replay.rows.length - 1, 0));
  scrub.value = "0";
  document.getElementById("replayDuration").textContent = hms(state.replay.durationMs);
  renderReplayState();
});

function playStep() {
  if (!state.replay.playing || state.replay.index >= state.replay.rows.length) return;
  const row = state.replay.rows[state.replay.index];
  sendReplayPacket(row.packet);
  state.replay.index += 1;
  renderReplayState();
  if (state.replay.index >= state.replay.rows.length) {
    state.replay.playing = false;
    return;
  }
  const next = state.replay.rows[state.replay.index];
  const delay = Math.max((next.timestampMs - row.timestampMs) / state.replay.rate, 0);
  state.replay.timer = setTimeout(playStep, delay);
}

function renderReplayState() {
  const row = state.replay.rows[state.replay.index] || state.replay.rows.at(-1);
  const base = state.replay.rows[0]?.timestampMs || 0;
  const elapsed = row ? row.timestampMs - base : 0;
  scrub.value = String(state.replay.index);
  document.getElementById("replayTime").textContent = met(elapsed);
  document.getElementById("replayFrame").textContent = `${pad(row?.packet.sequence)} / ${pad(state.replay.rows.at(-1)?.packet.sequence)}`;
}

function pause() {
  state.replay.playing = false;
  clearTimeout(state.replay.timer);
}

document.getElementById("playReplay").addEventListener("click", () => {
  if (!state.replay.rows.length) return;
  pause();
  state.replay.playing = true;
  playStep();
});
document.getElementById("pauseReplay").addEventListener("click", pause);
document.getElementById("rewindStart").addEventListener("click", () => { pause(); state.replay.index = 0; renderReplayState(); });
document.getElementById("rewindEnd").addEventListener("click", () => { pause(); state.replay.index = Math.max(state.replay.rows.length - 1, 0); renderReplayState(); });
document.getElementById("stepBack").addEventListener("click", () => { pause(); state.replay.index = Math.max(0, state.replay.index - 1); renderReplayState(); });
document.getElementById("stepForward").addEventListener("click", () => { pause(); state.replay.index = Math.min(state.replay.rows.length - 1, state.replay.index + 1); sendReplayPacket(state.replay.rows[state.replay.index].packet); renderReplayState(); });
scrub.addEventListener("input", () => {
  pause();
  state.replay.index = Number(scrub.value);
  for (let i = 0; i <= state.replay.index; i += 1) sendReplayPacket(state.replay.rows[i].packet);
  renderReplayState();
});
document.querySelectorAll("[data-rate]").forEach((button) => button.addEventListener("click", () => {
  document.querySelectorAll("[data-rate]").forEach((b) => b.classList.remove("active"));
  button.classList.add("active");
  state.replay.rate = Number(button.dataset.rate);
}));
