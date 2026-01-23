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

  const sites = Object.values(groupedBySite);

  /* ===============================
     🔹 Selection State
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
    if (value === "-" || value === undefined || value === null) return "";
    if (["2G", "3G", "4G"].includes(kpi)) {
      if (value > 97) return "bg-green-500 text-white";
      if (value >= 50) return "bg-yellow-400 text-black";
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

    for (let r = minR; r <= maxR; r++) {
      const site = sites[r];
      let c = 0;
      const row = [];

      const push = (v) => {
        if (c >= minC && c <= maxC) row.push(v);
        c++;
      };

      push(r + 1);
      push(site.siteCode);
      push(site.siteName);

      displayKPIs.forEach((kpi, i) => {
        datesByKPI[kpi].forEach((d) => {
          push(site.kpis[kpi]?.[d] ?? "-");
        });
        if (i < displayKPIs.length - 1) push("");
      });

      push(getSiteStatus ? getSiteStatus(site) : "-");
      push(site.priority ?? "-");
      push(site.domain ?? "-");
      push(site.topologyPower ?? "-");

      rows.push(row.join("\t"));
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

  /* ===============================
     🧠 Cell handlers
     =============================== */
  const cellHandlers = (r, c, extraClass = "") => ({
    onMouseDown: () => {
      setSelectionMode(true);
      setDragging(true);
      setStart({ r, c });
      setEnd({ r, c });
    },
    onMouseEnter: () => {
      if (dragging) setEnd({ r, c });
    },
    onMouseUp: () => setDragging(false),
    className: `
      border px-3 select-none
      ${extraClass}
      ${isSelected(r, c)
        ? "ring-2 ring-red-500 ring-inset bg-red-500/20"
        : ""
      }
    `,
  });

  return (
    <div className="overflow-auto mx-4 border border-gray-700 rounded">
      <table className="min-w-max border-collapse text-sm">
        <thead>
          {/* ===== KPI GROUP HEADERS ===== */}
          <tr className="bg-gray-800">
            <th rowSpan={2} className="border px-3">#</th>
            <th rowSpan={2} className="border px-3">Site Code</th>
            <th rowSpan={2} className="border px-3">Site Name</th>

            {displayKPIs.map((kpi, i) => (
              <React.Fragment key={kpi}>
                <th colSpan={datesByKPI[kpi].length} className="border px-3">
                  {kpi}
                </th>
                {i < displayKPIs.length - 1 && (
                  <th className="border-r-4 border-gray-900 bg-gray-900 w-3"></th>
                )}
              </React.Fragment>
            ))}

            <th rowSpan={2} className="border px-3">Status</th>
            <th rowSpan={2} className="border px-3">Priority</th>
            <th rowSpan={2} className="border px-3">Domain</th>
            <th rowSpan={2} className="border px-3">Topology Power</th>
          </tr>

          <tr className="bg-gray-700">
            {displayKPIs.map((kpi, i) => (
              <React.Fragment key={kpi}>
                {datesByKPI[kpi].map((d) => (
                  <th key={`${kpi}-${d}`} className="border px-3">
                    {d}
                  </th>
                ))}
                {i < displayKPIs.length - 1 && (
                  <th className="border-r-4 border-gray-900 bg-gray-900 w-3"></th>
                )}
              </React.Fragment>
            ))}
          </tr>
        </thead>

        <tbody>
          {sites.map((site, rIdx) => {
            let cIdx = 0;

            return (
              <tr key={site.siteCode} className="hover:bg-gray-800">
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
                  <React.Fragment key={`${site.siteCode}-${kpi}`}>
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
                        const col = cIdx++;
                        return (
                          <td
                            key={`${site.siteCode}-${kpi}-${d}`}
                            {...cellHandlers(
                              rIdx,
                              col,
                              `text-center ${selectionMode ? "cursor-crosshair" : "cursor-pointer"
                              } ${getCellColor(kpi, v)}`
                            )}
                            onClick={() =>
                              !dragging && (setSelectedSite(site), setSelectedDay(d))
                            }
                          >
                            {v}
                          </td>
                        );
                      })
                    )}

                    {/* vertical separator */}
                    {i < displayKPIs.length - 1 && (
                      <td {...cellHandlers(rIdx, cIdx++, "bg-gray-900")}></td>
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
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default KPITable;
