import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Header from '@/components/Header/Header';
import MainContentWrapper from '@/components/Layout/MainContentWrapper';
import StatsCards from '../Widgets/StatsCards';
import TradesList from '../Widgets/TradesList';
import ProgressTracker from '../Widgets/ProgressTracker';
import { markPerf, measurePerf } from '@/utils/common/perfMarks';
import { loadCachedUserSettings } from '@/utils/user/userSettings';
import { useUserSettings } from '@/hooks/useUserSettings';
import { Card, Skeleton } from '@/components/ui';

import { useQuery } from '@tanstack/react-query';
import analyticsApi from '@/utils/api/analyticsApi';

const ActivityChart = lazy(() => import('../Widgets/ActivityChart'));
const Radar = lazy(() => import('../Widgets/Radar'));
const PerformanceChart = lazy(() => import('../Widgets/PerformanceChart'));
const PnLCalendar = lazy(() => import('../Widgets/PnLCalendar'));

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
          if (!delay) {
            setShouldRender(true);
            if (sectionKey) LOADED_SECTIONS.add(sectionKey);
            observer.disconnect();
            return;
          }
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

  return <div className="w-full h-full min-w-0" ref={sectionRef}>{shouldRender ? children : fallback}</div>;
}

const SkeletonChartCard = () => (
  <Card className="w-full h-full min-h-[340px] sm:min-h-[360px] lg:min-h-0 flex flex-col p-4" padding="none">
    <Skeleton className="w-36 h-5 rounded-lg mb-5" />
    <Skeleton className="flex-1 rounded-xl" />
  </Card>
);

const SkeletonTradesList = () => (
  <Card className="w-full h-full min-h-[380px] sm:min-h-[420px] lg:min-h-0 flex flex-col p-4" padding="none">
    <Skeleton className="w-28 h-5 rounded-lg mb-4" />
    {[...Array(5)].map((_, i) => (
      <Skeleton key={i} className="w-full h-3.5 rounded mb-2.5" />
    ))}
  </Card>
);

