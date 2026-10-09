import React, { Suspense, lazy, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, CircleDollarSign, Gauge, Percent, Sigma, TrendingDown, TrendingUp } from '@/icons/lucideIcons';
import SymbolWithIcon from '@/components/Common/SymbolWithIcon/SymbolWithIcon';
import MainContentWrapper from '@/components/Layout/MainContentWrapper';
import PageHeader from '@/components/Layout/PageHeader';
import { formatCurrency } from '@/utils/user/Currency';
import { getTradeDisplayDate, getTradeDisplayTime, getTradeOpenDate, toTradeDateKey } from '@/utils/trading/tradeTime';

const PerformanceChart = lazy(() => import('@/features/analytics/components/Widgets/PerformanceChart'));

const toDateKey = (v) => {
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? '' : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatDateTitle = (k) => {
  const [y, m, d] = k.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(y, m - 1, d));
};

const getSession = (t) => {
  const d = getTradeDisplayDate(t);
  if (!d) return 'Unknown';
  const h = d.getHours();
  return h < 8 ? 'Asia' : h < 13 ? 'London' : h < 18 ? 'New York' : 'Late';
};

const toDateFromTimestamp = (ts) => {
  if (!ts) return null;
  const n = Number(ts);
  const v = Number.isFinite(n) ? (n < 1e12 ? n * 1000 : n) : ts;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

const formatTime = (ts) => {
  const d = toDateFromTimestamp(ts);
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-';
};

const formatDuration = (st, en) => {
  const s = toDateFromTimestamp(st), e = toDateFromTimestamp(en);
  if (!s || !e) return '-';
  const diff = e - s;
  if (!Number.isFinite(diff) || diff < 0) return '-';
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60), r = mins % 60;
  return r > 0 ? `${h}h ${r}m` : `${h}h`;
};

const getTradeCategory = (t) => {
  const raw = t?.category ? t.category : (t?.symbol_category ? t.symbol_category : (t?.assetClass ? t.assetClass : ''));
  const s = String(raw).trim();
  if (s) return s;
  const sym = String(t?.symbol || '').toUpperCase();
  if (sym.includes('BTC') || sym.includes('ETH') || sym.includes('USDT')) return 'crypto';
  if (/^[A-Z]{6}$/.test(sym)) return 'forex';
  if (sym.includes('XAU') || sym.includes('XAG')) return 'metal';
  return 'market';
};

const shiftDateKey = (k, days) => {
  const [y, m, d] = k.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
};

