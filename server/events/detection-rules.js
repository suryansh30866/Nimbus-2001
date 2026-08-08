const RULES = [
  {
    id: "RULE-01",
    name: "SEQUENCE GAP",
    class: "LINK",
    severity: "CAUTION",
    description: "If a received sequence is greater than previous sequence + 1, create a link event."
  },
  {
    id: "RULE-02",
    name: "INVALID SAMPLE",
    class: "DATA",
    severity: "WARNING",
    description: "If a numeric channel is null, undefined, NaN, infinite, or non-numeric, flag the sample invalid."
  },
  {
    id: "RULE-03",
    name: "FLATLINE",
    class: "DATA",
    severity: "ADVISORY",
    description: "If a channel remains unchanged within tolerance for consecutive samples, create a possible flatline event."
  },
  {
    id: "RULE-04",
    name: "RAPID VALUE CHANGE",
    class: "DATA",
    severity: "ADVISORY",
    description: "If absolute delta exceeds the configured channel threshold, report rapid value change."
  },
  {
    id: "RULE-05",
    name: "PACKET RATE DROP",
    class: "LINK",
    severity: "CAUTION",
    description: "If rolling packet rate drops below the expected range, report frame rate below expected range."
  }
];

module.exports = { RULES };
