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
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(location.state.data));
      } catch (error) {
        console.warn(
          "⚠️ Huawei data too large for localStorage. Data will not persist on refresh.",
          error
        );
      }
    } else {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          setRawData(JSON.parse(saved));
        } catch (e) {
          console.error("❌ Failed to parse stored Huawei data", e);
          localStorage.removeItem(STORAGE_KEY);
        }
      }
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
      if (kpi !== "Alarm" && r.beginTime && !dates.includes(r.beginTime)) {
        dates.push(r.beginTime);
      }
    });

    // Alarm has ONE column
    datesByKPI[kpi] = kpi === "Alarm" ? ["Alarm"] : dates.slice(-7);
  });

  /* ================= GROUP BY SITE ================= */
  const groupedBySite = {};

  Object.keys(rawData).forEach((kpi) => {
    rawData[kpi].forEach((row) => {
      const { siteCode, siteName, beginTime, kpiValue } = row;

      if (!siteCode) return;

      if (!groupedBySite[siteCode]) {
        groupedBySite[siteCode] = {
          siteCode,
          siteName,
          kpis: {},
        };
      }

      if (!groupedBySite[siteCode].kpis[kpi]) {
        groupedBySite[siteCode].kpis[kpi] = kpi === "Alarm" ? null : {};
      }

      if (kpi === "Voltage" && kpiValue != null) {
        groupedBySite[siteCode].kpis[kpi][beginTime] = kpiValue * 1000;
      } else if (kpi === "Packet Loss" && kpiValue != null) {
        groupedBySite[siteCode].kpis[kpi][beginTime] = `${kpiValue}%`;
      } else if (kpi === "Alarm") {
        groupedBySite[siteCode].kpis[kpi] = kpiValue;
      } else {
        groupedBySite[siteCode].kpis[kpi][beginTime] = kpiValue ?? "-";
      }
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

    if (kpi === "Alarm") {
      return "bg-red-600 text-white";
    }

    return "";
  };

  /* ================= SITE ANALYSIS ================= */
  const getSiteAnalysis = (siteData, day = null) => {
    const result = {
      "Site Code": siteData.siteCode,
      "Site Name": siteData.siteName,
    };

    let allZero = true;

    kpiTypes.forEach((kpi) => {
      if (kpi === "Alarm") {
        result[kpi] = siteData.kpis[kpi] || "No Alarm Data";
        return;
      }

      const targetDay = day || datesByKPI[kpi].slice(-1)[0];
      const value = siteData.kpis[kpi]?.[targetDay];

      if (["2G", "3G", "4G"].includes(kpi)) {
        if (value === undefined || value === "-" || value === null) {
          result[kpi] = "No value displayed";
        } else if (value === 0) {
          result[kpi] = "Degraded";
        } else if (value < 97) {
          result[kpi] = "Degraded";
          allZero = false;
        } else {
          result[kpi] = "Ok";
          allZero = false;
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
      }
    });

    const last2G = siteData.kpis["2G"]?.[datesByKPI["2G"].slice(-1)[0]] ?? 0;
    const last3G = siteData.kpis["3G"]?.[datesByKPI["3G"].slice(-1)[0]] ?? 0;
    const last4G = siteData.kpis["4G"]?.[datesByKPI["4G"].slice(-1)[0]] ?? 0;

    if (allZero || (last2G === 0 && last3G === 0 && last4G === 0)) {
      result["Site Status"] = "Down";
    } else if (last2G > 97 && last3G > 97 && last4G > 97) {
      result["Site Status"] = "Ok";
    } else {
      result["Site Status"] = "Degraded";
    }

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

      <div className="grow overflow-auto mx-4 border border-gray-700 rounded">
        <table className="border-collapse min-w-max">
          {/* ================= TABLE HEAD ================= */}
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
                <React.Fragment key={kpi}>
                  {datesByKPI[kpi].map((date) => (
                    <th key={`${kpi}-${date}`} className="border px-4 py-2">{date}</th>
                  ))}
                  {idx < kpiTypes.length - 1 && <th className="border px-4 py-2 bg-gray-900"></th>}
                </React.Fragment>
              ))}
            </tr>
          </thead>

          {/* ================= TABLE BODY ================= */}
          <tbody>
            {filteredSites.map(([code, site], i) => (
              <tr key={code} className="hover:bg-gray-800">
                <td className="border px-4 py-2">{i + 1}</td>
                <td
                  className="border px-4 py-2 cursor-pointer text-white "
                  onClick={() => {
                    setSelectedSite(site);
                    setSelectedDay(null); // null = last day
                  }}
                >
                  {code}
                </td>
                <td
                  className="border px-4 py-2 cursor-pointer text-white "
                  onClick={() => {
                    setSelectedSite(site);
                    setSelectedDay(null); // null = last day
                  }}
                >
                  {site.siteName}
                </td>

                {kpiTypes.map((kpi, idx) => (
                  <React.Fragment key={kpi}>
                    {datesByKPI[kpi].map((date) => {
                      const val = kpi === "Alarm" ? site.kpis[kpi] ?? "-" : site.kpis[kpi]?.[date] ?? "-";

                      return (
                        <td
                          key={`${code}-${kpi}-${date}`}
                          className={`border px-4 py-2 text-center ${getCellColor(kpi, val)} cursor-pointer`}
                          onClick={() => {
                            setSelectedSite(site);
                            setSelectedDay(date); // specific day
                          }}
                        >
                          {val}
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

      {/* ================= MODAL ================= */}
      {selectedSite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 backdrop-blur-sm bg-black/60"
            onClick={() => {
              setSelectedSite(null);
              setSelectedDay(null);
            }}
          />
          <div className="bg-gray-800 p-6 rounded z-10 max-w-md w-full shadow-lg">
            <h3 className="text-xl font-bold mb-2">
              Site Analysis: {selectedSite.siteName}
            </h3>
            <p className="mb-3 text-sm text-gray-300">
              Day: {selectedDay ?? "Last available day"}
            </p>
            {Object.entries(getSiteAnalysis(selectedSite, selectedDay)).map(([k, v]) => (
              <p key={k} className="mb-1">
                <strong>{k}:</strong> {v}
              </p>
            ))}
            <div className="text-right mt-4">
              <button
                className="px-4 py-2 bg-blue-500 rounded hover:bg-blue-600"
                onClick={() => {
                  setSelectedSite(null);
                  setSelectedDay(null);
                }}
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
