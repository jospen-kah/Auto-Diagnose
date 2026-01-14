import React from "react";

const SiteAnalysisModal = ({
  selectedSite,
  selectedDay,
  setSelectedSite,
  setSelectedDay,
  datesByKPI,
  siteMap,
}) => {
  if (!selectedSite || !selectedSite.kpis) return null;

  const siteInfo =
    siteMap.find((s) => s.siteCode === selectedSite.siteCode) || {};

  const getStatusClass = (status) =>
    ["Ok", "No Power Issues", "No Packet Loss"].includes(status)
      ? "text-green-400"
      : "text-orange-400";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={() => {
          setSelectedSite(null);
          setSelectedDay(null);
        }}
      />

      <div className="relative bg-gray-800 p-6 rounded w-full max-w-md z-10 text-sm">
        <h3 className="text-xl font-bold text-blue-400 mb-4">Site Analysis</h3>

        {/* SITE INFORMATION */}
        <h4 className="text-yellow-400 font-semibold mb-2">Site Information</h4>
        <p><strong>Site Code:</strong> {selectedSite.siteCode}</p>
        <p><strong>Site Name:</strong> {selectedSite.siteName}</p>
        <p><strong>Date:</strong> {selectedDay || "Last Day"}</p>
        <p><strong>Region:</strong> {siteInfo.region || "-"}</p>
        <p><strong>Cluster:</strong> {siteInfo.cluster || "-"}</p>
        <p><strong>Parent Site:</strong> {siteInfo.parentSite || "-"}</p>
        <p><strong>Child Sites:</strong> {siteInfo.childSites?.join(", ") || "-"}</p>
        <p><strong>Topology Power:</strong> {selectedSite.topologyPower || "-"}</p>

        <hr className="border-gray-600 my-3" />

        {/* ANALYSIS */}
        <h4 className="text-yellow-400 font-semibold mb-2">Analysis</h4>

        {["2G", "3G", "4G"].map((kpi) => {
          const day = selectedDay || datesByKPI[kpi]?.slice(-1)[0];
          const v = selectedSite.kpis[kpi]?.[day];

          const status =
            v == null || v === "-"
              ? "No Value"
              : v < 97
              ? "Degraded"
              : "Ok";

          return (
            <p key={kpi}>
              <strong>{kpi}:</strong> {v ?? "-"} →{" "}
              <span className={getStatusClass(status)}>{status}</span>
            </p>
          );
        })}

        {/* POWER */}
        {(() => {
          const day = selectedDay || datesByKPI["Voltage"]?.slice(-1)[0];
          const v = selectedSite.kpis["Voltage"]?.[day];
          const status =
            v == null || v === "-"
              ? "No Value"
              : v < 45000
              ? "Power Issues"
              : "No Power Issues";

          return (
            <p>
              <strong>Power:</strong> {v ?? "-"} →{" "}
              <span className={getStatusClass(status)}>{status}</span>
            </p>
          );
        })()}

        {/* PACKET LOSS */}
        {(() => {
          const day = selectedDay || datesByKPI["Packet Loss"]?.slice(-1)[0];
          const v = selectedSite.kpis["Packet Loss"]?.[day];

          const num =
            typeof v === "number"
              ? v
              : typeof v === "string"
              ? parseFloat(v)
              : NaN;

          const status =
            isNaN(num)
              ? "No Value"
              : num >= 2
              ? "Packet Loss"
              : "No Packet Loss";

          return (
            <p>
              <strong>Packet Loss:</strong> {v ?? "-"} →{" "}
              <span className={getStatusClass(status)}>{status}</span>
            </p>
          );
        })()}

        <p><strong>Priority:</strong> {selectedSite.priority}</p>
        <p><strong>Domain:</strong> {selectedSite.domain}</p>

        <hr className="border-gray-600 my-3" />

        {/* COMMENT */}
        <h4 className="text-yellow-400 font-semibold mb-2">Comment</h4>
        <p className="italic">{selectedSite.comment || "-"}</p>

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
  );
};

export default SiteAnalysisModal;
