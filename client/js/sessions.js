import { state, hms, shortUtc } from "./state.js";

const rows = document.getElementById("sessionRows");
const comparison = document.getElementById("comparison");

export function renderSessions() {
  rows.innerHTML = state.sessions.map((session) => `
    <tr>
      <td>${session.id}</td><td>${shortUtc(session.date)}</td><td>${session.sourceMode}</td><td>${hms(session.durationMs)}</td>
      <td>${session.packets}</td><td>${session.invalid}</td><td>${session.events}</td><td>${session.state}</td>
    </tr>`).join("");
  const [a, b] = state.sessions;
  comparison.innerHTML = a && b ? `
    <table><thead><tr><th>METRIC</th><th>${a.id}</th><th>${b.id}</th></tr></thead><tbody>
      <tr><td>DURATION</td><td>${(a.durationMs / 1000).toFixed(1)} s</td><td>${(b.durationMs / 1000).toFixed(1)} s</td></tr>
      <tr><td>PACKETS</td><td>${a.packets}</td><td>${b.packets}</td></tr>
      <tr><td>AVG PACKET RATE</td><td>${(a.avgRate || 0).toFixed(2)} Hz</td><td>${(b.avgRate || 0).toFixed(2)} Hz</td></tr>
      <tr><td>INVALID SAMPLES</td><td>${a.invalid}</td><td>${b.invalid}</td></tr>
      <tr><td>SEQUENCE GAPS</td><td>${a.sequenceGaps}</td><td>${b.sequenceGaps}</td></tr>
      <tr><td>DATA EVENTS</td><td>${a.events}</td><td>${b.events}</td></tr>
    </tbody></table>` : "SELECT TWO COMPLETED SESSIONS FOR COMPARISON.";
}
