import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CircleMarker, MapContainer, TileLayer, Tooltip } from "react-leaflet";
import siteMap from "./utils/sites_full.json";

const TECHS = ["2G", "3G", "4G"];
const REGIONS = ["NRD", "SUD", "CTR", "OST", "NRO", "SUO", "ADM", "LIT", "EST", "EXN"];

const parseNum = (v) => {
  if (v === "-" || v == null || v === "NaN" || v === "NAN") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
};

const getTechStatus = (value) => {
  if (value === "-" || value == null || value === "NaN" || value === "NAN") return "No Value";
  const n = Number(value);
  if (Number.isNaN(n)) return "No Value";
  if (n < 5) return "Down";
  if (n < 97) return "Degraded";
  return "Ok";
};

const getOverallStatus = (site, datesByKPI) => {
  const vals = TECHS.map((k) => {
    const d = datesByKPI[k]?.slice(-1)[0];
    return d ? site.kpis?.[k]?.[d] : null;
  });

  const parsed = vals.map((v) => {
    if (v === "-" || v == null || v === "NaN" || v === "NAN") return null;
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  });

  if (parsed.every((v) => v == null)) return "No Value";
  if (parsed.every((v) => v == null || v < 5)) return "Down";
  if (parsed.some((v) => v != null && v < 97)) return "Degraded";
  return "Ok";
};

