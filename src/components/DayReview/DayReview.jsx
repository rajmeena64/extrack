import React, { Suspense, lazy, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Gauge,
  Percent,
  Sigma,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import SymbolWithIcon from '../Common/SymbolWithIcon';
import { formatCurrency } from '../../utils/Currency';
import './DayReview.css';

const PerformanceChart = lazy(() => import('../MainContent/PerformanceChart'));

const toDateKey = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
};

const formatDateTitle = (dateKey) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
};

const getSession = (timestamp) => {
  const hour = new Date(timestamp).getHours();
  if (hour < 8) return 'Asia';
  if (hour < 13) return 'London';
  if (hour < 18) return 'New York';
  return 'Late';
};

const toDateFromTimestamp = (timestamp) => {
  if (!timestamp) return null;

  const numericTimestamp = Number(timestamp);
  const value = Number.isFinite(numericTimestamp)
    ? numericTimestamp < 1e12
      ? numericTimestamp * 1000
      : numericTimestamp
    : timestamp;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatTime = (timestamp) => {
  const date = toDateFromTimestamp(timestamp);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDuration = (start, end) => {
  const startDate = toDateFromTimestamp(start);
  const endDate = toDateFromTimestamp(end);
  if (!startDate || !endDate) return '-';
  const diffMs = endDate - startDate;
  if (!Number.isFinite(diffMs) || diffMs < 0) return '-';

  const minutes = Math.round(diffMs / 60000);
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
};

const getTradeCategory = (trade) => {
  const raw = (trade?.category || trade?.symbol_category || trade?.assetClass || '').toString().trim();
  if (raw) return raw;

  const symbol = (trade?.symbol || '').toUpperCase();
  if (symbol.includes('BTC') || symbol.includes('ETH') || symbol.includes('USDT')) return 'crypto';
  if (/^[A-Z]{6}$/.test(symbol)) return 'forex';
  if (symbol.includes('XAU') || symbol.includes('XAG')) return 'metal';
  return 'market';
};

const shiftDateKey = (dateKey, days) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
};

function DayReview({ trades = [], currencyCode = 'USD' }) {
  const navigate = useNavigate();
  const { dateKey } = useParams();
  const selectedDateKey = dateKey || toDateKey(new Date());
  const isToday = selectedDateKey === toDateKey(new Date());

  const dayTrades = useMemo(() => (
    (Array.isArray(trades) ? trades : [])
      .filter((trade) => trade?.timestamp && toDateKey(trade.timestamp) === selectedDateKey)
      .sort((left, right) => new Date(left.timestamp) - new Date(right.timestamp))
  ), [selectedDateKey, trades]);

  const stats = useMemo(() => {
    let pnl = 0;
    let wins = 0;
    let losses = 0;
    let grossProfit = 0;
    let grossLoss = 0;
    let bestTrade = null;
    let worstTrade = null;
    const sessions = {};
    const symbols = {};
    let runningPnl = 0;
    let peak = 0;
    let maxDrawdown = 0;
    let longestWinStreak = 0;
    let longestLossStreak = 0;
    let currentWinStreak = 0;
    let currentLossStreak = 0;

    dayTrades.forEach((trade) => {
      const value = Number(trade.pnl) || 0;
      pnl += value;
      runningPnl += value;
      peak = Math.max(peak, runningPnl);
      maxDrawdown = Math.min(maxDrawdown, runningPnl - peak);

      if (value > 0) {
        wins += 1;
        grossProfit += value;
        currentWinStreak += 1;
        currentLossStreak = 0;
      }

      if (value < 0) {
        losses += 1;
        grossLoss += Math.abs(value);
        currentLossStreak += 1;
        currentWinStreak = 0;
      }

      if (value === 0) {
        currentWinStreak = 0;
        currentLossStreak = 0;
      }

      longestWinStreak = Math.max(longestWinStreak, currentWinStreak);
      longestLossStreak = Math.max(longestLossStreak, currentLossStreak);

      if (!bestTrade || value > Number(bestTrade.pnl || 0)) bestTrade = trade;
      if (!worstTrade || value < Number(worstTrade.pnl || 0)) worstTrade = trade;

      const session = getSession(trade.timestamp);
      sessions[session] = (sessions[session] || 0) + value;

      const symbol = trade.symbol || 'Unknown';
      if (!symbols[symbol]) {
        symbols[symbol] = { pnl: 0, trades: 0 };
      }
      symbols[symbol].pnl += value;
      symbols[symbol].trades += 1;
    });

    const totalTrades = dayTrades.length;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
    const avgPnl = totalTrades > 0 ? pnl / totalTrades : 0;
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? grossProfit : 0;
    const bestSession = Object.entries(sessions).sort((a, b) => b[1] - a[1])[0];

    return {
      pnl,
      totalTrades,
      wins,
      losses,
      winRate,
      avgPnl,
      profitFactor,
      bestTrade,
      worstTrade,
      bestSession,
      sessions: Object.entries(sessions).sort((left, right) => right[1] - left[1]),
      symbols: Object.entries(symbols).sort((left, right) => Math.abs(right[1].pnl) - Math.abs(left[1].pnl)),
      maxDrawdown,
      longestWinStreak,
      longestLossStreak,
    };
  }, [dayTrades]);

  const analysis = useMemo(() => {
    if (stats.totalTrades === 0) {
      return isToday
        ? 'No trades recorded today yet. Once trades come in, this page will show the live readout for the session.'
        : 'No trades were recorded for this day.';
    }

    const tone = stats.pnl > 0 ? 'green day' : stats.pnl < 0 ? 'red day' : 'flat day';
    const accuracy =
      stats.winRate >= 60
        ? 'accuracy was strong'
        : stats.winRate >= 45
          ? 'accuracy was mixed'
          : 'accuracy needs review';
    const factor =
      stats.profitFactor >= 1.5
        ? 'payout quality was healthy'
        : stats.profitFactor >= 1
          ? 'payout quality held above breakeven'
          : 'losses outweighed winners';

    return `This was a ${tone}: ${accuracy}, and ${factor}. Review the largest winner and loser before carrying this behavior into the next session.`;
  }, [isToday, stats.pnl, stats.profitFactor, stats.totalTrades, stats.winRate]);

  const statCards = [
    {
      label: 'Net P&L',
      value: formatCurrency(stats.pnl, currencyCode),
      icon: CircleDollarSign,
      tone: stats.pnl > 0 ? 'positive' : stats.pnl < 0 ? 'negative' : 'neutral',
    },
    { label: 'Trades', value: stats.totalTrades, icon: Sigma, tone: 'neutral' },
    { label: 'Win rate', value: `${stats.winRate.toFixed(1)}%`, icon: Percent, tone: 'neutral' },
    { label: 'Profit factor', value: stats.profitFactor.toFixed(2), icon: Gauge, tone: 'neutral' },
    {
      label: 'Max DD',
      value: formatCurrency(stats.maxDrawdown, currencyCode),
      icon: TrendingDown,
      tone: stats.maxDrawdown < 0 ? 'negative' : 'neutral',
    },
    {
      label: 'Best streak',
      value: `${stats.longestWinStreak}W / ${stats.longestLossStreak}L`,
      icon: TrendingUp,
      tone: 'neutral',
    },
  ];

  return (
    <main className="main-content day-review-page">
      <header className="day-review-header">
        <button className="day-review-back" type="button" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} />
          Back
        </button>

        <div className="day-review-title">
          <span className="day-review-eyebrow">
            <CalendarDays size={14} />
            {isToday ? 'Start my day' : 'Day review'}
          </span>
          <h1 className="app-page-title">{formatDateTitle(selectedDateKey)}</h1>
        </div>

        <div className="day-review-date-nav">
          <button type="button" onClick={() => navigate(`/day-review/${shiftDateKey(selectedDateKey, -1)}`)}>
            <ArrowLeft size={14} />
            Previous
          </button>
          <button type="button" onClick={() => navigate('/day-review')}>
            Today
          </button>
          <button type="button" onClick={() => navigate(`/day-review/${shiftDateKey(selectedDateKey, 1)}`)}>
            Next
            <ArrowRight size={14} />
          </button>
        </div>
      </header>

      <section className="day-review-stats">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.label} className={`day-review-stat day-review-stat--${card.tone}`}>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <Icon size={16} />
            </article>
          );
        })}
      </section>

      <section className="day-review-grid">
        <div className="day-review-chart">
          <Suspense fallback={<div className="day-review-panel">Loading curve...</div>}>
            <PerformanceChart
              trades={dayTrades}
              currencyCode={currencyCode}
              groupBy="trade"
              title="Intraday Net Cumulative P&L"
            />
          </Suspense>
        </div>

        <aside className="day-review-panel day-review-analysis">
          <h2 className="app-panel-title">Session Readout</h2>
          <p>{analysis}</p>

          <div className="day-review-notes">
            <span>Wins / losses</span>
            <strong>
              {stats.wins} / {stats.losses}
            </strong>
          </div>
          <div className="day-review-notes">
            <span>Average trade</span>
            <strong>{formatCurrency(stats.avgPnl, currencyCode)}</strong>
          </div>
          <div className="day-review-notes">
            <span>Best session</span>
            <strong>
              {stats.bestSession ? `${stats.bestSession[0]} ${formatCurrency(stats.bestSession[1], currencyCode)}` : '-'}
            </strong>
          </div>
        </aside>
      </section>

      <section className="day-review-grid day-review-grid--four">
        <article className="day-review-panel">
          <h2 className="app-panel-title">Largest Winner</h2>
          {stats.bestTrade ? (
            <TradeSummary trade={stats.bestTrade} currencyCode={currencyCode} />
          ) : (
            <EmptyInsight title="No winner" body={isToday ? 'First winning trade will appear here.' : 'No winning trade was logged on this day.'} />
          )}
        </article>

        <article className="day-review-panel">
          <h2 className="app-panel-title">Largest Loser</h2>
          {stats.worstTrade ? (
            <TradeSummary trade={stats.worstTrade} currencyCode={currencyCode} />
          ) : (
            <EmptyInsight title="No loser" body={isToday ? 'Loss control is clean until a losing trade appears.' : 'No losing trade was logged on this day.'} />
          )}
        </article>

        <article className="day-review-panel">
          <h2 className="app-panel-title">Daily Checklist</h2>
          <div className="day-review-checklist">
            {[
              stats.totalTrades > 0 ? 'Review first trade decision' : 'Plan first setup',
              stats.maxDrawdown < 0 ? 'Check drawdown trigger' : 'Risk stayed contained',
              stats.longestLossStreak >= 2 ? 'Look for revenge sequence' : 'No heavy loss streak',
              stats.totalTrades === 0
                ? 'Define max trades before entry'
                : stats.profitFactor < 1
                  ? 'Find payout leak'
                  : 'Payout quality acceptable',
            ].map((item) => (
              <span key={item}>
                <CheckCircle2 size={14} />
                {item}
              </span>
            ))}
          </div>
        </article>
      </section>

      {stats.totalTrades === 0 && (
        <section className="day-review-panel day-review-no-trade">
          <div>
            <h2 className="app-panel-title">{isToday ? 'No Trades Yet' : 'No-Trade Day'}</h2>
            <p>
              {isToday
                ? 'Use this page as a pre-market control panel. Once you take a trade, the curve and stats will update here.'
                : 'This day had no logged trades. Treat it as a rest, missed, or observation day and keep the context visible.'}
            </p>
          </div>

          <div className="day-review-prompts">
            <span>Market condition</span>
            <strong>{isToday ? 'Waiting for A+ setup' : 'No execution recorded'}</strong>
            <span>Risk status</span>
            <strong>Untouched</strong>
            <span>Best next action</span>
            <strong>{isToday ? 'Write the setup trigger before entering' : 'Compare against nearby active days'}</strong>
          </div>
        </section>
      )}

      <section className="day-review-grid day-review-grid--breakdowns">
        <BreakdownPanel title="Symbol Breakdown" items={stats.symbols} currencyCode={currencyCode} type="symbol" />
        <BreakdownPanel title="Session Breakdown" items={stats.sessions} currencyCode={currencyCode} />
      </section>

      <section className="day-review-panel day-review-trades">
        <h2 className="app-panel-title">Trades On This Day</h2>
        <div className="day-review-table">
          {dayTrades.length === 0 ? (
            <div className="day-review-empty-state">
              <strong>No trades found for this day</strong>
              <span>
                {isToday
                  ? 'Trades will appear here as soon as they are logged.'
                  : 'Click previous or next day to inspect nearby sessions.'}
              </span>
            </div>
          ) : (
            dayTrades.map((trade) => (
              <button
                key={trade.unique_id || trade.id || trade.timestamp}
                className="day-review-trade-row"
                type="button"
                onClick={() => navigate(`/trade/${trade.unique_id || trade.id}`, { state: { tradeData: trade } })}
              >
                <div className="day-review-trade-main">
                  <SymbolWithIcon symbol={trade.symbol} />
                  <span className="day-review-market-pill">{getTradeCategory(trade)}</span>
                </div>

                <TradeDetail label="Side" value={trade.trade_type || '-'} />
                <TradeDetail label="Entry" value={trade.price ?? trade.entry_price ?? '-'} />
                <TradeDetail label="Exit" value={trade.exit_price ?? '-'} />
                <TradeDetail label="Open" value={formatTime(trade.open_timestamp || trade.timestamp)} />
                <TradeDetail label="Close" value={formatTime(trade.close_timestamp || trade.exit_timestamp)} />
                <TradeDetail label="Duration" value={formatDuration(trade.open_timestamp || trade.timestamp, trade.close_timestamp || trade.exit_timestamp)} />
                <TradeDetail label="Qty" value={trade.quantity ?? trade.volume ?? trade.lots ?? '-'} />
                <div className="day-review-trade-pnl">
                  <span>P&L</span>
                  <strong className={Number(trade.pnl) >= 0 ? 'day-review-profit' : 'day-review-loss'}>
                    {formatCurrency(Number(trade.pnl) || 0, currencyCode)}
                  </strong>
                </div>
                <div className="day-review-trade-context">
                  <span>{trade.strategy || 'No strategy'}</span>
                  <small>{trade.notes || trade.note || 'No notes'}</small>
                </div>
              </button>
            ))
          )}
        </div>
      </section>
    </main>
  );
}

