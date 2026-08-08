class ReplayEngine {
  static intervals(rows, rate = 1) {
    return rows.map((row, index) => {
      if (index === 0) return 0;
      return Math.max((row.timestampMs - rows[index - 1].timestampMs) / rate, 0);
    });
  }
}

module.exports = { ReplayEngine };
