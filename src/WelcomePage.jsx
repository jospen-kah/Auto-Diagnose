import React from "react";
import { useNavigate } from "react-router-dom";

const WelcomePage = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 text-center">
        <h2 className="text-2xl font-bold text-purple-400 mb-6">
          Welcome - Choose a Vendor
        </h2>

        <p className="text-gray-300 mb-8">
          Select the vendor to upload the KPI files and generate the analysis
          table.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            type="button"
            onClick={() => navigate("/nokia")}
            className="px-6 py-4 bg-red-500 hover:bg-red-600 text-white rounded font-semibold"
          >
            Nokia
          </button>

          <button
            type="button"
            onClick={() => navigate("/huawei")}
            className="px-6 py-4 bg-blue-500 hover:bg-blue-600 text-white rounded font-semibold"
          >
            Huawei
          </button>

          <button
            type="button"
            onClick={() => navigate("/zte")}
            className="px-6 py-4 bg-purple-500 hover:bg-purple-600 text-white rounded font-semibold"
          >
            ZTE
          </button>
        </div>

        <div className="mt-6 text-xs text-gray-400">
          You can also use the global navigation to open `Assemble`.
        </div>
      </div>
    </div>
  );
};

export default WelcomePage;

