import { state, shortUtc } from "./state.js";

const lines = document.getElementById("consoleLines");
let filter = "ALL";

export function addConsole(line) {
  if (!state.consolePaused) {
    state.console.unshift(line);
    state.console = state.console.slice(0, 180);
  }
  renderConsole();
}

export function renderConsole() {
  lines.textContent = state.console
    .filter((line) => filter === "ALL" || line.code === filter)
    .map((line) => `${shortUtc(line.utc)}  ${line.code.padEnd(5)}  ${line.text}`)
    .join("\n");
}

document.querySelectorAll("[data-console-filter]").forEach((button) => button.addEventListener("click", () => {
  document.querySelectorAll("[data-console-filter]").forEach((b) => b.classList.remove("active"));
  button.classList.add("active");
  filter = button.dataset.consoleFilter;
  renderConsole();
}));
document.getElementById("consolePause").addEventListener("click", (event) => {
  state.consolePaused = !state.consolePaused;
  event.currentTarget.classList.toggle("active", state.consolePaused);
});
document.getElementById("consoleClear").addEventListener("click", () => {
  state.console = [];
  renderConsole();
});
document.getElementById("consoleExpand").addEventListener("click", () => {
  document.getElementById("eventConsole").classList.toggle("expanded");
});
