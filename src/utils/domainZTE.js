// domainZTE.js
// import { getSitePriorityZTE } from "./SitePriorityZTE";

export const getDomainAndPriorityZTE = (site, datesByKPI) => {
  const techs = ["2G", "3G", "4G"];
  const lastDay = datesByKPI["2G"]?.slice(-1)[0];

  /* ===============================
     🔧 KPI PARSERS
  =============================== */

  const getNumericValue = (raw) => {
    if (raw === null || raw === undefined || raw === "-") return null;

    let v = raw;
    if (typeof v === "string") v = v.replace("%", "").trim();

    const num = parseFloat(v);
    return isNaN(num) ? null : num;
  };

  // ✅ Packet Loss: return numeric value exactly as parsed from the raw file
  const getPacketLossValue = (raw) => {
    return getNumericValue(raw);
  };

  /* ===============================
     📊 KPI VALUES
  =============================== */

  const voltage = getNumericValue(site.kpis?.Voltage?.[lastDay]);

  const packetLoss = getPacketLossValue(
    site.kpis?.["Packet Loss"]?.[lastDay]
  );

  const getTechAvailability = (tech) =>
    getNumericValue(site.kpis?.[tech]?.[lastDay]);

  /* ===============================
     📉 DEGRADED TECHS
  =============================== */

  const degradedTechs = techs.filter((t) => {
    const v = getTechAvailability(t);
    return v !== null && v < 97;
  });

  const anyTechDegraded = degradedTechs.length > 0;

  const allTechsDegraded = techs.every((t) => {
    const v = getTechAvailability(t);
    return v !== null && v < 97;
  });

  /* ===============================
     🧠 DOMAIN LOGIC (ZTE)
  =============================== */

  let domain = "N/A";

  if (allTechsDegraded) {
    domain = "TX";
  } else if (anyTechDegraded && voltage !== null && voltage < 45000) {
    domain = "Power";
  } else if (anyTechDegraded) {
    domain = "RAN";
  }

  // If nothing is degraded, treat "N/A" as RAN for UI + filtering consistency
  if (domain === "N/A") domain = "RAN";

  /* ===============================
     🚦 PRIORITY
  =============================== */

  let priority = "OK";
  try {
    priority = getSitePriorityZTE(site, datesByKPI);
  } catch {
    priority = "OK";
  }

  return {
    domain,
    priority,

    // Optional (for debugging / UI use)
    _debug: {
      packetLoss, // numeric %, e.g. 0.03
    },
  };
};