function EmptyInsight({ title, body }) {
  return (
    <div className="day-review-empty-insight">
      <strong>{title}</strong>
      <span>{body}</span>
    </div>
  );
}

function BreakdownPanel({ title, items, currencyCode, type = 'text' }) {
  return (
    <article className="day-review-panel day-review-breakdown">
      <h2 className="app-panel-title">{title}</h2>
      <div className="day-review-breakdown-list">
        {items.length === 0 ? (
          <p className="day-review-empty">No data yet.</p>
        ) : (
          items.slice(0, 6).map(([label, value]) => {
            const pnl = typeof value === 'number' ? value : value.pnl;
            const trades = typeof value === 'number' ? null : value.trades;
            return (
              <div key={label} className="day-review-breakdown-row">
                {type === 'symbol' ? <SymbolWithIcon symbol={label} /> : <span>{label}</span>}
                <strong className={pnl >= 0 ? 'day-review-profit' : 'day-review-loss'}>
                  {formatCurrency(pnl, currencyCode)}
                </strong>
                {trades != null && <small>{trades} trades</small>}
              </div>
            );
          })
        )}
      </div>
    </article>
  );
}

function TradeSummary({ trade, currencyCode }) {
  return (
    <div className="day-review-trade-summary">
      <SymbolWithIcon symbol={trade.symbol} />
      <strong className={Number(trade.pnl) >= 0 ? 'day-review-profit' : 'day-review-loss'}>
        {formatCurrency(Number(trade.pnl) || 0, currencyCode)}
      </strong>
      <span>{trade.trade_type || '-'}</span>
      <small>
        {trade.timestamp
          ? new Date(trade.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : '-'}
      </small>
    </div>
  );
}

function TradeDetail({ label, value }) {
  return (
    <div className="day-review-trade-detail">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default DayReview;
