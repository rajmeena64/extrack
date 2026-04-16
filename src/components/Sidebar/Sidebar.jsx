import React, { lazy, Suspense, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';  // ✅ ADDED

import './Sidebar.css';
import LegacyIcon from '../Common/LegacyIcon';

const DashboardSettings = lazy(() => import('./DashboardSettings'));

function Sidebar() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [layoutOpen, setLayoutOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const settingsRef = useRef(null);
  const settingsToggleRef = useRef(null);

  // ✅ ADDED - from context
  const { darkMode, toggleDarkMode } = useTheme();



  // 🔹 SIDEBAR TOGGLE
  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  // 🔹 CLOSE SIDEBAR ON OUTSIDE CLICK (MOBILE)
  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        sidebarOpen &&
        !e.target.closest('.sidebar') &&
        !e.target.closest('.sidebar-toggle')
      ) {
        setSidebarOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [sidebarOpen]);

  // 🔹 CLOSE SETTINGS ON OUTSIDE CLICK
  React.useEffect(() => {
    const handleOutsideSettings = (e) => {
      if (
        settingsOpen &&
        settingsRef.current &&
        !settingsRef.current.contains(e.target) &&
        settingsToggleRef.current &&
        !settingsToggleRef.current.contains(e.target)
      ) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideSettings);
    return () => document.removeEventListener('mousedown', handleOutsideSettings);
  }, [settingsOpen]);

  // 🔹 ESC KEY
  React.useEffect(() => {
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        setSettingsOpen(false);
        setLayoutOpen(false);
        setSidebarOpen(false);
      }
    };
    document.addEventListener('keydown', escHandler);
    return () => document.removeEventListener('keydown', escHandler);
  }, []);

  const handleLogout = (e) => {
    e.preventDefault();
    localStorage.removeItem('currentUser');
    localStorage.removeItem('tradeMode');
    window.location.reload();
  };

  return (
    <>
      {/* 🔹 TOGGLE BUTTON */}
      <button
        className="sidebar-toggle"
        onClick={toggleSidebar}
        aria-label={sidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
        title={sidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
      >
        ☰
      </button>

      {/* 🔹 SIDEBAR */}
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* LOGO */}
        <div className="sidebar-logo">
          <span className="logo-text">
            <span className="ex">EX</span>
            <span className="track">TRACK</span>
          </span>
        </div>

        {/* NAV LINKS */}
        <Link
          to="/dashboard"
          className="nav-item"
          onClick={() => setSidebarOpen(false)}
          aria-label="Go to Dashboard"
          title="Dashboard"
        >
                <LegacyIcon className="fas fa-home" />  <span className="nav-label">Dashboard</span>
        </Link>

        <Link
          to="/add-trade"
          className="nav-item add-trade-btn"
          onClick={() => setSidebarOpen(false)}
          aria-label="Go to Add Trade"
          title="Add Trade"
        >
                <LegacyIcon className="fas fa-plus" /> <span className="nav-label">Add tarde</span>
        </Link>

        <Link
          to="/analytics"
          className="nav-item"
          onClick={() => setSidebarOpen(false)}
          aria-label="Go to Analytics"
          title="Analytics"
        >
                <LegacyIcon className="fas fa-chart-pie" /> <span className="nav-label">Analytics</span>
        </Link>

        <Link
          to="/TradeView"
          className="nav-item"
          onClick={() => setSidebarOpen(false)}
          aria-label="Go to Trades"
          title="Trades"
        >
          <LegacyIcon className="fas fa-chart-line" />
          <span className="nav-label">Trades</span>
        </Link>

        {/* SETTINGS */}
        <div
          className="nav-item"
          ref={settingsToggleRef}
          onClick={() => setSettingsOpen(!settingsOpen)}
        >
          <LegacyIcon className="fas fa-cog" />
          <span className="nav-label">Settings</span>
              <LegacyIcon className="fas fa-chevron-down dropdown-arrow" />
        </div>

        {settingsOpen && (
          <div className="sub-menu" ref={settingsRef}>
            <div className="sub-nav-item">
                  <LegacyIcon className="fas fa-moon" />
              <span>Dark mode</span>
              <label className="switch">
                <input type="checkbox" checked={darkMode} onChange={toggleDarkMode} />
                <span className="slider round"></span>
              </label>
            </div>

            <div
              className="sub-nav-item"
              onClick={() => {
                setLayoutOpen(true);
                setSettingsOpen(false);
              }}
            >
                    <LegacyIcon className="fas fa-th-large" />
              <span>Dashboard Layout</span>
            </div>

            <div className="sub-nav-item" onClick={handleLogout}>
                  <LegacyIcon className="fas fa-sign-out-alt" /> Logout
            </div>
          </div>
        )}
      </div>

      {/* 🔹 DASHBOARD LAYOUT PANEL */}
      {layoutOpen && (
        <>
          <div className="layout-overlay" onClick={() => setLayoutOpen(false)} />
          <div className="layout-panel">
            <div className="layout-panel-header">
              <span>Dashboard Layout</span>
              <button onClick={() => setLayoutOpen(false)}>✖</button>
            </div>
            <Suspense fallback={null}>
              <DashboardSettings />
            </Suspense>
          </div>
        </>
      )}
    </>
  );
}

export default Sidebar;
