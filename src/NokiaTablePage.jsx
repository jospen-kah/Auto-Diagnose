import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Filters from "./Components/filter.jsx";
import KPITable from "./Components/KpiTable.jsx";
import SiteAnalysisModal from "./Components/SiteAnalysisModal.jsx";
import siteMap from "./utils/sites_full.json";
import { getSitePriority } from "./utils/sitePriority";
import { getDomainAndPriority } from "./utils/domain";


const STORAGE_META_KEY = "NOKIA_TABLE_META"; // Only store metadata

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

  // Load data from router state or fallback metadata
  useEffect(() => {
    if (location.state?.data) {
      setRawData(location.state.data);
      // Only save metadata, not the full dataset
      localStorage.setItem(
        STORAGE_META_KEY,
        JSON.stringify({ date: new Date().toLocaleString() })
      );
    } else {
      // Cannot retrieve full data from localStorage anymore
      alert(
        "No Nokia data found. Please upload files again."
      );
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

  const kpiTypes = ["2G", "3G", "4G", "Voltage", "Alarm"];

  const datesByKPI = {};
  kpiTypes.forEach((kpi) => {
    const rows = rawData[kpi] || [];
    datesByKPI[kpi] =
      kpi === "Alarm"
        ? ["Alarm"]
        : [...new Set(rows.map((r) => r.beginTime))].slice(-7);
  });

  const groupedBySite = {};
  Object.keys(rawData).forEach((kpi) => {
    rawData[kpi].forEach(({ siteCode, siteName, beginTime, kpiValue }) => {
      if (!siteCode) return;

      groupedBySite[siteCode] ??= { siteCode, siteName, kpis: {} };
      groupedBySite[siteCode].kpis[kpi] ??= kpi === "Alarm" ? null : {};
      if (kpi === "Alarm") groupedBySite[siteCode].kpis[kpi] = kpiValue;
      else groupedBySite[siteCode].kpis[kpi][beginTime] = kpiValue ?? "-";

      const site = groupedBySite[siteCode];
      site.priority = getSitePriority(site, datesByKPI);
      site.domain = getDomainAndPriority(site, datesByKPI).domain;

      const info = siteMap.find((s) => s.siteCode === siteCode) || {};
      site.topologyPower = info.topologyPower || "-";
    });
  });

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
        groupedBySite={Object.values(groupedBySite)}
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
