import React from 'react';
import { CalendarDays, RefreshCw, Search } from '../../../icons/lucideIcons';

function BacktestToolbar({ symbol, sessionDate, loadStatus, onSymbolChange, onSessionChange, onReload }) {
  return (
    <div className="backtest-toolbar">
      <label className="backtest-field backtest-field--symbol backtest-toolbar__symbol">
        <span><Search size={13} aria-hidden="true" /> Symbol</span>
        <input 
          value={symbol} 
          onChange={(event) => onSymbolChange(event.target.value.toUpperCase())} 
          placeholder="e.g. BTCUSDT"
        />
      </label>

      <label className="backtest-field backtest-field--session backtest-toolbar__session">
        <span><CalendarDays size={13} aria-hidden="true" /> Session</span>
        <input 
          type="date" 
          value={sessionDate}
          onChange={(e) => onSessionChange(e.target.value)}
        />
      </label>

      <div className="backtest-chart-tools backtest-toolbar__tools" aria-label="Chart tools">
        <button type="button" title="Trend line placeholder">TL</button>
        <button type="button" title="Measure placeholder">M</button>
        <button type="button" title="Magnet placeholder">MG</button>
      </div>

      <button className="backtest-icon-button" type="button" onClick={onReload} title="Reload candles" aria-label="Reload candles">
        <RefreshCw size={15} aria-hidden="true" />
      </button>

      <span className={`backtest-data-pill backtest-data-pill--${loadStatus}`}>{loadStatus}</span>
    </div>
  );
}

export default BacktestToolbar;
