import React, { useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, CircleDollarSign, Gauge, Percent, Sigma } from 'lucide-react';
import './StatsCards.css';
import { formatCurrency as formatDashboardCurrency } from '../../utils/Currency';
import { decodeStorageValue, encodeStorageValue } from '../../utils/obfuscatedStorage';
import InfoTooltip from '../Common/InfoTooltip';

const STATS_CACHE_KEY = 'm5$ds.4';
const LEGACY_STATS_CACHE_KEY = 'entrack:dashboard_stats';
const PREVIOUS_STATS_CACHE_KEY = ['ex', 'track:dashboard_stats'].join('');
const DEFAULT_STATS_SCOPE = 'dashboard:all';

function formatNumber(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return '-';
  return num.toFixed(2);
}

const emptyStats = {
  totalPnL: 0,
  totalTrades: 0,
  winRate: 0,
  profitFactor: 0,
  avgPnL: 0,
  avgWin: 0,
  avgLoss: 0,
  wins: 0,
  losses: 0,
};

const calculateStats = (trades = []) => {
  let totalPnL = 0;
  let wins = 0;
  let losses = 0;
  let grossProfit = 0;
  let grossLoss = 0;

  trades.forEach((trade) => {
    const pnl = Number(trade?.pnl);

    if (Number.isNaN(pnl)) return;
    totalPnL += pnl;

    if (pnl > 0) {
      wins += 1;
      grossProfit += pnl;
    } else if (pnl < 0) {
      losses += 1;
      grossLoss += Math.abs(pnl);
    }
  });

  const totalTrades = trades.length;
  const avgPnL = totalTrades > 0 ? totalPnL / totalTrades : 0;
  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
  const avgWin = wins > 0 ? grossProfit / wins : 0;
  const avgLoss = losses > 0 ? grossLoss / losses : 0;
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? grossProfit : 0;

  return {
    totalPnL,
    totalTrades,
    winRate,
    profitFactor,
    avgPnL,
    avgWin,
    avgLoss,
    wins,
    losses,
  };
};

const readStatsCache = () => {
  try {
    const saved = localStorage.getItem(STATS_CACHE_KEY);
    if (saved) {
      const decoded = decodeStorageValue(saved);
      return decoded?.scopes ? decoded : { scopes: { [DEFAULT_STATS_SCOPE]: decoded } };
    }

    const legacySaved =
      localStorage.getItem(LEGACY_STATS_CACHE_KEY) ||
      localStorage.getItem(PREVIOUS_STATS_CACHE_KEY);
    if (legacySaved) {
      const stats = JSON.parse(legacySaved);
      const nextCache = { scopes: { [DEFAULT_STATS_SCOPE]: stats } };
      localStorage.setItem(STATS_CACHE_KEY, encodeStorageValue(nextCache));
      localStorage.removeItem(LEGACY_STATS_CACHE_KEY);
      localStorage.removeItem(PREVIOUS_STATS_CACHE_KEY);
      return nextCache;
    }

    return { scopes: {} };
  } catch {
    localStorage.removeItem(STATS_CACHE_KEY);
    localStorage.removeItem(LEGACY_STATS_CACHE_KEY);
    localStorage.removeItem(PREVIOUS_STATS_CACHE_KEY);
    return { scopes: {} };
  }
};

const writeStatsCache = (scopeKey, stats) => {
  try {
    const cache = readStatsCache();
    const nextCache = {
      ...cache,
      scopes: {
        ...(cache.scopes || {}),
        [scopeKey]: stats,
      },
    };
    localStorage.setItem(STATS_CACHE_KEY, encodeStorageValue(nextCache));
    localStorage.removeItem(LEGACY_STATS_CACHE_KEY);
    localStorage.removeItem(PREVIOUS_STATS_CACHE_KEY);
  } catch {
    // Cache is a performance hint only.
  }
};

