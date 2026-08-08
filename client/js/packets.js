import { state, shortUtc, pad } from "./state.js";

const packetList = document.getElementById("packetList");
const packetJson = document.getElementById("packetJson");
const packetTitle = document.getElementById("packetTitle");
const packetValidation = document.getElementById("packetValidation");

export function addPacket(record) {
  if (!state.packetPaused) {
    state.packets.unshift(record);
    state.packets = state.packets.slice(0, 250);
    if (!state.selectedPacket) state.selectedPacket = record;
  }
  renderPackets();
}

export function renderPackets() {
  const device = document.getElementById("deviceFilter").value.trim();
  const valid = document.getElementById("validFilter").value;
  const filtered = state.packets.filter((record) => (!device || record.deviceId.includes(device)) && (valid === "ALL" || (valid === "VALID") === record.valid));
  packetList.innerHTML = filtered.map((record) => `
    <div class="packet-row ${state.selectedPacket === record ? "active" : ""}" data-seq="${record.sequence}">
      <span>${pad(record.sequence)}</span><span>${shortUtc(record.receivedAt)}</span><span>${record.valid ? "VALID" : "INVALID"}</span>
    </div>`).join("");
  packetList.querySelectorAll(".packet-row").forEach((row) => row.addEventListener("click", () => {
    state.selectedPacket = state.packets.find((record) => String(record.sequence) === row.dataset.seq);
    renderPackets();
  }));
  if (state.selectedPacket) {
    packetTitle.textContent = `FRAME ${pad(state.selectedPacket.sequence)}`;
    packetValidation.textContent = `VALIDATION ${state.selectedPacket.valid ? "PASS" : "FAIL"}`;
    packetJson.textContent = JSON.stringify({
      frame: state.selectedPacket.sequence,
      received: `${shortUtc(state.selectedPacket.receivedAt)} UTC`,
      source: state.selectedPacket.deviceId,
      validation: state.selectedPacket.valid ? "PASS" : state.selectedPacket.validation.errors,
      packet: state.selectedPacket.packet
    }, null, 2);
  }
}

document.getElementById("pausePackets").addEventListener("click", (event) => {
  state.packetPaused = !state.packetPaused;
  event.currentTarget.classList.toggle("active", state.packetPaused);
});
document.getElementById("clearPackets").addEventListener("click", () => {
  state.packets = [];
  state.selectedPacket = null;
  renderPackets();
});
document.getElementById("copyPacket").addEventListener("click", () => navigator.clipboard?.writeText(packetJson.textContent));
document.getElementById("deviceFilter").addEventListener("input", renderPackets);
document.getElementById("validFilter").addEventListener("change", renderPackets);