const Bar = ({ value, total, color = "bg-blue-500" }) => {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div className="w-full bg-gray-700/30 rounded h-3">
      <div className={`h-3 rounded ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
};

const RegionBarChart = ({ title, data = [] }) => {
  const width = 1000;
  const height = 280;
  const padLeft = 45;
  const padRight = 20;
  const padTop = 25;
  const padBottom = 55;

  const isLight = document?.documentElement?.classList?.contains("theme-light");
  const axisColor = isLight ? "#334155" : "#94a3b8";
  const gridColor = isLight ? "#94a3b8" : "#64748b";
  const tickColor = isLight ? "#020617" : "#ffffff";
  const labelColor = isLight ? "#020617" : "#ffffff";
  const tickBg = isLight ? "rgba(241,245,249,0.95)" : "rgba(15,23,42,0.85)";

  const maxVal = Math.max(1, ...data.map((d) => d.value));
  const innerW = width - padLeft - padRight;
  const innerH = height - padTop - padBottom;
  const slot = innerW / Math.max(1, data.length);
  const barW = Math.max(12, slot * 0.6);

  const y = (v) => padTop + innerH - (v * innerH) / maxVal;
  const x = (i) => padLeft + i * slot + (slot - barW) / 2;

  return (
    <div className="bg-gray-800 rounded p-4 mb-5">
      <h3 className="text-lg text-yellow-400 mb-3">{title}</h3>
      <div className="overflow-x-auto">
        <svg width={width} height={height} className="w-full min-w-[900px]">
          <line x1={padLeft} y1={padTop + innerH} x2={width - padRight} y2={padTop + innerH} stroke={axisColor} />
          <line x1={padLeft} y1={padTop} x2={padLeft} y2={padTop + innerH} stroke={axisColor} />

          {[0, 25, 50, 75, 100].map((p) => {
            const v = (p / 100) * maxVal;
            return (
              <g key={`g-${p}`}>
                <line
                  x1={padLeft}
                  y1={y(v)}
                  x2={width - padRight}
                  y2={y(v)}
                  stroke={gridColor}
                  strokeDasharray="2 3"
                />
                <rect
                  x={padLeft - 28}
                  y={y(v) - 8}
                  width={18}
                  height={14}
                  rx={3}
                  fill={tickBg}
                />
                <text
                  x={padLeft - 19}
                  y={y(v) + 2}
                  fill={tickColor}
                  fontSize="10"
                  fontWeight="800"
                  textAnchor="middle"
                >
                  {Math.round(v)}
                </text>
              </g>
            );
          })}

          {data.map((d, i) => (
            <g key={`bar-${d.label}`}>
              <rect
                x={x(i)}
                y={y(d.value)}
                width={barW}
                height={padTop + innerH - y(d.value)}
                fill="#3b82f6"
                rx="3"
              />
              <text
                x={x(i) + barW / 2}
                y={y(d.value) - 6}
                fill={labelColor}
                fontSize="10"
                fontWeight="700"
                textAnchor="middle"
              >
                {d.value}
              </text>
              <text
                x={x(i) + barW / 2}
                y={padTop + innerH + 16}
                fill={labelColor}
                fontSize="12"
                fontWeight="800"
                textAnchor="middle"
              >
                {d.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
};

const CameroonLeafletMap = ({ title, data = [], sites = [], datesByKPI = {} }) => {
  const [query, setQuery] = useState("");
  const [selectedSiteCode, setSelectedSiteCode] = useState("");
  const [mapInstance, setMapInstance] = useState(null);

  // Approximate regional anchor points (capital cities / region centers)
  const regionPoints = {
    NRD: [9.3, 13.4],  // Garoua
    SUD: [2.9, 11.15], // Ebolowa
    CTR: [3.87, 11.52],// Yaounde
    OST: [5.48, 10.42],// Bafoussam
    NRO: [5.96, 10.16],// Bamenda
    SUO: [4.15, 9.24], // Buea
    ADM: [7.32, 13.58],// Ngaoundere
    LIT: [4.05, 9.70], // Douala
    EST: [4.58, 13.68],// Bertoua
    EXN: [10.59, 14.32],// Maroua
  };

  const statusColor = (status) => {
    if (status === "Down") return "#ef4444";
    if (status === "Degraded") return "#f59e0b";
    return "#22c55e";
  };

  const hashString = (s) => {
    let h = 0;
    const str = String(s || "");
    for (let i = 0; i < str.length; i++) {
      h = (h * 31 + str.charCodeAt(i)) >>> 0;
    }
    return h;
  };

  const latestByTech = {
    "2G": datesByKPI["2G"]?.slice(-1)[0],
    "3G": datesByKPI["3G"]?.slice(-1)[0],
    "4G": datesByKPI["4G"]?.slice(-1)[0],
  };

  const markers = useMemo(() => {
    return sites
      .map((site) => {
        const region = String(site.siteCode || "").slice(0, 3).toUpperCase();
        const base = regionPoints[region];
        if (!base) return null;

        const rawVals = TECHS.map((k) => {
          const d = latestByTech[k];
          return d ? site.kpis?.[k]?.[d] : null;
        });
        const vals = rawVals
          .map((v) => {
            if (v === "-" || v == null || v === "NaN" || v === "NAN") return null;
            const n = Number(v);
            return Number.isNaN(n) ? null : n;
          })
          .filter((v) => v != null);
        const status =
          vals.length === 0
            ? "Down"
            : vals.every((v) => v < 5)
            ? "Down"
            : vals.some((v) => v < 97)
            ? "Degraded"
            : "Ok";

        // Deterministic jitter around region center to "locate" each site without GPS.
        const h = hashString(site.siteCode);
        const latJ = (((h % 1000) / 1000) - 0.5) * 0.5;
        const lngJ = ((((Math.floor(h / 1000)) % 1000) / 1000) - 0.5) * 0.5;

        const getTechAnalysis = (tech) => {
          const d = latestByTech[tech];
          const raw = d ? site.kpis?.[tech]?.[d] : null;
          const n = parseNum(raw);
          const st =
            n == null ? "No Value" : n < 97 ? "Degraded" : "Ok";
          return { day: d || "-", value: raw ?? "-", status: st };
        };

        const a2 = getTechAnalysis("2G");
        const a3 = getTechAnalysis("3G");
        const a4 = getTechAnalysis("4G");

        const vDay = datesByKPI["Voltage"]?.slice(-1)[0];
        const vRaw = vDay ? site.kpis?.Voltage?.[vDay] : null;
        const vNum = parseNum(vRaw);
        const powerStatus =
          vNum == null ? "No Value" : vNum > 0 && vNum < 45000 ? "Power Issues" : "No Power Issues";

        const pDay = datesByKPI["Packet Loss"]?.slice(-1)[0];
        const pRaw = pDay ? site.kpis?.["Packet Loss"]?.[pDay] : null;
        const pNum = parseNum(pRaw);
        const plStatus =
          pNum == null ? "No Value" : pNum < 0.5 ? "No Packet Loss" : "Packet Loss Available";

        return {
          siteCode: site.siteCode,
          siteName: site.siteName,
          status,
          region,
          domain: site.domain || "-",
          priority: site.priority || "-",
          comment: site.comment || "-",
          analysis: {
            "2G": a2,
            "3G": a3,
            "4G": a4,
            power: { day: vDay || "-", value: vRaw ?? "-", status: powerStatus },
            packetLoss: { day: pDay || "-", value: pRaw ?? "-", status: plStatus },
          },
          pos: [base[0] + latJ, base[1] + lngJ],
        };
      })
      .filter(Boolean);
  }, [sites, datesByKPI]);

  const filteredMarkers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return markers;
    return markers.filter(
      (m) =>
        String(m.siteCode).toLowerCase().includes(q) ||
        String(m.siteName).toLowerCase().includes(q)
    );
  }, [markers, query]);

  const selectedMarker = useMemo(
    () => markers.find((m) => m.siteCode === selectedSiteCode),
    [markers, selectedSiteCode]
  );

  const handleSelectSite = (code) => {
    setSelectedSiteCode(code);
    const marker = markers.find((m) => m.siteCode === code);
    if (marker && mapInstance) {
      mapInstance.setView(marker.pos, 8);
    }
  };

  return (
    <div className="bg-gray-800 rounded p-4 mb-5">
      <h3 className="text-lg text-yellow-400 mb-3">{title}</h3>
      <div className="grid md:grid-cols-2 gap-3 mb-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search site code or site name..."
          className="px-3 py-2 rounded bg-gray-700 border border-gray-600"
        />
        <select
          value={selectedSiteCode}
          onChange={(e) => handleSelectSite(e.target.value)}
          className="px-3 py-2 rounded bg-gray-700 border border-gray-600"
        >
          <option value="">Select site to locate...</option>
          {filteredMarkers.slice(0, 500).map((m) => (
            <option key={m.siteCode} value={m.siteCode}>
              {m.siteCode} - {m.siteName}
            </option>
          ))}
        </select>
      </div>
      <div className="h-[520px] rounded overflow-hidden border border-gray-600">
        <MapContainer
          center={[5.8, 12.6]}
          zoom={6}
          minZoom={5}
          maxZoom={8}
          whenCreated={setMapInstance}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {filteredMarkers.map((m) => {
            return (
              <CircleMarker
                key={m.siteCode}
                center={m.pos}
                radius={m.siteCode === selectedSiteCode ? 8 : 5}
                pathOptions={{
                  color: "#0f172a",
                  weight: 1,
                  fillColor: statusColor(m.status),
                  fillOpacity: 0.9,
                }}
              >
                <Tooltip
                  direction="top"
                  offset={[0, -4]}
                  opacity={1}
                  sticky
                >
                  <div className="text-xs leading-5 min-w-[280px]">
                    <div className="font-semibold text-sm mb-1">Site Analysis</div>
                    <div><strong>Site:</strong> {m.siteCode} - {m.siteName}</div>
                    <div><strong>Region:</strong> {m.region}</div>
                    <div><strong>Status:</strong> {m.status}</div>
                    <div><strong>Priority:</strong> {m.priority}</div>
                    <div><strong>Domain:</strong> {m.domain}</div>
                    <hr className="my-1" />
                    <div><strong>2G:</strong> {m.analysis["2G"].value} ({m.analysis["2G"].status})</div>
                    <div><strong>3G:</strong> {m.analysis["3G"].value} ({m.analysis["3G"].status})</div>
                    <div><strong>4G:</strong> {m.analysis["4G"].value} ({m.analysis["4G"].status})</div>
                    <div><strong>Power:</strong> {m.analysis.power.value} ({m.analysis.power.status})</div>
                    <div><strong>Packet Loss:</strong> {m.analysis.packetLoss.value} ({m.analysis.packetLoss.status})</div>
                    <hr className="my-1" />
                    <div><strong>Comment:</strong> {m.comment}</div>
                  </div>
                </Tooltip>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>
      <div className="text-xs text-gray-300 mt-2 flex flex-wrap gap-4">
        <span><span className="inline-block w-3 h-3 rounded mr-1 align-middle" style={{ background: "#22c55e" }} /> Ok</span>
        <span><span className="inline-block w-3 h-3 rounded mr-1 align-middle" style={{ background: "#f59e0b" }} /> Degraded</span>
        <span><span className="inline-block w-3 h-3 rounded mr-1 align-middle" style={{ background: "#ef4444" }} /> Down</span>
        <span>Showing {filteredMarkers.length} site markers</span>
      </div>
    </div>
  );
};

const LineChart = ({ labels = [], series = [], title, maxY = null, width = 560 }) => {
  const [hoverPoint, setHoverPoint] = useState(null);
  const [disabledSeries, setDisabledSeries] = useState({});
  const height = 240;
  const pad = 35;
  const isLight = document?.documentElement?.classList?.contains("theme-light");
  const axisColor = isLight ? "#334155" : "#94a3b8";
  const gridColor = isLight ? "#94a3b8" : "#64748b";
  const tickColor = isLight ? "#020617" : "#ffffff";
  const dateColor = isLight ? "#020617" : "#ffffff";
  const tickBg = isLight ? "rgba(241,245,249,0.95)" : "rgba(15,23,42,0.85)";
  const visibleSeries = series.filter((s) => !disabledSeries[s.label]);
  const maxVal =
    maxY != null
      ? maxY
      : Math.max(
          1,
          ...visibleSeries
            .flatMap((s) => s.values)
            .map((v) => (Number.isFinite(v) ? v : 0))
        );

  const x = (i) => {
    if (labels.length <= 1) return pad;
    return pad + (i * (width - pad * 2)) / (labels.length - 1);
  };
  const y = (v) => height - pad - (Math.max(0, v) * (height - pad * 2)) / maxVal;
  const yTicks = [0, 20, 40, 60, 80, 100];

  return (
    <div className="bg-gray-800 rounded p-4 mb-5">
      <h3 className="text-lg text-yellow-400 mb-3">{title}</h3>
      <div className="overflow-x-auto">
        <svg width={width} height={height} className="w-full min-w-[520px] max-w-full">
          <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke={axisColor} />
          <line x1={pad} y1={pad} x2={pad} y2={height - pad} stroke={axisColor} />

          {maxY === 100 &&
            yTicks.map((t) => (
              <g key={`yt-${t}`}>
                <line
                  x1={pad}
                  y1={y(t)}
                  x2={width - pad}
                  y2={y(t)}
                  stroke={gridColor}
                  strokeDasharray="2 3"
                />
                <rect
                  x={pad - 30}
                  y={y(t) - 8}
                  width={22}
                  height={14}
                  rx={3}
                  fill={tickBg}
                />
                <text
                  x={pad - 19}
                  y={y(t) + 2}
                  fill={tickColor}
                  fontSize="10"
                  fontWeight="800"
                  textAnchor="middle"
                >
                  {t}
                </text>
              </g>
            ))}

          {visibleSeries.map((s) => {
            const pts = s.values
              .map((v, i) => `${x(i)},${y(Number.isFinite(v) ? v : 0)}`)
              .join(" ");
            return (
              <g key={s.label}>
                <polyline fill="none" stroke={s.color} strokeWidth="2.5" points={pts} />
                {s.values.map((v, i) => (
                  <circle
                    key={`${s.label}-${i}`}
                    cx={x(i)}
                    cy={y(Number.isFinite(v) ? v : 0)}
                    r="3.5"
                    fill={s.color}
                    onMouseEnter={() =>
                      setHoverPoint({
                        idx: i,
                        label: s.label,
                        color: s.color,
                        value: Number.isFinite(v) ? v : null,
                      })
                    }
                    onMouseLeave={() => setHoverPoint(null)}
                  />
                ))}
              </g>
            );
          })}

          {labels.map((lb, i) => (
            <text
              key={lb + i}
              x={x(i)}
              y={height - 8}
              fill={dateColor}
              fontSize="12"
              fontWeight="800"
              textAnchor="middle"
            >
              {String(lb).slice(5, 10)}
            </text>
          ))}
        </svg>
      </div>
      {hoverPoint && (
        <div className="mt-2 text-xs bg-gray-700/40 rounded p-2">
          <div className="mb-1 font-semibold">Period: {String(labels[hoverPoint.idx])}</div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded" style={{ backgroundColor: hoverPoint.color }} />
            <span>
              {hoverPoint.label}: {hoverPoint.value == null ? "-" : Number(hoverPoint.value).toFixed(2)}
            </span>
          </div>
        </div>
      )}
      <div className="flex gap-4 flex-wrap text-xs mt-2">
        {series.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() =>
              setDisabledSeries((prev) => ({
                ...prev,
                [s.label]: !prev[s.label],
              }))
            }
            className={`flex items-center gap-2 px-2 py-1 rounded border ${
              disabledSeries[s.label] ? "opacity-50 border-gray-500 line-through" : "border-gray-400"
            }`}
            title={disabledSeries[s.label] ? `Show ${s.label}` : `Hide ${s.label}`}
          >
            <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: s.color }} />
            <span>{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

const GraphsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showAllRegions, setShowAllRegions] = useState(false);

  const { sites = [], datesByKPI = {}, vendor = "Vendor", backPath = "/" } =
    location.state || {};

  const siteRegionMap = useMemo(() => {
    const m = {};
    siteMap.forEach((s) => {
      m[s.siteCode] = s.region || "Unknown";
    });
    return m;
  }, []);

  const computed = useMemo(() => {
    const overall = { Ok: 0, Degraded: 0, Down: 0, "No Value": 0 };
    const byRegion = {}; // region -> tech -> status counts
    const extras = {
      powerIssue: 0,
      packetLossAvailable: 0,
      ruralPower: 0,
      boTx: 0,
    };

    sites.forEach((site) => {
      const region = siteRegionMap[site.siteCode] || "Unknown";
      byRegion[region] ||= {};

      const o = getOverallStatus(site, datesByKPI);
      overall[o] += 1;

      TECHS.forEach((tech) => {
        byRegion[region][tech] ||= { Ok: 0, Degraded: 0, Down: 0, "No Value": 0 };
        const d = datesByKPI[tech]?.slice(-1)[0];
        const st = getTechStatus(d ? site.kpis?.[tech]?.[d] : null);
        byRegion[region][tech][st] += 1;
      });

      const vDay = datesByKPI["Voltage"]?.slice(-1)[0];
      const v = vDay ? Number(site.kpis?.Voltage?.[vDay]) : NaN;
      if (!Number.isNaN(v) && v > 0 && v < 45000) extras.powerIssue += 1;

      const pDay = datesByKPI["Packet Loss"]?.slice(-1)[0];
      const p = pDay ? Number(site.kpis?.["Packet Loss"]?.[pDay]) : NaN;
      if (!Number.isNaN(p) && p > 0.5) extras.packetLossAvailable += 1;

      if (site.domain === "Rural Power") extras.ruralPower += 1;
      if (site.domain === "BO TX") extras.boTx += 1;
    });

    return { overall, byRegion, extras, total: sites.length };
  }, [sites, datesByKPI, siteRegionMap]);

  const techTimeline = useMemo(() => {
    const labels = datesByKPI["2G"] || [];
    const buildAvg = (tech) =>
      labels.map((d) => {
        let s = 0;
        let c = 0;
        sites.forEach((site) => {
          const raw = site.kpis?.[tech]?.[d];
          if (raw == null || raw === "-" || raw === "NaN" || raw === "NAN") return;
          const n = Number(raw);
          if (!Number.isNaN(n)) {
            s += n;
            c += 1;
          }
        });
        return c ? s / c : 0;
      });

    // Global trend = average of all technologies (2G/3G/4G) across all sites per day
    const globalAvg = labels.map((d) => {
      let s = 0;
      let c = 0;
      sites.forEach((site) => {
        TECHS.forEach((kpi) => {
          const raw = site.kpis?.[kpi]?.[d];
          if (raw == null || raw === "-" || raw === "NaN" || raw === "NAN") return;
          const n = Number(raw);
          if (!Number.isNaN(n)) {
            s += n;
            c += 1;
          }
        });
      });
      return c ? s / c : 0;
    });

    return {
      labels,
      series: [
        { label: "All Tech Avg", color: "#ffffff", values: globalAvg },
        { label: "2G Avg", color: "#22c55e", values: buildAvg("2G") },
        { label: "3G Avg", color: "#3b82f6", values: buildAvg("3G") },
        { label: "4G Avg", color: "#f59e0b", values: buildAvg("4G") },
      ],
    };
  }, [sites, datesByKPI]);

  const statusTimeline = useMemo(() => {
    const labels = datesByKPI["2G"] || [];
    const down = [];
    const degraded = [];
    const ok = [];

    labels.forEach((d) => {
      let o = 0;
      let g = 0;
      let dn = 0;
      sites.forEach((site) => {
        const parsed = TECHS.map((k) => site.kpis?.[k]?.[d])
          .map((v) => {
            if (v === "-" || v == null || v === "NaN" || v === "NAN") return null;
            const n = Number(v);
            return Number.isNaN(n) ? null : n;
          })
          .filter((v) => v != null);

        if (!parsed.length) {
          dn += 1;
          return;
        }

        const avg = parsed.reduce((a, b) => a + b, 0) / parsed.length;
        if (avg < 5) dn += 1;
        else if (avg < 97) g += 1;
        else o += 1;
      });
      down.push(dn);
      degraded.push(g);
      ok.push(o);
    });

    return {
      labels,
      series: [
        { label: "Down", color: "#ef4444", values: down },
        { label: "Degraded", color: "#f59e0b", values: degraded },
        { label: "Ok", color: "#22c55e", values: ok },
      ],
    };
  }, [sites, datesByKPI]);

  const perRegionDegradedTimeline = useMemo(() => {
    const labels = datesByKPI["2G"] || [];
    const regionMap = {};
    const regionTotals = {};

    REGIONS.forEach((r) => {
      regionMap[r] = Array(labels.length).fill(0);
      regionTotals[r] = 0;
    });

    sites.forEach((site) => {
      const region = siteRegionMap[site.siteCode] || "Unknown";
      if (!REGIONS.includes(region)) return;
      regionTotals[region] += 1;
      labels.forEach((d, i) => {
        const vals = TECHS.map((k) => site.kpis?.[k]?.[d]);
        const degraded = vals.some((v) => {
          if (v == null || v === "-" || v === "NaN" || v === "NAN") return false;
          const n = Number(v);
          return !Number.isNaN(n) && n < 97;
        });
        if (degraded) regionMap[region][i] += 1;
      });
    });

    const palette = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#a855f7", "#14b8a6"];
    const allRegions = REGIONS;

    return {
      labels,
      series: allRegions.map((r, i) => ({
        label: r,
        color: palette[i % palette.length],
        values: regionMap[r].map((v) =>
          regionTotals[r] > 0 ? (v / regionTotals[r]) * 100 : 0
        ),
      })),
    };
  }, [sites, datesByKPI, siteRegionMap]);

  const statusTimelinePct = useMemo(() => {
    return {
      labels: statusTimeline.labels,
      series: statusTimeline.series.map((s) => ({
        ...s,
        values: s.values.map((v) =>
          computed.total > 0 ? (v / computed.total) * 100 : 0
        ),
      })),
    };
  }, [statusTimeline, computed.total]);

  const problemTimeline = useMemo(() => {
    const labels = datesByKPI["2G"] || [];
    const ran = [];
    const boTx = [];
    const power = [];

    const isNokia = String(vendor).toLowerCase().includes("nokia");

    labels.forEach((d) => {
      let ranCount = 0;
      let boTxCount = 0;
      let powerCount = 0;

      sites.forEach((site) => {
        const vals = TECHS.map((k) => parseNum(site.kpis?.[k]?.[d]));
        const available = vals.filter((v) => v != null);
        const anyTechDegraded = available.some((v) => v < 97);
        const allTechsDegraded =
          available.length === TECHS.length && available.every((v) => v < 97);

        const voltage = parseNum(site.kpis?.Voltage?.[d]);
        const powerIssue =
          anyTechDegraded && voltage != null && voltage > 0 && voltage < 45000;

        const packetLoss = parseNum(site.kpis?.["Packet Loss"]?.[d]);
        const packetLossAvailable = packetLoss != null && packetLoss > 0.5;

        let domain = "RAN";
        if (powerIssue) {
          domain = "Power";
        } else if (
          isNokia
            ? allTechsDegraded && !powerIssue
            : allTechsDegraded && packetLossAvailable && !powerIssue
        ) {
          domain = "BO TX";
        }

        if (domain === "Power") powerCount += 1;
        else if (domain === "BO TX") boTxCount += 1;
        else ranCount += 1;
      });

      const total = sites.length || 1;
      ran.push((ranCount / total) * 100);
      boTx.push((boTxCount / total) * 100);
      power.push((powerCount / total) * 100);
    });

    return {
      labels,
      series: [
        { label: "RAN %", color: "#3b82f6", values: ran },
        { label: "BO TX %", color: "#a855f7", values: boTx },
        { label: "Power %", color: "#f59e0b", values: power },
      ],
    };
  }, [datesByKPI, sites, vendor]);

  const insights = useMemo(() => {
    const latest = datesByKPI["2G"]?.slice(-1)[0];
    if (!latest) return null;

    const regionDeg = {};
    const regionTech = {};
    const regionDomain = {};

    sites.forEach((site) => {
      const region = siteRegionMap[site.siteCode] || "Unknown";
      if (!REGIONS.includes(region)) return;
      regionDeg[region] ||= 0;
      regionTech[region] ||= { "2G": 0, "3G": 0, "4G": 0 };
      regionDomain[region] ||= {};

      const vals = {
        "2G": site.kpis?.["2G"]?.[latest],
        "3G": site.kpis?.["3G"]?.[latest],
        "4G": site.kpis?.["4G"]?.[latest],
      };

      let anyDegraded = false;
      Object.entries(vals).forEach(([k, v]) => {
        const n = Number(v);
        if (v != null && v !== "-" && !Number.isNaN(n) && n < 97) {
          anyDegraded = true;
          regionTech[region][k] += 1;
        }
      });
      if (anyDegraded) regionDeg[region] += 1;

      const d = site.domain || "-";
      regionDomain[region][d] = (regionDomain[region][d] || 0) + 1;
    });

    const topRegion = Object.entries(regionDeg).sort((a, b) => b[1] - a[1])[0]?.[0] || "-";
    const topTech = topRegion
      ? Object.entries(regionTech[topRegion] || {}).sort((a, b) => b[1] - a[1])[0]?.[0] || "-"
      : "-";
    const topDomain = topRegion
      ? Object.entries(regionDomain[topRegion] || {}).sort((a, b) => b[1] - a[1])[0]?.[0] || "-"
      : "-";

    return { topRegion, topTech, topDomain };
  }, [sites, datesByKPI, siteRegionMap]);

  const sitesPerRegion = useMemo(() => {
    const counts = {};
    REGIONS.forEach((r) => {
      counts[r] = 0;
    });

    sites.forEach((site) => {
      const region = String(site.siteCode || "").slice(0, 3).toUpperCase();
      if (REGIONS.includes(region)) counts[region] += 1;
    });

    return REGIONS.map((r) => ({ label: r, value: counts[r] }));
  }, [sites]);


  if (!location.state) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-gray-900 text-white">
        <button
          className="px-4 py-2 bg-blue-600 rounded"
          onClick={() => navigate(-1)}
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-5">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-2xl text-blue-400 font-bold">{vendor} Graphs</h2>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
        >
          Back to KPI Page
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <LineChart
          title="All Technologies Average Trend (Past 7 Days)"
          labels={techTimeline.labels}
          series={techTimeline.series}
          maxY={100}
        />

        <LineChart
          title="Site Status Trend % (Down / Degraded / Ok)"
          labels={statusTimelinePct.labels}
          series={statusTimelinePct.series}
          maxY={100}
        />
      </div>

      <LineChart
        title="Problem Classification Trend % (RAN / BO TX / Power) - Past 7 Days"
        labels={problemTimeline.labels}
        series={problemTimeline.series}
        maxY={100}
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <LineChart
          title="Per Region Degraded Trend % (All 10 Regions)"
          labels={perRegionDegradedTimeline.labels}
          series={perRegionDegradedTimeline.series}
          maxY={100}
        />

        <RegionBarChart
          title="Total Number of Sites per Region (10 Regions)"
          data={sitesPerRegion}
        />
      </div>

      <CameroonLeafletMap
        title="Cameroon Map - Site Status (Down/Degraded/Ok)"
        data={sitesPerRegion}
        sites={sites}
        datesByKPI={datesByKPI}
      />

      <div className="bg-gray-800 rounded p-4 mb-5">
        <h3 className="text-lg text-yellow-400 mb-3">Total Site Status</h3>
        {["Ok", "Degraded", "Down", "No Value"].map((k) => (
          <div key={k} className="mb-3">
            <div className="flex justify-between text-sm mb-1">
              <span>{k}</span>
              <span>{computed.overall[k]}</span>
            </div>
            <Bar
              value={computed.overall[k]}
              total={computed.total}
              color={
                k === "Ok"
                  ? "bg-green-500"
                  : k === "Degraded"
                  ? "bg-yellow-500"
                  : k === "Down"
                  ? "bg-red-500"
                  : "bg-gray-500"
              }
            />
          </div>
        ))}
      </div>

      <div className="bg-gray-800 rounded p-4 mb-5">
        <h3 className="text-lg text-yellow-400 mb-3">Other Possibilities</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="bg-gray-700/40 rounded p-3">Power Issues: {computed.extras.powerIssue}</div>
          <div className="bg-gray-700/40 rounded p-3">Packet Loss Available: {computed.extras.packetLossAvailable}</div>
          <div className="bg-gray-700/40 rounded p-3">BO TX: {computed.extras.boTx}</div>
          <div className="bg-gray-700/40 rounded p-3">Rural Power: {computed.extras.ruralPower}</div>
        </div>
      </div>

      <div className="bg-gray-800 rounded p-4 mb-5">
        <h3 className="text-lg text-yellow-400 mb-3">Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="bg-gray-700/40 rounded p-3">
            Region with majority degradations: <span className="font-semibold">{insights?.topRegion || "-"}</span>
          </div>
          <div className="bg-gray-700/40 rounded p-3">
            Most impacted technology (in that region): <span className="font-semibold">{insights?.topTech || "-"}</span>
          </div>
          <div className="bg-gray-700/40 rounded p-3">
            Most impacted domain (in that region): <span className="font-semibold">{insights?.topDomain || "-"}</span>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg text-yellow-400">
            Status Per Region by Technology (2G/3G/4G)
          </h3>
          <button
            type="button"
            onClick={() => setShowAllRegions((v) => !v)}
            className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 text-xs"
          >
            {showAllRegions ? "Show Top 3" : "View All Regions"}
          </button>
        </div>
        <div className="space-y-4">
          {REGIONS.slice(0, showAllRegions ? REGIONS.length : 3)
            .map((region) => (
              <div key={region} className="border border-gray-700 rounded p-3">
                <h4 className="font-semibold text-blue-300 mb-2">{region}</h4>
                <div className="grid md:grid-cols-3 gap-3">
                  {TECHS.map((tech) => {
                    const c = computed.byRegion[region]?.[tech] || {
                      Ok: 0,
                      Degraded: 0,
                      Down: 0,
                      "No Value": 0,
                    };
                    const total = c.Ok + c.Degraded + c.Down + c["No Value"];
                    return (
                      <div key={`${region}-${tech}`} className="bg-gray-700/30 rounded p-2">
                        <div className="font-medium mb-2">{tech}</div>
                        <div className="text-xs space-y-1">
                          <div>Ok: {c.Ok}</div>
                          <div>Degraded: {c.Degraded}</div>
                          <div>Down: {c.Down}</div>
                          <div>No Value: {c["No Value"]}</div>
                        </div>
                        <div className="mt-2">
                          <Bar value={c.Ok} total={total} color="bg-green-500" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default GraphsPage;
