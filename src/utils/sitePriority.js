// SitePriority.js

/**
 * Priority Logic (Corrected):
 *
 * P0 → At least ONE technology (2G/3G/4G) degraded
 *      for the LAST 3 CONSECUTIVE DAYS
 *
 * P1 → At least ONE technology degraded
 *      for the LAST 2 CONSECUTIVE DAYS
 *
 * P2 → Degradation exists ONLY on the LAST DAY
 *      (no tech degraded for 2 consecutive days)
 *
 * 0 → No degradation in the last 3 days
 */

export const getSitePriority = (siteData, datesByKPI) => {
  const techs = ["2G", "3G", "4G"];
  const dates = datesByKPI["2G"]; // assume aligned dates
  if (!dates || dates.length === 0) return "P3";

  const last1 = dates.slice(-1);
  const last2 = dates.slice(-2);
  const last3 = dates.slice(-3);

  const isDegraded = (tech, day) => {
    const val = siteData.kpis?.[tech]?.[day];
    return val !== undefined && val !== "-" && val < 97;
  };

  // 🔴 P0 → 3 consecutive days degradation
  const hasP0 = techs.some((tech) =>
    last3.length === 3 &&
    last3.every((day) => isDegraded(tech, day))
  );
  if (hasP0) return "P0";

  // 🟠 P1 → 2 consecutive days degradation
  const hasP1 = techs.some((tech) =>
    last2.length === 2 &&
    last2.every((day) => isDegraded(tech, day))
  );
  if (hasP1) return "P1";

  // 🟡 P2 → ONLY last day degraded (any tech)
  const hasLastDayOnly = techs.some((tech) =>
    isDegraded(tech, last1[0])
  );
  if (hasLastDayOnly) return "P2";

  // 🟢 P3 → No degradation
  return "Ok";
};
