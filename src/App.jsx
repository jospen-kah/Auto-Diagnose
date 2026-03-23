import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link, useLocation } from 'react-router-dom';

import NokiaPage from './Nokia';
import ZTEPage from './Zte';
import ZTETablePage from './ZteTablePage';
import HuaweiTablePage from './HuaweiTablePage';
import HuaweiPage from './Huawei';
import NokiaTablePage from './NokiaTablePage';

// Navigation Component with active tab highlighting
const TechLinks = () => {
  const location = useLocation();

  const links = [
    { path: '/nokia', label: 'Nokia' },
    { path: '/zte', label: 'ZTE' },
    { path: '/huawei', label: 'Huawei' },
  ];

  return (
    <nav className="flex justify-center mt-6">
      <ul className="flex gap-4">
        {links.map((link) => {
          const isActive = location.pathname.startsWith(link.path);
          return (
            <li key={link.path}>
              <Link
                to={link.path}
                className={`px-6 py-2 rounded-lg transition ${
                  isActive
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-800 text-white hover:bg-slate-700'
                }`}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

// Component to show dynamic heading based on route
const PageHeading = () => {
  const location = useLocation();
  let heading = '';

  if (location.pathname.startsWith('/zte')) heading = 'ZTE Auto Diagnose';
  else if (location.pathname.startsWith('/huawei')) heading = 'Huawei Auto Diagnose';
  else if (location.pathname.startsWith('/nokia')) heading = 'Nokia Auto Diagnose';
  else heading = 'KPI Dashboard';

  return (
    <h1 className="text-3xl font-bold text-purple-400 text-center mt-6 mb-4">
      {heading}
    </h1>
  );
};

const App = () => {
  return (
    <Router>
      <div className="flex flex-col min-h-screen bg-gray-950 text-white">
        {/* Navigation */}
        <TechLinks />

        {/* Page Heading */}
        <PageHeading />

        {/* Page Content */}
        <div className="grow flex flex-col mt-4 px-0 w-full">
          <Routes>
            <Route path="/nokia" element={<NokiaPage />} />
            <Route path="/zte" element={<ZTEPage />} />
            <Route path="/zte-table" element={<ZTETablePage />} />
            <Route path="/huawei-table" element={<HuaweiTablePage />} />
            <Route path="/nokia-table" element={<NokiaTablePage />} />
            <Route path="/huawei" element={<HuaweiPage />} />
            <Route path="/" element={<ZTEPage />} />
          </Routes>
        </div>

        {/* Footer */}
        <footer className="bg-slate-800 text-gray-300 text-center py-4 mt-8 rounded-t-lg">
          &copy; {new Date().getFullYear()} by MSP/OCM Service Desk, Autodiagnose (V1.1)
        </footer>
      </div>
    </Router>
  );
};

export default App;
