// src/NokiaPage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { parseNokiaData } from "./utils/nokiaparser";
import { saveVendorData } from "./utils/appStorage.js";

const STORAGE_META_KEY = "NOKIA_TABLE_META"; // store only metadata

const NokiaPage = () => {
  const navigate = useNavigate();

  const [files, setFiles] = useState({
    "2G": null,
    "3G": null,
    "4G": null,
    Voltage: null,
    Alarm: null,
  });

  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasPreviousTable, setHasPreviousTable] = useState(false);
  const [previousDate, setPreviousDate] = useState(null);

  // Check for previous upload date (metadata only)
  useEffect(() => {
    const meta = localStorage.getItem(STORAGE_META_KEY);
    if (meta) {
      const parsed = JSON.parse(meta);
      setHasPreviousTable(true);
      setPreviousDate(parsed.date);
    }
  }, []);

  const handleFileChange = (e, key) => {
    const file = e.target.files[0];
    if (!file) return;

    setFiles((prev) => ({ ...prev, [key]: file }));
    setUploadedFiles((prev) => (prev.includes(key) ? prev : [...prev, key]));
  };

  const allFilesSelected = Object.values(files).every(Boolean);

  const handleNext = async () => {
    setLoading(true);
    const allData = {};

    const promises = Object.keys(files).map(
      (key) =>
        new Promise((resolve) => {
          const reader = new FileReader();

          reader.onload = (evt) => {
            try {
              const arrayBuffer = evt.target.result; // ✅ Use ArrayBuffer
              const workbook = XLSX.read(arrayBuffer, {
                type: "array", // important: read as array
                cellDates: true,
                raw: true,
                WTF: false, // suppress Nokia warnings
              });

              const sheetName = workbook.SheetNames[0];
              if (!sheetName) {
                allData[key] = [];
                resolve();
                return;
              }

              const sheet = workbook.Sheets[sheetName];
              const rows = XLSX.utils.sheet_to_json(sheet, {
                defval: "-",
                blankrows: false,
              });

              allData[key] = parseNokiaData(rows, key);
              console.log(`📡 Nokia Parser → ${key}`);
              console.log("Rows:", allData[key].length);
            } catch (err) {
              console.error(`❌ Nokia parse error (${key})`, err);
              allData[key] = [];
            }
            resolve();
          };

          reader.readAsArrayBuffer(files[key]); // ✅ Correct way for modern XLSX
        })
    );

    await Promise.all(promises);

    const hasData = Object.values(allData).some(
      (v) => Array.isArray(v) && v.length > 0
    );

    if (!hasData) {
      alert("Nokia files could not be read. Please re-save as .xlsx");
      setLoading(false);
      return;
    }

    // Save only small metadata, NOT the full data
    localStorage.setItem(
      STORAGE_META_KEY,
      JSON.stringify({ date: new Date().toLocaleString() })
    );

    setLoading(false);
    // Pass allData via navigate state
    try {
      await saveVendorData("nokia", allData);
    } catch (e) {
      console.error("IndexedDB save failed (nokia)", e);
    }
    navigate("/nokia-table", { state: { data: allData } });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold text-red-400 text-center mb-8">
        Upload Nokia KPI Files
      </h2>

      {hasPreviousTable && (
        <div className="mb-6 p-4 bg-gray-800 border border-gray-600 rounded text-center">
          <p className="text-gray-300">
            Previous table generated on:
            <span className="text-red-400 ml-2">{previousDate}</span>
          </p>
        </div>
      )}

      <form className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {["2G", "3G", "4G", "Voltage", "Alarm"].map((key) => (
          <div key={key} className="flex flex-col">
            <label className="text-white mb-2">{key} Excel File</label>
            <input
              type="file"
              accept=".xls,.xlsx"
              onChange={(e) => handleFileChange(e, key)}
              className="p-2 bg-gray-800 border border-gray-600 rounded"
            />
            {uploadedFiles.includes(key) && (
              <span className="text-green-400 text-sm mt-1">
                {key} uploaded successfully
              </span>
            )}
          </div>
        ))}
      </form>

      {allFilesSelected && (
        <div className="mt-8 text-center">
          <button
            onClick={handleNext}
            disabled={loading}
            className={`px-6 py-3 rounded font-semibold ${
              loading
                ? "bg-gray-500"
                : "bg-red-400 hover:bg-red-500 text-white"
            }`}
          >
            {loading ? "Loading..." : "Get Analysis"}
          </button>
        </div>
      )}
    </div>
  );
};

export default NokiaPage;
