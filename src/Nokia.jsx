// src/NokiaPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';

const NokiaPage = () => {
  const navigate = useNavigate();

  // State to store files
  const [files, setFiles] = useState({
    '2G': null,
    '3G': null,
    '4G': null,
    'Voltage': null,
    'Alarm': null,
  });

  // State to store data after reading
  const [data, setData] = useState({});

  const handleFileChange = (e, key) => {
    const file = e.target.files[0];
    if (file && (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.name.endsWith('.xls') || file.name.endsWith('.xlsx'))) {
      setFiles(prev => ({ ...prev, [key]: file }));
    } else {
      alert('Please upload a valid Excel file (.xls or .xlsx)');
    }
  };

  const allFilesSelected = Object.values(files).every(f => f !== null);

  const handleNext = () => {
    const allData = {};
    const promises = Object.keys(files).map(key => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (evt) => {
          const bstr = evt.target.result;
          const workbook = XLSX.read(bstr, { type: 'binary' });
          const sheetName = workbook.SheetNames[0]; // Take first sheet
          const worksheet = workbook.Sheets[sheetName];
          allData[key] = XLSX.utils.sheet_to_json(worksheet);
          resolve();
        };
        reader.readAsBinaryString(files[key]);
      });
    });

    Promise.all(promises).then(() => {
      setData(allData);
      // Navigate to table display page with data
      navigate('/nokia-table', { state: { data: allData } });
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold text-red-400 text-center mb-8">Welcome to Nokia</h2>

      <form className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {['2G', '3G', '4G', 'Voltage', 'Alarm'].map((key) => (
          <div key={key} className="flex flex-col">
            <label className="mb-2 font-semibold text-white">{key} Excel File:</label>
            <input
              type="file"
              accept=".xls,.xlsx"
              onChange={(e) => handleFileChange(e, key)}
              className="p-2 border rounded-md bg-gray-800 text-white border-gray-600"
            />
            {files[key] && <span className="text-green-400 mt-1 text-sm">{files[key].name} selected</span>}
          </div>
        ))}
      </form>

      {allFilesSelected && (
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={handleNext}
            className="px-6 py-3 bg-red-400 text-white font-semibold rounded-lg hover:bg-red-500 transition"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default NokiaPage;
