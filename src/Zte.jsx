import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { parseZTEData } from "./utils/zteparser";
import { saveVendorData } from "./utils/appStorage.js";

const STORAGE_DATE_KEY = "ZTE_TABLE_DATE";

const ZTEPage = () => {
  const navigate = useNavigate();

  const [files, setFiles] = useState({
    "2G": null,
    "3G": null,
    "4G": null,
    "Voltage": null,
    "Packet Loss": null,
  });

  const [loading, setLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [lastLoadedDate, setLastLoadedDate] = useState(null);

  /* ================= CHECK LOCAL STORAGE ================= */
  useEffect(() => {
    const savedDate = localStorage.getItem(STORAGE_DATE_KEY);
    if (savedDate) setLastLoadedDate(new Date(savedDate));
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

  /* ================= LOAD FILES ================= */
  const handleNext = () => {
    setLoading(true);
    const allData = {};

    const promises = Object.keys(files).map(
      (key) =>
        new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (evt) => {
            try {
              const workbook = XLSX.read(evt.target.result, { type: "binary" });
              const sheet = workbook.Sheets[workbook.SheetNames[0]];
              const rows = XLSX.utils.sheet_to_json(sheet);
              allData[key] = parseZTEData(rows, key);
            } catch (error) {
              console.error(`Error parsing ${key} file:`, error);
            }
            resolve();
          };
          reader.readAsBinaryString(files[key]);
        })
    );

    Promise.all(promises).then(async () => {
      // Flatten all data into a single array
      const flattenedData = Object.values(allData).flat();

      const now = new Date();
      localStorage.setItem(STORAGE_DATE_KEY, now.toISOString());
      setLastLoadedDate(now);

      try {
        await saveVendorData("zte", flattenedData);
      } catch (e) {
        console.error("IndexedDB save failed (zte)", e);
      }

      setLoading(false);
      navigate("/zte-table", { state: { data: flattenedData } });
    });
  };

  /* ================= RELOAD PREVIOUS TABLE ================= */
  const handleReloadPrevious = () => {
    navigate("/zte-table");
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex justify-start mb-4">
        <button
          type="button"
          onClick={() => navigate("/assemble")}
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          Assemble
        </button>
      </div>
      <h2 className="text-2xl font-bold text-purple-400 text-center mb-8">
        Upload ZTE KPI Files
      </h2>

      {/* ===== RELOAD PREVIOUS TABLE ===== */}
      {lastLoadedDate && (
        <div className="mb-6 p-4 bg-gray-800 border border-gray-600 rounded text-center">
          <p className="text-gray-300 mb-2">
            Last table loaded on:
            <span className="text-purple-400 font-semibold ml-2">
              {lastLoadedDate.toLocaleString()}
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

      {/* ===== FILE UPLOADS ===== */}
      <form className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {["2G", "3G", "4G", "Voltage", "Packet Loss"].map((key) => (
          <div key={key} className="flex flex-col">
            <label className="mb-2 font-semibold text-white">{key} Excel File:</label>
            <input
              type="file"
              accept=".xls,.xlsx"
              onChange={(e) => handleFileChange(e, key)}
              className="p-2 border rounded-md bg-gray-800 text-white border-gray-600"
            />
            {uploadedFiles.includes(key) && (
              <span className="text-green-400 mt-1 text-sm">{key} uploaded successfully!</span>
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
                : "bg-purple-400 hover:bg-purple-500 text-white"
            }`}
            disabled={loading}
          >
            {loading ? "Loading..." : "Next"}
          </button>
        </div>
      )}
    </div>
  );
};

export default ZTEPage;
