// domainZTE.js

export const getDomainAndPriorityZTE = (site, datesByKPI) => {
  const techs = ["2G", "3G", "4G"];
  const lastDay = datesByKPI["2G"]?.slice(-1)[0];

  // Safely parse KPI values
  const getKPIValue = (tech, day) => {
    const val = site.kpis?.[tech]?.[day];
    if (val === null || val === undefined || val === "-") return null;
    return Number(val);
  };

  const voltage = getKPIValue("Voltage", lastDay);
  let packetLossRaw = site.kpis?.["Packet Loss"]?.[lastDay];
  if (typeof packetLossRaw === "string") {
    packetLossRaw = packetLossRaw.replace("%", "");
  }
  const packetLoss = parseFloat(packetLossRaw) || 0;

  const degradedTechs = techs.filter((t) => {
    const v = getKPIValue(t, lastDay);
    return v !== null && v < 97;
  });

  const anyTechDegraded = degradedTechs.length > 0;
  const allTechsDegraded = techs.every((t) => {
    const v = getKPIValue(t, lastDay);
    return v !== null && v < 97;
  });

  // DOMAIN LOGIC
  let domain = "N/A";

  if (allTechsDegraded) {
    domain = "TX";
  } else if (anyTechDegraded && voltage !== null && voltage < 45000) {
    domain = "Power";
  } else if (anyTechDegraded) {
    domain = "RAN";
  }

  // PRIORITY using ZTE-specific SitePriority logic
  let priority = "OK";
  try {
    // import ZTE site priority from SitePriorityZTE.js
    // Example: import { getSitePriorityZTE } from './SitePriorityZTE';
    priority = getSitePriorityZTE(site, datesByKPI);
  } catch {
    priority = "OK";
  }

  return { domain, priority };
};
