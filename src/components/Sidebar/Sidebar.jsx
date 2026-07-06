import React, { lazy, Suspense, useState, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import {
  CalendarRange,
  ChartCandlestick,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Grid2x2,
  History,
  LogOut,
  Moon,
  PieChart,
  Plus,
  Settings,
  Sun,
  X,
} from '../../icons/lucideIcons';
import { HomeIcon, TradesIcon } from '../../icons/interfaceIcons';
import { useTheme } from '../../context/ThemeContext';  // ✅ ADDED

import './Sidebar.css';
import { API_URL } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';
import { loadCachedUserSettings, saveUserSettings } from '../../utils/userSettings';
import { clearClientStorage } from '../../utils/clientStorage';
import { useUserSettings } from '../../hooks/useUserSettings';

const DashboardSettings = lazy(() => import('./DashboardSettings'));

function Sidebar() {
  const cachedPreferences = loadCachedUserSettings()?.preferences || {};
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [layoutOpen, setLayoutOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hoverLocked, setHoverLocked] = useState(Boolean(cachedPreferences.sidebarHoverLocked));
  const { isAuthenticated, setUser } = useAuth();
  const userSettingsQuery = useUserSettings();

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
        !e.target.closest('.sidebar-toggle') &&
        !e.target.closest('.dashboard-toolbar') &&
        !e.target.closest('.toolbar-date-range__panel') &&
        !e.target.closest('.trade-filter-menu') &&
        !e.target.closest('.currency-filter-menu')
      ) {
        setSidebarOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [sidebarOpen]);

  React.useEffect(() => {
    document.body.classList.toggle('dashboard-sidebar-open', sidebarOpen);

    return () => {
      document.body.classList.remove('dashboard-sidebar-open');
    };
  }, [sidebarOpen]);

  React.useEffect(() => {
    document.body.classList.toggle('dashboard-settings-open', settingsOpen);

    return () => {
      document.body.classList.remove('dashboard-settings-open');
    };
  }, [settingsOpen]);

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

    hasUserChangedDarkMode.current = false;
    hasUserChangedHoverLock.current = false;

    const savedDarkMode = userSettingsQuery.data?.preferences?.darkMode;
    if (!hasUserChangedDarkMode.current && typeof savedDarkMode === 'boolean') {
      setDarkModePreference(savedDarkMode);
    }

    const savedHoverLocked = userSettingsQuery.data?.preferences?.sidebarHoverLocked;
    if (!hasUserChangedHoverLock.current && typeof savedHoverLocked === 'boolean') {
      setHoverLocked(savedHoverLocked);
    }
  }, [isAuthenticated, setDarkModePreference, userSettingsQuery.data]);

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
        className={`sidebar-toggle ${sidebarOpen ? 'sidebar-toggle--open' : ''}`}
        onClick={toggleSidebar}
        aria-label="Open navigation menu"
        title="Open navigation menu"
      >
        <span className="sidebar-toggle__icon" aria-hidden="true">
          <span className="sidebar-menu-mark">
            <span />
            <span />
            <span />
          </span>
        </span>
      </button>

      {/* 🔹 SIDEBAR */}
      <div className={`sidebar ${sidebarOpen || settingsOpen ? 'open' : ''} ${settingsOpen ? 'settings-open' : ''} ${hoverLocked ? 'sidebar-hover-locked' : ''}`}>
        {/* NAV LINKS */}
        <NavLink
          to="/dashboard"
          end
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          onClick={() => setSidebarOpen(false)}
          aria-label="Go to Dashboard"
          title="Dashboard"
        >
          <HomeIcon size={16} aria-hidden="true" /> <span className="nav-label">Dashboard</span>
        </NavLink>

        <NavLink
          to="/add-trade"
          className={({ isActive }) => `nav-item add-trade-btn${isActive ? ' active' : ''}`}
          onClick={() => setSidebarOpen(false)}
          aria-label="Go to Add Trade"
          title="Add Trade"
        >
          <Plus size={16} aria-hidden="true" /> <span className="nav-label">Add trade</span>
        </NavLink>

        <NavLink
          to="/analytics"
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          onClick={() => setSidebarOpen(false)}
          aria-label="Go to Analytics"
          title="Analytics"
        >
          <PieChart size={16} aria-hidden="true" /> <span className="nav-label">Analytics</span>
        </NavLink>

        <NavLink
          to="/economic-calendar"
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          onClick={() => setSidebarOpen(false)}
          aria-label="Go to Economic Calendar"
          title="Economic Calendar"
        >
          <CalendarRange size={16} aria-hidden="true" />
          <span className="nav-label">Economic Calendar</span>
        </NavLink>

        <NavLink
          to="/backtesting"
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          onClick={() => setSidebarOpen(false)}
          aria-label="Go to Backtesting"
          title="Backtesting"
        >
          <History size={16} aria-hidden="true" />
          <span className="nav-label">Backtesting</span>
        </NavLink>

        <NavLink
          to="/chart"
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          onClick={() => setSidebarOpen(false)}
          aria-label="Go to Chart"
          title="Chart"
        >
          <ChartCandlestick size={16} aria-hidden="true" />
          <span className="nav-label">Chart</span>
        </NavLink>

        <NavLink
          to="/TradeView"
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          onClick={() => setSidebarOpen(false)}
          aria-label="Go to Trades"
          title="Trades"
        >
          <TradesIcon size={16} aria-hidden="true" />
          <span className="nav-label">Trades</span>
        </NavLink>

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
                <button
                  type="button"
                  className={`theme-mode-switch ${darkMode ? 'is-on' : ''}`}
                  onClick={handleDarkModeChange}
                  aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                  aria-pressed={darkMode}
                >
                  <span className="theme-mode-switch__track" aria-hidden="true">
                    <span className="theme-mode-switch__thumb">
                      {darkMode ? <Moon size={11} /> : <Sun size={11} />}
                    </span>
                  </span>
                  <span className="theme-mode-switch__text">{darkMode ? 'On' : 'Off'}</span>
                </button>
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