function DayReview({ trades = [], currencyCode = 'USD' }) {
  const navigate = useNavigate();
  const { dateKey } = useParams();
  const selectedDateKey = dateKey ? dateKey : toDateKey(new Date());
  const isToday = selectedDateKey === toDateKey(new Date());

  const dayTrades = useMemo(() => (
    (Array.isArray(trades) ? trades : [])
      .filter((t) => toTradeDateKey(t) === selectedDateKey)
      .sort((a, b) => getTradeDisplayTime(a) - getTradeDisplayTime(b))
  ), [selectedDateKey, trades]);

  const stats = useMemo(() => {
    let pnl = 0, wins = 0, losses = 0, grossProfit = 0, grossLoss = 0;
    let bestTrade = null, worstTrade = null, runningPnl = 0, peak = 0, maxDrawdown = 0;
    let longestWinStreak = 0, longestLossStreak = 0, currentWinStreak = 0, currentLossStreak = 0;
    const sessions = {}, symbols = {};

    dayTrades.forEach((trade) => {
      const v = Number(trade.pnl) || 0;
      pnl += v;
      runningPnl += v;
      peak = Math.max(peak, runningPnl);
      maxDrawdown = Math.min(maxDrawdown, runningPnl - peak);
      if (v > 0) {
        wins += 1; grossProfit += v; currentWinStreak += 1; currentLossStreak = 0;
      } else if (v < 0) {
        losses += 1; grossLoss += Math.abs(v); currentLossStreak += 1; currentWinStreak = 0;
      } else {
        currentWinStreak = 0; currentLossStreak = 0;
      }
      longestWinStreak = Math.max(longestWinStreak, currentWinStreak);
      longestLossStreak = Math.max(longestLossStreak, currentLossStreak);
      if (!bestTrade || v > Number(bestTrade.pnl || 0)) bestTrade = trade;
      if (!worstTrade || v < Number(worstTrade.pnl || 0)) worstTrade = trade;
      const sess = getSession(trade);
      sessions[sess] = (sessions[sess] || 0) + v;
      const sym = trade.symbol ? trade.symbol : 'Unknown';
      if (!symbols[sym]) symbols[sym] = { pnl: 0, trades: 0 };
      symbols[sym].pnl += v;
      symbols[sym].trades += 1;
    });

    const totalTrades = dayTrades.length;
    return {
      pnl, totalTrades, wins, losses,
      winRate: totalTrades > 0 ? (wins / totalTrades) * 100 : 0,
      avgPnl: totalTrades > 0 ? pnl / totalTrades : 0,
      profitFactor: grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? grossProfit : 0),
      bestTrade, worstTrade, maxDrawdown, longestWinStreak, longestLossStreak,
      bestSession: Object.entries(sessions).sort((a, b) => b[1] - a[1])[0],
      sessions: Object.entries(sessions).sort((a, b) => b[1] - a[1]),
      symbols: Object.entries(symbols).sort((a, b) => Math.abs(b[1].pnl) - Math.abs(a[1].pnl))
    };
  }, [dayTrades]);

  const analysis = useMemo(() => {
    if (stats.totalTrades === 0) {
      return isToday ? 'No trades recorded today yet. Once trades come in, this page will show the live readout for the session.' : 'No trades were recorded for this day.';
    }
    const tone = stats.pnl > 0 ? 'profitable day' : stats.pnl < 0 ? 'red day' : 'flat day';
    const acc = stats.winRate >= 60 ? 'accuracy was strong' : stats.winRate >= 45 ? 'accuracy was mixed' : 'accuracy needs review';
    const fac = stats.profitFactor >= 1.5 ? 'payout quality was healthy' : stats.profitFactor >= 1 ? 'payout quality held above breakeven' : 'losses outweighed winners';
    return `This was a ${tone}: ${acc}, and ${fac}. Review the largest winner and loser before carrying this behavior into the next session.`;
  }, [isToday, stats.pnl, stats.profitFactor, stats.totalTrades, stats.winRate]);

  const statCards = [
    { label: 'Net P&L', value: formatCurrency(stats.pnl, currencyCode), icon: CircleDollarSign, tone: stats.pnl > 0 ? 'positive' : stats.pnl < 0 ? 'negative' : 'neutral' },
    { label: 'Trades', value: stats.totalTrades, icon: Sigma, tone: 'neutral' },
    { label: 'Win rate', value: `${stats.winRate.toFixed(1)}%`, icon: Percent, tone: 'neutral' },
    { label: 'Profit factor', value: stats.profitFactor.toFixed(2), icon: Gauge, tone: 'neutral' },
    { label: 'Max DD', value: formatCurrency(stats.maxDrawdown, currencyCode), icon: TrendingDown, tone: stats.maxDrawdown < 0 ? 'negative' : 'neutral' },
    { label: 'Best streak', value: `${stats.longestWinStreak}W / ${stats.longestLossStreak}L`, icon: TrendingUp, tone: 'neutral' }
  ];

  return (
    <MainContentWrapper className="day-review-page flex flex-col gap-[var(--dashboard-grid-gap)]">
      <PageHeader
        className="day-review-header !gap-[14px] max-[900px]:!gap-[10px] max-md:!gap-2 dark:bg-[var(--bg-card)] dark:border-[var(--border-light)] [&_.app-page-header__left]:max-md:flex-[1_1_auto] [&_.app-page-header__left]:max-md:min-w-0 [&_.app-page-header__left]:max-md:gap-2 [&_.app-page-header__right]:max-md:flex-[0_0_auto] [&_.app-page-header__right]:max-md:gap-1.5 [&_.app-page-header__right]:max-md:min-w-0 [&_.app-page-header__right]:max-md:overflow-visible [&_.app-page-header__title-block]:max-md:min-w-0 [&_.app-page-header__title-block]:max-md:overflow-hidden [&_.app-page-header__eyebrow]:max-md:w-fit [&_.app-page-header__eyebrow]:max-md:max-w-[20px] [&_.app-page-header__eyebrow]:max-md:overflow-hidden [&_.app-page-header__eyebrow]:max-md:gap-0 [&_.app-page-header__eyebrow]:max-md:text-[0px] [&_.app-page-header__eyebrow]:max-md:tracking-normal [&_.app-page-header__eyebrow]:max-md:leading-none [&_.app-page-header__eyebrow_svg]:max-md:w-3.5 [&_.app-page-header__eyebrow_svg]:max-md:h-3.5 [&_.app-page-header__eyebrow_svg]:max-md:shrink-0 [&_.app-page-title]:max-md:max-w-full [&_.app-page-title]:max-md:overflow-hidden [&_.app-page-title]:max-md:text-ellipsis [&_.app-page-title]:max-md:whitespace-nowrap [&_.app-page-title]:max-md:text-[clamp(14px,4.3vw,18px)]"
        onBack={() => navigate(-1)}
        eyebrow={<><CalendarDays size={14} />{isToday ? 'Start my day' : 'Day review'}</>}
        title={formatDateTitle(selectedDateKey)}
        actions={(
          <div className="day-review-date-nav inline-flex items-center gap-1.5 max-[900px]:flex max-[900px]:w-auto max-[900px]:ml-0 max-md:flex-none">
            <button type="button" className="h-8 inline-flex items-center gap-1.5 px-2.5 border border-[var(--border-light)] rounded-lg bg-[var(--surface-elevated)] text-[var(--text-primary)] text-xs font-semibold cursor-pointer max-[900px]:flex-[0_0_36px] max-[900px]:justify-center max-[900px]:h-9 max-md:w-9 max-md:min-w-[36px] max-md:p-0 max-md:gap-0 max-md:text-[0px] [&>span]:max-md:hidden [&>svg]:max-md:w-4 [&>svg]:max-md:h-4 [&>svg]:max-md:shrink-0" aria-label="Previous day" title="Previous day" onClick={() => navigate(`/day-review/${shiftDateKey(selectedDateKey, -1)}`)}>
              <ArrowLeft size={14} /><span>Previous</span>
            </button>
            <button type="button" className="h-8 inline-flex items-center gap-1.5 px-2.5 border border-[var(--border-light)] rounded-lg bg-[var(--surface-elevated)] text-[var(--text-primary)] text-xs font-semibold cursor-pointer max-[900px]:flex-[0_0_36px] max-[900px]:justify-center max-[900px]:h-9 max-md:w-9 max-md:min-w-[36px] max-md:p-0 max-md:gap-0 max-md:text-[0px] [&>span]:max-md:hidden [&>svg]:max-md:w-4 [&>svg]:max-md:h-4 [&>svg]:max-md:shrink-0" aria-label="Today" title="Today" onClick={() => navigate('/day-review')}>
              <CalendarDays size={14} /><span>Today</span>
            </button>
            <button type="button" className="h-8 inline-flex items-center gap-1.5 px-2.5 border border-[var(--border-light)] rounded-lg bg-[var(--surface-elevated)] text-[var(--text-primary)] text-xs font-semibold cursor-pointer max-[900px]:flex-[0_0_36px] max-[900px]:justify-center max-[900px]:h-9 max-md:w-9 max-md:min-w-[36px] max-md:p-0 max-md:gap-0 max-md:text-[0px] [&>span]:max-md:hidden [&>svg]:max-md:w-4 [&>svg]:max-md:h-4 [&>svg]:max-md:shrink-0" aria-label="Next day" title="Next day" onClick={() => navigate(`/day-review/${shiftDateKey(selectedDateKey, 1)}`)}>
              <span>Next</span><ArrowRight size={14} />
            </button>
          </div>
        )}
      />

      <section className="day-review-stats grid grid-cols-6 max-[900px]:grid-cols-1 gap-2">
        {statCards.map((card) => {
          const Icon = card.icon;
          const toneBg = card.tone === 'positive'
            ? 'bg-[linear-gradient(135deg,color-mix(in_srgb,var(--profit-color)_11%,transparent),transparent_64%),var(--bg-card)]'
            : card.tone === 'negative'
              ? 'bg-[linear-gradient(135deg,rgba(220,38,38,0.1),transparent_64%),var(--bg-card)]'
              : 'bg-[linear-gradient(135deg,rgba(37,99,235,0.035),transparent_62%),var(--bg-card)]';
          const toneColor = card.tone === 'positive' ? 'text-[var(--profit-color)]' : card.tone === 'negative' ? 'text-[var(--loss-color)]' : '';
          return (
            <article key={card.label} className={`day-review-stat day-review-stat--${card.tone} min-h-[72px] p-2.5 grid grid-cols-[minmax(0,1fr)_auto] content-between gap-2 border border-[var(--border-light)] rounded-[var(--dashboard-card-radius)] shadow-[var(--dashboard-card-shadow)] dark:border-[var(--border-light)] ${toneBg}`}>
              <span className="text-[var(--text-secondary)] text-[10px] font-semibold uppercase">{card.label}</span>
              <strong className={`col-start-1 text-[19px] font-bold leading-none ${toneColor || 'text-[var(--heading)]'}`}>{card.value}</strong>
              <Icon size={16} className={`col-start-2 row-start-1 row-span-2 self-center ${toneColor || 'text-[var(--primary)]'}`} />
            </article>
          );
        })}
      </section>

      <section className="day-review-grid grid grid-cols-[minmax(0,2fr)_minmax(280px,0.8fr)] max-[900px]:grid-cols-1 gap-2.5">
        <div className="day-review-chart min-h-[250px] [&_.performance-card]:min-h-[250px]">
          <Suspense fallback={<div className="day-review-panel border border-[var(--border-light)] rounded-[var(--dashboard-card-radius)] bg-[var(--bg-card)] shadow-[var(--dashboard-card-shadow)] dark:bg-[var(--bg-card)] dark:border-[var(--border-light)] p-[9px]">Loading curve...</div>}>
            <PerformanceChart trades={dayTrades} currencyCode={currencyCode} groupBy="trade" title="Intraday Net Cumulative P&L" />
          </Suspense>
        </div>

        <aside className="day-review-panel day-review-analysis flex flex-col gap-2.5 border border-[var(--border-light)] rounded-[var(--dashboard-card-radius)] bg-[var(--bg-card)] shadow-[var(--dashboard-card-shadow)] dark:bg-[var(--bg-card)] dark:border-[var(--border-light)] p-[9px]">
          <h2 className="app-panel-title">Session Readout</h2>
          <p className="m-0 text-[var(--text-primary)] text-xs leading-[1.45]">{analysis}</p>
          <div className="day-review-notes flex items-center justify-between gap-3 pt-2 border-t border-[var(--border-light)] text-[var(--text-secondary)] text-xs">
            <span>Wins / losses</span>
            <strong className="text-[var(--heading)] font-semibold text-right">{stats.wins} / {stats.losses}</strong>
          </div>
          <div className="day-review-notes flex items-center justify-between gap-3 pt-2 border-t border-[var(--border-light)] text-[var(--text-secondary)] text-xs">
            <span>Average trade</span>
            <strong className="text-[var(--heading)] font-semibold text-right">{formatCurrency(stats.avgPnl, currencyCode)}</strong>
          </div>
          <div className="day-review-notes flex items-center justify-between gap-3 pt-2 border-t border-[var(--border-light)] text-[var(--text-secondary)] text-xs">
            <span>Best session</span>
            <strong className="text-[var(--heading)] font-semibold text-right">
              {stats.bestSession ? `${stats.bestSession[0]} ${formatCurrency(stats.bestSession[1], currencyCode)}` : '-'}
            </strong>
          </div>
        </aside>
      </section>

      <section className="day-review-grid day-review-grid--four grid grid-cols-3 max-[900px]:grid-cols-1 gap-2.5">
        <article className="day-review-panel border border-[var(--border-light)] rounded-[var(--dashboard-card-radius)] bg-[var(--bg-card)] shadow-[var(--dashboard-card-shadow)] dark:bg-[var(--bg-card)] dark:border-[var(--border-light)] p-[9px]">
          <h2 className="app-panel-title">Largest Winner</h2>
          {stats.bestTrade ? <TradeSummary trade={stats.bestTrade} currencyCode={currencyCode} /> : <EmptyInsight title="No winner" body={isToday ? 'First winning trade will appear here.' : 'No winning trade was logged on this day.'} />}
        </article>
        <article className="day-review-panel border border-[var(--border-light)] rounded-[var(--dashboard-card-radius)] bg-[var(--bg-card)] shadow-[var(--dashboard-card-shadow)] dark:bg-[var(--bg-card)] dark:border-[var(--border-light)] p-[9px]">
          <h2 className="app-panel-title">Largest Loser</h2>
          {stats.worstTrade ? <TradeSummary trade={stats.worstTrade} currencyCode={currencyCode} /> : <EmptyInsight title="No loser" body={isToday ? 'Loss control is clean until a losing trade appears.' : 'No losing trade was logged on this day.'} />}
        </article>
        <article className="day-review-panel border border-[var(--border-light)] rounded-[var(--dashboard-card-radius)] bg-[var(--bg-card)] shadow-[var(--dashboard-card-shadow)] dark:bg-[var(--bg-card)] dark:border-[var(--border-light)] p-[9px]">
          <h2 className="app-panel-title">Daily Checklist</h2>
          <div className="day-review-checklist flex flex-col gap-1 mt-2">
            {[
              stats.totalTrades > 0 ? 'Review first trade decision' : 'Plan first setup',
              stats.maxDrawdown < 0 ? 'Check drawdown trigger' : 'Risk stayed contained',
              stats.longestLossStreak >= 2 ? 'Look for revenge sequence' : 'No heavy loss streak',
              stats.totalTrades === 0 ? 'Define max trades before entry' : stats.profitFactor < 1 ? 'Find payout leak' : 'Payout quality acceptable'
            ].map((item) => (
              <span key={item} className="inline-flex items-center gap-2 text-[var(--text-primary)] text-[11px]">
                <CheckCircle2 size={14} className="text-[var(--primary)] shrink-0" />
                {item}
              </span>
            ))}
          </div>
        </article>
      </section>

      {stats.totalTrades === 0 && (
        <section className="day-review-panel day-review-no-trade grid grid-cols-[minmax(0,1fr)_minmax(260px,0.9fr)] max-[900px]:grid-cols-1 gap-3.5 items-start border border-[var(--border-light)] rounded-[var(--dashboard-card-radius)] bg-[var(--bg-card)] shadow-[var(--dashboard-card-shadow)] dark:bg-[var(--bg-card)] dark:border-[var(--border-light)] p-[9px]">
          <div>
            <h2 className="app-panel-title">{isToday ? 'No Trades Yet' : 'No-Trade Day'}</h2>
            <p className="mt-2.5 mb-0 text-[var(--text-secondary)] text-[13px] leading-[1.5]">
              {isToday ? 'Use this page as a pre-market control panel. Once you take a trade, the curve and stats will update here.' : 'This day had no logged trades. Treat it as a rest, missed, or observation day and keep the context visible.'}
            </p>
          </div>
          <div className="day-review-prompts grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-x-3 gap-y-2 p-2.5 rounded-[10px] bg-[var(--surface-subtle)] border border-[var(--border-light)]">
            <span className="text-[var(--text-secondary)] text-[11px] font-semibold uppercase">Market condition</span>
            <strong className="text-[var(--heading)] text-xs font-semibold text-right">{isToday ? 'Waiting for A+ setup' : 'No execution recorded'}</strong>
            <span className="text-[var(--text-secondary)] text-[11px] font-semibold uppercase">Risk status</span>
            <strong className="text-[var(--heading)] text-xs font-semibold text-right">Untouched</strong>
            <span className="text-[var(--text-secondary)] text-[11px] font-semibold uppercase">Best next action</span>
            <strong className="text-[var(--heading)] text-xs font-semibold text-right">{isToday ? 'Write the setup trigger before entering' : 'Compare against nearby active days'}</strong>
          </div>
        </section>
      )}

      <section className="day-review-grid day-review-grid--breakdowns grid grid-cols-2 max-[900px]:grid-cols-1 gap-2.5">
        <BreakdownPanel title="Symbol Breakdown" items={stats.symbols} currencyCode={currencyCode} type="symbol" />
        <BreakdownPanel title="Session Breakdown" items={stats.sessions} currencyCode={currencyCode} />
      </section>

      <section className="day-review-panel day-review-trades border border-[var(--border-light)] rounded-[var(--dashboard-card-radius)] bg-[var(--bg-card)] shadow-[var(--dashboard-card-shadow)] dark:bg-[var(--bg-card)] dark:border-[var(--border-light)] p-[9px]">
        <h2 className="app-panel-title">Trades On This Day</h2>
        <div className="day-review-table flex flex-col mt-3 overflow-x-auto border border-[var(--border-light)] rounded-[10px] max-[900px]:border-none max-[900px]:gap-3 max-[900px]:bg-transparent">
          {dayTrades.length === 0 ? (
            <div className="day-review-empty-state min-h-[120px] flex flex-col justify-center gap-1.5 p-[18px] text-[var(--text-secondary)] text-center">
              <strong className="text-[var(--heading)] text-[15px]">No trades found for this day</strong>
              <span className="text-[13px]">{isToday ? 'Trades will appear here as soon as they are logged.' : 'Click previous or next day to inspect nearby sessions.'}</span>
            </div>
          ) : (
            dayTrades.map((trade) => (
              <button
                key={trade.unique_id}
                className="day-review-trade-row grid grid-cols-[minmax(150px,1.25fr)_repeat(7,minmax(76px,0.7fr))_minmax(96px,0.8fr)_minmax(180px,1.2fr)] items-center gap-2 min-h-[68px] px-2.5 py-2 border-0 border-b border-[var(--border-light)] last:border-b-0 bg-transparent text-[var(--text-primary)] text-left cursor-pointer hover:bg-[var(--bg-hover)] max-[900px]:grid-cols-2 max-[900px]:gap-x-2.5 max-[900px]:gap-y-3 max-[900px]:p-4 max-[900px]:bg-[var(--bg-card)] max-[900px]:border max-[900px]:border-[var(--border-light)] max-[900px]:rounded-2xl max-[900px]:mb-1 max-[900px]:min-h-0 max-[900px]:shadow-[0_4px_12px_-8px_rgba(0,0,0,0.1)]"
                type="button"
                onClick={() => navigate(`/trade/${trade.unique_id}`, { state: { tradeData: trade } })}
              >
                <div className="day-review-trade-main flex flex-col gap-1.5 min-w-0 max-[900px]:col-start-1 max-[900px]:order-1 max-[900px]:items-start">
                  <SymbolWithIcon symbol={trade.symbol} />
                  <span className="day-review-market-pill w-fit px-[7px] py-0.5 rounded-full bg-[var(--surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-light)] text-[10px] font-semibold uppercase">{getTradeCategory(trade)}</span>
                </div>
                <TradeDetail label="Side" value={trade.side ? trade.side : '-'} />
                <TradeDetail label="Entry" value={trade.entryPrice !== undefined && trade.entryPrice !== null ? trade.entryPrice : '-'} />
                <TradeDetail label="Exit" value={trade.exitPrice !== undefined && trade.exitPrice !== null ? trade.exitPrice : '-'} />
                <TradeDetail label="Open" value={formatTime(trade.entryAt)} />
                <TradeDetail label="Close" value={formatTime(trade.exitAt)} />
                <TradeDetail label="Duration" value={formatDuration(trade.entryAt, trade.exitAt)} />
                <TradeDetail label="Qty" value={trade.quantity !== undefined && trade.quantity !== null ? trade.quantity : '-'} />
                <div className="day-review-trade-pnl flex min-w-0 flex-col gap-[3px] max-[900px]:col-start-2 max-[900px]:order-2 max-[900px]:items-end max-[900px]:text-right">
                  <span className="text-[var(--text-secondary)] text-[10px] font-semibold uppercase">P&L</span>
                  <strong className={`text-xs font-semibold leading-[1.2] [overflow-wrap:anywhere] ${Number(trade.netPnl) >= 0 ? 'day-review-profit text-[var(--profit-color)]' : 'day-review-loss text-[var(--loss-color)]'}`}>
                    {formatCurrency(Number(trade.netPnl) || 0, currencyCode)}
                  </strong>
                </div>
                <div className="day-review-trade-context flex min-w-0 flex-col gap-[3px] max-[900px]:col-span-full max-[900px]:order-10 max-[900px]:mt-1 max-[900px]:pt-3 max-[900px]:border-t max-[900px]:border-dashed max-[900px]:border-[var(--border-light)]">
                  <span className="text-[var(--text-primary)] text-xs font-semibold truncate max-[900px]:whitespace-normal">{trade.strategy ? trade.strategy : 'No strategy'}</span>
                  <small className="text-[var(--text-secondary)] text-[11px] truncate max-[900px]:whitespace-normal max-[900px]:block max-[900px]:mt-1">{trade.notes ? trade.notes : 'No notes'}</small>
                </div>
              </button>
            ))
          )}
        </div>
      </section>
    </MainContentWrapper>
  );
}

