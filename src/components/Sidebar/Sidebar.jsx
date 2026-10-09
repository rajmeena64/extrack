import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  HomeLine,
  BarChartSquare02,
  PieChart03,
  Moon01,
  ChevronDown,
} from '@untitledui/icons';
import {
  CalendarIcon,
  ChartCandlestick,
  ChartLine,
  ChevronsLeft,
  ChevronsRight,
  History,
  Plus,
  Ratio,
  Sun,
  TradesIcon,
} from '@/icons';
import { Dropdown, Tooltip } from '@/components/ui';
import { Button as AriaButton } from 'react-aria-components';
import Logo from '../Common/Logo/Logo';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { loadCachedUserSettings, saveUserSettings } from '../../utils/user/userSettings';

const SIDEBAR_EXPANDED_STORAGE_KEY = 'entrack:sidebar_expanded';

const getInitialSidebarExpanded = () => {
  try {
    const saved = localStorage.getItem(SIDEBAR_EXPANDED_STORAGE_KEY);
    if (saved !== null) {
      return saved === 'true';
    }
    const cached = loadCachedUserSettings()?.preferences?.sidebarExpanded;
    if (typeof cached === 'boolean') {
      return cached;
    }
  } catch {
  }
  return true;
};

function Sidebar() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState({});
  const [sidebarExpanded, setSidebarExpandedState] = useState(getInitialSidebarExpanded);
  const [isDesktop, setIsDesktop] = useState(typeof window !== 'undefined' ? window.innerWidth >= 1024 : true);

  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { darkMode, setDarkModePreference } = useTheme();

  const isSlimDesktop = isDesktop && !sidebarExpanded;

  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth >= 1024;
      setIsDesktop(desktop);
      if (desktop) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const setSidebarExpanded = useCallback((updater) => {
    setSidebarExpandedState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try {
        localStorage.setItem(SIDEBAR_EXPANDED_STORAGE_KEY, String(next));
      } catch {
      }
      if (isAuthenticated) {
        saveUserSettings({ preferences: { sidebarExpanded: next } }).catch(() => null);
      }
      return next;
    });
  }, [isAuthenticated]);

  useEffect(() => {
    document.body.classList.toggle('sidebar-expanded', sidebarExpanded);
    document.body.classList.toggle('sidebar-compact', !sidebarExpanded);
    return () => {
      document.body.classList.remove('sidebar-expanded', 'sidebar-compact');
    };
  }, [sidebarExpanded]);

  useEffect(() => {
    document.body.classList.toggle('dashboard-sidebar-open', sidebarOpen);
    return () => {
      document.body.classList.remove('dashboard-sidebar-open');
    };
  }, [sidebarOpen]);

  useEffect(() => {
    const handleToggle = () => setSidebarOpen((prev) => !prev);
    const handleOpen = () => setSidebarOpen(true);
    const handleClose = () => setSidebarOpen(false);
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };

    window.addEventListener('sidebar:toggle', handleToggle);
    window.addEventListener('sidebar:open', handleOpen);
    window.addEventListener('sidebar:close', handleClose);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('sidebar:toggle', handleToggle);
      window.removeEventListener('sidebar:open', handleOpen);
      window.removeEventListener('sidebar:close', handleClose);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleDarkModeChange = useCallback(() => {
    const nextDarkMode = !darkMode;
    setDarkModePreference?.(nextDarkMode);
    if (isAuthenticated) {
      saveUserSettings({ preferences: { darkMode: nextDarkMode } }).catch(() => null);
    }
  }, [darkMode, isAuthenticated, setDarkModePreference]);

  const handleSidebarModeToggle = useCallback(() => {
    setSidebarExpanded((prev) => !prev);
  }, [setSidebarExpanded]);

  const navItems = useMemo(
    () => [
      { label: 'Dashboard', href: '/dashboard', icon: HomeLine },
      { label: 'Analytics', href: '/analytics', icon: ChartLine },
      { label: 'Add trade', href: '/add-trade', icon: Plus },
      { divider: true },
      {
        label: 'Market',
        icon: BarChartSquare02,
        items: [
          { label: 'Chart', href: '/chart', icon: ChartCandlestick },
          { label: 'Heatmaps', href: '/heatmaps', icon: Ratio },
        ],
      },
      { divider: true },
      { label: 'AI Analysis', href: '/ai-analysis', icon: PieChart03 },
      { label: 'Economic Calendar', href: '/economic-calendar', icon: CalendarIcon },
      { label: 'Backtesting', href: '/backtesting', icon: History },
      { label: 'Trades', href: '/trade-log', icon: TradesIcon },
    ],
    []
  );

  const itemClass = (isActive) =>
    `flex items-center w-full h-10 px-2.5 rounded-xl text-[13.5px] font-medium transition-colors duration-150 cursor-pointer overflow-hidden whitespace-nowrap ${
      isActive
        ? 'bg-[color-mix(in_srgb,var(--accent-ink)_10%,var(--bg-card))] text-[var(--accent-ink)] font-semibold dark:bg-[#202020] dark:text-white'
        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--accent-ink)]'
    }`;

  const slimItemClass = (isActive) =>
    `flex items-center justify-center w-10 h-10 rounded-xl text-[13.5px] font-medium transition-colors duration-150 cursor-pointer shrink-0 border-0 bg-transparent ${
      isActive
        ? 'bg-[color-mix(in_srgb,var(--accent-ink)_10%,var(--bg-card))] text-[var(--accent-ink)] font-semibold dark:bg-[#202020] dark:text-white'
        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--accent-ink)]'
    }`;

  const childItemClass = (isActive) =>
    `flex items-center w-full h-9 px-2.5 rounded-lg text-[13px] font-medium transition-colors duration-150 cursor-pointer overflow-hidden whitespace-nowrap ${
      isActive
        ? 'bg-[color-mix(in_srgb,var(--accent-ink)_10%,var(--bg-card))] text-[var(--accent-ink)] font-semibold dark:bg-[#202020] dark:text-white'
        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--accent-ink)]'
    }`;

  const renderItem = (item, idx) => {
    if (item.divider) {
      return <hr key={`divider-${idx}`} className="border-0 border-t border-[var(--border-light)] dark:border-[#222] my-1.5 mx-1" />;
    }

    const Icon = item.icon;

    if (item.items) {
      const isChildActive = item.items.some((child) => child.href === location.pathname);
      const isGroupOpen = !!(openGroups[item.label] ?? isChildActive) && !isSlimDesktop;

      if (isSlimDesktop) {
        return (
          <div key={item.label} className="flex justify-center w-full my-0.5">
            <Dropdown.Root>
              <Tooltip title={item.label} placement="right" delay={120}>
                <AriaButton
                  className={slimItemClass(isChildActive)}
                  aria-label={item.label}
                >
                  <Icon className="shrink-0" size={20} aria-hidden={true} />
                </AriaButton>
              </Tooltip>

              <Dropdown.Popover placement="right top" className="w-44 p-1 rounded-xl shadow-lg border border-[var(--border-light)] dark:border-[#222] bg-[var(--bg-card)] dark:bg-[var(--bg-secondary)] z-[10020]">
                <div className="px-2.5 py-1.5 text-xs font-semibold text-[var(--text-muted)] border-b border-[var(--border-light)] dark:border-[#222] mb-1">
                  {item.label}
                </div>
                {item.items.map((child) => {
                  const ChildIcon = child.icon;
                  const isChildActiveItem = location.pathname === child.href;
                  return (
                    <NavLink
                      key={child.href}
                      to={child.href}
                      className={childItemClass(isChildActiveItem)}
                      onClick={() => setSidebarOpen(false)}
                      title={child.label}
                    >
                      <span className="w-5 h-5 min-w-5 flex items-center justify-center shrink-0">
                        <ChildIcon className="shrink-0" size={16} aria-hidden={true} />
                      </span>
                      <span className="truncate ml-2">{child.label}</span>
                    </NavLink>
                  );
                })}
              </Dropdown.Popover>
            </Dropdown.Root>
          </div>
        );
      }

      return (
        <div key={item.label} className="flex flex-col w-full my-0.5">
          <button
            type="button"
            className={itemClass(isChildActive)}
            onClick={() => {
              setOpenGroups((prev) => ({ ...prev, [item.label]: !prev[item.label] }));
            }}
            title={item.label}
            aria-expanded={isGroupOpen}
          >
            <span className="w-6 h-6 min-w-6 flex items-center justify-center shrink-0">
              <Icon className="shrink-0" size={20} aria-hidden={true} />
            </span>
            <div className="flex items-center justify-between flex-1 min-w-0 ml-2.5 overflow-hidden whitespace-nowrap">
              <span className="truncate">{item.label}</span>
              <ChevronDown
                className={`shrink-0 transition-transform duration-200 ${isGroupOpen ? 'rotate-180' : ''}`}
                size={16}
                aria-hidden={true}
              />
            </div>
          </button>

          <div
            className={`grid transition-[grid-template-rows,opacity] duration-200 ease-[cubic-bezier(0.2,0,0,1)] ${
              isGroupOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'
            }`}
          >
            <div className="overflow-hidden flex flex-col gap-0.5 pl-4 pt-0.5">
              {item.items.map((child) => {
                const ChildIcon = child.icon;
                const isChildItemActive = location.pathname === child.href;
                return (
                  <NavLink
                    key={child.href}
                    to={child.href}
                    className={childItemClass(isChildItemActive)}
                    onClick={() => setSidebarOpen(false)}
                    title={child.label}
                  >
                    <span className="w-5 h-5 min-w-5 flex items-center justify-center shrink-0">
                      <ChildIcon className="shrink-0" size={17} aria-hidden={true} />
                    </span>
                    <span className="truncate ml-2">{child.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    const isExactActive = location.pathname === item.href || (item.href === '/dashboard' && location.pathname === '/');

    if (isSlimDesktop) {
      return (
        <div key={item.href} className="flex justify-center w-full my-0.5">
          <Tooltip title={item.label} placement="right" delay={120}>
            <AriaButton
              className={slimItemClass(isExactActive)}
              onPress={() => {
                navigate(item.href);
                setSidebarOpen(false);
              }}
              aria-label={item.label}
            >
              <Icon className="shrink-0" size={20} aria-hidden={true} />
            </AriaButton>
          </Tooltip>
        </div>
      );
    }

    return (
      <NavLink
        key={item.href}
        to={item.href}
        end={item.href === '/' || item.href === '/dashboard'}
        className={({ isActive }) => itemClass(isActive || isExactActive)}
        onClick={() => setSidebarOpen(false)}
        title={item.label}
      >
        <span className="w-6 h-6 min-w-6 flex items-center justify-center shrink-0">
          <Icon className="shrink-0" size={20} aria-hidden={true} />
        </span>
        <div className="flex items-center flex-1 min-w-0 ml-2.5 overflow-hidden whitespace-nowrap">
          <span className="truncate">{item.label}</span>
        </div>
      </NavLink>
    );
  };

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 w-screen h-screen bg-slate-900/45 backdrop-blur-[2px] z-[10004]"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setSidebarOpen(false);
          }}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed top-2 left-2 bottom-2 z-[1000] flex flex-col justify-between p-2 rounded-2xl overflow-hidden bg-[var(--bg-card)] dark:bg-[var(--bg-secondary)] border border-[var(--border-light)] dark:border-[#1f1f1f] shadow-[0_4px_24px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.25)] select-none max-lg:top-0 max-lg:bottom-0 max-lg:left-0 max-lg:h-screen max-lg:w-[260px] max-lg:rounded-none max-lg:rounded-r-2xl max-lg:pt-6 max-lg:z-[10005] max-lg:shadow-2xl max-lg:transition-transform max-lg:duration-200 lg:transition-[width] lg:duration-200 lg:ease-[cubic-bezier(0.2,0,0,1)] ${
          sidebarExpanded ? 'w-[236px]' : 'w-[64px]'
        } ${
          sidebarOpen ? 'max-lg:translate-x-0' : 'max-lg:-translate-x-full'
        }`}
        aria-label="Sidebar Navigation"
      >
        <div className="flex items-center justify-center h-11 px-1 mb-1.5 shrink-0 overflow-hidden">
          <NavLink
            to="/dashboard"
            className={`flex items-center h-full rounded-xl hover:bg-[var(--bg-hover)] transition-colors text-inherit no-underline ${
              !isSlimDesktop ? 'w-full px-2 gap-2.5 justify-start' : 'w-10 justify-center'
            }`}
            title="Entrack Dashboard"
            aria-label="Entrack Dashboard"
          >
            <Logo compact={isSlimDesktop} showText={!isSlimDesktop} className="shrink-0" />
          </NavLink>
        </div>

        <nav className="flex flex-col flex-1 justify-between overflow-hidden" aria-label="Main Navigation">
          <div className="flex flex-col gap-0.5 overflow-y-auto overflow-x-hidden scrollbar-hide py-1">
            {navItems.map(renderItem)}
          </div>

          <div className="flex flex-col gap-0.5 mt-auto pt-1 border-t border-[var(--border-light)] dark:border-[#222]">
            {isSlimDesktop ? (
              <div className="flex justify-center w-full my-0.5">
                <Tooltip title={darkMode ? 'Light mode' : 'Dark mode'} placement="right" delay={120}>
                  <AriaButton
                    className={slimItemClass(false)}
                    onPress={handleDarkModeChange}
                    aria-label={darkMode ? 'Light mode' : 'Dark mode'}
                  >
                    {darkMode ? <Sun size={20} aria-hidden={true} /> : <Moon01 size={20} aria-hidden={true} />}
                  </AriaButton>
                </Tooltip>
              </div>
            ) : (
              <button
                type="button"
                className={itemClass(false)}
                onClick={handleDarkModeChange}
                title={darkMode ? 'Light mode' : 'Dark mode'}
              >
                <span className="w-6 h-6 min-w-6 flex items-center justify-center shrink-0">
                  {darkMode ? <Sun size={20} aria-hidden={true} /> : <Moon01 size={20} aria-hidden={true} />}
                </span>
                <div className="flex items-center flex-1 min-w-0 ml-2.5 overflow-hidden whitespace-nowrap">
                  <span className="truncate">{darkMode ? 'Light mode' : 'Dark mode'}</span>
                </div>
              </button>
            )}

            {isDesktop && (
              isSlimDesktop ? (
                <div className="flex justify-center w-full my-0.5">
                  <Tooltip title="Expand sidebar" placement="right" delay={120}>
                    <AriaButton
                      className={slimItemClass(false)}
                      onPress={handleSidebarModeToggle}
                      aria-label="Expand sidebar"
                    >
                      <ChevronsRight size={20} aria-hidden={true} />
                    </AriaButton>
                  </Tooltip>
                </div>
              ) : (
                <button
                  type="button"
                  className={itemClass(false)}
                  onClick={handleSidebarModeToggle}
                  title="Collapse sidebar"
                >
                  <span className="w-6 h-6 min-w-6 flex items-center justify-center shrink-0">
                    <ChevronsLeft size={20} aria-hidden={true} />
                  </span>
                  <div className="flex items-center flex-1 min-w-0 ml-2.5 overflow-hidden whitespace-nowrap">
                    <span className="truncate">Collapse sidebar</span>
                  </div>
                </button>
              )
            )}
          </div>
        </nav>
      </aside>
    </>
  );
}

export default Sidebar;
