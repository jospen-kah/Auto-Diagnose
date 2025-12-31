// src/utils/huaweiparser.js

// Extract site code from full site name or site ID
export const extractSiteCode = (fullNameOrID) => {
  if (!fullNameOrID) return "";
  const match = fullNameOrID.match(/^(EXN|NRD|ADM|SUO|NRO|CTR|LIT|EST|OST|SUD)_(\d{3,4})/);
  return match ? match[0] : "";
};

// List of valid alarms
const VALID_ALARMS = [
  "Power Supply DC Output Out of Range",
  "Battery Power Unavailable",
  "Loss of Power Supply Redundancy",
  "Ethernet Link Fault",
  "GNSS Antenna Fault",
  "Board Hardware Fault",
  "Board Powered Off",
  "RF Unit Maintenance Link Negotiation Failure",
  "BBU CPRI Optical Module Fault",
  "BBU CPRI Optical Module or Electrical Port Not Ready",
  "BBU CPRI Interface Error",
  "RF Unit Maintenance Link Failure",
  "RF Unit CPRI Interface Error",
  "RF Unit Optical Module Fault",
  "RF Unit Input Power Out of Range",
  "RF Unit VSWR Threshold Crossed",
  "RF Unit Hardware Fault",
  "RF Unit AC Input Power Failure",
  "RF Unit Backup Power Device Maintenance Link Failure",
  "RF Unit Power Surge Protector Fault",
  "RF Unit External Power Supply Insufficient",
  "RF Unit DC Input Power Failure",
  "RF Unit Power Supply Abnormal",
  "RF Unit Power Connector Abnormal",
  "SASU VSWR Threshold Crossed",
  "GSM Local Cell Unusable",
  "GSM Local Cell Capability Decline",
  "Local Cell Unusable",
  "GPS Receiver Hardware Fault",
  "GPS Receiver Antenna Power Problem",
  "GPS Receiver Antenna Fault",
  "S1 Interface Fault",
  "Cell Unavailable",
  "NE Is Disconnected",
  "Mains Power Fail",
];

// Parse Huawei Excel rows
export const parseHuaweiData = (rows, kpiType, existingSiteCodes = []) => {
  const parsed = [];
  if (!rows.length) return parsed;

  if (kpiType === "Alarm") {
    const siteAlarmMap = {};

    // Aggregate alarm occurrences per siteCode
    rows.forEach((row) => {
      const siteID = row["Site ID"];
      const siteCode = extractSiteCode(siteID);
      if (!siteCode) return; // skip invalid site IDs
      if (existingSiteCodes.length && !existingSiteCodes.includes(siteCode)) return;

      const alarmName = row["Alarm Name"];
      if (!alarmName || !VALID_ALARMS.includes(alarmName)) return;

      if (!siteAlarmMap[siteCode]) siteAlarmMap[siteCode] = {};
      if (!siteAlarmMap[siteCode][alarmName]) siteAlarmMap[siteCode][alarmName] = 0;

      // Increment count for repeated alarms
      siteAlarmMap[siteCode][alarmName] += 1;
    });

    // Build parsed array: top alarm per siteCode
    (existingSiteCodes.length ? existingSiteCodes : Object.keys(siteAlarmMap)).forEach((siteCode) => {
      const siteRow = rows.find((r) => extractSiteCode(r["Site ID"]) === siteCode);
      const siteName = siteRow?.["Site ID"] ?? siteCode;

      const alarms = siteAlarmMap[siteCode] ? Object.entries(siteAlarmMap[siteCode]) : [];
      if (alarms.length === 0) {
        parsed.push({
          siteCode,
          siteName,
          kpiType,
          beginTime: "Top Alarm",
          kpiValue: "Need BORAN analyses",
        });
      } else {
        // Sort by highest occurrence
        alarms.sort((a, b) => b[1] - a[1]);
        parsed.push({
          siteCode,
          siteName,
          kpiType,
          beginTime: "Top Alarm",
          kpiValue: alarms[0][0],
        });
      }
    });

    return parsed;
  }

  // Non-alarm KPIs (keep original logic)
  rows.forEach((row) => {
    let siteNameCol = "";
    let valueCol = "";

    switch (kpiType) {
      case "2G":
        siteNameCol = "Site Name";
        valueCol = "TR373:Cell Availability(%)";
        break;
      case "3G":
        siteNameCol = "NODEBNAME";
        valueCol = "3G Availability (Group)";
        break;
      case "4G":
        siteNameCol = "eNodeB Name";
        valueCol = "4G Cell Availability (Excluding manual)";
        break;
      case "Voltage":
        siteNameCol = "eGBTS";
        valueCol = "VS.RADIOEQM.InputVoltage.Min(V)";
        break;
      case "Packet Loss":
        siteNameCol = "NodeB";
        valueCol = "VS.IPPM.Forword.DropMeans(%)";
        break;
      default:
        break;
    }

    const beginTime = row["Date"];
    const fullName = row[siteNameCol];

    if (beginTime !== undefined && fullName) {
      parsed.push({
        siteCode: extractSiteCode(fullName),
        siteName: fullName,
        kpiType,
        beginTime,
        kpiValue: row[valueCol] ?? "-",
      });
    }
  });

  return parsed;
};
