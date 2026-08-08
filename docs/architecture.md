# ASTRA Mission Control Architecture

## Runtime

The app is a vanilla HTML/CSS/JavaScript client served by a Node.js Express backend. Socket.IO carries accepted telemetry, mission events, console lines, and system state to the browser.

## Data Flow

1. `TelemetrySimulator` generates synthetic engineering telemetry packets.
2. `TelemetryIngest` receives packets from simulator, replay, or live submission.
3. `validator.js` checks packet structure and numeric sample quality.
4. `channel-registry.js` dynamically registers channel metadata and statistics.
5. `event-engine.js` applies deterministic detection rules.
6. `recorder.js` stores packets, events, validation results, channel registry, and operator notes for the active session.
7. Socket.IO broadcasts packet records and state to the client.
8. The client updates dynamic tables, charts, packet inspection, events, link health, session archive, and big board mode.

## Source Modes

The source mode is never inferred visually. It is explicitly shown as `SIM`, `REPLAY`, or `LIVE` in the system bar and relevant screens.
