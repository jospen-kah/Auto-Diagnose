import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { parseZTEData } from "./utils/zteparser";

const ZTEPage = () => {
  const navigate = useNavigate();

  const [files, setFiles] = useState({
    "2G": null,
    "3G": null,
    "4G": null,
    "Voltage": null,
    "Packet Loss": null,
  });

  const handleFileChange = (e, key) => {
    const file = e.target.files[0];
    if (file && (file.name.endsWith(".xls") || file.name.endsWith(".xlsx"))) {
      setFiles((prev) => ({ ...prev, [key]: file }));
    } else {
      alert("Please upload a valid Excel file (.xls or .xlsx)");
    }
  };

  const allFilesSelected = Object.values(files).every((f) => f !== null);

  const handleNext = () => {
    const allParsedData = [];

    const promises = Object.keys(files).map((key) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (evt) => {
          const bstr = evt.target.result;
          const workbook = XLSX.read(bstr, { type: "binary" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const rawRows = XLSX.utils.sheet_to_json(worksheet);

          const parsedRows = parseZTEData(rawRows, key);
          allParsedData.push(...parsedRows);

          resolve();
        };
        reader.readAsBinaryString(files[key]);
      });
    });

    Promise.all(promises).then(() => {
      console.log("🔥 FINAL PARSED DATA:", allParsedData);
      navigate("/zte-table", { state: { data: allParsedData } });
    });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold text-purple-400 text-center mb-8">
        Welcome to ZTE
      </h2>

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
            {files[key] && (
              <span className="text-green-400 mt-1 text-sm">{files[key].name} selected</span>
            )}
          </div>
        ))}
      </form>

      {allFilesSelected && (
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={handleNext}
            className="px-6 py-3 bg-purple-400 text-white font-semibold rounded-lg hover:bg-purple-500 transition"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default ZTEPage;
