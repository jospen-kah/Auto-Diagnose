import React, { useEffect, useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getSitePriorityZTE } from "./utils/sitePriorityZTE.js";
import { getDomainAndPriorityZTE } from "./utils/domainZTE.js";
import siteMap from "./utils/sites_full.json";
import KPITable from "./components/KpiTable.jsx";
import SiteAnalysisModal from "./components/SiteAnalysisModal.jsx";
import Filters from "./components/filter.jsx";

const ZTETablePage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [rawData, setRawData] = useState([]);
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
    }
  }, [location.state]);

  const isEmpty = !rawData || rawData.length === 0;

  const kpiTypes = ["2G", "3G", "4G", "Voltage", "Packet Loss"];

  /* ================= DATES ================= */
  const datesByKPI = useMemo(() => {
    if (isEmpty) return {};
    const obj = {};
    kpiTypes.forEach((kpi) => {
      const dates = [];
      rawData
        .filter((r) => r.kpiType === kpi)
        .forEach((r) => {
          if (r.beginTime && !dates.includes(r.beginTime)) {
            dates.push(r.beginTime);
          }
        });
      obj[kpi] = dates.slice(-7);
    });
    return obj;
  }, [rawData, isEmpty]);

  /* ================= GROUP BY SITE ================= */
  const groupedBySite = useMemo(() => {
    if (isEmpty) return {};

    const acc = {};
    rawData.forEach(({ siteCode, siteName, kpiType, beginTime, kpiValue }) => {
      if (!siteCode) return;

      acc[siteCode] ??= { siteCode, siteName, kpis: {} };
      acc[siteCode].kpis[kpiType] ??= {};

      let value = kpiValue ?? "-";
      if ((kpiType === "2G" || kpiType === "3G") && value !== "-") value *= 100;
      if (kpiType === "Voltage" && value !== "-") value *= 1000;

      acc[siteCode].kpis[kpiType][beginTime] = value;

      const siteInfo = siteMap.find((s) => s.siteCode === siteCode) || {};
      acc[siteCode].topologyPower = siteInfo.topologyPower || "-";

      acc[siteCode].priority = getSitePriorityZTE(acc[siteCode], datesByKPI);
      acc[siteCode].domain =
        getDomainAndPriorityZTE(acc[siteCode], datesByKPI).domain;
    });

    return acc;
  }, [rawData, datesByKPI, isEmpty]);

  /* ================= STATUS ================= */
  const getSiteStatus = (site, day = null) => {
    if (!site) return "Down";

    const d2 = day || datesByKPI["2G"]?.slice(-1)[0];
    const d3 = day || datesByKPI["3G"]?.slice(-1)[0];
    const d4 = day || datesByKPI["4G"]?.slice(-1)[0];

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

  /* ================= FILTERS ================= */
  const filteredSites = useMemo(() => {
    if (isEmpty) return [];

    return Object.values(groupedBySite).filter((site) => {
      const status = getSiteStatus(site);

      if (statusFilter !== "ALL" && status !== statusFilter) return false;
      if (priorityFilter !== "ALL" && site.priority !== priorityFilter)
        return false;
      if (domainFilter !== "ALL" && site.domain !== domainFilter) return false;

      const s = search.toLowerCase();
      if (
        s &&
        !(
          site.siteCode.toLowerCase().includes(s) ||
          site.siteName.toLowerCase().includes(s)
        )
      )
        return false;

      return true;
    });
  }, [
    groupedBySite,
    search,
    statusFilter,
    priorityFilter,
    domainFilter,
    isEmpty,
  ]);

  /* ================= RENDER ================= */
  if (isEmpty) {
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

  return (
    <div className="w-screen h-screen bg-gray-900 text-white flex flex-col">
      <h2 className="text-2xl text-purple-400 text-center py-4">
        ZTE KPI Performance Report
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
        getSiteStatus={getSiteStatus}
        setSelectedSite={setSelectedSite}
        setSelectedDay={setSelectedDay}
        showAlarms={false}
      />

      {selectedSite && (
        <SiteAnalysisModal
          selectedSite={selectedSite}
          selectedDay={selectedDay}
          setSelectedSite={setSelectedSite}
          setSelectedDay={setSelectedDay}
          datesByKPI={datesByKPI}
          siteMap={siteMap}
          vendor="ZTE"
        />
      )}
    </div>
  );
};

export default ZTETablePage;
