import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { getSitePriorityZTE } from "./utils/sitePriorityZTE";
import { getDomainAndPriorityZTE } from "./utils/domainZTE";

const STORAGE_KEY = "ZTE_TABLE_DATA";

const ZTETablePage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [rawData, setRawData] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedSite, setSelectedSite] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [domainFilter, setDomainFilter] = useState("ALL");

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

  if (!rawData || rawData.length === 0) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-gray-900 text-white">
        <button
          onClick={() => navigate("/zte")}
          className="px-4 py-2 bg-purple-500 rounded"
        >
          Go Back
        </button>
      </div>
    );
  }

  const kpiTypes = ["2G", "3G", "4G", "Voltage", "Packet Loss"];

  /* ================= COLLECT DATES ================= */
  const datesByKPI = {};
  kpiTypes.forEach((kpi) => {
    const dates = [];
    rawData
      .filter((d) => d.kpiType === kpi)
      .forEach((d) => {
        if (!dates.includes(d.beginTime)) dates.push(d.beginTime);
      });
    datesByKPI[kpi] = dates.slice(-7); // last 7 days
  });

  /* ================= GROUP DATA BY SITE ================= */
  const groupedBySite = rawData.reduce(
    (acc, { siteCode, siteName, kpiType, beginTime, kpiValue }) => {
      if (!siteCode) return acc;

      if (!acc[siteCode]) acc[siteCode] = { siteCode, siteName, kpis: {} };
      if (!acc[siteCode].kpis[kpiType]) acc[siteCode].kpis[kpiType] = {};

      let value = kpiValue ?? "-";

      // Multiply 2G and 3G by 100
      if ((kpiType === "2G" || kpiType === "3G") && value !== "-") {
        value = value * 100;
      }

      // Multiply Voltage by 1000 (same as before)
      if (kpiType === "Voltage" && value !== "-") {
        value = value * 1000;
      }

      acc[siteCode].kpis[kpiType][beginTime] = value;

      return acc;
    },
    {}
  );

  /* ================= SITE STATUS ================= */
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

  /* ================= FILTERED SITES ================= */
  const filteredSites = Object.entries(groupedBySite).filter(([_, site]) => {
    const status = getSiteStatus(site);
    const priority = getSitePriorityZTE(site, datesByKPI);
    const { domain } = getDomainAndPriorityZTE(site, datesByKPI);

    return (
      (search === "" ||
        site.siteCode.toLowerCase().includes(search.toLowerCase()) ||
        site.siteName.toLowerCase().includes(search.toLowerCase())) &&
      (statusFilter === "ALL" || status === statusFilter) &&
      (priorityFilter === "ALL" || priority === priorityFilter) &&
      (domainFilter === "ALL" || domain === domainFilter)
    );
  });

  /* ================= CELL COLOR ================= */
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

  /* ================= CLEAR FILTERS ================= */
  const clearFilters = () => {
    setSearch("");
    setStatusFilter("ALL");
    setPriorityFilter("ALL");
    setDomainFilter("ALL");
  };

  /* ================= DOWNLOAD ================= */
  const handleDownload = (type) => {
    const wb = XLSX.utils.book_new();
    const wsData = [
      ["#", "Site Code", "Site Name", ...kpiTypes.flatMap(kpi => datesByKPI[kpi]), "Status", "Priority", "Domain"],
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
      row.push(getSiteStatus(siteData));
      row.push(getSitePriorityZTE(siteData, datesByKPI));
      row.push(getDomainAndPriorityZTE(siteData, datesByKPI).domain);
      wsData.push(row);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "ZTE KPI");
    if (type === "excel") XLSX.writeFile(wb, "zte_kpi.xlsx");
    else XLSX.writeFile(wb, "zte_kpi.csv");
  };

  /* ================= RENDER ================= */
  return (
    <div className="w-screen h-screen bg-gray-900 text-white flex flex-col">
      <h2 className="text-2xl text-purple-400 text-center py-4">ZTE KPI Performance Report</h2>

      {/* FILTERS */}
      <div className="flex gap-4 px-4 mb-3 flex-wrap items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 bg-gray-800 rounded"
          placeholder="Search by Site"
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
        <button onClick={clearFilters} className="px-4 py-2 bg-red-600 rounded hover:bg-red-700">Clear Filters</button>
        <button onClick={() => handleDownload("csv")} className="px-4 py-2 bg-purple-500 rounded hover:bg-purple-600">Download CSV</button>
        <button onClick={() => handleDownload("excel")} className="px-4 py-2 bg-purple-500 rounded hover:bg-purple-600">Download Excel</button>
      </div>

      {/* TABLE */}
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
              const sitePriority = getSitePriorityZTE(site, datesByKPI);
              const { domain } = getDomainAndPriorityZTE(site, datesByKPI);

              return (
                <tr key={code} className="hover:bg-gray-800">
                  <td className="border px-3">{i + 1}</td>
                  <td className="border px-3 cursor-pointer text-purple-400 hover:underline" onClick={() => { setSelectedSite(site); setSelectedDay(null); }}>{site.siteCode}</td>
                  <td className="border px-3 cursor-pointer text-purple-400 hover:underline" onClick={() => { setSelectedSite(site); setSelectedDay(null); }}>{site.siteName}</td>
                  {kpiTypes.map((kpi, idx) => (
                    <React.Fragment key={kpi}>
                      {datesByKPI[kpi].map((d) => {
                        const v = site.kpis[kpi]?.[d] ?? "-";
                        return (
                          <td key={d} className={`border px-3 text-center ${getCellColor(kpi, v)}`} onClick={() => { setSelectedSite(site); setSelectedDay(d); }}>
                            {kpi === "Packet Loss" && v !== "-" ? `${v}%` : v}
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

      {/* SITE ANALYSIS MODAL */}
      {selectedSite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => { setSelectedSite(null); setSelectedDay(null); }} />
          <div className="relative bg-gray-800 p-6 rounded w-full max-w-md z-10">
            <h3 className="text-xl font-bold text-purple-400 mb-4">Site Analysis</h3>
            <p><strong>Site Code:</strong> {selectedSite.siteCode}</p>
            <p><strong>Site Name:</strong> {selectedSite.siteName}</p>
            <p className="mb-3"><strong>Date:</strong> {selectedDay || "Last Day"}</p>
            <hr className="border-gray-600 mb-3" />

            {/* RAN KPIs */}
            {["2G","3G","4G"].map((kpi) => {
              const day = selectedDay || datesByKPI[kpi].slice(-1)[0];
              const value = selectedSite.kpis[kpi]?.[day];
              const status = value == null || value === "-" ? "No Value" : value < 97 ? "Degraded" : "Ok";
              return <p key={kpi}><strong>{kpi}:</strong> {value ?? "-"} → <span className={status==="Ok"?"text-green-400":"text-orange-400"}>{status}</span></p>
            })}

            {/* Power */}
            {(() => {
              const day = selectedDay || datesByKPI["Voltage"].slice(-1)[0];
              const v = selectedSite.kpis["Voltage"]?.[day];
              const status = v == null || v === "-" ? "No Value" : v < 45000 ? "Power Issues" : "No Power Issues";
              return <p><strong>Power:</strong> {v ?? "-"} → <span className={status==="No Power Issues"?"text-green-400":"text-orange-400"}>{status}</span></p>;
            })()}

            {/* Packet Loss */}
            {(() => {
              const day = selectedDay || datesByKPI["Packet Loss"].slice(-1)[0];
              const v = selectedSite.kpis["Packet Loss"]?.[day];
              const num = parseFloat(v || 0);
              const status = isNaN(num) ? "No Value" : num >= 2 ? "Packet Loss" : "No Packet Loss";
              return <p><strong>Packet Loss:</strong> {v ?? "-"} → <span className={status==="No Packet Loss"?"text-green-400":"text-orange-400"}>{status}</span></p>;
            })()}

            <hr className="border-gray-600 my-3" />
            <p><strong>Overall Status:</strong> <span className="text-yellow-400 font-bold">{getSiteStatus(selectedSite, selectedDay)}</span></p>

            <div className="text-right mt-4">
              <button className="px-4 py-2 bg-purple-500 rounded" onClick={() => { setSelectedSite(null); setSelectedDay(null); }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ZTETablePage;
