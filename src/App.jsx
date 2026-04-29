import React, { useEffect, useMemo, useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Link, useLocation } from 'react-router-dom';

import NokiaPage from './Nokia';
import ZTEPage from './Zte';
import ZTETablePage from './ZteTablePage';
import HuaweiTablePage from './HuaweiTablePage';
import HuaweiPage from './Huawei';
import NokiaTablePage from './NokiaTablePage';
import GraphsPage from './GraphsPage';
import AssemblePage from './AssemblePage';
import WelcomePage from './WelcomePage';

// Navigation Component with active tab highlighting
const TechLinks = () => {
  const location = useLocation();

  const links = [
    { path: '/nokia', label: 'Nokia' },
    { path: '/zte', label: 'ZTE' },
    { path: '/huawei', label: 'Huawei' },
    { path: '/assemble', label: 'Assemble' },
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

const ThemeIconButton = ({ theme, setTheme }) => {
  const isDark = theme === 'dark';
  const bg = isDark ? "bg-slate-800 text-white hover:bg-slate-700" : "bg-gray-200 text-gray-900 hover:bg-gray-300";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`fixed top-4 right-4 z-50 p-2 rounded-lg shadow ${bg}`}
    >
      {isDark ? (
        // Sun icon
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M12 18.25C15.4518 18.25 18.25 15.4518 18.25 12C18.25 8.54822 15.4518 5.75 12 5.75C8.54822 5.75 5.75 8.54822 5.75 12C5.75 15.4518 8.54822 18.25 12 18.25Z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M12 2.75V4.5M12 19.5V21.25M4.5 12H2.75M21.25 12H19.5M5.35 5.35L6.6 6.6M17.4 17.4L18.65 18.65M18.65 5.35L17.4 6.6M6.6 17.4L5.35 18.65"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        // Moon icon
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M21 14.5C19.3 15.6 17.2 16.2 15 16.2C9.477 16.2 5 11.723 5 6.2C5 5 5.2 3.9 5.6 2.9C2.6 4.2 1 7.4 1 10.8C1 16.9 5.9 21.8 12 21.8C16.1 21.8 19.7 19.5 21 14.5Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
};

// Component to show dynamic heading based on route
const PageHeading = () => {
  const location = useLocation();
  let heading = '';

  if (location.pathname === '/') heading = 'Choose Your Vendor';
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
  const initialTheme = useMemo(() => {
    try {
      const saved = localStorage.getItem('theme');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {}

    // Respect OS preference as a fallback
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }, []);

  const [theme, setTheme] = useState(initialTheme);

  useEffect(() => {
    try {
      localStorage.setItem('theme', theme);
    } catch {}

    document.documentElement.classList.toggle('theme-light', theme === 'light');
    document.documentElement.classList.toggle('theme-dark', theme === 'dark');
  }, [theme]);

  return (
    <Router>
      <div className="flex flex-col min-h-screen bg-gray-950 text-white">
        {/* Navigation */}
        <TechLinks />
        <ThemeIconButton theme={theme} setTheme={setTheme} />

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
            <Route path="/graphs" element={<GraphsPage />} />
            <Route path="/assemble" element={<AssemblePage />} />
            <Route path="/huawei" element={<HuaweiPage />} />
            <Route path="/" element={<WelcomePage />} />
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
