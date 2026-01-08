export const getDomainAndPriority = (site, datesByKPI) => {
  const techs = ["2G", "3G", "4G"];
  const lastDay = datesByKPI["2G"]?.slice(-1)[0];

  /* ================= GET DEGRADED TECHS ================= */
  const degradedTechs = techs.filter((t) => {
    const v = site.kpis[t]?.[lastDay];
    return v !== null && v !== undefined && v !== "-" && Number(v) < 97;
  });

  const anyTechDegraded = degradedTechs.length > 0;

  const allTechsDegraded = techs.every((t) => {
    const v = site.kpis[t]?.[lastDay];
    return v !== null && v !== undefined && v !== "-" && Number(v) < 97;
  });

  const voltage = site.kpis["Voltage"]?.[lastDay];
  const packetLoss = parseFloat(
    (site.kpis["Packet Loss"]?.[lastDay] || "").replace("%", "")
  );

  /* ================= TX (STRONGEST CONDITION) ================= */
  if (allTechsDegraded) {
    return { domain: "TX", priority: "P0" };
  }

  /* ================= POWER ================= */
  if (anyTechDegraded && voltage < 45000) {
    if (!isNaN(packetLoss) && packetLoss >= 2) {
      return { domain: "Power", priority: "P0" };
    }
    return { domain: "Power", priority: "P1" };
  }

  /* ================= RAN (DEFAULT FOR DEGRADED) ================= */
  if (anyTechDegraded) {
    return { domain: "RAN", priority: "P2" };
  }

  /* ================= OK ================= */
  return { domain: "N/A", priority: "OK" };
};
