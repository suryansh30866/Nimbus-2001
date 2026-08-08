import { inject, startSimulator, stopSimulator } from "./socket.js";

document.getElementById("startSim").addEventListener("click", () => {
  startSimulator(document.getElementById("simDevice").value, Number(document.getElementById("simRate").value));
});
document.getElementById("stopSim").addEventListener("click", stopSimulator);
document.querySelectorAll("[data-inject]").forEach((button) => button.addEventListener("click", () => inject(button.dataset.inject)));
