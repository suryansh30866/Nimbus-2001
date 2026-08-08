import { state, met, shortUtc, fmt } from "./state.js";

const eventRows = document.getElementById("eventRows");
const recentEvents = document.getElementById("recentEvents");
const bigEvent = document.getElementById("bigEvent");

const sevRank = { INFO: 0, ADVISORY: 1, CAUTION: 2, WARNING: 3 };
let classFilter = "ALL";
let severityFilter = "INFO";

export function addEvent(event) {
  state.events.unshift(event);
  state.events = state.events.slice(0, 300);
  renderEvents();
}

export function renderEvents() {
  const filtered = state.events.filter((event) => (classFilter === "ALL" || event.class === classFilter) && sevRank[event.severity] >= sevRank[severityFilter]);
  eventRows.innerHTML = filtered.map((event) => `
    <tr data-id="${event.id}">
      <td>${met(event.metMs).replace("T+ ", "T+")}</td>
      <td>${shortUtc(event.utc)}</td>
      <td>${event.class}</td>
      <td>${event.severity}</td>
      <td>${event.source}</td>
      <td>${event.description}</td>
    </tr>`).join("");
  recentEvents.innerHTML = state.events.slice(0, 8).map((event) => `
    <div class="event-item ${event.severity}">
      <div>${met(event.metMs)} / ${event.class} / ${event.source}</div>
      <strong>${event.description}</strong>
    </div>`).join("") || "<div class='event-item'>NO SIGNIFICANT EVENTS</div>";
  const latest = state.events[0];
  if (latest) bigEvent.textContent = `LATEST EVENT / ${met(latest.metMs)} / ${latest.class} / ${latest.source} / ${latest.description}`;
}

document.querySelectorAll("[data-event-filter]").forEach((button) => button.addEventListener("click", () => {
  document.querySelectorAll("[data-event-filter]").forEach((b) => b.classList.remove("active"));
  button.classList.add("active");
  classFilter = button.dataset.eventFilter;
  renderEvents();
}));

document.querySelectorAll("[data-sev-filter]").forEach((button) => button.addEventListener("click", () => {
  document.querySelectorAll("[data-sev-filter]").forEach((b) => b.classList.remove("active"));
  button.classList.add("active");
  severityFilter = button.dataset.sevFilter;
  renderEvents();
}));
