export const getDomainAndPriority = (site, datesByKPI) => {
  const techs = ["2G", "3G", "4G"];
  const lastDay = datesByKPI["2G"]?.slice(-1)[0];

  // Get tech status for last day
  const techStatus = techs.map((t) => {
    const v = site.kpis[t]?.[lastDay];
    if (v === null || v === undefined || v === "-" || v === 0) return "OK"; // Treat 0 or missing as OK for degradation
    return Number(v) < 97 ? "degraded" : "OK";
  });

  const degradedTechs = techStatus.filter((s) => s === "degraded");
  const anyTechDegraded = degradedTechs.length > 0;
  const allTechsDegraded = degradedTechs.length === techs.length;

  const voltage = site.kpis["Voltage"]?.[lastDay] ?? 0;
  const packetLoss = parseFloat(
    (site.kpis["Packet Loss"]?.[lastDay] || "0").toString().replace("%", "")
  );

  // ================= TX =================
  if (allTechsDegraded) {
    return { domain: "TX", priority: "P0" };
  }

  // ================= Power =================
  if (anyTechDegraded && voltage > 0 && voltage < 45000) {
    return { domain: "Power", priority: "P0" };
  }

  // ================= RAN =================
  if (anyTechDegraded) {
    return { domain: "RAN", priority: "P2" };
  }

  // ================= N/A =================
  return { domain: "N/A", priority: "OK" };
};
