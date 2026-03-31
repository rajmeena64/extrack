import React, { useMemo } from "react";
import "./StatsCards.css";

function StatsCards({ trades }) {

  const stats = useMemo(() => {
    let profitTrades = 0;
    let totalPnL = 0;
    let grossProfit = 0;
    let grossLoss = 0;

    if (!Array.isArray(trades)) {
      return {
        totalPnL: 0,
        winRate: 0,
        avgPnL: 0,
        totalTrades: 0,
        profitFactor: 0,
      };
    }

    trades.forEach((trade) => {
      const pnl = Number(trade?.pnl);

      if (!isNaN(pnl)) {
        totalPnL += pnl;

        if (pnl > 0) {
          profitTrades++;
          grossProfit += pnl; // 🔥 winning money
        } else if (pnl < 0) {
          grossLoss += Math.abs(pnl); // 🔥 losing money
        }
      }
    });

    const totalTrades = trades.length;

    const winRate =
      totalTrades > 0 ? (profitTrades / totalTrades) * 100 : 0;

    const avgPnL =
      totalTrades > 0 ? totalPnL / totalTrades : 0;

    const profitFactor =
      grossLoss > 0 ? grossProfit / grossLoss : 0;

    return {
      totalPnL,
      winRate,
      avgPnL,
      totalTrades,
      profitFactor,
    };
  }, [trades]);

  const formatNumber = (value) => {
    const num = Number(value);
    if (isNaN(num)) return "-";
    return num.toFixed(2);
  };

  return (
    <div className="stats-cards">

      {/* Total PnL */}
      <div className="stat-card">
        <div className={`stat-value ${stats.totalPnL >= 0 ? "positive" : "negative"}`}>
          ${formatNumber(stats.totalPnL)}
        </div>
        <div className="stat-label">Total P&L</div>
      </div>

      {/* Win Rate */}
      <div className="stat-card">
        <div className="stat-value">
          {stats.winRate.toFixed(1)}%
        </div>
        <div className="stat-label">Win Rate</div>
      </div>

      {/* 🔥 PROFIT FACTOR */}
      <div className="stat-card">
        <div className={`stat-value ${stats.profitFactor >= 1 ? "positive" : "negative"}`}>
          {formatNumber(stats.profitFactor)}
        </div>
        <div className="stat-label">Profit Factor</div>
      </div>

      {/* Avg PnL */}
      <div className="stat-card">
        <div className={`stat-value ${stats.avgPnL >= 0 ? "positive" : "negative"}`}>
          ${formatNumber(stats.avgPnL)}
        </div>
        <div className="stat-label">Avg P&L</div>
      </div>

      {/* Total Trades */}
      <div className="stat-card">
        <div className="stat-value">
          {stats.totalTrades}
        </div>
        <div className="stat-label">Total Trades</div>
      </div>

    </div>
  );
}

export default StatsCards;