// src/utils/zteparser.js

// Helper to extract site code
export const extractSiteCode = (fullName) => {
  if (!fullName) return "";
  // Match 3 letters + underscore + 3-4 digits (EXN_001 or NRO_1234)
  const match = fullName.match(/^(EXN|NRD|ADM|SUO|NRO|CTR|LIT|EST|OST|SUD)_(\d{3,4})/);
  return match ? match[0] : "";
};

export const parseZTEData = (rows, kpiType) => {
  const parsed = [];

  if (!rows.length) return parsed;

  rows.forEach((row) => {
    let siteNameCol = "";
    let valueCol = "";

    // Match columns exactly based on your provided headings
    switch (kpiType) {
      case "2G":
        siteNameCol = "SITE Name";
        valueCol = "ORA_2G_TCH Availability Normal TRXs";
        break;

      case "3G":
        siteNameCol = "NodeB Name";
        valueCol = "ORA_3G_Cell Availability, excluding BLU (%)";
        break;

      case "4G":
        siteNameCol = "ENBFunction Name";
        valueCol = "ORA_4G_Cell Availability, excluding BLU_ZTE(%)";
        break;

      case "Packet Loss":
        siteNameCol = "Managed Element";
        valueCol = "Packet Loss Rate(%)";
        break;

      case "Voltage":
        siteNameCol = "Managed Element";
        valueCol = "MinVoltageOfBBU(V)";
        break;

      default:
        break;
    }

    const beginTime = row["Begin Time"];
    const fullName = row[siteNameCol];

    if (beginTime !== undefined && fullName) {
      parsed.push({
        siteCode: extractSiteCode(fullName), // Extract site code properly
        siteName: fullName,                  // Keep the full name
        kpiType,
        beginTime,
        kpiValue: row[valueCol] ?? "-",
      });
    }
  });

  return parsed;
};
