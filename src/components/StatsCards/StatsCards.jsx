import React, { useMemo } from 'react';
import { ArrowDownRight, ArrowUpRight, CircleDollarSign, Gauge, Percent, Sigma } from 'lucide-react';
import './StatsCards.css';

function formatNumber(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return '-';
  return num.toFixed(2);
}

function formatCurrency(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return '$0.00';
  return `${num < 0 ? '-' : ''}$${Math.abs(num).toFixed(2)}`;
}

function StatsCards({ trades }) {
  const stats = useMemo(() => {
    if (!Array.isArray(trades)) {
      return {
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
    }

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
  }, [trades]);

  const netPnlTone = stats.totalPnL >= 0 ? 'positive' : 'negative';
  const avgTone = stats.avgPnL >= 0 ? 'positive' : 'negative';

  const cards = [
    {
      key: 'net',
      title: 'Total P&L',
      shortTitle: 'Total P&L',
      value: formatCurrency(stats.totalPnL),
      badge: `${stats.totalTrades} trades`,
      tone: netPnlTone,
      badgeTone: 'neutral',
      icon: CircleDollarSign,
      meta: `${stats.wins} wins / ${stats.losses} losses`,
      mobileMeta: `${stats.wins}W / ${stats.losses}L`,
      detail: stats.totalTrades > 0 ? 'Overall result' : 'No trades yet',
      mobileDetail: stats.totalTrades > 0 ? 'Overall result' : 'No trades yet',
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
      meta: `Avg/trade ${formatCurrency(stats.avgPnL)}`,
      mobileMeta: `Avg ${formatCurrency(stats.avgPnL)}`,
      detail: 'Target 1.00+',
      mobileDetail: 'Target 1.0+',
    },
    {
      key: 'avg',
      title: 'Avg P&L',
      shortTitle: 'Avg P&L',
      value: formatCurrency(stats.avgPnL),
      badge: stats.avgPnL >= 0 ? 'Positive edge' : 'Negative edge',
      tone: avgTone,
      badgeTone: stats.avgPnL >= 0 ? 'positive' : 'negative',
      icon: Sigma,
      meta: `Avg win ${formatCurrency(stats.avgWin)}`,
      mobileMeta: `Win ${formatCurrency(stats.avgWin)}`,
      detail: `Avg loss ${formatCurrency(-stats.avgLoss)}`,
      mobileDetail: `Loss ${formatCurrency(-stats.avgLoss)}`,
    },
  ];

  return (
    <section className="stats-cards stats-grid-layout">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <article
            key={card.key}
            className={`metric-card metric-card--${card.tone}${card.key === 'net' ? ' metric-card--featured' : ''}`}
          >
            <div className="metric-card__top">
              <div className="metric-card__label-row">
                <p className="metric-card__label">
                  <span className="metric-card__label-full">{card.title}</span>
                  <span className="metric-card__label-short">{card.shortTitle ?? card.title}</span>
                </p>
                <span className={`metric-card__badge metric-card__badge--${card.badgeTone ?? 'neutral'}`}>{card.badge}</span>
              </div>

              <div className="metric-card__value-row">
                <h3>{card.value}</h3>
                <span className="metric-card__icon">
                  {card.tone === 'negative' ? <ArrowDownRight size={15} /> : <ArrowUpRight size={15} />}
                  <Icon size={15} />
                </span>
              </div>
            </div>

            <div className="metric-card__bottom">
              <span>
                <span className="metric-card__meta-full">{card.meta}</span>
                <span className="metric-card__meta-short">{card.mobileMeta ?? card.meta}</span>
              </span>
              <span>
                <span className="metric-card__detail-full">{card.detail}</span>
                <span className="metric-card__detail-short">{card.mobileDetail ?? card.detail}</span>
              </span>
            </div>
          </article>
        );
      })}
    </section>
  );
}

export default StatsCards;
