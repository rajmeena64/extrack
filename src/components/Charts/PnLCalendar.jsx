import React, { useState, useEffect, useMemo } from 'react';
import './PnLCalendar.css';
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";



function PnLCalendar({ trades }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState([]);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const weekNames = ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"];

  const calculateDailyStats = () => {
    const dailyPnL = {};
    const dailyTradesCount = {};

    if (trades && trades.length > 0) {
      trades.forEach(trade => {
        if (!trade.timestamp || trade.pnl === undefined) return;

        const date = new Date(trade.timestamp);
        const dateStr = `${date.getFullYear()}-${(date.getMonth() + 1)
          .toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;

        dailyPnL[dateStr] = (dailyPnL[dateStr] || 0) + (parseFloat(trade.pnl) || 0);
        dailyTradesCount[dateStr] = (dailyTradesCount[dateStr] || 0) + 1;
      });
    }

    return { dailyPnL, dailyTradesCount };
  };

  const calculateWeeklyStats = useMemo(() => {
    const { dailyPnL, dailyTradesCount } = calculateDailyStats();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const weeklyStats = [];
    let currentWeek = 1;
    let weekStart = new Date(firstDay);
    
    while (weekStart.getDay() !== 0) {
      weekStart.setDate(weekStart.getDate() - 1);
    }
    
    while (weekStart <= lastDay) {
      let weekPnL = 0;
      let tradingDays = 0;
      let weeklyTrades = 0;
      
      for (let i = 0; i < 7; i++) {
        const currentDate = new Date(weekStart);
        currentDate.setDate(weekStart.getDate() + i);
        
        if (currentDate < firstDay || currentDate > lastDay) continue;
        
        const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${currentDate.getDate().toString().padStart(2, '0')}`;
        
        if (dailyPnL[dateStr] !== undefined) {
          weekPnL += dailyPnL[dateStr];
          tradingDays++;
          weeklyTrades += dailyTradesCount[dateStr] || 0;
        }
      }
      
      if (weekStart <= lastDay) {
        weeklyStats.push({
          week: weekNames[currentWeek - 1] || `Week ${currentWeek}`,
          pnl: weekPnL,
          days: tradingDays,
          trades: weeklyTrades
        });
      }
      
      weekStart.setDate(weekStart.getDate() + 7);
      currentWeek++;
    }
    
    return weeklyStats;
  }, [currentDate, trades]);

  const calculateMonthlyStats = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const { dailyPnL } = calculateDailyStats();
    
    let monthlyPnL = 0;
    let totalTradingDaysThisMonth = 0;
    
    Object.keys(dailyPnL).forEach(dateStr => {
      const [y, m] = dateStr.split('-').map(Number);
      if (y === year && m === month) {
        monthlyPnL += dailyPnL[dateStr];
        totalTradingDaysThisMonth++;
      }
    });
    
    return { monthlyPnL, totalTradingDaysThisMonth };
  };

  const generateCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthStr = (month + 1).toString().padStart(2, '0');

    const { dailyPnL, dailyTradesCount } = calculateDailyStats();
    const data = [];
    let dayCount = 1;

    while (dayCount <= daysInMonth) {
      const week = [];
      for (let i = 0; i < 7; i++) {
        if ((data.length === 0 && i < firstDay) || dayCount > daysInMonth) {
          week.push({ day: null });
        } else {
          const dateStr = `${year}-${monthStr}-${dayCount.toString().padStart(2, '0')}`;
          week.push({
            day: dayCount,
            pnl: dailyPnL[dateStr] || 0,
            trades: dailyTradesCount[dateStr] || 0,
            dateStr,
            isToday: isToday(year, month, dayCount)
          });
          dayCount++;
        }
      }
      data.push(week);
    }

    setCalendarData(data);
  };

  const isToday = (y, m, d) => {
    const t = new Date();
    return t.getFullYear() === y && t.getMonth() === m && t.getDate() === d;
  };

  const changeMonth = dir => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() + dir);
    setCurrentDate(d);
  };

  const getCellClassName = cell => {
    if (!cell.day) return 'empty';
    let cls = cell.pnl > 0 ? 'positive' : cell.pnl < 0 ? 'negative' : 'no-data';
    if (cell.isToday) cls += ' today';
    return cls;
  };

  const formatPnL = pnl => {
    if (!pnl) return '';
    const abs = Math.abs(pnl);
    return `${pnl > 0 ? '+' : '-'}${abs >= 1000 ? (abs / 1000).toFixed(1) + 'K' : abs.toFixed(0)}`;
  };

  const formatTrades = trades => {
    if (!trades || trades === 0) return null;
    return `${trades} tr`;
  };

  useEffect(() => {
    generateCalendar();
  }, [currentDate, trades]);

  const { monthlyPnL, totalTradingDaysThisMonth } = calculateMonthlyStats();

  return (
    <div className="calendar-card">
      <div className="analytics-header">
        <div className="header-left">
          <h3>PnL Calendar</h3>
          <div className="header-stats">
            <div className={`month-pnl ${monthlyPnL >= 0 ? 'positive' : 'negative'}`}>
              <span className="month-pnl-label"> PnL</span>
              <span className="month-pnl-value">
                {monthlyPnL >= 0 ? '+' : ''}{monthlyPnL.toFixed(2)}
              </span>
            </div>
            <div className="month-trades">
              <span className="trades-label">days</span>
              <span className="trades-value">{totalTradingDaysThisMonth}</span>
            </div>
          </div>
        </div>






<div className="month-navigation">

  <button className="months-btn-left" onClick={() => changeMonth(-1)}>
    <FaChevronLeft />
  </button>

    <span className="current-month">
    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
  </span>

  <button className="months-btn-right" onClick={() => changeMonth(1)}>
    <FaChevronRight />
  </button>

  </div>








      </div>  
      <div className="calendar-layout">
        <table className="analytics-calendar">
          <thead>
            <tr>
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                <th key={d}>{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {calendarData.map((week, wi) => (
              <tr key={wi}>
                {week.map((cell, di) => (
                  <td key={di} className={getCellClassName(cell)}>
                    {cell.day && (

                     
                      <div className="day-cell-content">
                  
                        <span className="date-number">{cell.day}</span>
                        <div className="day-stats">
                          {cell.pnl !== 0 && (
                            <span className={`pnl-amount ${cell.pnl > 0 ? 'positive' : 'negative'}`}>
                              {formatPnL(cell.pnl)}
                            </span>
                          )}
                          {cell.trades > 0 && (
                            <span className="trades-count">
                              {formatTrades(cell.trades)}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        <div className="weekly-stats">
          {calculateWeeklyStats.map((week, i) => (
            <div
              key={i}
              className={`week-card ${
                week.pnl > 0 ? 'profit' : week.pnl < 0 ? 'loss' : 'neutral'
              }`}
            >
              <div className='one'>
              <span className="week-title">{week.week}</span>
              <span className="week-pnl">
                {week.pnl > 0 ? '+' : ''}{week.pnl.toFixed(2)}
              </span>
           </div>
              <span className="week-days">{week.days}days• {week.trades}tr</span>
            </div>
          ))}
          
          {calculateWeeklyStats.length === 0 && (
            <div className="week-card neutral">
              <span className="week-title">No Data</span>
              <span className="week-pnl">0.00</span>
              <span className="week-days">0 days • 0 tr</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PnLCalendar; 