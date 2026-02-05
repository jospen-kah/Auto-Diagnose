  // src/HuaweiTablePage.jsx
  import React, { useEffect, useState } from "react";
  import { useLocation, useNavigate } from "react-router-dom";
  import { getSitePriority } from "./utils/sitePriority.js";
  import { getDomainAndPriority } from "./utils/domain.js";
  import siteMap from "./utils/sites_full.json";
  import Filters from "./Components/filter.jsx";
  import KPITable from "./Components/KpiTable.jsx";
  import SiteAnalysisModal from "./Components/SiteAnalysisModal.jsx";

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
      (rawData[kpi] || []).forEach(({ siteCode, siteName, beginTime, kpiValue }) => {
        if (!siteCode) return;

        groupedBySite[siteCode] ??= { siteCode, siteName, kpis: {} };

        // ✅ FIX: Alarm is NOT an object
        if (kpi === "Alarm") {
          groupedBySite[siteCode].kpis["Alarm"] = kpiValue ?? "-";
        } else {
          groupedBySite[siteCode].kpis[kpi] ??= {};

          if (kpi === "Voltage" && kpiValue != null) {
            groupedBySite[siteCode].kpis[kpi][beginTime] = kpiValue * 1000;
          } else if (kpi === "Packet Loss" && kpiValue != null) {
            groupedBySite[siteCode].kpis[kpi][beginTime] = kpiValue;
          } else {
            groupedBySite[siteCode].kpis[kpi][beginTime] = kpiValue ?? "-";
          }
        }

        // ================= SITE METADATA =================
        const site = groupedBySite[siteCode];

        site.priority = getSitePriority(site, datesByKPI);

        const { domain } = getDomainAndPriority(site, datesByKPI);
        site.domain = domain;

        const siteInfo = siteMap.find((s) => s.siteCode === siteCode) || {};
        site.topologyPower = siteInfo.topologyPower || "-";

        site.comment =
          domain === "RAN"
            ? "BO Analysis needed"
            : domain === "Power"
            ? "Verify the alimentation chain"
            : domain === "TX"
            ? "verifier l'etat de congestion du lien portant le site; verifier si le site n'est pas impacté par un probleme d energie sur le site porteur; verifier l'etat des canaux et des alarmes sur la chaine de transmission"
            : "-";
      });
    });

    /* ================= STATUS LOGIC ================= */
    const getSiteStatus = (site, day = null) => {
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

    /* ================= FILTERED SITES ================= */
    const filteredSites = Object.values(groupedBySite).filter((site) => {
      const status = getSiteStatus(site);

      if (statusFilter !== "ALL" && status !== statusFilter) return false;
      if (priorityFilter !== "ALL" && site.priority !== priorityFilter) return false;
      if (domainFilter !== "ALL" && site.domain !== domainFilter) return false;

      const searchText = search.toLowerCase();
      if (
        searchText &&
        !(
          site.siteCode.toLowerCase().includes(searchText) ||
          site.siteName.toLowerCase().includes(searchText)
        )
      )
        return false;

      return true;
    });

    return (
      <div className="w-screen h-screen bg-gray-900 text-white flex flex-col">
        <h2 className="text-2xl text-blue-400 text-center py-4">
          Huawei KPI Performance Report
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
        />

        {selectedSite && (
          <SiteAnalysisModal
            selectedSite={selectedSite}
            selectedDay={selectedDay}
            setSelectedSite={setSelectedSite}
            setSelectedDay={setSelectedDay}
            datesByKPI={datesByKPI}
            siteMap={siteMap}
            vendor="HUAWEI"
          />
        )}
      </div>
    );
  };

  export default HuaweiTablePage;