const SkeletonPnLCalendar = () => (
  <Card className="w-full h-full min-h-[420px] lg:h-[590px] flex flex-col p-4" padding="none">
    <Skeleton className="w-32 h-5 rounded-lg mb-5" />
    <div className="grid grid-cols-7 gap-2 flex-1">
      {[...Array(35)].map((_, i) => (
        <Skeleton key={i} className="rounded-lg" />
      ))}
    </div>
  </Card>
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
  openPositions = [],
}) {
  const [layout, setLayout] = useState(getCachedDashboardLayout);
  const userSettingsQuery = useUserSettings();
  const layoutChangeVersion = useRef(0);

  useEffect(() => {
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

    window.addEventListener('dashboard-layout-change', handleLayoutChange);
    return () => {
      window.removeEventListener('dashboard-layout-change', handleLayoutChange);
    };
  }, []);

  useEffect(() => {
    if (!userSettingsQuery.data || layoutChangeVersion.current > 0) return;

    setLayout({
      rowOrder: userSettingsQuery.data?.dashboard?.rowOrder || DEFAULT_DASHBOARD_LAYOUT.rowOrder,
      columnOrder: userSettingsQuery.data?.dashboard?.columnOrder || DEFAULT_DASHBOARD_LAYOUT.columnOrder,
    });
  }, [userSettingsQuery.data]);

  useEffect(() => {
    markPerf('dashboard-shell-visible');
    measurePerf('dashboard-shell-from-start', 'app-start', 'dashboard-shell-visible');
  }, []);

  useEffect(() => {
    if (isLoading) return;

    markPerf('dashboard-visible');
    measurePerf('dashboard-visible-from-start', 'app-start', 'dashboard-visible');
  }, [isLoading]);

  const analyticsQuery = useQuery({
    queryKey: ['dashboard-analytics', tradeMode, dateRange?.from, dateRange?.to, currencyCode],
    queryFn: () => {
      const fromDate = dateRange?.from ? new Date(dateRange.from) : null;
      if (fromDate) fromDate.setHours(0, 0, 0, 0);
      const toDate = dateRange?.to ? new Date(dateRange.to) : null;
      if (toDate) toDate.setHours(23, 59, 59, 999);
      return analyticsApi.getDashboard({
        trade_mode: tradeMode,
        from: fromDate ? fromDate.toISOString() : null,
        to: toDate ? toDate.toISOString() : null,
        currency: currencyCode,
      });
    },
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev,
  });

  const analytics = analyticsQuery.data;
  const isDashboardLoading = isLoading || analyticsQuery.isPending;

  const statsScopeKey = useMemo(() => {
    const from = getDateScopePart(dateRange?.from);
    const to = getDateScopePart(dateRange?.to);
    return `dashboard:${tradeMode}:${currencyCode}:${from}:${to}`;
  }, [currencyCode, dateRange?.from, dateRange?.to, tradeMode]);

  const isChartsFirst = layout.rowOrder === 'charts-first';
  const isFlipped = layout.columnOrder === 'flipped';

  const OverviewSection = useMemo(() => (
    <section className={`grid grid-cols-1 lg:grid-cols-3 gap-[var(--component-gap)] w-full items-stretch lg:h-[590px] ${isChartsFirst ? 'order-2' : 'order-1'}`}>
      <div className={`col-span-1 flex flex-col gap-[var(--component-gap)] min-w-0 min-h-0 lg:h-[590px] ${isFlipped ? 'lg:order-2' : 'lg:order-1'}`}>
        <div className="min-w-0 min-h-0 h-[340px] sm:h-[360px] lg:h-[288px] shrink-0">
          {isDashboardLoading && !analytics ? (
            <SkeletonChartCard />
          ) : (
            <ProgressTracker calendarData={analytics?.calendar} />
          )}
        </div>

        <section className="min-w-0 min-h-0 h-[380px] sm:h-[420px] lg:h-[292px] shrink-0 flex">
          {isDashboardLoading && !analytics ? (
            <SkeletonTradesList />
          ) : (
            <LazyDashboardSection sectionKey="trades-list" fallback={<SkeletonTradesList />} delay={0}>
              <TradesList
                trades={analytics?.recentTrades}
                openPositions={tradeMode === 'manual' ? [] : openPositions}
                currentTradeMode={tradeMode}
                currencyCode={currencyCode}
              />
            </LazyDashboardSection>
          )}
        </section>
      </div>

      <div className={`col-span-1 lg:col-span-2 min-w-0 min-h-0 h-full lg:h-[590px] flex flex-col ${isFlipped ? 'lg:order-1' : 'lg:order-2'}`}>
        {isDashboardLoading && !analytics ? (
          <SkeletonPnLCalendar />
        ) : (
          <LazyDashboardSection sectionKey="pnl-calendar" fallback={<SkeletonPnLCalendar />} delay={0}>
            <Suspense fallback={<SkeletonPnLCalendar />}>
              <PnLCalendar calendarSummary={analytics?.calendar} currencyCode={currencyCode} />
            </Suspense>
          </LazyDashboardSection>
        )}
      </div>
    </section>
  ), [analytics, currencyCode, isChartsFirst, isDashboardLoading, isFlipped, openPositions, tradeMode]);

  const ChartsSection = useMemo(() => (
    <section className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[var(--component-gap)] w-full items-stretch ${isChartsFirst ? 'order-1' : 'order-2'}`}>
      <div className={`min-w-0 h-[340px] sm:h-[360px] lg:h-[290px] ${isFlipped ? 'lg:order-3' : 'lg:order-1'}`}>
        {isDashboardLoading && !analytics ? (
          <SkeletonChartCard />
        ) : (
          <LazyDashboardSection sectionKey="performance-chart" fallback={<SkeletonChartCard />} perfName="charts-ready">
            <Suspense fallback={<SkeletonChartCard />}>
              <PerformanceChart chartData={analytics?.performanceChart} currencyCode={currencyCode} />
            </Suspense>
          </LazyDashboardSection>
        )}
      </div>

      <div className="min-w-0 h-[340px] sm:h-[360px] lg:h-[290px] lg:order-2">
        {isDashboardLoading && !analytics ? (
          <SkeletonChartCard />
        ) : (
          <LazyDashboardSection sectionKey="activity-chart" fallback={<SkeletonChartCard />}>
            <Suspense fallback={<SkeletonChartCard />}>
              <ActivityChart chartData={analytics?.activityChart} currencyCode={currencyCode} />
            </Suspense>
          </LazyDashboardSection>
        )}
      </div>

      <div className={`min-w-0 h-[340px] sm:h-[360px] lg:h-[290px] md:col-span-2 lg:col-span-1 ${isFlipped ? 'lg:order-1' : 'lg:order-3'}`}>
        {isDashboardLoading && !analytics ? (
          <SkeletonChartCard />
        ) : (
          <LazyDashboardSection sectionKey="radar-chart" fallback={<SkeletonChartCard />}>
            <Suspense fallback={<SkeletonChartCard />}>
              <Radar metrics={analytics?.radar} />
            </Suspense>
          </LazyDashboardSection>
        )}
      </div>
    </section>
  ), [analytics, currencyCode, isChartsFirst, isDashboardLoading, isFlipped]);

  const MainGrid = useMemo(() => (
    <div className="flex flex-col gap-[var(--component-gap)] w-full">
      {OverviewSection}
      {ChartsSection}
    </div>
  ), [OverviewSection, ChartsSection]);

  return (
    <MainContentWrapper>
      <Header
        tradeMode={tradeMode}
        setTradeMode={setTradeMode}
        trades={analytics?.recentTrades}
        dateRange={dateRange}
        setDateRange={setDateRange}
        currencyCode={currencyCode}
        defaultCurrencyCode={defaultCurrencyCode}
        onCurrencyChange={onCurrencyChange}
      />

      <StatsCards
        stats={analytics?.stats}
        currencyCode={currencyCode}
        isLoading={analyticsQuery.isPending}
        statsScopeKey={statsScopeKey}
      />

      {MainGrid}

    </MainContentWrapper>
  );
}

export default React.memo(Dashboard);
