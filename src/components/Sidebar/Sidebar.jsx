import React, { lazy, Suspense, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  ChartLine,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Grid2x2,
  Home,
  LogOut,
  Moon,
  PieChart,
  Plus,
  Settings,
  Sun,
  X,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';  // ✅ ADDED

import './Sidebar.css';
import { API_URL } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';
import { loadCachedUserSettings, loadUserSettings, saveUserSettings } from '../../utils/userSettings';
import { clearClientStorage } from '../../utils/clientStorage';

const DashboardSettings = lazy(() => import('./DashboardSettings'));

function Sidebar() {
  const cachedPreferences = loadCachedUserSettings()?.preferences || {};
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [layoutOpen, setLayoutOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hoverLocked, setHoverLocked] = useState(Boolean(cachedPreferences.sidebarHoverLocked));
  const { isAuthenticated, setUser } = useAuth();

  const settingsRef = useRef(null);
  const settingsToggleRef = useRef(null);

  // ✅ ADDED - from context
  const { darkMode, setDarkModePreference } = useTheme();
  const hasUserChangedDarkMode = useRef(false);
  const hasUserChangedHoverLock = useRef(false);



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

  React.useEffect(() => {
    if (!isAuthenticated || !setDarkModePreference) {
      hasUserChangedDarkMode.current = false;
      hasUserChangedHoverLock.current = false;
      return;
    }

    let isCurrent = true;
    hasUserChangedDarkMode.current = false;
    hasUserChangedHoverLock.current = false;

    loadUserSettings()
      .then((settings) => {
        const savedDarkMode = settings?.preferences?.darkMode;
        if (isCurrent && !hasUserChangedDarkMode.current && typeof savedDarkMode === 'boolean') {
          setDarkModePreference(savedDarkMode);
        }

        const savedHoverLocked = settings?.preferences?.sidebarHoverLocked;
        if (isCurrent && !hasUserChangedHoverLock.current && typeof savedHoverLocked === 'boolean') {
          setHoverLocked(savedHoverLocked);
        }
      })
      .catch(() => null);

    return () => {
      isCurrent = false;
    };
  }, [isAuthenticated, setDarkModePreference]);

  const handleDarkModeChange = () => {
    const nextDarkMode = !darkMode;
    hasUserChangedDarkMode.current = true;
    setDarkModePreference(nextDarkMode);

    if (isAuthenticated) {
      saveUserSettings({ preferences: { darkMode: nextDarkMode } })
        .catch(() => null);
    }
  };

  const handleHoverLockChange = () => {
    setHoverLocked((previous) => {
      const nextHoverLocked = !previous;
      hasUserChangedHoverLock.current = true;

      if (isAuthenticated) {
        saveUserSettings({ preferences: { sidebarHoverLocked: nextHoverLocked } })
          .catch(() => null);
      }

      return nextHoverLocked;
    });
    setSettingsOpen(false);
  };

  const handleLogout = (e) => {
    e.preventDefault();
    fetch(`${API_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include'
    })
      .catch(() => null)
      .finally(() => {
        clearClientStorage();
        setUser(null);
        window.dispatchEvent(new Event('auth:logout'));
      });
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
        <span className="sidebar-toggle__icon" aria-hidden="true">☰</span>
      </button>

      {/* 🔹 SIDEBAR */}
      <div className={`sidebar ${sidebarOpen || settingsOpen ? 'open' : ''} ${settingsOpen ? 'settings-open' : ''} ${hoverLocked ? 'sidebar-hover-locked' : ''}`}>
        {/* NAV LINKS */}
        <Link
          to="/dashboard"
          className="nav-item"
          onClick={() => setSidebarOpen(false)}
          aria-label="Go to Dashboard"
          title="Dashboard"
        >
          <Home size={16} aria-hidden="true" />  <span className="nav-label">Dashboard</span>
        </Link>

        <Link
          to="/add-trade"
          className="nav-item add-trade-btn"
          onClick={() => setSidebarOpen(false)}
          aria-label="Go to Add Trade"
          title="Add Trade"
        >
          <Plus size={16} aria-hidden="true" /> <span className="nav-label">Add trade</span>
        </Link>

        <Link
          to="/analytics"
          className="nav-item"
          onClick={() => setSidebarOpen(false)}
          aria-label="Go to Analytics"
          title="Analytics"
        >
          <PieChart size={16} aria-hidden="true" /> <span className="nav-label">Analytics</span>
        </Link>

        <Link
          to="/economic-calendar"
          className="nav-item"
          onClick={() => setSidebarOpen(false)}
          aria-label="Go to Economic Calendar"
          title="Economic Calendar"
        >
          <CalendarDays size={16} aria-hidden="true" />
          <span className="nav-label">Economic Calendar</span>
        </Link>

        <Link
          to="/TradeView"
          className="nav-item"
          onClick={() => setSidebarOpen(false)}
          aria-label="Go to Trades"
          title="Trades"
        >
          <ChartLine size={16} aria-hidden="true" />
          <span className="nav-label">Trades</span>
        </Link>

        {/* SETTINGS */}
        <div className="sidebar-settings-group">
          <div
            className="nav-item"
            ref={settingsToggleRef}
            onClick={() => setSettingsOpen(!settingsOpen)}
            role="button"
            tabIndex="0"
            aria-haspopup="true"
            aria-expanded={settingsOpen}
            aria-label="Settings"
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSettingsOpen(!settingsOpen); } }}
          >
            <Settings size={16} aria-hidden="true" />
            <span className="nav-label">Settings</span>
            <ChevronDown className="dropdown-arrow" size={16} aria-hidden="true" />
          </div>

          {settingsOpen && (
            <div className="sub-menu" ref={settingsRef} role="menu">
              <div className="sub-nav-item settings-dark-mode-item">
                <Moon size={16} aria-hidden="true" />
                <span>Dark mode</span>
                <label className="switch">
                  <input type="checkbox" checked={darkMode} onChange={handleDarkModeChange} aria-label="Toggle dark mode" />
                  <span className="slider round"></span>
                </label>
              </div>

              <div
                className="sub-nav-item"
                onClick={() => {
                  setLayoutOpen(true);
                  setSettingsOpen(false);
                }}
                role="menuitem"
                tabIndex="0"
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setLayoutOpen(true); setSettingsOpen(false); } }}
              >
                <Grid2x2 size={16} aria-hidden="true" />
                <span>Dashboard Layout</span>
              </div>

              {isAuthenticated && (
                <div
                  className="sub-nav-item"
                  onClick={handleLogout}
                  role="menuitem"
                  tabIndex="0"
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleLogout(e); } }}
                >
                  <LogOut size={16} aria-hidden="true" /> Logout
                </div>
              )}
            </div>
          )}
        </div>

        <button
          className="nav-item sidebar-theme-toggle"
          type="button"
          onClick={handleDarkModeChange}
          aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          title={darkMode ? 'Light mode' : 'Dark mode'}
        >
          {darkMode ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
          <span className="nav-label">{darkMode ? 'Light mode' : 'Dark mode'}</span>
        </button>

        <button
          className="nav-item sidebar-collapse-toggle"
          type="button"
          onClick={handleHoverLockChange}
          aria-label={hoverLocked ? 'Enable sidebar hover expand' : 'Keep sidebar icon only'}
          title={hoverLocked ? 'Enable hover expand' : 'Keep icon only'}
        >
          {hoverLocked ? <ChevronsRight size={16} aria-hidden="true" /> : <ChevronsLeft size={16} aria-hidden="true" />}
          <span className="nav-label">{hoverLocked ? 'Expand on hover' : 'Icon only'}</span>
        </button>
      </div>

      {/* 🔹 DASHBOARD LAYOUT PANEL */}
      {layoutOpen && (
        <>
          <div className="layout-overlay" onClick={() => setLayoutOpen(false)} />
          <div className="layout-panel">
            <div className="layout-panel-header">
              <span>Dashboard Layout</span>
              <button onClick={() => setLayoutOpen(false)} aria-label="Close dashboard layout">
                <X size={16} aria-hidden="true" />
              </button>
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
