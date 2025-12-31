import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { parseHuaweiData } from './utils/huaweiparser';

const HuaweiPage = () => {
  const navigate = useNavigate();

  const [files, setFiles] = useState({
    '2G': null, '3G': null, '4G': null, 'Voltage': null, 'Alarm': null, 'Packet Loss': null
  });

  const [loading, setLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]); // Track successfully uploaded files

  const handleFileChange = (e, key) => {
    const file = e.target.files[0];
    if (!file) return;

    setFiles((prev) => ({ ...prev, [key]: file }));

    console.log(`Successfully uploaded ${key} file: ${file.name}`);
    setUploadedFiles((prev) => {
      if (!prev.includes(key)) return [...prev, key];
      return prev;
    });
  };

  const allFilesSelected = Object.values(files).every(f => f !== null);

  const handleNext = () => {
    setLoading(true);
    const allData = {};
    const promises = Object.keys(files).map((key) => new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const workbook = XLSX.read(evt.target.result, { type: 'binary' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(sheet);
          allData[key] = parseHuaweiData(rows, key);
          console.log(`Parsed ${key} data:`, allData[key].slice(0, 3)); // log first 3 rows
        } catch (error) {
          console.error(`Error parsing ${key} file:`, error);
        }
        resolve();
      };
      reader.readAsBinaryString(files[key]);
    }));

    Promise.all(promises).then(() => {
      console.log("All files parsed successfully:", allData);
      setLoading(false);
      navigate('/huawei-table', { state: { data: allData } });
    }).catch((err) => {
      console.error("Error processing files:", err);
      setLoading(false);
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold text-blue-400 text-center mb-8">Upload Huawei KPI Files</h2>

      <form className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {['2G', '3G', '4G', 'Voltage', 'Alarm', 'Packet Loss'].map((key) => (
          <div key={key} className="flex flex-col">
            <label className="mb-2 font-semibold text-white">{key} Excel File:</label>
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
              loading ? 'bg-gray-500 cursor-not-allowed' : 'bg-blue-400 hover:bg-blue-500 text-white'
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

export default HuaweiPage;
