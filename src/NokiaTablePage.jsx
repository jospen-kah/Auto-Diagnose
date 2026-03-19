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
const getSiteStatus = (site, datesByKPI) => {
  const d2 = (datesByKPI["2G"] || []).slice(-1)[0];
  const d3 = (datesByKPI["3G"] || []).slice(-1)[0];
  const d4 = (datesByKPI["4G"] || []).slice(-1)[0];

  const raw = [
    site.kpis["2G"]?.[d2],
    site.kpis["3G"]?.[d3],
    site.kpis["4G"]?.[d4],
  ];

  const values = raw.map(v => {
    if (v === "-" || v == null || v === "NaN" || v === "NAN") return NaN;
    return Number(v);
  });

  const hasNaN = values.some(v => Number.isNaN(v));
  const allZeroOrDash = values.every(v => isNaN(v) || v === 0);

  // ✅ DOWN
  if (hasNaN && allZeroOrDash) return "Down";       // NaN + 0/- scenario
  if (allZeroOrDash) return "Down";                // all 0 or -
  if (hasNaN && !values.some(v => !Number.isNaN(v) && v > 0)) return "Down"; // only NaN + 0/-

  // ✅ DEGRADED
  // At least one tech >0 and <97 OR at least one tech >0 and rest are 0/- (worst case)
  const someBetween0And97 = values.some(v => !isNaN(v) && v > 0 && v < 97);
  const someAbove0RestZeroOrDash = values.some(v => !isNaN(v) && v > 0) && values.some(v => v === 0 || isNaN(v));

  if (someBetween0And97 || someAbove0RestZeroOrDash) return "Degraded";

  // ✅ OK
  // At least one tech >97 and the rest are "-" or >97
  const someAbove97 = values.some(v => !isNaN(v) && v > 97);
  const restAreDashOrAbove97 = values.every(v => isNaN(v) || v > 97);

  if (someAbove97 && restAreDashOrAbove97) return "Ok";

  // fallback (should not happen)
  return "Degraded";
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
    : [...new Set(rows.map(r => r.beginTime))]
        .sort((a, b) => {
          const [am, ad, ay] = a.split(".");
          const [bm, bd, by] = b.split(".");
          return new Date(`${ay}-${am}-${ad}`) - new Date(`${by}-${bm}-${bd}`);
        })
        .slice(-7);
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

      // ✅ METADATA (NO STATUS HERE)
      site.priority = getSitePriority(site, datesByKPI);
      site.domain = getDomainAndPriority(site, datesByKPI).domain;

      const info = siteMap.find((s) => s.siteCode === siteCode) || {};
      site.topologyPower = info.topologyPower || "-";
    });
  });

  /* ================= FINAL STATUS PASS (IMPORTANT) ================= */
  Object.values(groupedBySite).forEach((site) => {
    site.status = getSiteStatus(site, datesByKPI);
  });

  const normalizeDomainForFilter = (domain) => {
    if (domain == null) return "-";
    const s = String(domain).trim();
    if (!s || s === "-") return "-";
    if (/^n\s*\/\s*a$/i.test(s) || /^na$/i.test(s)) return "RAN";
    return s;
  };

  /* ================= FILTERING ================= */
  const filteredSites = Object.values(groupedBySite).filter((site) => {
    const searchMatch =
      site.siteCode.toLowerCase().includes(search.toLowerCase()) ||
      site.siteName.toLowerCase().includes(search.toLowerCase());

    const statusMatch =
      statusFilter === "ALL" ||
      String(site.status).toLowerCase() === String(statusFilter).toLowerCase();

    const priorityMatch =
      priorityFilter === "ALL" ||
      String(site.priority ?? "-").toLowerCase() ===
        String(priorityFilter).toLowerCase();

    const domainMatch =
      domainFilter === "ALL" || normalizeDomainForFilter(site.domain) === domainFilter;

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
          sitesByCode={groupedBySite}
          vendor="NOKIA"
        />
      )}
    </div>
  );
};

export default NokiaTablePage;
