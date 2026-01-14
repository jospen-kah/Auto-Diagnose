// src/components/KpiTable.jsx
import React from "react";

const KPITable = ({
  kpiTypes,
  datesByKPI,
  groupedBySite,
  getSiteStatus,
  setSelectedSite,
  setSelectedDay,
  showAlarms = true, // default Huawei behavior
}) => {
  // Function to determine cell color based on KPI value
  const getCellColor = (kpi, value) => {
    if (value === undefined || value === null) return "";
    if (["2G", "3G", "4G"].includes(kpi)) {
      if (value > 97) return "bg-green-500 text-white";
      if (value >= 50) return "bg-yellow-400 text-black";
      return "bg-orange-500 text-white";
    }
    if (kpi === "Voltage")
      return value < 45000 ? "bg-orange-500 text-white" : "bg-green-500 text-white";
    if (kpi === "Packet Loss")
      return value < 1 ? "bg-green-500 text-white" : "bg-orange-500 text-white";
    return "";
  };

  // Determine the KPI types to display (exclude alarms if showAlarms is false)
  const displayKPIs = showAlarms ? kpiTypes : kpiTypes.filter(kpi => kpi !== "Alarm");

  return (
    <div className="overflow-auto mx-4 border border-gray-700 rounded">
      <table className="min-w-max border-collapse">
        <thead>
          {/* First row: KPI headers */}
          <tr className="bg-gray-800">
            <th rowSpan={2} className="border px-3">#</th>
            <th rowSpan={2} className="border px-3">Site Code</th>
            <th rowSpan={2} className="border px-3">Site Name</th>

            {displayKPIs.map((kpi, i) => (
              <React.Fragment key={kpi}>
                <th colSpan={datesByKPI[kpi].length} className="border">{kpi}</th>
                {/* Spacer column after each KPI except the last */}
                {i < displayKPIs.length - 1 && <th className="bg-gray-900 w-3"></th>}
              </React.Fragment>
            ))}

            <th rowSpan={2} className="border px-3">Status</th>
            <th rowSpan={2} className="border px-3">Priority</th>
            <th rowSpan={2} className="border px-3">Domain</th>
            <th rowSpan={2} className="border px-3">Topology Power</th>
          </tr>

          {/* Second row: Dates for each KPI */}
          <tr className="bg-gray-700">
            {displayKPIs.map((kpi, i) => (
              <React.Fragment key={kpi}>
                {datesByKPI[kpi].map((d) => (
                  <th key={`${kpi}-${d}`} className="border px-3">{d}</th>
                ))}
                {i < displayKPIs.length - 1 && <th className="bg-gray-900"></th>}
              </React.Fragment>
            ))}
          </tr>
        </thead>

        <tbody>
          {Object.entries(groupedBySite).map(([code, site], idx) => {
            const priority = site.priority || "-";
            const domain = site.domain || "-";
            const topologyPower = site.topologyPower || "-";

            return (
              <tr key={code} className="hover:bg-gray-800">
                <td className="border px-3">{idx + 1}</td>
                <td
                  className="border px-3 cursor-pointer text-blue-400 hover:underline"
                  onClick={() => { setSelectedSite(site); setSelectedDay(null); }}
                >
                  {site.siteCode}
                </td>
                <td
                  className="border px-3 cursor-pointer text-blue-400 hover:underline"
                  onClick={() => { setSelectedSite(site); setSelectedDay(null); }}
                >
                  {site.siteName}
                </td>

                {/* KPI values */}
                {displayKPIs.map((kpi, i) => (
                  <React.Fragment key={kpi}>
                    {datesByKPI[kpi].map((d) => {
                      const v = site.kpis[kpi]?.[d] ?? "-";
                      return (
                        <td
                          key={`${kpi}-${d}`}
                          className={`border px-3 text-center ${getCellColor(kpi, v)}`}
                          onClick={() => { setSelectedSite(site); setSelectedDay(d); }}
                        >
                          {kpi === "Packet Loss" && v !== "-" ? `${v}` : v}
                        </td>
                      );
                    })}
                    {/* Spacer column */}
                    {i < displayKPIs.length - 1 && <td className="bg-gray-900"></td>}
                  </React.Fragment>
                ))}

                <td className="border px-3">{getSiteStatus(site)}</td>
                <td className="border px-3">{priority}</td>
                <td className="border px-3">{domain}</td>
                <td className="border px-3">{topologyPower}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default KPITable;
