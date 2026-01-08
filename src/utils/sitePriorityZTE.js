// SitePriorityZTE.js

export const getSitePriorityZTE = (siteData, datesByKPI) => {
  const techs = ["2G", "3G", "4G"];
  const dates = datesByKPI["2G"];
  if (!dates || dates.length === 0) return "Ok";

  const last1 = dates.slice(-1);
  const last2 = dates.slice(-2);
  const last3 = dates.slice(-3);

  const isDegraded = (tech, day) => {
    const val = siteData.kpis?.[tech]?.[day];
    if (val === undefined || val === "-" || val === null) return false;
    return Number(val) < 97;
  };

  // 🔴 P0 → 3 consecutive days degraded
  const hasP0 = techs.some((tech) =>
    last3.length === 3 && last3.every((day) => isDegraded(tech, day))
  );
  if (hasP0) return "P0";

  // 🟠 P1 → 2 consecutive days degraded
  const hasP1 = techs.some((tech) =>
    last2.length === 2 && last2.every((day) => isDegraded(tech, day))
  );
  if (hasP1) return "P1";

  // 🟡 P2 → last day only degraded
  const hasLastDayOnly = techs.some((tech) => isDegraded(tech, last1[0]));
  if (hasLastDayOnly) return "P2";

  // 🟢 P3 → no degradation
  return "Ok";
};
