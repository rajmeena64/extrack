import React, { lazy, Suspense, useEffect, useState } from 'react';
import './dashboard.css';
import './mobile.css';

import Header from '@/components/Header/Header';
import StatsCards from '@/components/StatsCards/StatsCards';
import TradesList from '@/components/myTrades/TradesList';

const AccountBalance = lazy(() => import('@/components/MainContent/AccountBalance'));
const Radar = lazy(() => import('@/components/MainContent/Radar'));
const PerformanceChart = lazy(() => import('@/components/MainContent/PerformanceChart'));
const ProgressTracker = lazy(() => import('@/components/MainContent/ProgressTracker'));
const PnLCalendar = lazy(() => import('@/components/MainContent/PnLCalendar'));


function DeferredRender({ delay = 0, children, fallback = null }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setIsReady(true), delay);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [delay]);

  return isReady ? children : fallback;
}

const SkeletonStatsCards = () => (
  <div className="stats-grid">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="stat-card skeleton-box skeleton-stat-card">
        <div
          className="skeleton-text"
          style={{ width: '100px', height: '14px', marginBottom: '12px' }}
        />
        <div
          className="skeleton-text"
          style={{ width: '80px', height: '28px', marginBottom: '8px' }}
        />
        <div
          className="skeleton-text"
          style={{ width: '120px', height: '12px' }}
        />
      </div>
    ))}
  </div>
);

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

function Dashboard({ tradeMode, setTradeMode, trades, isLoading = false }) {
  const MainGrid = (
    <>
      <div className="dashboard-grid-card dashboard-grid-card--zella left-charts">
        {isLoading ? (
          <SkeletonChartCard />
        ) : (
          <DeferredRender delay={0} fallback={<SkeletonChartCard />}>
            <Suspense fallback={<SkeletonChartCard />}>
              <Radar trades={trades} />
            </Suspense>
          </DeferredRender>
        )}
      </div>

      <div className="dashboard-grid-card dashboard-grid-card--performance">
        {isLoading ? (
          <SkeletonChartCard />
        ) : (
          <DeferredRender delay={40} fallback={<SkeletonChartCard />}>
            <Suspense fallback={<SkeletonChartCard />}>
              <PerformanceChart trades={trades} />
            </Suspense>
          </DeferredRender>
        )}
      </div>

      <div className="dashboard-grid-card dashboard-grid-card--progress">
        {isLoading ? (
          <SkeletonChartCard />
        ) : (
          <DeferredRender delay={80} fallback={<SkeletonChartCard />}>
            <Suspense fallback={<SkeletonChartCard />}>
              <ProgressTracker trades={trades} />
            </Suspense>
          </DeferredRender>
        )}
      </div>

      <div className="dashboard-grid-card dashboard-grid-card--balance">
        {isLoading ? (
          <SkeletonChartCard />
        ) : (
          <DeferredRender delay={120} fallback={<SkeletonChartCard />}>
            <Suspense fallback={<SkeletonChartCard />}>
              <AccountBalance trades={trades} />
            </Suspense>
          </DeferredRender>
        )}
      </div>

      <div className="dashboard-grid-card dashboard-grid-card--calendar chart-cardx calendar-panel">
        {isLoading ? (
          <SkeletonPnLCalendar />
        ) : (
          <DeferredRender delay={160} fallback={<SkeletonPnLCalendar />}>
            <Suspense fallback={<SkeletonPnLCalendar />}>
              <PnLCalendar trades={trades} />
            </Suspense>
          </DeferredRender>
        )}
      </div>

      <section className="dashboard-grid-card dashboard-grid-card--trades trades-section">
        {isLoading ? (
          <SkeletonTradesList />
        ) : (
          <TradesList trades={trades} currentTradeMode={tradeMode} />
        )}
      </section>
    </>
  );

  return (
    <main className="main-content">
      {isLoading ? (
        <div className="header-skeleton">
          <div
            className="skeleton-text"
            style={{ width: '150px', height: '32px' }}
          />
          <div
            className="skeleton-button"
            style={{ width: '100px', height: '38px' }}
          />
        </div>
      ) : (
        <Header tradeMode={tradeMode} setTradeMode={setTradeMode} trades={trades} />
      )}

      {isLoading ? <SkeletonStatsCards /> : <StatsCards trades={trades} />}

      <section className="dashboard-layout dashboard-main-grid">
        {MainGrid}
      </section>

      <style>{`
        @keyframes skeleton-pulse {
          0% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
          100% {
            opacity: 1;
          }
        }

        .skeleton-box {
          background: var(--bg-card);
          border-radius: 12px;
          padding: 10px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          height: 100%;
        }

        .skeleton-text {
          background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%);
          background-size: 200% 100%;
          animation: skeleton-pulse 1.5s ease-in-out infinite;
          border-radius: 4px;
        }

        .skeleton-button {
          background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%);
          background-size: 200% 100%;
          animation: skeleton-pulse 1.5s ease-in-out infinite;
          border-radius: 6px;
        }

        .skeleton-chart {
          background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%);
          background-size: 200% 100%;
          animation: skeleton-pulse 1.5s ease-in-out infinite;
        }

        .skeleton-stat-card,
        .skeleton-chart-card,
        .skeleton-trades,
        .skeleton-calendar {
          min-width: 0;
          width: 100%;
        }

        .calendar-grid-skeleton {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 8px;
        }

        .skeleton-calendar-day {
          aspect-ratio: 1;
          background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%);
          background-size: 200% 100%;
          animation: skeleton-pulse 1.5s ease-in-out infinite;
          border-radius: 8px;
        }

        .header-skeleton {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          background: var(--bg-card);
          border-bottom: 1px solid var(--border-light);
          margin-bottom: 10px;
          border-radius: 8px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 20px;
          padding: 5px;
        }
      `}</style>
    </main>
  );
}

export default Dashboard;
