import { state, shortUtc } from "./state.js";

const grid = "rgba(137,147,151,0.10)";
const text = "#899397";
const lines = ["#A8B8BD", "#8EA7B0", "#7E9B88", "#B79A62", "#8A7F92"];
const dash = [[], [6, 4], [2, 4], [8, 3, 2, 3], [1, 3]];
export const charts = {};

function commonOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: { intersect: false, mode: "nearest" },
    scales: {
      x: { grid: { color: grid }, ticks: { color: text, maxTicksLimit: 8 } },
      y: { grid: { color: grid }, ticks: { color: text } }
    },
    plugins: {
      legend: { labels: { color: text, boxWidth: 28, boxHeight: 1, font: { family: "IBM Plex Mono" } } },
      tooltip: {
        backgroundColor: "#161C20",
        borderColor: "#252D31",
        borderWidth: 1,
        titleColor: "#EDF0F1",
        bodyColor: "#D7DCDE",
        callbacks: { title: (items) => items[0]?.label || "" }
      }
    },
    elements: { point: { radius: 0 }, line: { borderWidth: 1.5, tension: 0.15 } }
  };
}

export function initCharts() {
  charts.primary = new Chart(document.getElementById("primaryChart"), {
    type: "line",
    data: { labels: [], datasets: [{ label: "ACC-Z", data: [], borderColor: lines[0], pointRadius: 0 }] },
    options: commonOptions()
  });
  charts.multi = new Chart(document.getElementById("multiChart"), {
    type: "line",
    data: { labels: [], datasets: [] },
    options: commonOptions()
  });
  charts.arrival = new Chart(document.getElementById("arrivalChart"), {
    type: "line",
    data: { labels: [], datasets: [{ label: "INTER-ARRIVAL MS", data: [], borderColor: lines[1], pointRadius: 0 }] },
    options: commonOptions()
  });
  charts.big = new Chart(document.getElementById("bigChart"), {
    type: "line",
    data: { labels: [], datasets: [{ label: "ACC-Z", data: [], borderColor: lines[0], pointRadius: 0 }] },
    options: commonOptions()
  });
}

export function addSample(packetRecord) {
  const channels = packetRecord.packet.channels || {};
  const label = shortUtc(packetRecord.receivedAt);
  Object.entries(channels).forEach(([field, value]) => {
    if (typeof value !== "number" || !Number.isFinite(value)) return;
    if (!state.histories.has(field)) state.histories.set(field, []);
    const history = state.histories.get(field);
    history.push({ x: label, y: value, t: packetRecord.receivedAt, sequence: packetRecord.sequence });
    while (history.length > 650) history.shift();
  });
  updateCharts();
}

export function updateCharts() {
  const primary = state.histories.get(state.selectedChannel) || [];
  const last60 = primary.slice(-600);
  [charts.primary, charts.big].forEach((chart) => {
    chart.data.labels = last60.map((p) => p.x);
    chart.data.datasets[0].label = state.server.channels.find((c) => c.field === state.selectedChannel)?.label || state.selectedChannel;
    chart.data.datasets[0].data = last60.map((p) => p.y);
    chart.update("none");
  });
  if (!state.hold) {
    const selected = Array.from(state.channelSelection);
    const max = Math.max(0, ...selected.map((field) => (state.histories.get(field) || []).length));
    charts.multi.data.labels = Array.from({ length: Math.min(max, 600) }, (_, i) => String(i - Math.min(max, 600)));
    charts.multi.data.datasets = selected.map((field, index) => {
      const channel = state.server.channels.find((c) => c.field === field);
      const samples = (state.histories.get(field) || []).slice(-600);
      return {
        label: channel?.label || field,
        data: samples.map((p) => p.y),
        borderColor: lines[index % lines.length],
        borderDash: dash[index % dash.length],
        pointRadius: 0
      };
    });
    charts.multi.update("none");
  }
  charts.arrival.data.labels = state.arrivals.slice(-120).map((p) => p.sequence);
  charts.arrival.data.datasets[0].data = state.arrivals.slice(-120).map((p) => p.ms);
  charts.arrival.update("none");
}
