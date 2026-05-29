import React from 'react';

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

function formatProfitFactor(value) {
  if (value === Infinity) return '∞';
  return Number(value || 0).toFixed(2);
}

function BacktestStatsBar({ stats }) {
  return (
    <section className="backtest-stats-bar" aria-label="Account summary">
      <div><span>Current balance</span><strong>{currency.format(stats.currentBalance)}</strong></div>
      <div><span>Realized P&L</span><strong className={stats.realizedPnL >= 0 ? 'is-positive' : 'is-negative'}>{currency.format(stats.realizedPnL)}</strong></div>
      <div><span>Unrealized P&L</span><strong className={stats.unrealizedPnL >= 0 ? 'is-positive' : 'is-negative'}>{currency.format(stats.unrealizedPnL)}</strong></div>
      <div><span>Win rate</span><strong>{stats.winRate.toFixed(1)}%</strong></div>
      <div><span>Profit factor</span><strong>{formatProfitFactor(stats.profitFactor)}</strong></div>
      <div><span>Total trades</span><strong>{stats.totalTrades}</strong></div>
    </section>
  );
}

export default BacktestStatsBar;
