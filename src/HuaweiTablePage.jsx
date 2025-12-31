import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const STORAGE_KEY = "HUAWEI_TABLE_DATA";

const HuaweiTablePage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [rawData, setRawData] = useState({});
  const [search, setSearch] = useState("");
  const [selectedSite, setSelectedSite] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);

  /* ================= LOAD DATA ================= */
  useEffect(() => {
    if (location.state?.data) {
      setRawData(location.state.data);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(location.state.data));
    } else {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setRawData(JSON.parse(saved));
    }
  }, [location.state]);

  if (!rawData || Object.keys(rawData).length === 0) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <p>No Huawei data available.</p>
          <button
            onClick={() => navigate("/huawei")}
            className="mt-4 px-4 py-2 bg-blue-500 rounded"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const kpiTypes = ["2G", "3G", "4G", "Voltage", "Packet Loss", "Alarm"];

  /* ================= DATES ================= */
  const datesByKPI = {};
  kpiTypes.forEach((kpi) => {
    const rows = rawData[kpi] || [];
    const dates = [];
    rows.forEach((r) => {
      if (!dates.includes(r.beginTime)) dates.push(r.beginTime);
    });
    datesByKPI[kpi] = kpi === "Alarm" ? dates.slice(-3) : dates.slice(-7);
  });

  /* ================= GROUP BY SITE ================= */
  const groupedBySite = {};
  Object.keys(rawData).forEach((kpi) => {
    rawData[kpi].forEach((row) => {
      const { siteCode, siteName, beginTime } = row;
      let value = row.kpiValue;

      if (!groupedBySite[siteCode]) {
        groupedBySite[siteCode] = { siteCode, siteName, kpis: {} };
      }
      if (!groupedBySite[siteCode].kpis[kpi]) {
        groupedBySite[siteCode].kpis[kpi] = {};
      }

      if (kpi === "Voltage" && value != null) value *= 1000;
      if (kpi === "Packet Loss" && value != null) value = `${value}%`;
      if (kpi === "Alarm") value = "-";

      groupedBySite[siteCode].kpis[kpi][beginTime] = value;
    });
  });

  const filteredSites = Object.entries(groupedBySite).filter(
    ([code, site]) =>
      code.toLowerCase().includes(search.toLowerCase()) ||
      site.siteName.toLowerCase().includes(search.toLowerCase())
  );

  /* ================= COLORS ================= */
  const getCellColor = (kpi, value) => {
    if (value === undefined || value === null || value === "-") return "";

    let num = value;
    if (typeof value === "string" && value.endsWith("%")) {
      num = parseFloat(value);
    }

    if (["2G", "3G", "4G"].includes(kpi)) {
      if (num === 0) return "bg-red-500 text-white";
      if (num > 97) return "bg-green-500 text-white";
      if (num >= 50) return "bg-yellow-400 text-black";
      return "bg-orange-500 text-white";
    }

    if (kpi === "Voltage") {
      return num < 45000 ? "bg-orange-500 text-white" : "bg-green-500 text-white";
    }

    if (kpi === "Packet Loss") {
      return num < 1 ? "bg-green-500 text-white" : "bg-orange-500 text-white";
    }

    return "";
  };

  /* ================= SITE ANALYSIS ================= */
  const getSiteAnalysis = (siteData, day = null) => {
    const result = {
      "Site Code": siteData.siteCode,
      "Site Name": siteData.siteName,
    };

    kpiTypes.forEach((kpi) => {
      const targetDay = day || datesByKPI[kpi].slice(-1)[0];
      const value = siteData.kpis[kpi]?.[targetDay];

      if (["2G", "3G", "4G"].includes(kpi)) {
        if (value === undefined || value === "-" || value === null) {
          result[kpi] = "No value displayed";
        } else if (value === 0 || value < 97) {
          result[kpi] = "Degraded";
        } else {
          result[kpi] = "Ok";
        }
      } else if (kpi === "Voltage") {
        result[kpi] =
          value === undefined || value === "-"
            ? "No value displayed"
            : value < 45000
            ? "Power Issues"
            : "No Power Issues";
      } else if (kpi === "Packet Loss") {
        const num = parseFloat((value || "").replace("%", ""));
        result[kpi] =
          isNaN(num) ? "No value displayed" : num >= 2 ? "Packet Loss" : "No Packet Loss";
      } else {
        result[kpi] = "-";
      }
    });

    return result;
  };

  /* ================= RENDER ================= */
  return (
    <div className="w-screen h-screen bg-gray-900 text-white flex flex-col">
      <h2 className="text-2xl font-bold text-blue-400 text-center pt-4">
        Huawei KPI Performance Report
      </h2>

      <div className="px-4 my-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search site code or name"
          className="px-4 py-2 border rounded text-white"
        />
      </div>

      <div
        className={`grow overflow-auto mx-4 border border-gray-700 rounded ${
          selectedSite ? "blur-sm pointer-events-none" : ""
        }`}
      >
        <table className="border-collapse min-w-max">
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
                  {idx < kpiTypes.length - 1 && (
                    <th className="border px-4 py-2 bg-gray-900"></th>
                  )}
                </React.Fragment>
              ))}
            </tr>

            <tr className="bg-gray-700">
              {kpiTypes.map((kpi, idx) => (
                <React.Fragment key={kpi}>
                  {datesByKPI[kpi].map((date) => (
                    <th key={date} className="border px-4 py-2">{date}</th>
                  ))}
                  {idx < kpiTypes.length - 1 && (
                    <th className="border px-4 py-2 bg-gray-900"></th>
                  )}
                </React.Fragment>
              ))}
            </tr>
          </thead>

          <tbody>
            {filteredSites.map(([code, site], i) => (
              <tr key={code} className="hover:bg-gray-800">
                <td className="border px-4 py-2">{i + 1}</td>
                <td
                  className="border px-4 py-2 cursor-pointer"
                  onClick={() => { setSelectedSite(site); setSelectedDay(null); }}
                >
                  {code}
                </td>
                <td
                  className="border px-4 py-2 cursor-pointer"
                  onClick={() => { setSelectedSite(site); setSelectedDay(null); }}
                >
                  {site.siteName}
                </td>

                {kpiTypes.map((kpi, idx) => (
                  <React.Fragment key={kpi}>
                    {datesByKPI[kpi].map((date) => {
                      const val = site.kpis[kpi]?.[date] ?? "-";
                      return (
                        <td
                          key={date}
                          className={`border px-4 py-2 text-center ${getCellColor(kpi, val)}`}
                          onClick={() => { setSelectedSite(site); setSelectedDay(date); }}
                        >
                          {val}
                        </td>
                      );
                    })}
                    {idx < kpiTypes.length - 1 && (
                      <td className="border bg-gray-900"></td>
                    )}
                  </React.Fragment>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {selectedSite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => { setSelectedSite(null); setSelectedDay(null); }}
          />
          <div className="bg-gray-800 p-6 rounded z-10 max-w-md w-full">
            <h3 className="text-xl font-bold mb-3">
              Site Analysis {selectedDay && `(Date: ${selectedDay})`}
            </h3>
            {Object.entries(getSiteAnalysis(selectedSite, selectedDay)).map(
              ([k, v]) => <p key={k}><strong>{k}:</strong> {v}</p>
            )}
            <div className="text-right mt-4">
              <button
                className="px-4 py-2 bg-blue-500 rounded"
                onClick={() => { setSelectedSite(null); setSelectedDay(null); }}
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

export default HuaweiTablePage;
