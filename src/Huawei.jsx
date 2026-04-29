import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { parseHuaweiData } from "./utils/huaweiparser";
import { saveVendorData } from "./utils/appStorage.js";

const STORAGE_DATE_KEY = "HUAWEI_TABLE_DATE";

const HuaweiPage = () => {
  const navigate = useNavigate();

  const [files, setFiles] = useState({
    "2G": null,
    "3G": null,
    "4G": null,
    "Voltage": null,
    "Alarm": null,
    "Packet Loss": null,
  });

  const [loading, setLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);

  const [hasPreviousTable, setHasPreviousTable] = useState(false);
  const [previousDate, setPreviousDate] = useState(null);

  /* ================= CHECK LOCAL STORAGE ================= */
  useEffect(() => {
    const savedDate = localStorage.getItem(STORAGE_DATE_KEY);

    if (savedDate) {
      setHasPreviousTable(true);
      setPreviousDate(savedDate);
    }
  }, []);

  const handleFileChange = (e, key) => {
    const file = e.target.files[0];
    if (!file) return;

    setFiles((prev) => ({ ...prev, [key]: file }));

    setUploadedFiles((prev) =>
      prev.includes(key) ? prev : [...prev, key]
    );
  };

  const allFilesSelected = Object.values(files).every((f) => f !== null);

  const handleNext = () => {
    setLoading(true);
    const allData = {};

    const promises = Object.keys(files).map(
      (key) =>
        new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (evt) => {
            try {
              const workbook = XLSX.read(evt.target.result, {
                type: "binary",
              });
              const sheet = workbook.Sheets[workbook.SheetNames[0]];
              const rows = XLSX.utils.sheet_to_json(sheet);
              allData[key] = parseHuaweiData(rows, key);
            } catch (error) {
              console.error(`Error parsing ${key} file:`, error);
            }
            resolve();
          };
          reader.readAsBinaryString(files[key]);
        })
    );

    Promise.all(promises).then(async () => {
      const now = new Date().toLocaleString();

      // Save only small metadata, NOT the full data (avoid localStorage quota exceeded)
      localStorage.setItem(STORAGE_DATE_KEY, now);

      try {
        await saveVendorData("huawei", allData);
      } catch (e) {
        console.error("IndexedDB save failed (huawei)", e);
      }

      setLoading(false);
      // Pass allData via navigate state
      navigate("/huawei-table", { state: { data: allData } });
    });
  };

  const handleReloadPrevious = () => {
    navigate("/huawei-table");
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold text-blue-400 text-center mb-8">
        Upload Huawei KPI Files
      </h2>

      {/* ================= PREVIOUS TABLE BUTTON ================= */}
      {hasPreviousTable && (
        <div className="mb-6 p-4 bg-gray-800 border border-gray-600 rounded text-center">
          <p className="text-gray-300 mb-2">
            Previous table loaded on:
            <span className="text-blue-400 font-semibold ml-2">
              {previousDate}
            </span>
          </p>

          <button
            onClick={handleReloadPrevious}
            className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded font-semibold"
          >
            Reload Previous Table
          </button>
        </div>
      )}

      <form className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {["2G", "3G", "4G", "Voltage", "Alarm", "Packet Loss"].map((key) => (
          <div key={key} className="flex flex-col">
            <label className="mb-2 font-semibold text-white">
              {key} Excel File:
            </label>
            <input
              type="file"
              accept=".xls,.xlsx"
              onChange={(e) => handleFileChange(e, key)}
              className="p-2 border rounded-md bg-gray-800 text-white border-gray-600"
            />
            {uploadedFiles.includes(key) && (
              <span className="text-green-400 mt-1 text-sm">
                {key} uploaded successfully!
              </span>
            )}
          </div>
        ))}
      </form>

      {allFilesSelected && (
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={handleNext}
            className={`px-6 py-3 font-semibold rounded-lg transition ${
              loading
                ? "bg-gray-500 cursor-not-allowed"
                : "bg-blue-400 hover:bg-blue-500 text-white"
            }`}
            disabled={loading}
          >
            {loading ? "Loading..." : "Get Analysis"}
          </button>
        </div>
      )}
    </div>
  );
};

export default HuaweiPage;