function EmptyInsight({ title, body }) {
  return (
    <div className="day-review-empty-insight mt-2.5 min-h-[74px] flex flex-col justify-center gap-1.5 p-2.5 rounded-[10px] bg-[var(--surface-subtle)] border border-dashed border-[var(--border-light)]">
      <strong className="text-[var(--heading)] text-[13px]">{title}</strong>
      <span className="text-[var(--text-secondary)] text-xs leading-[1.4]">{body}</span>
    </div>
  );
}

function BreakdownPanel({ title, items, currencyCode, type = 'text' }) {
  return (
    <article className="day-review-panel day-review-breakdown border border-[var(--border-light)] rounded-[var(--dashboard-card-radius)] bg-[var(--bg-card)] shadow-[var(--dashboard-card-shadow)] dark:bg-[var(--bg-card)] dark:border-[var(--border-light)] p-[9px]">
      <h2 className="app-panel-title">{title}</h2>
      <div className="day-review-breakdown-list flex flex-col gap-1 mt-2">
        {items.length === 0 ? (
          <p className="day-review-empty mt-3 mb-0 text-[var(--text-secondary)] text-[13px]">No data yet.</p>
        ) : (
          items.slice(0, 6).map(([label, value]) => {
            const pnl = typeof value === 'number' ? value : value.pnl;
            const trd = typeof value === 'number' ? null : value.trades;
            return (
              <div key={label} className="day-review-breakdown-row grid grid-cols-[minmax(0,1fr)_auto] gap-x-2.5 gap-y-[1px] items-center min-h-[34px] py-[5px] border-b border-[var(--border-light)] last:border-b-0">
                {type === 'symbol' ? <SymbolWithIcon symbol={label} /> : <span className="text-[var(--text-primary)] text-[11px] font-semibold">{label}</span>}
                <strong className={`text-[11px] font-semibold ${pnl >= 0 ? 'day-review-profit text-[var(--profit-color)]' : 'day-review-loss text-[var(--loss-color)]'}`}>
                  {formatCurrency(pnl, currencyCode)}
                </strong>
                {trd != null && <small className="col-span-full text-[var(--text-secondary)] text-[10px]">{trd} trades</small>}
              </div>
            );
          })
        )}
      </div>
    </article>
  );
}

