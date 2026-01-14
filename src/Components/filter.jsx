// src/components/Filters.jsx
import React from "react";

const Filters = ({
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  priorityFilter,
  setPriorityFilter,
  domainFilter,
  setDomainFilter,
}) => {
  const clearFilters = () => {
    setSearch("");
    setStatusFilter("ALL");
    setPriorityFilter("ALL");
    setDomainFilter("ALL");
  };

  return (
    <div className="flex gap-4 px-4 mb-3 flex-wrap items-center">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="px-3 py-2 bg-gray-800 rounded"
        placeholder="Search site"
      />

      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        className="bg-gray-800 px-3 py-2 rounded"
      >
        <option value="ALL">All Status</option>
        <option value="Ok">Ok</option>
        <option value="Degraded">Degraded</option>
        <option value="Down">Down</option>
      </select>

      <select
        value={priorityFilter}
        onChange={(e) => setPriorityFilter(e.target.value)}
        className="bg-gray-800 px-3 py-2 rounded"
      >
        <option value="ALL">All Priorities</option>
        <option value="P0">P0</option>
        <option value="P1">P1</option>
        <option value="P2">P2</option>
        <option value="OK">OK</option>
      </select>

      <select
        value={domainFilter}
        onChange={(e) => setDomainFilter(e.target.value)}
        className="bg-gray-800 px-3 py-2 rounded"
      >
        <option value="ALL">All Domains</option>
        <option value="RAN">RAN</option>
        <option value="Power">Power</option>
        <option value="TX">TX</option>
      </select>

      <button
        onClick={clearFilters}
        className="px-4 py-2 bg-red-600 rounded hover:bg-red-700"
      >
        Clear Filters
      </button>
    </div>
  );
};

export default Filters;
