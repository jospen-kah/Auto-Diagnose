import React from "react";
import { useNavigate } from "react-router-dom";

const Graphs = ({ sites = [], datesByKPI = {}, vendor = "", backPath = "/" }) => {
  const navigate = useNavigate();

  return (
    <div className="px-4 pt-3">
      <button
        type="button"
        onClick={() =>
          navigate("/graphs", {
            state: { sites, datesByKPI, vendor, backPath },
          })
        }
        className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
      >
        Graphs
      </button>
    </div>
  );
};

export default Graphs;
