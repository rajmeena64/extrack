import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import UserLoginModal from '../user/UserLoginModal/UserLoginModal';
import DashboardSettings from './DashboardSettings';

import BarChartIcon from '@mui/icons-material/BarChart';
import SettingsIcon from '@mui/icons-material/Settings';




import './Sidebar.css';

function Sidebar() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [layoutOpen, setLayoutOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const settingsRef = useRef(null);
  const settingsToggleRef = useRef(null);

  // 🔹 INIT DARK MODE
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    document.body.classList.toggle('dark-mode', savedDarkMode);
  }, []);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('darkMode', newMode);
    document.body.classList.toggle('dark-mode', newMode);
  };

  // 🔹 SIDEBAR TOGGLE
  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  // 🔹 CLOSE SIDEBAR ON OUTSIDE CLICK (MOBILE)
  useEffect(() => {
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
  useEffect(() => {
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
  useEffect(() => {
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
        <Link to="/dashboard" className="nav-item" onClick={() => setSidebarOpen(false)}>
          <i className="fas fa-home"></i>  <span>Dashboard</span>
        </Link>

        <Link to="/add-trade" className="nav-item add-trade-btn" onClick={() => setSidebarOpen(false)}>
          <i className="fas fa-plus"></i> <span>Add tarde</span>
        </Link>

        <Link to="/analytics" className="nav-item" onClick={() => setSidebarOpen(false)}>
          <i className="fas fa-chart-pie"></i> <span>Analytics</span>
        </Link>

<Link to="/TradeView" className="nav-item" onClick={() => setSidebarOpen(false)}>
     < BarChartIcon fontSize='small'/> 
     <span>Markets</span>
</Link>

        {/* SETTINGS */}
        <div
          className="nav-item"
          ref={settingsToggleRef}
          onClick={() => setSettingsOpen(!settingsOpen)}
        >

       <SettingsIcon fontSize='small'/>         <span>  Settings  </span>
          <i className="fas fa-chevron-down dropdown-arrow"></i>
        </div>

        {settingsOpen && (
          <div className="sub-menu" ref={settingsRef}>
            <div className="sub-nav-item">
              <i className="fas fa-moon"></i>
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
              <i className="fas fa-th-large"></i>
              <span>Dashboard Layout</span>
            </div>

            <div className="sub-nav-item" onClick={handleLogout}>
              <i className="fas fa-sign-out-alt"></i> Logout
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
            <DashboardSettings />
          </div>
        </>
      )}

      {/* LOGIN MODAL */}
      <UserLoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </>
  );
}

export default Sidebar;