function TradeSummary({ trade, currencyCode }) {
  const sideStr = trade.side ? String(trade.side).toLowerCase() : '';
  const sideLabel = sideStr === 'short' || sideStr === 'sell' ? 'Short' : 'Long';
  const openDate = getTradeOpenDate(trade);
  return (
    <div className="day-review-trade-summary grid grid-cols-[minmax(0,1fr)_auto] gap-x-2.5 gap-y-[5px] items-center pt-2">
      <SymbolWithIcon symbol={trade.symbol} />
      <strong className={`font-semibold ${Number(trade.pnl) >= 0 ? 'day-review-profit text-[var(--profit-color)]' : 'day-review-loss text-[var(--loss-color)]'}`}>
        {formatCurrency(Number(trade.pnl) || 0, currencyCode)}
      </strong>
      <span className="text-[var(--text-secondary)] text-xs">{trade.side ? sideLabel : '-'}</span>
      <small className="text-[var(--text-secondary)] text-xs">
        {openDate ? openDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
      </small>
    </div>
  );
}

function TradeDetail({ label, value }) {
  return (
    <div className="day-review-trade-detail flex min-w-0 flex-col gap-[3px] max-[900px]:order-3 max-[900px]:py-2 max-[900px]:px-3 max-[900px]:bg-[var(--surface-subtle)] max-[900px]:rounded-[10px] max-[900px]:border max-[900px]:border-[var(--border-light)]">
      <span className="text-[var(--text-secondary)] text-[10px] font-semibold uppercase">{label}</span>
      <strong className="text-[var(--text-primary)] text-xs font-semibold leading-[1.2] [overflow-wrap:anywhere]">{value}</strong>
    </div>
  );
}

export default DayReview;
