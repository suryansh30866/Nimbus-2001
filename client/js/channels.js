import { state, fmt, shortUtc } from "./state.js";
import { updateCharts } from "./charts.js";

const rows = document.getElementById("channelRows");
const detail = document.getElementById("channelDetail");
const detailTitle = document.getElementById("detailTitle");
const selector = document.getElementById("channelSelector");

function stateCode(code) {
  const symbol = code === "NOM" ? "●" : code === "CAUT" ? "▲" : code === "WARN" ? "■" : code === "INV" ? "×" : "—";
  return `<span class="state-code ${code}"><span>${symbol}</span><span>${code}</span></span>`;
}

export function renderChannels() {
  rows.innerHTML = state.server.channels.map((channel) => `
    <tr data-field="${channel.field}" class="${channel.field === state.selectedChannel ? "selected" : ""}">
      <td>${channel.label}</td>
      <td>${fmt(channel.lastValue, channel.precision)}</td>
      <td>${channel.unit || ""}</td>
      <td>${fmt(channel.deltaPerSec, 3)}</td>
      <td>${fmt(channel.min, channel.precision)}</td>
      <td>${fmt(channel.max, channel.precision)}</td>
      <td>${channel.samples}</td>
      <td>${stateCode(channel.state || "NOM")}</td>
    </tr>`).join("");
  rows.querySelectorAll("tr").forEach((row) => row.addEventListener("click", () => {
    state.selectedChannel = row.dataset.field;
    renderChannels();
    renderDetail();
    updateCharts();
  }));
  renderSelector();
  renderDetail();
}

function renderSelector() {
  selector.innerHTML = state.server.channels.map((channel, index) => {
    const active = state.channelSelection.has(channel.field);
    const style = ["", "dashed", "dotted", "dotdash"][index % 4];
    return `<button class="channel-toggle ${active ? "active" : ""}" data-field="${channel.field}"><span class="line-sample ${style}"></span>${active ? "[×]" : "[ ]"} ${channel.label}</button>`;
  }).join("");
  selector.querySelectorAll("button").forEach((button) => button.addEventListener("click", () => {
    if (state.channelSelection.has(button.dataset.field)) state.channelSelection.delete(button.dataset.field);
    else state.channelSelection.add(button.dataset.field);
    renderSelector();
    updateCharts();
  }));
}

export function renderDetail() {
  const channel = state.server.channels.find((item) => item.field === state.selectedChannel) || state.server.channels[0];
  if (!channel) {
    detail.innerHTML = "";
    return;
  }
  detailTitle.textContent = `${channel.label} / CHANNEL DETAIL`;
  const history = state.histories.get(channel.field) || [];
  const samples = history.slice(-4).reverse().map((sample) => `<div>${shortUtc(sample.t)}</div><div>${fmt(sample.y, channel.precision)}</div>`).join("");
  detail.innerHTML = `
    <div class="current">${fmt(channel.lastValue, channel.precision)} ${channel.unit || ""}</div>
    <dt>SOURCE FIELD</dt><dd>${channel.field}</dd>
    <dt>CHANNEL ID</dt><dd>${channel.id}</dd>
    <dt>SAMPLES</dt><dd>${channel.samples}</dd>
    <dt>LAST UPDATE</dt><dd>${channel.lastUpdate ? shortUtc(channel.lastUpdate) : "--"}</dd>
    <dt>MEAN</dt><dd>${fmt(channel.mean, channel.precision)}</dd>
    <dt>STD DEV</dt><dd>${fmt(channel.stdDev, channel.precision)}</dd>
    <dt>MIN</dt><dd>${fmt(channel.min, channel.precision)}</dd>
    <dt>MAX</dt><dd>${fmt(channel.max, channel.precision)}</dd>
    <dt>INVALID</dt><dd>${channel.invalid}</dd>
    <dt>RECENT SAMPLES</dt><dd></dd>${samples}`;
}