function StatsCards({ trades, currencyCode = 'USD', isLoading = false, statsScopeKey = DEFAULT_STATS_SCOPE }) {
  const [initialCache] = useState(() => readStatsCache());

  const cachedStats = useMemo(() => (
    readStatsCache().scopes?.[statsScopeKey] || initialCache.scopes?.[statsScopeKey] || null
  ), [initialCache.scopes, statsScopeKey]);

  const stats = useMemo(() => {
    if (Array.isArray(trades) && (!isLoading || trades.length > 0)) {
      const result = calculateStats(trades);
      writeStatsCache(statsScopeKey, result);
      return result;
    }

    // If loading and we have cached stats, use them for immediate rendering (LCP)
    if (isLoading && cachedStats) {
      return cachedStats;
    }

    // Otherwise, return zero stats
    return {
      ...emptyStats,
      isPlaceholder: true
    };
  }, [trades, cachedStats, isLoading, statsScopeKey]);

  const netPnlTone = stats.totalPnL >= 0 ? 'positive' : 'negative';
  const avgTone = stats.avgPnL >= 0 ? 'positive' : 'negative';

  const showSkeleton = isLoading && !cachedStats;

  const cards = [
    {
      key: 'net',
      title: 'Total P&L',
      shortTitle: 'Total P&L',
      value: formatDashboardCurrency(stats.totalPnL, currencyCode),
      badge: `${stats.totalTrades} trades`,
      tone: netPnlTone,
      badgeTone: 'neutral',
      icon: CircleDollarSign,
      meta: `${stats.wins} wins / ${stats.losses} losses`,
      mobileMeta: `${stats.wins}W / ${stats.losses}L`,
      detail: stats.totalTrades > 0 ? 'Overall result' : 'No trades yet',
      mobileDetail: stats.totalTrades > 0 ? 'Overall result' : 'No trades yet',
      info: 'Total profit or loss from all trades in the current filter.',
    },
    {
      key: 'win-rate',
      title: 'Trade Win %',
      shortTitle: 'Win %',
      value: `${stats.winRate.toFixed(1)}%`,
      badge: `${stats.wins}W / ${stats.losses}L`,
      tone: 'neutral',
      badgeTone: 'neutral',
      icon: Percent,
      meta: `${stats.wins} winning trades`,
      mobileMeta: `${stats.wins} winning`,
      detail: stats.totalTrades > 0 ? 'Closed trade accuracy' : 'Waiting for history',
      mobileDetail: stats.totalTrades > 0 ? 'Accuracy' : 'Waiting',
      info: 'Percentage of trades that closed with positive P&L.',
    },
    {
      key: 'factor',
      title: 'Profit Factor',
      shortTitle: 'P. Factor',
      value: formatNumber(stats.profitFactor),
      badge: stats.profitFactor >= 1 ? 'Healthy' : 'Needs work',
      tone: stats.profitFactor >= 1 ? 'positive' : 'negative',
      badgeTone: stats.profitFactor >= 1 ? 'positive' : 'negative',
      icon: Gauge,
      meta: `Avg/trade ${formatDashboardCurrency(stats.avgPnL, currencyCode)}`,
      mobileMeta: `Avg ${formatDashboardCurrency(stats.avgPnL, currencyCode)}`,
      detail: 'Target 1.00+',
      mobileDetail: 'Target 1.0+',
      info: 'Gross profit divided by gross loss; above 1 means profit is beating loss.',
    },
    {
      key: 'avg',
      title: 'Avg P&L',
      shortTitle: 'Avg P&L',
      value: formatDashboardCurrency(stats.avgPnL, currencyCode),
      badge: stats.avgPnL >= 0 ? 'Positive edge' : 'Negative edge',
      tone: avgTone,
      badgeTone: stats.avgPnL >= 0 ? 'positive' : 'negative',
      icon: Sigma,
      meta: `Avg win ${formatDashboardCurrency(stats.avgWin, currencyCode)}`,
      mobileMeta: `Win ${formatDashboardCurrency(stats.avgWin, currencyCode)}`,
      detail: `Avg loss ${formatDashboardCurrency(-stats.avgLoss, currencyCode)}`,
      mobileDetail: `Loss ${formatDashboardCurrency(-stats.avgLoss, currencyCode)}`,
      info: 'Average P&L per trade in the current filter.',
    },
  ];

  return (
    <section className="stats-cards stats-grid-layout">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <article
            key={card.key}
            className={`metric-card metric-card--${card.tone}${card.key === 'net' ? ' metric-card--featured' : ''}${showSkeleton ? ' skeleton-pulse' : ''}`}
          >
            <div className="metric-card__top">
              <div className="metric-card__label-row">
                <div className="metric-card__heading">
                  <p className="metric-card__label">
                    <span className="metric-card__label-full">{card.title}</span>
                    <span className="metric-card__label-short">{card.shortTitle ?? card.title}</span>
                  </p>
                  <InfoTooltip text={card.info} size={12} side="bottom-left" />
                </div>
                {showSkeleton ? (
                  <span className="skeleton-text" style={{ width: '60px', height: '18px' }} />
                ) : (
                  <span className={`metric-card__badge metric-card__badge--${card.badgeTone ?? 'neutral'}`}>{card.badge}</span>
                )}
              </div>

              <div className="metric-card__value-row">
                {showSkeleton ? (
                  <span className="skeleton-text" style={{ width: '100px', height: '28px' }} />
                ) : (
                  <span className="metric-card__value">{card.value}</span>
                )}
                <span className="metric-card__icon">
                  {card.tone === 'negative' ? <ArrowDownRight size={15} /> : <ArrowUpRight size={15} />}
                  <Icon size={15} />
                </span>
              </div>
            </div>

            <div className="metric-card__bottom">
              {showSkeleton ? (
                <>
                  <span className="skeleton-text" style={{ width: '80px', height: '12px' }} />
                  <span className="skeleton-text" style={{ width: '60px', height: '12px' }} />
                </>
              ) : (
                <>
                  <span>
                    <span className="metric-card__meta-full">{card.meta}</span>
                    <span className="metric-card__meta-short">{card.mobileMeta ?? card.meta}</span>
                  </span>
                  <span>
                    <span className="metric-card__detail-full">{card.detail}</span>
                    <span className="metric-card__detail-short">{card.mobileDetail ?? card.detail}</span>
                  </span>
                </>
              )}
            </div>
          </article>
        );
      })}
    </section>
  );
}

export default StatsCards;
