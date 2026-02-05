// ================= SITE CODE EXTRACTION =================
export const extractSiteCode = (value) => {
  if (!value) return "";

  const str = String(value);
  const match = str.match(
    /(EXN|NRD|ADM|SUO|NRO|CTR|LIT|EST|OST|SUD)_(\d{3,4})/
  );

  return match ? match[0] : "";
};

// ================= DATE FORMATTER (NOKIA SAFE) =================
const formatNokiaDate = (rawDate) => {
  if (!rawDate) return null;

  console.log("🔍 formatNokiaDate input:", rawDate, "type:", typeof rawDate, rawDate instanceof Date ? "is Date" : "not Date");

  let dateString;

  // String in MM.DD.YYYY format (not DD.MM.YYYY)
  if (typeof rawDate === "string" && /^\d{2}\.\d{2}\.\d{4}$/.test(rawDate)) {
    const [month, day, year] = rawDate.split(".");
    dateString = `${year}-${month}-${day} 00:00:00:00`;
    console.log("✅ Parsed MM.DD.YYYY format:", dateString);
  }
  // Excel serial number
  else if (typeof rawDate === "number") {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const jsDate = new Date(excelEpoch.getTime() + rawDate * 86400000);
    const y = jsDate.getUTCFullYear();
    const m = String(jsDate.getUTCMonth() + 1).padStart(2, "0");
    const d = String(jsDate.getUTCDate()).padStart(2, "0");
    dateString = `${y}-${m}-${d} 00:00:00:00`;
    console.log("✅ Parsed Excel serial:", dateString);
  }
  // Already JS Date - add 1 day to correct timezone offset issue
  else if (rawDate instanceof Date) {
    // The timezone offset causes dates to be 1 day earlier, so add 1 day
    const correctedDate = new Date(rawDate.getTime() + 86400000);
    const y = correctedDate.getUTCFullYear();
    const m = String(correctedDate.getUTCMonth() + 1).padStart(2, "0");
    const d = String(correctedDate.getUTCDate()).padStart(2, "0");
    dateString = `${y}-${m}-${d} 00:00:00:00`;
    console.log("✅ Parsed JS Date (add 1 dy for offset):", dateString);
  }
  // String fallback (try parsing)
  else if (typeof rawDate === "string") {
    const jsDate = new Date(rawDate);
    if (isNaN(jsDate)) return null;
    const y = jsDate.getFullYear();
    const m = String(jsDate.getMonth() + 1).padStart(2, "0");
    const d = String(jsDate.getDate()).padStart(2, "0");
    dateString = `${y}-${m}-${d} 00:00:00:00`;
    console.log("✅ Parsed string fallback:", dateString);
  }

  return dateString || null;
};

// ================= VALID ALARMS (REUSE SAME LIST) =================
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

// ================= MAIN NOKIA PARSER =================
export const parseNokiaData = (rows, kpiType, existingSiteCodes = []) => {
  const parsed = [];
  if (!rows?.length) return parsed;

  console.group(`📡 Nokia Parser → ${kpiType}`);
  console.log("Rows:", rows.length);
  
  // DEBUG: Show sample dates from raw file
  if (kpiType !== "Alarm" && rows.length > 0) {
    console.log("🔍 Raw dates from file (first 5 rows):");
    rows.slice(0, 5).forEach((row, idx) => {
      console.log(`  Row ${idx}: Period start time =`, row["Period start time"], "type:", typeof row["Period start time"]);
    });
  }

  // ===================== ALARM LOGIC =====================
  if (kpiType === "Alarm") {
    const siteAlarmMap = {};

    rows.forEach((row) => {
      const alarmName = row["Alarm Name"];
      const alarmSource = row["Alarm Source"] || "";

      const siteCode = extractSiteCode(alarmSource);
      if (!siteCode) return;

      if (existingSiteCodes.length && !existingSiteCodes.includes(siteCode))
        return;

      if (!alarmName || !VALID_ALARMS.includes(alarmName)) return;

      siteAlarmMap[siteCode] ??= {};
      siteAlarmMap[siteCode][alarmName] ??= 0;
      siteAlarmMap[siteCode][alarmName]++;
    });

    const sites =
      existingSiteCodes.length > 0
        ? existingSiteCodes
        : Object.keys(siteAlarmMap);

    sites.forEach((siteCode) => {
      const alarms = siteAlarmMap[siteCode]
        ? Object.entries(siteAlarmMap[siteCode])
        : [];

      parsed.push({
        siteCode,
        siteName: siteCode,
        kpiType: "Alarm",
        beginTime: "Alarm",
        kpiValue: alarms.length
          ? alarms.sort((a, b) => b[1] - a[1])[0][0]
          : "Need BORAN analyses",
      });
    });

    console.groupEnd();
    return parsed;
  }

  // ================= NON-ALARM KPIs =================
  rows.forEach((row) => {
    let siteCol = "";
    let valueCol = "";

    switch (kpiType) {
      case "2G":
        siteCol = "BCF name";
        valueCol = "TCH Availability Normal TRXs";
        break;

      case "3G":
        siteCol = "WBTS name";
        valueCol = "Cell Availability, excluding blocked by user state (BLU)";
        break;

      case "4G":
        siteCol = "LNBTS name";
        valueCol = "Cell Avail excl BLU";
        break;

      case "Voltage":
        siteCol = "MRBTS name";
        valueCol = "MIN_INPUT_VOLTAGE_IN_RF (M40003C0)";
        break;

      default:
        return;
    }

    const siteName = row[siteCol];
    if (!siteName) return;

    const siteCode = extractSiteCode(siteName);
    if (!siteCode) return;

    if (existingSiteCodes.length && !existingSiteCodes.includes(siteCode))
      return;

    parsed.push({
      siteCode,
      siteName,
      kpiType,
      beginTime: formatNokiaDate(row["Period start time"]),
      kpiValue:
        row[valueCol] === undefined ||
        row[valueCol] === null ||
        row[valueCol] === ""
          ? null
          : Number(row[valueCol]),
    });
  });

  console.groupEnd();
  return parsed;
};
