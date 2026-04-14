import React, { useState, useEffect } from 'react';
// import './dashboard.css';
import './mobile.css';

import Header from '@/components/Header/Header';
import StatsCards from '@/components/StatsCards/StatsCards';

import Radar from '@/components/MainContent/Radar';
import PerformanceChart from '@/components/MainContent/PerformanceChart';
import ActivityChart from '@/components/MainContent/ActivityChart';
import PortfolioChart from '@/components/MainContent/PortfolioChart';
import PnLCalendar from '@/components/MainContent/PnLCalendar';
import TradesList from '@/components/myTrades/TradesList';




// ================= SKELETON COMPONENTS =================

const SkeletonStatsCards = () => (
  <div className="stats-grid">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="stat-card skeleton-box skeleton-stat-card">
        <div
          className="skeleton-text"
          style={{ width: '100px', height: '14px', marginBottom: '12px' }}
        ></div>
        <div
          className="skeleton-text"
          style={{ width: '80px', height: '28px', marginBottom: '8px' }}
        ></div>
        <div
          className="skeleton-text"
          style={{ width: '120px', height: '12px' }}
        ></div>
      </div>
    ))}
  </div>
);

const SkeletonChartCard = () => (
  <div className="chart-card skeleton-box skeleton-chart-card">
    <div
      className="skeleton-text"
      style={{ width: '150px', height: '20px', marginBottom: '20px' }}
    ></div>
    <div
      className="skeleton-chart"
      style={{ height: '250px', borderRadius: '8px' }}
    ></div>
  </div>
);

const SkeletonTradesList = () => (
  <div className="skeleton-box skeleton-trades">
    <div
      className="skeleton-text"
      style={{ width: '120px', height: '20px', marginBottom: '16px' }}
    ></div>

    {[...Array(5)].map((_, i) => (
      <div
        key={i}
        className="skeleton-text"
        style={{ width: '100%', height: '14px', marginBottom: '10px' }}
      ></div>
    ))}
  </div>
);

const SkeletonRadar = () => (
  <div className="skeleton-box skeleton-radar">
    <div
      className="skeleton-text"
      style={{ width: '120px', height: '20px', marginBottom: '20px' }}
    ></div>
    <div
      className="skeleton-chart"
      style={{ height: '300px', borderRadius: '50%' }}
    ></div>
  </div>
);

const SkeletonPnLCalendar = () => (
  <div className="skeleton-box skeleton-calendar">
    <div
      className="skeleton-text"
      style={{ width: '140px', height: '20px', marginBottom: '20px' }}
    ></div>

    <div className="calendar-grid-skeleton">
      {[...Array(35)].map((_, i) => (
        <div key={i} className="skeleton-calendar-day"></div>
      ))}
    </div>
  </div>
);

function Dashboard({ user, tradeMode, setTradeMode, trades, isLoading = false }) {
  const [rowOrder, setRowOrder] = useState(
    localStorage.getItem('dashboardRowOrder') || 'charts-first'
  );

  useEffect(() => {
    const handleLayoutChange = () => {
      const updated =
        localStorage.getItem('dashboardRowOrder') || 'charts-first';
      setRowOrder(updated);
    };

    window.addEventListener('dashboard-layout-change', handleLayoutChange);

    return () => {
      window.removeEventListener('dashboard-layout-change', handleLayoutChange);
    };
  }, []);

  // ================= ROW SECTIONS =================

  const ChartsRow = (
    <div className="left-charts">
      {isLoading ? (
        <>
          <SkeletonChartCard />
          <SkeletonChartCard />
          <SkeletonChartCard />
        </>
      ) : (
        <>
          <div className="chart-card">
            <PerformanceChart trades={trades} />
          </div>

          <div className="chart-card">
            <ActivityChart trades={trades} />
          </div>

          <div className="chart-card">
            <PortfolioChart trades={trades} />
          </div>
        </>
      )}
    </div>
  );

  const OverviewRow = (
    <section className="overview-section">
      <div className="second">
        <section className="trades-section">
          {isLoading ? (
            <SkeletonTradesList />
          ) : (
            <TradesList trades={trades} currentTradeMode={tradeMode} />
          )}
        </section>

        {isLoading ? <SkeletonRadar /> : <Radar trades={trades} />}
      </div>

      <div className="chart-cardx">
        {isLoading ? <SkeletonPnLCalendar /> : <PnLCalendar trades={trades} />}
      </div>
    </section>
  );

  // ================= RENDER =================

  return (
    <main className="main-content">
      {/* HEADER */}
      {isLoading ? (
        <div className="header-skeleton">
          <div
            className="skeleton-text"
            style={{ width: '150px', height: '32px' }}
          ></div>
          <div
            className="skeleton-button"
            style={{ width: '100px', height: '38px' }}
          ></div>
        </div>
      ) : (
        <Header tradeMode={tradeMode} setTradeMode={setTradeMode} />
      )}

      {/* TOP STATS */}
      {isLoading ? <SkeletonStatsCards /> : <StatsCards trades={trades} />}

      {/* MAIN GRID */}
      <section className="dashboard-layout">
        {rowOrder === 'overview-first' ? (
          <>
            {OverviewRow}
            {ChartsRow}
          </>
        ) : (
          <>
            {ChartsRow}
            {OverviewRow}
          </>
        )}
      </section>

      <style >{`
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
        .skeleton-radar,
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