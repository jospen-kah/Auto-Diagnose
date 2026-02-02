// ================= SITE CODE EXTRACTION =================
export const extractSiteCode = (value) => {
  if (!value) return "";

  const str = String(value);

  const match = str.match(
    /(EXN|NRD|ADM|SUO|NRO|CTR|LIT|EST|OST|SUD)_\d{3,4}/
  );

  return match ? match[0] : "";
};


// ================= DATE FORMATTER (HUAWEI SAFE) =================
const formatHuaweiDate = (rawDate) => {
  if (!rawDate) return null;

  let jsDate;

  // ✅ Already a JS Date (cellDates: true)
  if (rawDate instanceof Date) {
    jsDate = rawDate;
  }
  // ✅ Excel serial number
  else if (typeof rawDate === "number") {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    jsDate = new Date(excelEpoch.getTime() + rawDate * 86400000);
  }
  // ✅ String fallback
  else {
    jsDate = new Date(rawDate);
  }

  if (isNaN(jsDate)) return null;

  const y = jsDate.getUTCFullYear();
  const m = String(jsDate.getUTCMonth() + 1).padStart(2, "0");
  const d = String(jsDate.getUTCDate()).padStart(2, "0");

  return `${y}-${m}-${d} 00:00:00:00`;
};

// ================= VALID ALARMS =================
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

// ================= MAIN PARSER =================
export const parseHuaweiData = (rows, kpiType, existingSiteCodes = []) => {
  const parsed = [];
  if (!rows?.length) return parsed;

  console.group(`📡 Huawei Parser → ${kpiType}`);
  console.log("Rows:", rows.length);

  // ===================== ALARM LOGIC (UNCHANGED) =====================
  if (kpiType === "Alarm") {
  const siteAlarmMap = {};

  rows.forEach((row) => {
    const rawSite =
      row["Site ID"] ||
      row["Site Name"] ||
      row["NE Name"] ||
      row["Managed Object"] ||
      row["Object"] ||
      "";

    const alarmName =
      row["Alarm Name"] ||
      row["Alarm"] ||
      row["Alarm Description"];

    const siteCode = extractSiteCode(rawSite);

    if (!siteCode || !alarmName) return;

    siteAlarmMap[siteCode] ??= {};
    siteAlarmMap[siteCode][alarmName] =
      (siteAlarmMap[siteCode][alarmName] || 0) + 1;
  });

  Object.entries(siteAlarmMap).forEach(([siteCode, alarms]) => {
    const topAlarm = Object.entries(alarms)
      .sort((a, b) => b[1] - a[1])[0]?.[0];

    parsed.push({
      siteCode,
      siteName: siteCode,
      kpiType: "Alarm",
      beginTime: "Alarm",
      kpiValue: topAlarm || "No active alarm",
    });
  });

  console.groupEnd();
  return parsed;
}

  // ================= NON-ALARM KPIs (FINAL FIX) =================
  rows.forEach((row) => {
    let siteCol = "";
    let valueCol = "";

    switch (kpiType) {
      case "2G":
        siteCol = "Site Name";
        valueCol = "TR373:Cell Availability(%)";
        break;
      case "3G":
        siteCol = "NODEBNAME";
        valueCol = "3G Availability (Group)";
        break;
      case "4G":
        siteCol = "eNodeB Name";
        valueCol = "4G Cell Availability (Excluding manual)";
        break;
      case "Voltage":
        siteCol = "NodeB";
        valueCol = "VS.RADIOEQM.InputVoltage.Min(V)";
        break;
      case "Packet Loss":
        siteCol = "NodeB";
        valueCol = "VS.IPPM.Forword.DropMeans(%)";
        break;
      default:
        return;
    }

    const siteName = row[siteCol];
    if (!siteName) return;

    const siteCode = extractSiteCode(siteName);
    if (!siteCode) return;

    parsed.push({
      siteCode,
      siteName,
      kpiType,
      beginTime: formatHuaweiDate(row["Date"]),
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
