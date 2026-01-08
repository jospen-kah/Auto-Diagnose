import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getSitePriority } from "./utils/sitePriority";
import { getDomainAndPriority } from "./utils/domain";

const STORAGE_KEY = "HUAWEI_TABLE_DATA";

const HuaweiTablePage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [rawData, setRawData] = useState({});
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [domainFilter, setDomainFilter] = useState("ALL");

  const [selectedSite, setSelectedSite] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);

  /* ================= LOAD DATA ================= */
  useEffect(() => {
    if (location.state?.data) {
      setRawData(location.state.data);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(location.state.data));
      } catch {}
    } else {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setRawData(JSON.parse(saved));
    }
  }, [location.state]);

  if (!rawData || Object.keys(rawData).length === 0) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-gray-900 text-white">
        <button
          onClick={() => navigate("/huawei")}
          className="px-4 py-2 bg-blue-500 rounded"
        >
          Go Back
        </button>
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
    datesByKPI[kpi] = kpi === "Alarm" ? ["Alarm"] : dates.slice(-7);
  });

  /* ================= GROUP BY SITE ================= */
  const groupedBySite = {};
  Object.keys(rawData).forEach((kpi) => {
    rawData[kpi].forEach(({ siteCode, siteName, beginTime, kpiValue }) => {
      if (!siteCode) return;

      groupedBySite[siteCode] ??= { siteCode, siteName, kpis: {} };
      groupedBySite[siteCode].kpis[kpi] ??= kpi === "Alarm" ? null : {};

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

  /* ================= STATUS LOGIC ================= */
  const getSiteStatus = (site, day = null) => {
    const d2 = day || datesByKPI["2G"].slice(-1)[0];
    const d3 = day || datesByKPI["3G"].slice(-1)[0];
    const d4 = day || datesByKPI["4G"].slice(-1)[0];

    const v2 = site.kpis["2G"]?.[d2];
    const v3 = site.kpis["3G"]?.[d3];
    const v4 = site.kpis["4G"]?.[d4];

    const values = [v2, v3, v4].map((v) =>
      v === "-" || v == null ? 0 : Number(v)
    );

    if (values.every((v) => v === 0)) return "Down";
    if (values.some((v) => v < 97)) return "Degraded";
    return "Ok";
  };

  /* ================= FILTER ================= */
  const filteredSites = Object.entries(groupedBySite).filter(([_, site]) => {
    const status = getSiteStatus(site);
    const priority = getSitePriority(site, datesByKPI);
    const { domain } = getDomainAndPriority(site, datesByKPI);

    return (
      (search === "" ||
        site.siteCode.toLowerCase().includes(search.toLowerCase()) ||
        site.siteName.toLowerCase().includes(search.toLowerCase())) &&
      (statusFilter === "ALL" || status === statusFilter) &&
      (priorityFilter === "ALL" || priority === priorityFilter) &&
      (domainFilter === "ALL" || domain === domainFilter)
    );
  });

  /* ================= COLORS ================= */
  const getCellColor = (kpi, v) => {
    if (v === "-" || v == null) return "";
    const n = typeof v === "string" ? parseFloat(v) : v;

    if (["2G", "3G", "4G"].includes(kpi))
      return n < 97 ? "bg-orange-500" : "bg-green-500";

    if (kpi === "Voltage") return n < 45000 ? "bg-orange-500" : "bg-green-500";
    if (kpi === "Packet Loss") return n >= 2 ? "bg-orange-500" : "bg-green-500";
    if (kpi === "Alarm") return "bg-red-600";
    return "";
  };

  /* ================= CLEAR FILTERS ================= */
  const clearFilters = () => {
    setSearch("");
    setStatusFilter("ALL");
    setPriorityFilter("ALL");
    setDomainFilter("ALL");
  };

  /* ================= RENDER ================= */
  return (
    <div className="w-screen h-screen bg-gray-900 text-white flex flex-col">
      <h2 className="text-2xl text-blue-400 text-center py-4">
        Huawei KPI Performance Report
      </h2>

      {/* FILTERS */}
      <div className="flex gap-4 px-4 mb-3 flex-wrap items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 bg-gray-800 rounded"
          placeholder="Search site"
        />

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-gray-800 px-3 py-2 rounded">
          <option value="ALL">All Status</option>
          <option value="Ok">Ok</option>
          <option value="Degraded">Degraded</option>
          <option value="Down">Down</option>
        </select>

        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="bg-gray-800 px-3 py-2 rounded">
          <option value="ALL">All Priorities</option>
          <option value="P0">P0</option>
          <option value="P1">P1</option>
          <option value="P2">P2</option>
          <option value="OK">OK</option>
        </select>

        <select value={domainFilter} onChange={(e) => setDomainFilter(e.target.value)} className="bg-gray-800 px-3 py-2 rounded">
          <option value="ALL">All Domains</option>
          <option value="RAN">RAN</option>
          <option value="Power">Power</option>
          <option value="TX">TX</option>
        </select>

        <button
          onClick={clearFilters}
          className="px-4 py-2 bg-red-600 rounded hover:bg-red-700"
        >
          Clear Filters
        </button>
      </div>

      <div className="overflow-auto mx-4 border border-gray-700 rounded">
        <table className="min-w-max border-collapse">
          <thead>
            <tr className="bg-gray-800">
              <th rowSpan={2} className="border px-3">#</th>
              <th rowSpan={2} className="border px-3">Site Code</th>
              <th rowSpan={2} className="border px-3">Site Name</th>

              {kpiTypes.map((kpi, i) => (
                <React.Fragment key={kpi}>
                  <th colSpan={datesByKPI[kpi].length} className="border">{kpi}</th>
                  {i < kpiTypes.length - 1 && <th className="bg-gray-900 w-3"></th>}
                </React.Fragment>
              ))}

              <th rowSpan={2} className="border px-3">Status</th>
              <th rowSpan={2} className="border px-3">Priority</th>
              <th rowSpan={2} className="border px-3">Domain</th>
            </tr>

            <tr className="bg-gray-700">
              {kpiTypes.map((kpi, i) => (
                <React.Fragment key={kpi}>
                  {datesByKPI[kpi].map((d) => (
                    <th key={d} className="border px-3">{d}</th>
                  ))}
                  {i < kpiTypes.length - 1 && <th className="bg-gray-900"></th>}
                </React.Fragment>
              ))}
            </tr>
          </thead>

          <tbody>
            {filteredSites.map(([code, site], i) => {
              const sitePriority = getSitePriority(site, datesByKPI);
              const { domain } = getDomainAndPriority(site, datesByKPI);

              return (
                <tr key={code} className="hover:bg-gray-800">
                  <td className="border px-3">{i + 1}</td>

                  {/* SITE CODE CLICKABLE */}
                  <td
                    className="border px-3 cursor-pointer text-blue-400 hover:underline"
                    onClick={() => {
                      setSelectedSite(site);
                      setSelectedDay(null);
                    }}
                  >
                    {site.siteCode}
                  </td>

                  {/* SITE NAME CLICKABLE */}
                  <td
                    className="border px-3 cursor-pointer text-blue-400 hover:underline"
                    onClick={() => {
                      setSelectedSite(site);
                      setSelectedDay(null);
                    }}
                  >
                    {site.siteName}
                  </td>

                  {kpiTypes.map((kpi, idx) => (
                    <React.Fragment key={kpi}>
                      {datesByKPI[kpi].map((d) => {
                        const v = kpi === "Alarm" ? site.kpis[kpi] : site.kpis[kpi]?.[d] ?? "-";
                        return (
                          <td
                            key={d}
                            className={`border px-3 text-center ${getCellColor(kpi, v)}`}
                            onClick={() => {
                              setSelectedSite(site);
                              setSelectedDay(d);
                            }}
                          >
                            {v}
                          </td>
                        );
                      })}
                      {idx < kpiTypes.length - 1 && <td className="bg-gray-900"></td>}
                    </React.Fragment>
                  ))}

                  <td className="border px-3">{getSiteStatus(site)}</td>
                  <td className="border px-3">{sitePriority}</td>
                  <td className="border px-3">{domain}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ================= SITE ANALYSIS MODAL ================= */}
      {selectedSite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => {
              setSelectedSite(null);
              setSelectedDay(null);
            }}
          />

          <div className="relative bg-gray-800 p-6 rounded w-full max-w-md z-10">
            <h3 className="text-xl font-bold text-blue-400 mb-4">
              Site Analysis
            </h3>

            <p><strong>Site Code:</strong> {selectedSite.siteCode}</p>
            <p><strong>Site Name:</strong> {selectedSite.siteName}</p>
            <p className="mb-3"><strong>Date:</strong> {selectedDay || "Last Day"}</p>

            <hr className="border-gray-600 mb-3" />

            {/* RAN KPIs */}
            {["2G", "3G", "4G"].map((kpi) => {
              const day = selectedDay || datesByKPI[kpi].slice(-1)[0];
              const value = selectedSite.kpis[kpi]?.[day];
              const status =
                value == null || value === "-" ? "No Value" :
                value < 97 ? "Degraded" : "Ok";

              return (
                <p key={kpi}>
                  <strong>{kpi}:</strong> {value ?? "-"} →{" "}
                  <span className={status === "Ok" ? "text-green-400" : "text-orange-400"}>
                    {status}
                  </span>
                </p>
              );
            })}

            <hr className="border-gray-600 my-3" />

            {/* POWER */}
            {(() => {
              const day = selectedDay || datesByKPI["Voltage"].slice(-1)[0];
              const v = selectedSite.kpis["Voltage"]?.[day];
              const status =
                v == null || v === "-" ? "No Value" :
                v < 45000 ? "Power Issues" : "No Power Issues";

              return (
                <p>
                  <strong>Power:</strong> {v ?? "-"} →{" "}
                  <span className={status === "No Power Issues" ? "text-green-400" : "text-orange-400"}>
                    {status}
                  </span>
                </p>
              );
            })()}

            {/* PACKET LOSS */}
            {(() => {
              const day = selectedDay || datesByKPI["Packet Loss"].slice(-1)[0];
              const v = selectedSite.kpis["Packet Loss"]?.[day];
              const num = parseFloat((v || "").replace("%", ""));
              const status =
                isNaN(num) ? "No Value" :
                num >= 2 ? "Packet Loss" : "No Packet Loss";

              return (
                <p>
                  <strong>Packet Loss:</strong> {v ?? "-"} →{" "}
                  <span className={status === "No Packet Loss" ? "text-green-400" : "text-orange-400"}>
                    {status}
                  </span>
                </p>
              );
            })()}

            <hr className="border-gray-600 my-3" />

            <p>
              <strong>Overall Status:</strong>{" "}
              <span className="text-yellow-400 font-bold">
                {getSiteStatus(selectedSite, selectedDay)}
              </span>
            </p>

            <div className="text-right mt-4">
              <button
                className="px-4 py-2 bg-blue-500 rounded"
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
