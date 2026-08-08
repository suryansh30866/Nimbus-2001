const fs = require("fs");
const path = require("path");

class SessionStore {
  constructor(dir) {
    this.dir = dir;
    fs.mkdirSync(dir, { recursive: true });
  }

  saveSession(session) {
    fs.writeFileSync(path.join(this.dir, `${session.id}.json`), JSON.stringify(session, null, 2));
  }

  readSession(id) {
    const file = path.join(this.dir, `${id}.json`);
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, "utf8"));
  }

  listSessions() {
    return fs.readdirSync(this.dir)
      .filter((file) => file.endsWith(".json"))
      .map((file) => {
        const session = JSON.parse(fs.readFileSync(path.join(this.dir, file), "utf8"));
        return session.summary || {
          id: session.id,
          date: session.startTime,
          sourceMode: session.sourceMode,
          durationMs: (session.endTime || Date.now()) - session.startTime,
          packets: session.packets?.length || 0,
          invalid: 0,
          events: session.events?.length || 0,
          state: session.endTime ? "COMPLETE" : "OPEN"
        };
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }
}

module.exports = { SessionStore };
