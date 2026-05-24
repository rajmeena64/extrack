import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import './dashboard.css';

import Header from '@/components/Header/Header';
import MainContentWrapper from '@/components/Layout/MainContentWrapper';
import StatsCards from '@/components/StatsCards/StatsCards';
import TradesList from '@/components/myTrades/TradesList';
import ProgressTracker from '@/components/MainContent/ProgressTracker';
import { markPerf, measurePerf } from '@/utils/perfMarks';
import { loadCachedUserSettings, loadUserSettings } from '../../utils/userSettings';

const ActivityChart = lazy(() => import('@/components/MainContent/ActivityChart'));
const Radar = lazy(() => import('@/components/MainContent/Radar'));
const PerformanceChart = lazy(() => import('@/components/MainContent/PerformanceChart'));
const PnLCalendar = lazy(() => import('@/components/MainContent/PnLCalendar'));


// Global tracker to persist loaded state across page switches
const LOADED_SECTIONS = new Set();
const DEFAULT_DASHBOARD_LAYOUT = {
  rowOrder: 'overview-first',
  columnOrder: 'normal',
};

const getCachedDashboardLayout = () => {
  const cachedLayout = loadCachedUserSettings()?.dashboard || {};

  return {
    rowOrder: cachedLayout.rowOrder || DEFAULT_DASHBOARD_LAYOUT.rowOrder,
    columnOrder: cachedLayout.columnOrder || DEFAULT_DASHBOARD_LAYOUT.columnOrder,
  };
};

const getDashboardLayoutMode = () => {
  if (window.innerWidth <= 768) return 'mobile';
  if (window.innerWidth <= 1023) return 'tablet';
  return 'desktop';
};

const getDateScopePart = (value) => {
  if (!value) return 'all';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'all' : date.toISOString().slice(0, 10);
};

function LazyDashboardSection({ children, sectionKey, fallback, perfName, delay = 100 }) {
  const sectionRef = useRef(null);
  const [shouldRender, setShouldRender] = useState(LOADED_SECTIONS.has(sectionKey));

  useEffect(() => {
    if (shouldRender) return undefined;

    const section = sectionRef.current;
    if (!section || typeof IntersectionObserver === 'undefined') {
      const frameId = window.requestAnimationFrame(() => {
        setShouldRender(true);
        if (sectionKey) LOADED_SECTIONS.add(sectionKey);
      });
      return () => window.cancelAnimationFrame(frameId);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const timer = setTimeout(() => {
            setShouldRender(true);
            if (sectionKey) LOADED_SECTIONS.add(sectionKey);
          }, delay);
          observer.disconnect();
          return () => clearTimeout(timer);
        }
      },
      { 
        rootMargin: '100px 0px 100px 0px', 
        threshold: 0.01 
      }
    );

    observer.observe(section);

    return () => observer.disconnect();
  }, [shouldRender, delay, sectionKey]);

  useEffect(() => {
    if (!shouldRender || !perfName) return;

    markPerf(perfName);
    if (perfName === 'charts-ready') {
      measurePerf('charts-from-start', 'app-start', 'charts-ready');
    }
  }, [perfName, shouldRender]);

  return <div className="dashboard-lazy-section" ref={sectionRef}>{shouldRender ? children : fallback}</div>;
}

const SkeletonChartCard = () => (
  <div className="chart-card skeleton-box skeleton-chart-card">
    <div
      className="skeleton-text"
      style={{ width: '150px', height: '20px', marginBottom: '20px' }}
    />
    <div
      className="skeleton-chart"
      style={{ height: '250px', borderRadius: '8px' }}
    />
  </div>
);

const SkeletonTradesList = () => (
  <div className="skeleton-box skeleton-trades">
    <div
      className="skeleton-text"
      style={{ width: '120px', height: '20px', marginBottom: '16px' }}
    />

    {[...Array(5)].map((_, i) => (
      <div
        key={i}
        className="skeleton-text"
        style={{ width: '100%', height: '14px', marginBottom: '10px' }}
      />
    ))}
  </div>
);

const SkeletonPnLCalendar = () => (
  <div className="skeleton-box skeleton-calendar">
    <div
      className="skeleton-text"
      style={{ width: '140px', height: '20px', marginBottom: '20px' }}
    />

    <div className="calendar-grid-skeleton">
      {[...Array(35)].map((_, i) => (
        <div key={i} className="skeleton-calendar-day" />
      ))}
    </div>
  </div>
);

