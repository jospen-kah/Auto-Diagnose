import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";

const ACCEPT = ".xls,.xlsx,.csv";

const readFileRows = async (file) => {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: true, raw: true, WTF: false });
  const firstSheet = wb.SheetNames[0];
  if (!firstSheet) return [];
  const sheet = wb.Sheets[firstSheet];
  return XLSX.utils.sheet_to_json(sheet, { defval: "", blankrows: false });
};

const AssemblePage = () => {
  const navigate = useNavigate();
  const [files, setFiles] = useState({
    worstsite: null,
    cellDown: null,
    incident: null,
  });
  const [data, setData] = useState({
    worstsite: null,
    cellDown: null,
    incident: null,
  });
  const [loadingKey, setLoadingKey] = useState(null);
  const [errorByKey, setErrorByKey] = useState({});

  const handlePick = async (key, file) => {
    if (!file) return;
    setFiles((p) => ({ ...p, [key]: file }));
    setErrorByKey((p) => ({ ...p, [key]: "" }));
    setLoadingKey(key);
    try {
      const rows = await readFileRows(file);
      setData((p) => ({ ...p, [key]: rows }));
    } catch (e) {
      setData((p) => ({ ...p, [key]: null }));
      setErrorByKey((p) => ({
        ...p,
        [key]: e?.message || "Failed to read file",
      }));
    } finally {
      setLoadingKey(null);
    }
  };

  const allLoaded = useMemo(
    () => Object.values(data).every((v) => Array.isArray(v)),
    [data]
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-indigo-400">Assemble</h2>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
        >
          Back
        </button>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded p-5">
        <h3 className="text-lg font-semibold text-yellow-400 mb-4">Upload Assemble Files</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { key: "worstsite", label: "November Worstsite" },
            { key: "cellDown", label: "Cell Down" },
            { key: "incident", label: "Incident" },
          ].map(({ key, label }) => {
            const rows = data[key];
            const file = files[key];
            const err = errorByKey[key];
            const isLoading = loadingKey === key;
            return (
              <div key={key} className="border border-gray-700 rounded p-4 bg-gray-900/30">
                <div className="font-semibold mb-2">{label}</div>
                <input
                  type="file"
                  accept={ACCEPT}
                  className="w-full p-2 bg-gray-800 border border-gray-600 rounded"
                  onChange={(e) => handlePick(key, e.target.files?.[0] || null)}
                />
                <div className="mt-3 text-xs text-gray-300 space-y-1">
                  <div>
                    <strong>File:</strong> {file?.name || "-"}
                  </div>
                  <div>
                    <strong>Status:</strong>{" "}
                    {isLoading
                      ? "Loading..."
                      : err
                      ? "Error"
                      : Array.isArray(rows)
                      ? "Loaded"
                      : "Not loaded"}
                  </div>
                  <div>
                    <strong>Rows:</strong> {Array.isArray(rows) ? rows.length : "-"}
                  </div>
                  {err ? <div className="text-red-300">{err}</div> : null}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex items-center justify-between gap-3 flex-wrap">
          <div className="text-sm text-gray-300">
            {allLoaded ? "All files loaded. Tell me what merge/assembly you want next." : "Load the three files to begin."}
          </div>
          <button
            type="button"
            disabled={!allLoaded}
            onClick={() => {
              // Next step will be implemented once you confirm how to assemble/merge.
              alert("All files loaded. Tell me the assembly rules you want, and I’ll implement them.");
            }}
            className={`px-4 py-2 rounded ${
              allLoaded ? "bg-indigo-600 hover:bg-indigo-700" : "bg-gray-600 cursor-not-allowed"
            }`}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssemblePage;

