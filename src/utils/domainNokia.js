// utils/nokiaDomain.js

export const getNokiaDomain = (site, datesByKPI) => {
  const kpis = site.kpis || {};

  const has2G = kpis["2G"];
  const has3G = kpis["3G"];
  const has4G = kpis["4G"];
  const voltage = kpis["Voltage"];
  const alarm = kpis["Alarm"];

  /* ===============================
     🔌 POWER DOMAIN
     =============================== */
  if (alarm) {
    const powerAlarms = [
      "Mains Power Fail",
      "Battery Power Unavailable",
      "Power Supply DC Output Out of Range",
      "Loss of Power Supply Redundancy",
    ];

    if (powerAlarms.includes(alarm)) {
      return "Power";
    }
  }

  if (voltage && typeof voltage === "object") {
    const values = Object.values(voltage).filter(
      (v) => typeof v === "number"
    );
    if (values.length && Math.min(...values) < 45000) {
      return "Power";
    }
  }

  /* ===============================
     📡 RADIO DOMAIN
     =============================== */
  const radioBad = (obj) =>
    obj &&
    Object.values(obj).some(
      (v) => typeof v === "number" && v < 97
    );

  if (radioBad(has2G) || radioBad(has3G) || radioBad(has4G)) {
    return "Radio";
  }

  /* ===============================
     🌐 TRANSMISSION DOMAIN
     =============================== */
  const transmissionAlarms = [
    "Ethernet Link Fault",
    "BBU CPRI Interface Error",
    "BBU CPRI Optical Module Fault",
    "RF Unit Maintenance Link Negotiation Failure",
  ];

  if (alarm && transmissionAlarms.includes(alarm)) {
    return "Transmission";
  }

  /* ===============================
     🧠 CORE / OTHER
     =============================== */
  if (alarm) {
    return "Core";
  }

  return "Normal";
};
