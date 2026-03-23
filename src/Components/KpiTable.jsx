import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

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

    // ✅ PACKET LOSS COLORING
    if (kpi === "Packet Loss") {
      const num = Number(value);
      if (isNaN(num)) return "";
      return num <= 0.5
        ? "bg-green-500 text-white" // <= 0.5%
        : "bg-orange-500 text-white";
    }

    return "";
  };

  // Normalize domain values for both UI and exports
  const normalizeDomain = (domain) => {
    if (domain == null) return "-";
    const s = String(domain).trim();
    if (!s || s === "-") return "-";
    if (/^n\s*\/\s*a$/i.test(s) || /^na$/i.test(s)) return "RAN";
    if (/^tx$/i.test(s)) return "BO TX";
    return s;
  };



  const exportToExcel = async () => {
    const defaultFileName = "KPI_Report.xlsx";
    const suggested = window.prompt(
      "Enter the file name to export (you can omit the .xlsx extension):",
      "KPI_Report"
    );
    const rawName = (suggested ?? "").trim();
    const safeName = rawName
      ? rawName.replace(/[\\/:*?"<>|]/g, "_")
      : defaultFileName.replace(/\.xlsx$/i, "");
    const fileName = safeName.toLowerCase().endsWith(".xlsx")
      ? safeName
      : `${safeName}.xlsx`;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("KPI Report");

    /* ===== HEADER ===== */
    const header = [];
    header.push("#", "Site Code", "Site Name");

    displayKPIs.forEach((kpi, kpiIdx) => {
      if (kpi === "Alarm") {
        header.push("Alarm");
      } else {
        (datesByKPI[kpi] || []).forEach((d) => header.push(`${kpi} ${d}`));
      }

      // Gap column after each KPI group (except last)
      if (kpiIdx < displayKPIs.length - 1) header.push("");
    });

    header.push("Status", "Priority", "Domain", "Topology Power", "Techno Impacted");

    worksheet.columns = header.map((h) => ({ width: h === "" ? 4 : 18 }));

    worksheet.addRow(header);
    const headerRow = worksheet.getRow(1);
    headerRow.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.alignment = { horizontal: "center", vertical: "middle" };
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1F2937" },
      };
    });

    const clsToFill = (cls) => {
      if (!cls) return null;
      if (cls.includes("bg-green-500")) return { argb: "FF16A34A", font: { argb: "FFFFFFFF" } };
      if (cls.includes("bg-yellow-400")) return { argb: "FFF59E0B", font: { argb: "FF000000" } };
      if (cls.includes("bg-orange-500")) return { argb: "FFFB923C", font: { argb: "FFFFFFFF" } };
      if (cls.includes("bg-red-600")) return { argb: "FFDC2626", font: { argb: "FFFFFFFF" } };
      return null;
    };

    const baseFont = { name: "Calibri", size: 11 };

    visibleSites.forEach((site, rIdx) => {
      const rowNumber = rIdx + 2; // +1 for header row

      let col = 1;

      // #, Site Code, Site Name
      worksheet.getCell(rowNumber, col++).value = rIdx + 1;
      const siteCodeCell = worksheet.getCell(rowNumber, col++);
      siteCodeCell.value = site.siteCode;
      const nameCell = worksheet.getCell(rowNumber, col++);
      nameCell.value = site.siteName;

      // Styling basics for first columns
      worksheet.getCell(rowNumber, 1).alignment = { horizontal: "center", vertical: "middle" };
      worksheet.getCell(rowNumber, 2).alignment = { horizontal: "center", vertical: "middle" };
      nameCell.alignment = { horizontal: "left", vertical: "middle" };
      siteCodeCell.font = { ...baseFont, color: { argb: "FF3B82F6" } };
      nameCell.font = { ...baseFont, color: { argb: "FF3B82F6" } };

      // KPIs
      displayKPIs.forEach((kpi, kpiIdx) => {
        if (kpi === "Alarm") {
          const cell = worksheet.getCell(rowNumber, col++);
          cell.value = site.kpis.Alarm ?? "-";
          cell.alignment = { horizontal: "center", vertical: "middle" };
          cell.font = { ...baseFont, bold: true, color: { argb: "FFFFFFFF" } };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDC2626" } };
        } else {
          datesByKPI[kpi]?.forEach((d) => {
            const rawValue = site.kpis?.[kpi]?.[d] ?? "-";
            const cell = worksheet.getCell(rowNumber, col++);

            // Determine display value + Excel numeric typing
            let valueToWrite = rawValue;
            let numFmt = undefined;

            if (kpi === "Packet Loss" && rawValue !== "-" && rawValue != null) {
              let parsed = null;
              if (typeof rawValue === "string" && rawValue.trim().endsWith("%")) {
                const n = parseFloat(rawValue.replace("%", "").trim());
                if (!isNaN(n)) parsed = n / 100;
              } else if (!isNaN(Number(rawValue))) {
                const n = Number(rawValue);
                parsed = Math.abs(n) <= 1 ? n : n / 100;
              }

              if (parsed !== null) {
                valueToWrite = parsed;
                numFmt = "0.00%";
              }
            } else if (typeof rawValue === "string" && rawValue !== "-" && !isNaN(Number(rawValue))) {
              valueToWrite = Number(rawValue);
            }

            cell.value = valueToWrite;
            cell.alignment = { horizontal: "center", vertical: "middle" };
            cell.font = { ...baseFont };
            if (numFmt) cell.numFmt = numFmt;

            const cls = getCellColor(kpi, rawValue);
            const fill = clsToFill(cls);
            if (fill) {
              cell.fill = { type: "pattern", pattern: "solid", fgColor: fill };
              cell.font = { ...baseFont, color: fill.font };
            }
          });
        }

        // Gap column after each KPI group (except last)
        if (kpiIdx < displayKPIs.length - 1) {
          const spacerCell = worksheet.getCell(rowNumber, col++);
          spacerCell.value = "";
          spacerCell.alignment = { horizontal: "center", vertical: "middle" };
          spacerCell.font = { ...baseFont };
        }
      });

      // Other columns
      const status = getSiteStatus ? getSiteStatus(site) : "-";
      worksheet.getCell(rowNumber, col++).value = status;
      worksheet.getCell(rowNumber, col++).value = site.priority ?? "-";
      worksheet.getCell(rowNumber, col++).value = normalizeDomain(site.domain);
      worksheet.getCell(rowNumber, col++).value = site.topologyPower ?? "-";
      worksheet.getCell(rowNumber, col++).value = getTechnoImpacted(site);

      // Align trailing columns
      for (let c = 4; c < header.length + 1; c++) {
        const cell = worksheet.getCell(rowNumber, c);
        if (!cell.alignment) cell.alignment = { horizontal: "center", vertical: "middle" };
      }
    });

    // Borders for the whole table (including spacer columns)
    const lastRow = visibleSites.length + 1; // + header
    const lastCol = header.length;
    const borderColor = { argb: "FF374151" };
    const thin = { style: "thin", color: borderColor };
    for (let r = 1; r <= lastRow; r++) {
      for (let c = 1; c <= lastCol; c++) {
        const cell = worksheet.getCell(r, c);
        cell.border = { top: thin, left: thin, bottom: thin, right: thin };
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer], { type: "application/octet-stream" }), fileName);
  };

  const exportToCSV = () => {
    const wb = XLSX.utils.book_new();
    const wsData = [];
    const header = [
      "#",
      "Site Code",
      "Site Name",
      ...displayKPIs.flatMap((k) =>
        k === "Alarm" ? ["Alarm"] : datesByKPI[k]?.map((d) => `${k} ${d}`) || []
      ),
      "Status",
      "Priority",
      "Domain",
      "Topology Power",
      "Techno Impacted",
    ];
    wsData.push(header);

    visibleSites.forEach((site, rIdx) => {
      const row = [rIdx + 1, site.siteCode, site.siteName];
      displayKPIs.forEach((kpi) => {
        if (kpi === "Alarm") row.push(site.kpis.Alarm ?? "-");
        else datesByKPI[kpi]?.forEach((d) => row.push(site.kpis?.[kpi]?.[d] ?? "-"));
      });
      row.push(
        getSiteStatus ? getSiteStatus(site) : "-",
        site.priority ?? "-",
        normalizeDomain(site.domain),
        site.topologyPower ?? "-",
        getTechnoImpacted(site)
      );
      wsData.push(row);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "KPI_Report.csv");
  };

  /* ===============================
     📊 Format Packet Loss for Display
  =============================== */
  const formatPacketLoss = (value) => {
    if (value === "-" || value == null) return "-";
    
    let numValue = Number(value);
    if (isNaN(numValue)) return String(value);
    
    // If value already looks like a percent (e.g., "12.5%" or 12.5), just display with %
    if (typeof value === "string" && value.trim().endsWith("%")) {
      return value.trim();
    }
    
    // If it's a small decimal (like 0.125), assume it's a fraction and display as is with %
    // Otherwise display as-is with %
    return `${numValue}%`;
  };

  const copySelection = () => {
    if (!start || !end) return;

    const minR = Math.min(start.r, end.r);
    const maxR = Math.max(start.r, end.r);
    const minC = Math.min(start.c, end.c);
    const maxC = Math.max(start.c, end.c);

    const rows = [];

    for (let r = minR; r <= maxR; r++) {
      const site = visibleSites[r];
      if (!site) continue;
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
        if (kpi === "Alarm") {
          fullRow.push(site.kpis?.Alarm ?? "-");
        } else {
          datesByKPI[kpi]?.forEach((d) => {
            fullRow.push(site.kpis?.[kpi]?.[d] ?? "-");
          });
        }

        // separator column
        if (i < displayKPIs.length - 1) {
          fullRow.push("");
        }
      });

      // Other columns
      fullRow.push(getSiteStatus ? getSiteStatus(site) : "-");
      fullRow.push(site.priority ?? "-");
      fullRow.push(normalizeDomain(site.domain));
      fullRow.push(site.topologyPower ?? "-");
      fullRow.push(getTechnoImpacted(site));

      // ✅ slice EXACT selected columns
      rows.push(fullRow.slice(minC + 1, maxC + 2).join("\t"));
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

  const isSelected = (r, c) => {
    if (!start || !end) return false;
    const minR = Math.min(start.r, end.r);
    const maxR = Math.max(start.r, end.r);
    const minC = Math.min(start.c, end.c);
    const maxC = Math.max(start.c, end.c);
    return r >= minR && r <= maxR && c >= minC && c <= maxC;
  };

  const cellHandlers = (r, c, extra = "") => ({
    onMouseDown: () => {
      setSelectionMode(true);
      setDragging(true);
      setStart({ r, c });
      setEnd({ r, c });
    },
    onMouseEnter: () => dragging && setEnd({ r, c }),
    onMouseUp: () => setDragging(false),
    className: `border px-3 select-none ${extra} ${isSelected(r, c) ? "ring-2 ring-red-500 ring-inset bg-red-500/20" : ""
      }`,
  });

  /* ===============================
     ✅ BUTTON ACTIONS
  =============================== */
  const showSelectedOnly = () => {
    const selected = Object.keys(tickedSites).filter((k) => tickedSites[k]);
    if (!selected.length) return;
    setVisibleSites(allSites.filter((s) => selected.includes(s.siteCode)));
  };

  const removeSelected = () => {
    const selected = Object.keys(tickedSites).filter((k) => tickedSites[k]);
    if (!selected.length) return;
    setVisibleSites((prev) => prev.filter((s) => !selected.includes(s.siteCode)));
  };

  const clearFilter = () => {
    setVisibleSites(allSites);
    setTickedSites({});
  };

  const toggleSelectAll = (e) => {
    const checked = e.target.checked;
    const newTicks = {};
    allSites.forEach((s) => {
      newTicks[s.siteCode] = checked;
    });
    setTickedSites(newTicks);
  };

  /* ===============================
     🔎 Tech impacted helper (shared)
  =============================== */
  const getTechnoImpacted = (site) => {
    const techs = ["2G", "3G", "4G"];
    const impacted = [];

    techs.forEach((tech) => {
      const dates = datesByKPI[tech];
      if (!dates || !dates.length) return;

      const lastDate = dates[dates.length - 1];
      const raw = site.kpis?.[tech]?.[lastDate];
      const value = raw === "-" || raw == null || raw === "NaN" ? NaN : Number(raw);

      // Include 0 as degraded (e.g., 100/100/0 => degraded on 0 tech)
      if (!Number.isNaN(value) && value >= 0 && value < 97) impacted.push(tech);
    });

    return impacted.join(", ") || "-";
  };

  /* Duplicate exportToExcel removed — use the styled exportToExcel implemented earlier in this file */

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
          className="px-4 py-2 bg-red-600 text-white rounded"
          onClick={removeSelected}
        >
          Remove Selected
        </button>

        <button
          className="px-4 py-2 bg-gray-600 text-white rounded"
          onClick={clearFilter}
        >
          Clear
        </button>
      </div>

      <div className="overflow-auto mx-4 border border-gray-700 rounded">
        <div className="flex justify-end mb-2 px-4 gap-2">
          <button
            onClick={exportToExcel}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Export to Excel (styled)
          </button>
          <button
            onClick={exportToCSV}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Export CSV
          </button>
        </div>

        <table className="min-w-max border-collapse text-sm">
          <thead>
            <tr className="bg-gray-800">
              <th rowSpan={2} className="border px-2 text-center">
                <input
                  type="checkbox"
                  checked={
                    Object.keys(tickedSites).length === allSites.length &&
                    allSites.every((s) => tickedSites[s.siteCode])
                  }
                  onChange={toggleSelectAll}
                />
              </th>
              <th rowSpan={2} className="border px-3">
                #
              </th>
              <th rowSpan={2} className="border px-3">
                Site Code
              </th>
              <th rowSpan={2} className="border px-3">
                Site Name
              </th>

              {displayKPIs.map((kpi, i) => (
                <React.Fragment key={kpi}>
                  <th colSpan={datesByKPI[kpi].length} className="border px-3">
                    {kpi}
                  </th>
                  {i < displayKPIs.length - 1 && <th className="bg-gray-900 w-3"></th>}
                </React.Fragment>
              ))}

              <th rowSpan={2} className="border px-3">
                Status
              </th>
              <th rowSpan={2} className="border px-3">
                Priority
              </th>
              <th rowSpan={2} className="border px-3">
                Domain
              </th>
              <th rowSpan={2} className="border px-3">
                Topology Power
              </th>
              <th rowSpan={2} className="border px-3">
                Techno Impacted
              </th>
            </tr>

            <tr className="bg-gray-700">
              {displayKPIs.map((kpi, i) => (
                <React.Fragment key={kpi}>
                  {datesByKPI[kpi].map((d) => (
                    <th key={d} className="border px-3">
                      {d}
                    </th>
                  ))}
                  {i < displayKPIs.length - 1 && <th className="bg-gray-900 w-3"></th>}
                </React.Fragment>
              ))}
            </tr>
          </thead>

          <tbody>
            {visibleSites.map((site, rIdx) => {
              let cIdx = 0;

              

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
        const displayValue = kpi === "Packet Loss" ? formatPacketLoss(v) : v;
        return (
          <td
            key={d}
            {...cellHandlers(
              rIdx,
              cIdx++,
              `text-center ${getCellColor(kpi, v)}`
            )}
            onClick={() => {
              if (!dragging) {
                setSelectedSite(site);
                setSelectedDay(d);
              }
            }}
          >
            {displayValue}
          </td>
        );
      })
    )}

    {i < displayKPIs.length - 1 && (
      <td
        {...cellHandlers(
          rIdx,
          cIdx++,
          "bg-gray-900 pointer-events-none"
        )}
      />
    )}
  </React.Fragment>
))}
                  <td {...cellHandlers(rIdx, cIdx++)}>
                    {getSiteStatus ? getSiteStatus(site) : "-"}
                  </td>
                  <td {...cellHandlers(rIdx, cIdx++)}>{site.priority ?? "-"}</td>
                  <td {...cellHandlers(rIdx, cIdx++)}>{normalizeDomain(site.domain)}</td>
                  <td {...cellHandlers(rIdx, cIdx++)}>{site.topologyPower ?? "-"}</td>
                  <td {...cellHandlers(rIdx, cIdx++)}>{getTechnoImpacted(site)}</td>
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
