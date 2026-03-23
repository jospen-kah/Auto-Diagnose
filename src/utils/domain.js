const parseNumberOrNull = (raw) => {
  if (raw === null || raw === undefined || raw === "-" || raw === "") return null;
  const s = typeof raw === "string" ? raw.trim().replace("%", "") : raw;
  const n = typeof s === "number" ? s : parseFloat(String(s));
  return Number.isFinite(n) ? n : null;
};

const isPacketLossAvailable = (raw) => {
  const n = parseNumberOrNull(raw);
  // Align with SiteAnalysisModal: < 0.5 => No Packet Loss, otherwise Packet Loss Available
  return n != null && n > 0.5;
};

const getTechDegradationFlags = (site, lastDay) => {
  const techs = ["2G", "3G", "4G"];
  const techStatus = techs.map((t) => {
    const v = site.kpis?.[t]?.[lastDay];
    // Treat missing as OK; treat 0 as degraded if it's < 97
    if (v === null || v === undefined || v === "-") return "OK";
    return Number(v) < 97 ? "degraded" : "OK";
  });

  const degradedCount = techStatus.filter((s) => s === "degraded").length;
  const anyTechDegraded = degradedCount > 0;
  const allTechsDegraded = degradedCount === techStatus.length;
  return { anyTechDegraded, allTechsDegraded };
};

// ===============================
// Huawei Domain Rules
// ===============================
export const getDomainAndPriority = (site, datesByKPI) => {
  const lastDay = datesByKPI["2G"]?.slice(-1)[0];
  const { anyTechDegraded, allTechsDegraded } = getTechDegradationFlags(site, lastDay);

  const voltage = parseNumberOrNull(site.kpis?.["Voltage"]?.[lastDay]);
  const powerIssue = anyTechDegraded && voltage != null && voltage < 45000;
  const siteName = String(site?.siteName ?? "");
  const isRuralHuawei = siteName.toUpperCase().includes("URH");

  const packetLossAvailable = isPacketLossAvailable(site.kpis?.["Packet Loss"]?.[lastDay]);

  // Rural Power override (Huawei)
  if (isRuralHuawei && anyTechDegraded && powerIssue) {
    return { domain: "Rural Power", priority: "P0" };
  }

  // Huawei + ZTE: all degraded + packet loss + power issue => TX
  if (allTechsDegraded && packetLossAvailable && powerIssue) {
    return { domain: "BO TX", priority: "P0" };
  }

  if (powerIssue) {
    return { domain: "Power", priority: "P0" };
  }

  if (anyTechDegraded) {
    return { domain: "RAN-HUAWEI", priority: "P2" };
  }

  // Rest is RAN
  return { domain: "RAN-HUAWEI", priority: "OK" };
};

// ===============================
// Nokia Domain Rules
// ===============================
export const getDomainAndPriorityNokia = (site, datesByKPI) => {
  const lastDay = datesByKPI["2G"]?.slice(-1)[0];
  const { anyTechDegraded, allTechsDegraded } = getTechDegradationFlags(site, lastDay);

  const voltage = parseNumberOrNull(site.kpis?.["Voltage"]?.[lastDay]);
  const voltageIssue = voltage != null && voltage < 45000;
  const powerIssue = anyTechDegraded && voltageIssue;

  // Nokia: all techs degraded + NO voltage issues => TX
  if (allTechsDegraded && !voltageIssue) {
    return { domain: "BO TX", priority: "P0" };
  }

  if (powerIssue) {
    return { domain: "Power", priority: "P0" };
  }

  if (anyTechDegraded) {
    return { domain: "RAN-NOKIA", priority: "P2" };
  }

  // Rest is RAN
  return { domain: "RAN-NOKIA", priority: "OK" };
};