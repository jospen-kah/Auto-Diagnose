import React, { useEffect, useState } from "react";

const KPITable = ({
  kpiTypes,
  datesByKPI,
  groupedBySite,
  getSiteStatus,
  setSelectedSite,
  setSelectedDay,
  showAlarms = true,
}) => {
  if (!groupedBySite) return null;

  /* ===============================
     🔑 SOURCE OF TRUTH
     =============================== */
  const allSites = Object.values(groupedBySite);

  const [visibleSites, setVisibleSites] = useState(allSites);
  const [tickedSites, setTickedSites] = useState({});

  /* Reset when data reloads */
  useEffect(() => {
    setVisibleSites(allSites);
  }, [groupedBySite]);

  /* ===============================
     🧠 Selection (drag / copy)
     =============================== */
  const [selectionMode, setSelectionMode] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [start, setStart] = useState(null);
  const [end, setEnd] = useState(null);

  const displayKPIs = showAlarms
    ? kpiTypes
    : kpiTypes.filter((k) => k !== "Alarm");

  /* ===============================
     🎨 KPI Coloring
     =============================== */
  const getCellColor = (kpi, value) => {
    if (value === "-" || value == null) return "";
    if (["2G", "3G", "4G"].includes(kpi)) {
      if (value > 97) return "bg-green-500 text-white";
      if (value > 0) return "bg-yellow-400 text-black";
      return "bg-orange-500 text-white";
    }
    if (kpi === "Voltage") {
      return value < 45000
        ? "bg-orange-500 text-white"
        : "bg-green-500 text-white";
    }
    return "";
  };

  /* ===============================
     🟥 Selection logic
     =============================== */
  const isSelected = (r, c) => {
    if (!start || !end) return false;
    const minR = Math.min(start.r, end.r);
    const maxR = Math.max(start.r, end.r);
    const minC = Math.min(start.c, end.c);
    const maxC = Math.max(start.c, end.c);
    return r >= minR && r <= maxR && c >= minC && c <= maxC;
  };

  /* ===============================
     📋 Copy selected cells
     =============================== */
  const copySelection = () => {
    if (!start || !end) return;

    const minR = Math.min(start.r, end.r);
    const maxR = Math.max(start.r, end.r);
    const minC = Math.min(start.c, end.c);
    const maxC = Math.max(start.c, end.c);

    const rows = [];

    const getTechnoImpactedLocal = (site) => {
      const techs = ["2G", "3G", "4G"];
      const impacted = [];

      techs.forEach((tech) => {
        const dates = datesByKPI[tech];
        if (!dates?.length) return;

        const lastDate = dates[dates.length - 1];
        const raw = site.kpis?.[tech]?.[lastDate];

        if (raw === "-" || raw == null || raw === "NaN") return;

        const v = Number(raw);
        if (v > 0 && v < 97) impacted.push(tech);
      });

      return impacted.length ? impacted.join(", ") : "-";
    };

    for (let r = minR; r <= maxR; r++) {
      const site = visibleSites[r];

      const fullRow = [];

      // Checkbox column (ignored visually, but must exist for index alignment)
      fullRow.push("");

      // #
      fullRow.push(r + 1);

      // Site info
      fullRow.push(site.siteCode);
      fullRow.push(site.siteName);

      // KPIs
      displayKPIs.forEach((kpi, i) => {
        datesByKPI[kpi].forEach((d) => {
          fullRow.push(site.kpis?.[kpi]?.[d] ?? "-");
        });

        // separator column
        if (i < displayKPIs.length - 1) {
          fullRow.push("");
        }
      });

      // Other columns
      fullRow.push(getSiteStatus ? getSiteStatus(site) : "-");
      fullRow.push(site.priority ?? "-");
      fullRow.push(site.domain ?? "-");
      fullRow.push(site.topologyPower ?? "-");
      fullRow.push(getTechnoImpactedLocal(site));

      // ✅ slice EXACT selected columns
      rows.push(
        fullRow.slice(minC+1, maxC + 2).join("\t")
      );
    }

    navigator.clipboard.writeText(rows.join("\n"));
  };


  /* ===============================
     ⌨ Keyboard shortcuts
     =============================== */
  useEffect(() => {
    const handler = (e) => {
      if (!selectionMode) return;

      if (e.key === "Escape") {
        setSelectionMode(false);
        setStart(null);
        setEnd(null);
      }

      if (e.ctrlKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        copySelection();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectionMode, start, end]);

  const cellHandlers = (r, c, extra = "") => ({
    onMouseDown: () => {
      setSelectionMode(true);
      setDragging(true);
      setStart({ r, c });
      setEnd({ r, c });
    },
    onMouseEnter: () => dragging && setEnd({ r, c }),
    onMouseUp: () => setDragging(false),
    className: `
      border px-3 select-none
      ${extra}
      ${isSelected(r, c) ? "ring-2 ring-red-500 ring-inset bg-red-500/20" : ""}
    `,
  });

  /* ===============================
     ✅ BUTTON ACTIONS (ONLY ADDITION)
     =============================== */
  const showSelectedOnly = () => {
    const selected = Object.keys(tickedSites).filter((k) => tickedSites[k]);
    if (!selected.length) return;

    setVisibleSites(
      allSites.filter((s) => selected.includes(s.siteCode))
    );
  };

  const clearFilter = () => {
    setVisibleSites(allSites);
    setTickedSites({});
  };

  /* ===============================
     🧾 RENDER
     =============================== */
  return (
    <>
      {/* ACTION BUTTONS */}
      <div className="flex gap-3 mb-2 mx-4">
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded"
          onClick={showSelectedOnly}
        >
          Show Selected
        </button>

        <button
          className="px-4 py-2 bg-gray-600 text-white rounded"
          onClick={clearFilter}
        >
          Clear
        </button>
      </div>

      <div className="overflow-auto mx-4 border border-gray-700 rounded">
        <table className="min-w-max border-collapse text-sm">
          <thead>
            <tr className="bg-gray-800">
              <th rowSpan={2} className="border px-2">✓</th>
              <th rowSpan={2} className="border px-3">#</th>
              <th rowSpan={2} className="border px-3">Site Code</th>
              <th rowSpan={2} className="border px-3">Site Name</th>

              {displayKPIs.map((kpi, i) => (
                <React.Fragment key={kpi}>
                  <th colSpan={datesByKPI[kpi].length} className="border px-3">
                    {kpi}
                  </th>
                  {i < displayKPIs.length - 1 && (
                    <th className="bg-gray-900 w-3"></th>
                  )}
                </React.Fragment>
              ))}

              <th rowSpan={2} className="border px-3">Status</th>
              <th rowSpan={2} className="border px-3">Priority</th>
              <th rowSpan={2} className="border px-3">Domain</th>
              <th rowSpan={2} className="border px-3">Topology Power</th>
              <th rowSpan={2} className="border px-3">Techno Impacted</th>
            </tr>

            <tr className="bg-gray-700">
              {displayKPIs.map((kpi, i) => (
                <React.Fragment key={kpi}>
                  {datesByKPI[kpi].map((d) => (
                    <th key={d} className="border px-3">{d}</th>
                  ))}
                  {i < displayKPIs.length - 1 && (
                    <th className="bg-gray-900 w-3"></th>
                  )}
                </React.Fragment>
              ))}
            </tr>
          </thead>

          <tbody>
            {visibleSites.map((site, rIdx) => {
              let cIdx = 0;

              const getTechnoImpacted = (site) => {
                const techs = ["2G", "3G", "4G"];
                const impacted = [];

                techs.forEach((tech) => {
                  const dates = datesByKPI[tech];
                  if (!dates || !dates.length) return;

                  const lastDate = dates[dates.length - 1];
                  const raw = site.kpis?.[tech]?.[lastDate];

                  const value =
                    raw === "-" || raw == null || raw === "NaN"
                      ? NaN
                      : Number(raw);

                  if (value > 0 && value < 97) {
                    impacted.push(tech);
                  }
                });

                return impacted.join(", ") || "-";
              };

              return (
                <tr key={site.siteCode} className="hover:bg-gray-800">
                  {/* CHECKBOX */}
                  <td className="border px-2 text-center">
                    <input
                      type="checkbox"
                      checked={!!tickedSites[site.siteCode]}
                      onChange={(e) =>
                        setTickedSites((p) => ({
                          ...p,
                          [site.siteCode]: e.target.checked,
                        }))
                      }
                    />
                  </td>

                  <td {...cellHandlers(rIdx, cIdx++)}>{rIdx + 1}</td>

                  <td
                    {...cellHandlers(rIdx, cIdx++, "cursor-pointer text-blue-400")}
                    onClick={() => !dragging && setSelectedSite(site)}
                  >
                    {site.siteCode}
                  </td>

                  <td
                    {...cellHandlers(rIdx, cIdx++, "cursor-pointer text-blue-400")}
                    onClick={() => !dragging && setSelectedSite(site)}
                  >
                    {site.siteName}
                  </td>

                  {displayKPIs.map((kpi, i) => (
                    <React.Fragment key={kpi}>
                      {kpi === "Alarm" ? (
                        <td
                          {...cellHandlers(
                            rIdx,
                            cIdx++,
                            "text-center font-semibold bg-red-600/20"
                          )}
                        >
                          {site.kpis.Alarm ?? "-"}
                        </td>
                      ) : (
                        datesByKPI[kpi].map((d) => {
                          const v = site.kpis[kpi]?.[d] ?? "-";
                          return (
                            <td
                              key={d}
                              {...cellHandlers(
                                rIdx,
                                cIdx++,
                                `text-center ${getCellColor(kpi, v)}`
                              )}
                              onClick={() =>
                                !dragging &&
                                (setSelectedSite(site), setSelectedDay(d))
                              }
                            >
                              {v}
                            </td>
                          );
                        })
                      )}

                      {i < displayKPIs.length - 1 && (
                        <td
                          {...cellHandlers(rIdx, cIdx++, "bg-gray-900 pointer-events-none")}
                        />
                      )}
                    </React.Fragment>
                  ))}
                  <td {...cellHandlers(rIdx, cIdx++)}>
                    {getSiteStatus ? getSiteStatus(site) : "-"}
                  </td>
                  <td {...cellHandlers(rIdx, cIdx++)}>{site.priority ?? "-"}</td>
                  <td {...cellHandlers(rIdx, cIdx++)}>{site.domain ?? "-"}</td>
                  <td {...cellHandlers(rIdx, cIdx++)}>
                    {site.topologyPower ?? "-"}
                  </td>
                  <td {...cellHandlers(rIdx, cIdx++)}>
                    {getTechnoImpacted(site)}
                  </td>

                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default KPITable;
