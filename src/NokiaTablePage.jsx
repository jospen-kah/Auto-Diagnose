import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Filters from "./Components/filter.jsx";
import KPITable from "./Components/KpiTable.jsx";
import SiteAnalysisModal from "./Components/SiteAnalysisModal.jsx";
import siteMap from "./utils/sites_full.json";
import { getSitePriority } from "./utils/sitePriority";
import { getDomainAndPriority } from "./utils/domain";

const STORAGE_META_KEY = "NOKIA_TABLE_META";

/* =====================================================
   ✅ NOKIA STATUS — SAME LOGIC AS HUAWEI (NO ALARMS)
   ===================================================== */
const getSiteStatus = (site, datesByKPI, day = null) => {
  const d2 = day || (datesByKPI["2G"] || []).slice(-1)[0];
  const d3 = day || (datesByKPI["3G"] || []).slice(-1)[0];
  const d4 = day || (datesByKPI["4G"] || []).slice(-1)[0];

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

const NokiaTablePage = () => {
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
      localStorage.setItem(
        STORAGE_META_KEY,
        JSON.stringify({ date: new Date().toLocaleString() })
      );
    } else {
      alert("No Nokia data found. Please upload files again.");
      navigate("/nokia");
    }
  }, [location.state, navigate]);

  if (!Object.keys(rawData).length) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <button
          onClick={() => navigate("/nokia")}
          className="px-6 py-2 bg-red-500 text-white rounded"
        >
          Go Back
        </button>
      </div>
    );
  }

  /* ================= KPI SETUP ================= */
  const kpiTypes = ["2G", "3G", "4G", "Voltage", "Alarm"];

  const datesByKPI = {};
  kpiTypes.forEach((kpi) => {
    const rows = rawData[kpi] || [];
    datesByKPI[kpi] =
      kpi === "Alarm"
        ? ["Alarm"]
        : [...new Set(rows.map((r) => r.beginTime))].slice(-7);
  });

  /* ================= GROUP BY SITE ================= */
  const groupedBySite = {};

  Object.keys(rawData).forEach((kpi) => {
    rawData[kpi].forEach(({ siteCode, siteName, beginTime, kpiValue }) => {
      if (!siteCode) return;

      groupedBySite[siteCode] ??= { siteCode, siteName, kpis: {} };
      groupedBySite[siteCode].kpis[kpi] ??= kpi === "Alarm" ? null : {};

      if (kpi === "Alarm") {
        groupedBySite[siteCode].kpis[kpi] = kpiValue ?? "-";
      } else {
        groupedBySite[siteCode].kpis[kpi][beginTime] = kpiValue ?? "-";
      }

      const site = groupedBySite[siteCode];

      // ✅ SAME METADATA LOGIC AS HUAWEI
      site.priority = getSitePriority(site, datesByKPI);
      site.domain = getDomainAndPriority(site, datesByKPI).domain;
      site.status = getSiteStatus(site, datesByKPI);

      const info = siteMap.find((s) => s.siteCode === siteCode) || {};
      site.topologyPower = info.topologyPower || "-";
    });
  });

  /* ================= FILTERING ================= */
  const filteredSites = Object.values(groupedBySite).filter((site) => {
    const searchMatch =
      site.siteCode.toLowerCase().includes(search.toLowerCase()) ||
      site.siteName.toLowerCase().includes(search.toLowerCase());

    const statusMatch =
      statusFilter === "ALL" || site.status === statusFilter;

    const priorityMatch =
      priorityFilter === "ALL" || site.priority === priorityFilter;

    const domainMatch =
      domainFilter === "ALL" || site.domain === domainFilter;

    return searchMatch && statusMatch && priorityMatch && domainMatch;
  });

  /* ================= UI ================= */
  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col">
      <h2 className="text-2xl text-red-400 text-center py-4">
        Nokia KPI Performance Report
      </h2>

      <Filters
        search={search}
        setSearch={setSearch}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        priorityFilter={priorityFilter}
        setPriorityFilter={setPriorityFilter}
        domainFilter={domainFilter}
        setDomainFilter={setDomainFilter}
      />

      <KPITable
        kpiTypes={kpiTypes}
        datesByKPI={datesByKPI}
        groupedBySite={filteredSites}
        getSiteStatus={(site, day) =>
          getSiteStatus(site, datesByKPI, day)
        }
        setSelectedSite={setSelectedSite}
        setSelectedDay={setSelectedDay}
      />

      {selectedSite && (
        <SiteAnalysisModal
          selectedSite={selectedSite}
          selectedDay={selectedDay}
          setSelectedSite={setSelectedSite}
          setSelectedDay={setSelectedDay}
          datesByKPI={datesByKPI}
          siteMap={siteMap}
          vendor="NOKIA"
        />
      )}
    </div>
  );
};

export default NokiaTablePage;
