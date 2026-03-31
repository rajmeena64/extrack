import React, { useState, useEffect } from 'react';
import './dashboard.css';
import './mobile.css';
import Header from '../../components/Header/Header';
import StatsCards from '../../components/StatsCards/StatsCards';

import Radar from '../../components/Charts/Radar';
import PerformanceChart from '../../components/Charts/PerformanceChart';
import ActivityChart from '../../components/Charts/ActivityChart';
import PortfolioChart from '../../components/Charts/PortfolioChart';
import PnLCalendar from '../../components/Charts/PnLCalendar';
import TradesList from '../../components/myTrades/TradesList';



import TradeView from '../Daily/TradeView';



function Dashboard({ user, tradeMode, setTradeMode, trades,  }) {


  // 🔥 STATE for layout (listen to settings changes)
  const [rowOrder, setRowOrder] = useState(
    localStorage.getItem('dashboardRowOrder') || 'charts-first'
  );

  // 🔥 LISTEN to custom event from DashboardSettings
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


  /* ================= ROW SECTIONS ================= */

 
  const ChartsRow = (
    <div className="left-charts">
      <div className="chart-card">
        <PerformanceChart trades={trades} />
     
      </div>

      <div className="chart-card">
        <ActivityChart trades={trades} />
      </div>

      <div className="chart-card">
        <PortfolioChart trades={trades} />
      </div>
    </div>

     
     
  );

  const OverviewRow = (
  
    <section className="overview-section">
      <div className='second'>
      <section className="trades-section">
        <TradesList trades={trades} currentTradeMode={tradeMode} />
      </section>

      <Radar trades={trades} />
       </div>

      <div className="chart-cardx">
        <PnLCalendar trades={trades} />
    
      </div>
   
    </section>
  );

  /* ================= RENDER ================= */

  return (

    <main className="main-content">
      {/* HEADER */}
      <Header tradeMode={tradeMode} setTradeMode={setTradeMode} />

      {/* TOP STATS */}
      <StatsCards trades={trades} />

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
    </main>
    

    
  );


}

export default Dashboard;
