import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";

const ZTETablePage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const data = location.state?.data || [];

  const [search, setSearch] = useState("");
  const [selectedSite, setSelectedSite] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);

  if (!data.length) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <p>No data available.</p>
          <button
            onClick={() => navigate("/zte")}
            className="mt-4 px-4 py-2 bg-purple-500 rounded"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const kpiTypes = ["2G", "3G", "4G", "Voltage", "Packet Loss"];

  // Collect all unique dates per KPI (preserve order)
  const datesByKPI = {};
  kpiTypes.forEach((kpi) => {
    const kpiData = data.filter((d) => d.kpiType === kpi);
    const dates = [];
    kpiData.forEach(d => {
      if (!dates.includes(d.beginTime)) dates.push(d.beginTime);
    });
    datesByKPI[kpi] = dates;
  });

  // Group data by site
  const groupedBySite = data.reduce((acc, item) => {
    if (!acc[item.siteCode]) acc[item.siteCode] = { siteName: item.siteName, kpis: {} };
    if (!acc[item.siteCode].kpis[item.kpiType]) acc[item.siteCode].kpis[item.kpiType] = {};

    let value = item.kpiValue;
    if (item.kpiType === "2G" || item.kpiType === "3G") value *= 100;
    if (item.kpiType === "Voltage") value *= 1000;

    acc[item.siteCode].kpis[item.kpiType][item.beginTime] = value;
    return acc;
  }, {});

  const filteredSites = Object.entries(groupedBySite).filter(
    ([siteCode, siteData]) =>
      siteCode.toLowerCase().includes(search.toLowerCase()) ||
      siteData.siteName.toLowerCase().includes(search.toLowerCase())
  );

  const getCellColor = (kpi, value) => {
    if (value === undefined || value === null) return "";
    if (["2G", "3G", "4G"].includes(kpi)) {
      if (value > 97) return "bg-green-500 text-white";
      if (value >= 50) return "bg-yellow-400 text-black";
      return "bg-orange-500 text-white";
    }
    if (kpi === "Voltage") {
      return value < 45000 ? "bg-orange-500 text-white" : "bg-green-500 text-white";
    }
    if (kpi === "Packet Loss") {
      return value < 1 ? "bg-green-500 text-white" : "bg-orange-500 text-white";
    }
    return "";
  };

  const getSiteAnalysis = (siteData, day = null) => {
    const result = {};
    result["Site Name"] = siteData.siteName;
    result["Site Code"] = siteData.siteCode;

    let degradedFlag = false;
    let allZero = true;
    let allOk = true;

    kpiTypes.forEach((kpi) => {
      const targetDay = day || datesByKPI[kpi][datesByKPI[kpi].length - 1];
      const value = siteData.kpis[kpi]?.[targetDay];

      if (["2G", "3G", "4G"].includes(kpi)) {
        if (value === undefined || value === null) {
          result[kpi] = "No value displayed";
          degradedFlag = true;
          allOk = false;
          allZero = false;
        } else if (value === 0) {
          result[kpi] = "Degraded";
          allOk = false;
        } else if (value < 97) {
          result[kpi] = "Degraded";
          degradedFlag = true;
          allOk = false;
          allZero = false;
        } else {
          result[kpi] = "Ok";
          allZero = false;
        }
      } else if (kpi === "Voltage") {
        if (value === undefined || value === null) {
          result[kpi] = "No value displayed";
          degradedFlag = true;
        } else {
          result[kpi] = value < 45000 ? "Power issues" : "No Power Issues";
          if (value < 45000) degradedFlag = true;
        }
      } else if (kpi === "Packet Loss") {
        if (value === undefined || value === null) {
          result[kpi] = "No value displayed";
          degradedFlag = true;
        } else {
          result[kpi] =
            value >= 2 ? `Packet Loss (${value}%)` : `No Packet Loss (${value}%)`;
          if (value >= 2) degradedFlag = true;
        }
      }
    });

    // Determine site status
    const lastDay2G = siteData.kpis["2G"]?.[datesByKPI["2G"].slice(-1)[0]] ?? 0;
    const lastDay3G = siteData.kpis["3G"]?.[datesByKPI["3G"].slice(-1)[0]] ?? 0;
    const lastDay4G = siteData.kpis["4G"]?.[datesByKPI["4G"].slice(-1)[0]] ?? 0;

    if (allZero || (lastDay2G === 0 && lastDay3G === 0 && lastDay4G === 0)) {
      result["Site Status"] = "Down";
    } else if (lastDay2G > 97 && lastDay3G > 97 && lastDay4G > 97) {
      result["Site Status"] = "Ok";
    } else {
      result["Site Status"] = "Degraded";
    }

    return result;
  };

  const handleDownload = (type) => {
    const wb = XLSX.utils.book_new();
    const wsData = [
      ["#", "Site Code", "Site Name", ...kpiTypes.flatMap(kpi => datesByKPI[kpi])],
    ];

    filteredSites.forEach(([siteCode, siteData], idx) => {
      const row = [idx + 1, siteCode, siteData.siteName];
      kpiTypes.forEach((kpi) => {
        datesByKPI[kpi].forEach((date) => {
          let value = siteData.kpis[kpi]?.[date] ?? "-";
          if (kpi === "Packet Loss" && value !== "-") value = `${value}%`;
          row.push(value);
        });
      });
      wsData.push(row);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "ZTE KPI");
    if (type === "excel") XLSX.writeFile(wb, "zte_kpi.xlsx");
    else XLSX.writeFile(wb, "zte_kpi.csv");
  };

  return (
    <div className="w-screen h-screen bg-gray-900 text-white flex flex-col">
      

      {/* Search & Download */}
      <div className="px-4 mb-4 flex flex-wrap items-center gap-4 pt-4 ">
        <input
          type="text"
          placeholder="Search by Site Code or Site Name"
          className="px-4 py-2 rounded w-full sm:w-64 text-white border-2"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          onClick={() => handleDownload("csv")}
          className="px-4 py-2 bg-purple-500 rounded hover:bg-purple-600"
        >
          Download CSV
        </button>
        <button
          onClick={() => handleDownload("excel")}
          className="px-4 py-2 bg-purple-500 rounded hover:bg-purple-600"
        >
          Download Excel
        </button>
      </div>

      {/* Scrollable table */}
      <div
        className={`grow overflow-auto border border-gray-700 rounded mx-4 transition-all duration-300 ${
          selectedSite ? "blur-sm pointer-events-none" : ""
        }`}
      >
        <table className="border-collapse border border-gray-700 min-w-max">
          <thead>
            <tr className="bg-gray-800">
              <th rowSpan={2} className="border px-4 py-2">#</th>
              <th rowSpan={2} className="border px-4 py-2">Site Code</th>
              <th rowSpan={2} className="border px-4 py-2">Site Name</th>
              {kpiTypes.map((kpi, idx) => (
                <React.Fragment key={kpi}>
                  <th colSpan={datesByKPI[kpi].length} className="border px-4 py-2 text-center">
                    {kpi}
                  </th>
                  {idx < kpiTypes.length - 1 && <th className="border px-4 py-2 bg-gray-900"></th>}
                </React.Fragment>
              ))}
            </tr>

            <tr className="bg-gray-700">
              {kpiTypes.map((kpi, idx) => (
                <React.Fragment key={`${kpi}-dates`}>
                  {datesByKPI[kpi].map((date) => (
                    <th key={`${kpi}-${date}`} className="border px-4 py-2">{date}</th>
                  ))}
                  {idx < kpiTypes.length - 1 && <th className="border px-4 py-2 bg-gray-900"></th>}
                </React.Fragment>
              ))}
            </tr>
          </thead>

          <tbody>
            {filteredSites.map(([siteCode, siteData], index) => (
              <tr
                key={siteCode}
                className="hover:bg-gray-800 transition cursor-pointer"
              >
                <td
                  className="border px-4 py-2 cursor-pointer"
                  onClick={() => { setSelectedSite({ siteCode, ...siteData }); setSelectedDay(null); }}
                >
                  {index + 1}
                </td>
                <td
                  className="border px-4 py-2 cursor-pointer"
                  onClick={() => { setSelectedSite({ siteCode, ...siteData }); setSelectedDay(null); }}
                >
                  {siteCode}
                </td>
                <td
                  className="border px-4 py-2 cursor-pointer"
                  onClick={() => { setSelectedSite({ siteCode, ...siteData }); setSelectedDay(null); }}
                >
                  {siteData.siteName}
                </td>

                {kpiTypes.map((kpi, idx) => (
                  <React.Fragment key={`${siteCode}-${kpi}`}>
                    {datesByKPI[kpi].map((date) => {
                      const value = siteData.kpis[kpi]?.[date];
                      return (
                        <td
                          key={`${siteCode}-${kpi}-${date}`}
                          className={`border px-4 py-2 text-center cursor-pointer ${getCellColor(kpi, value)}`}
                          onClick={() => { setSelectedSite({ siteCode, ...siteData }); setSelectedDay(date); }}
                        >
                          {kpi === "Packet Loss" && value !== undefined && value !== null ? `${value}%` : value ?? "-"}
                        </td>
                      );
                    })}
                    {idx < kpiTypes.length - 1 && <td className="border bg-gray-900"></td>}
                  </React.Fragment>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Site Analysis Modal */}
      {selectedSite && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => { setSelectedSite(null); setSelectedDay(null); }}
          />
          <div className="relative bg-gray-800 text-white p-6 rounded-lg max-w-md w-full shadow-lg z-10">
            <h3 className="text-xl font-bold mb-4">
              Site Analysis {selectedDay ? `(Day: ${selectedDay})` : "(Last Day)"}
            </h3>
            {Object.entries(getSiteAnalysis(selectedSite, selectedDay)).map(([key, value]) => (
              <p key={key} className="mb-1">
                <strong>{key}:</strong> {value}
              </p>
            ))}
            <div className="text-right mt-4">
              <button
                onClick={() => { setSelectedSite(null); setSelectedDay(null); }}
                className="px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ZTETablePage;