function Dashboard({
  tradeMode,
  setTradeMode,
  trades,
  dateRange,
  setDateRange,
  currencyCode = 'USD',
  defaultCurrencyCode = 'USD',
  onCurrencyChange,
  isLoading = false,
}) {
  const [layout, setLayout] = useState(getCachedDashboardLayout);

  const [layoutMode, setLayoutMode] = useState(getDashboardLayoutMode);
  const layoutChangeVersion = useRef(0);

  const loadLayout = () => {
    const requestVersion = layoutChangeVersion.current;

    loadUserSettings().then(settings => {
      if (requestVersion !== layoutChangeVersion.current) return;

      setLayout({
        rowOrder: settings?.dashboard?.rowOrder || DEFAULT_DASHBOARD_LAYOUT.rowOrder,
        columnOrder: settings?.dashboard?.columnOrder || DEFAULT_DASHBOARD_LAYOUT.columnOrder
      });
    }).catch(() => null);
  };

  useEffect(() => {
    loadLayout();
    const handleResize = () => setLayoutMode(getDashboardLayoutMode());
    const handleLayoutChange = (event) => {
      layoutChangeVersion.current += 1;
      const eventLayout = event.detail?.layout;

      if (eventLayout) {
        setLayout({
          rowOrder: eventLayout.rowOrder || DEFAULT_DASHBOARD_LAYOUT.rowOrder,
          columnOrder: eventLayout.columnOrder || DEFAULT_DASHBOARD_LAYOUT.columnOrder,
        });
        return;
      }

      setLayout(getCachedDashboardLayout());
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('dashboard-layout-change', handleLayoutChange);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('dashboard-layout-change', handleLayoutChange);
    };
  }, []);

  useEffect(() => {
    markPerf('dashboard-shell-visible');
    measurePerf('dashboard-shell-from-start', 'app-start', 'dashboard-shell-visible');
  }, []);

  useEffect(() => {
    if (isLoading) return;

    markPerf('dashboard-visible');
    measurePerf('dashboard-visible-from-start', 'app-start', 'dashboard-visible');
  }, [isLoading]);

  const statsScopeKey = useMemo(() => {
    const from = getDateScopePart(dateRange?.from);
    const to = getDateScopePart(dateRange?.to);
    return `dashboard:${tradeMode}:${currencyCode}:${from}:${to}`;
  }, [currencyCode, dateRange?.from, dateRange?.to, tradeMode]);

  const gridAreas = useMemo(() => {
    const { rowOrder, columnOrder } = layout;

    if (layoutMode === 'mobile') {
      return rowOrder === 'charts-first'
        ? `
          "performance"
          "activity"
          "progress"
          "zella"
          "calendar"
          "trades"
        `
        : `
          "zella"
          "calendar"
          "trades"
          "performance"
          "activity"
          "progress"
        `;
    }

    if (layoutMode === 'tablet') {
      if (rowOrder === 'charts-first') {
        return columnOrder === 'flipped'
          ? `
            "activity performance"
            "progress progress"
            "calendar zella"
            "calendar trades"
          `
          : `
            "performance activity"
            "progress progress"
            "zella calendar"
            "trades calendar"
          `;
      }

      return columnOrder === 'flipped'
        ? `
          "calendar zella"
          "calendar trades"
          "activity performance"
          "progress progress"
        `
        : `
          "zella calendar"
          "trades calendar"
          "performance activity"
          "progress progress"
        `;
    }
    
    let areas;
    if (rowOrder === 'overview-first') {
      if (columnOrder === 'normal') {
        areas = `
          "zella calendar calendar"
          "trades calendar calendar"
          "performance activity progress"
        `;
      } else {
        areas = `
          "calendar calendar zella"
          "calendar calendar trades"
          "progress activity performance"
        `;
      }
    } else { // charts-first
      if (columnOrder === 'normal') {
        areas = `
          "performance activity progress"
          "zella calendar calendar"
          "trades calendar calendar"
        `;
      } else {
        areas = `
          "progress activity performance"
          "calendar calendar zella"
          "calendar calendar trades"
        `;
      }
    }
    return areas;
  }, [layout, layoutMode]);

  const gridColumns = useMemo(() => {
    if (layoutMode !== 'tablet') return undefined;

    return layout.columnOrder === 'flipped'
      ? 'minmax(0, 1.32fr) minmax(220px, 0.68fr)'
      : 'minmax(220px, 0.68fr) minmax(0, 1.32fr)';
  }, [layout.columnOrder, layoutMode]);

  const MainGrid = (
    <section 
      className="dashboard-layout dashboard-main-grid" 
      style={{
        ...(gridAreas ? { gridTemplateAreas: gridAreas } : {}),
        ...(gridColumns ? { gridTemplateColumns: gridColumns } : {}),
      }}
    >
      {/* 1st Row Left: Non-chart Progress Tracker */}
      <div className="dashboard-grid-card dashboard-grid-card--zella left-charts">
        {isLoading ? (
          <SkeletonChartCard />
        ) : (
          <ProgressTracker trades={trades} />
        )}
      </div>

      {/* 1st & 2nd Row Right: PnL Calendar (Large, non-chart) */}
      <div className="dashboard-grid-card dashboard-grid-card--calendar chart-cardx calendar-panel">
        {isLoading ? (
          <SkeletonPnLCalendar />
        ) : (
          <LazyDashboardSection sectionKey="pnl-calendar" fallback={<SkeletonPnLCalendar />} delay={0}>
            <Suspense fallback={<SkeletonPnLCalendar />}>
              <PnLCalendar trades={trades} currencyCode={currencyCode} />
            </Suspense>
          </LazyDashboardSection>
        )}
      </div>

      {/* 2nd Row Left: Trades List (Non-chart) */}
      <section className="dashboard-grid-card dashboard-grid-card--trades trades-section">
        {isLoading ? (
          <SkeletonTradesList />
        ) : (
          <LazyDashboardSection sectionKey="trades-list" fallback={<SkeletonTradesList />} delay={0}>
            <TradesList trades={trades} currentTradeMode={tradeMode} currencyCode={currencyCode} />
          </LazyDashboardSection>
        )}
      </section>

      {/* 3rd Row: Charts (Below the fold) */}
      <div className="dashboard-grid-card dashboard-grid-card--performance">
        {isLoading ? (
          <SkeletonChartCard />
        ) : (
          <LazyDashboardSection sectionKey="performance-chart" fallback={<SkeletonChartCard />} perfName="charts-ready" delay={800}>
            <Suspense fallback={<SkeletonChartCard />}>
              <PerformanceChart trades={trades} currencyCode={currencyCode} />
            </Suspense>
          </LazyDashboardSection>
        )}
      </div>

      <div className="dashboard-grid-card dashboard-grid-card--activity">
        {isLoading ? (
          <SkeletonChartCard />
        ) : (
          <LazyDashboardSection sectionKey="activity-chart" fallback={<SkeletonChartCard />} delay={1000}>
            <Suspense fallback={<SkeletonChartCard />}>
              <ActivityChart trades={trades} currencyCode={currencyCode} />
            </Suspense>
          </LazyDashboardSection>
        )}
      </div>

      <div className="dashboard-grid-card dashboard-grid-card--progress">
        {isLoading ? (
          <SkeletonChartCard />
        ) : (
          <LazyDashboardSection sectionKey="radar-chart" fallback={<SkeletonChartCard />} delay={1200}>
            <Suspense fallback={<SkeletonChartCard />}>
              <Radar trades={trades} />
            </Suspense>
          </LazyDashboardSection>
        )}
      </div>
    </section>
  );

  return (
    <MainContentWrapper>
      <Header
        tradeMode={tradeMode}
        setTradeMode={setTradeMode}
        trades={trades}
        dateRange={dateRange}
        setDateRange={setDateRange}
        currencyCode={currencyCode}
        defaultCurrencyCode={defaultCurrencyCode}
        onCurrencyChange={onCurrencyChange}
      />

      <StatsCards
        trades={trades}
        currencyCode={currencyCode}
        isLoading={isLoading}
        statsScopeKey={statsScopeKey}
      />

      {MainGrid}

    </MainContentWrapper>
  );
}

export default Dashboard;
