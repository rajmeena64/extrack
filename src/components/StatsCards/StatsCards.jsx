import React, { useMemo } from 'react';
import { ArrowDownRight, ArrowUpRight, CircleDollarSign, Gauge, Percent, Scale, Sigma } from 'lucide-react';
import './StatsCards.css';

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

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
  const ringWinRate = clamp(stats.winRate, 0, 100);
  const factorProgress = clamp((stats.profitFactor / 3) * 100, 0, 100);
  const avgWinLossRatio = stats.avgLoss > 0 ? stats.avgWin / stats.avgLoss : stats.avgWin > 0 ? stats.avgWin : 0;
  const avgWinLossProgress = clamp((avgWinLossRatio / 2) * 100, 0, 100);

  const cards = [
    {
      key: 'net',
      title: 'Net P&L',
      value: formatCurrency(stats.totalPnL),
      badge: `${stats.totalTrades} trades`,
      tone: netPnlTone,
      icon: CircleDollarSign,
      footer: `${stats.wins} winners`,
      sideValue: `${stats.losses} losers`,
      visual: (
        <div className="metric-card__spark metric-card__spark--net">
          <span className="metric-card__spark-line" />
        </div>
      ),
    },
    {
      key: 'win-rate',
      title: 'Trade Win %',
      value: `${stats.winRate.toFixed(1)}%`,
      badge: `${stats.wins}W / ${stats.losses}L`,
      tone: 'neutral',
      icon: Percent,
      footer: `${stats.wins} wins`,
      sideValue: `${stats.losses} losses`,
      visual: (
        <div
          className="metric-card__ring"
          style={{ '--ring-progress': `${ringWinRate}%` }}
        >
          <div className="metric-card__ring-center">{Math.round(ringWinRate)}%</div>
        </div>
      ),
    },
    {
      key: 'factor',
      title: 'Profit Factor',
      value: formatNumber(stats.profitFactor),
      badge: stats.profitFactor >= 1 ? 'Healthy' : 'Needs work',
      tone: stats.profitFactor >= 1 ? 'positive' : 'negative',
      icon: Gauge,
      footer: `Avg/trade ${formatCurrency(stats.avgPnL)}`,
      sideValue: `PF target 1.00+`,
      visual: (
        <div className="metric-card__progress">
          <span style={{ width: `${factorProgress}%` }} />
        </div>
      ),
    },
    {
      key: 'avg',
      title: 'Avg P&L',
      value: formatCurrency(stats.avgPnL),
      badge: stats.avgPnL >= 0 ? 'Positive edge' : 'Negative edge',
      tone: avgTone,
      icon: Sigma,
      footer: `Avg win ${formatCurrency(stats.avgWin)}`,
      sideValue: `Avg loss ${formatCurrency(-stats.avgLoss)}`,
      visual: (
        <div className="metric-card__split">
          <span className="win" style={{ width: `${clamp((stats.avgWin / Math.max(stats.avgWin + stats.avgLoss, 1)) * 100, 12, 88)}%` }} />
          <span className="loss" />
        </div>
      ),
    },
    {
      key: 'ratio',
      title: 'Avg Win/Loss',
      value: formatNumber(avgWinLossRatio),
      badge: 'Reward balance',
      tone: avgWinLossRatio >= 1 ? 'positive' : 'negative',
      icon: Scale,
      footer: `Avg win ${formatCurrency(stats.avgWin)}`,
      sideValue: `Avg loss ${formatCurrency(-stats.avgLoss)}`,
      visual: (
        <div className="metric-card__progress metric-card__progress--wide">
          <span style={{ width: `${avgWinLossProgress}%` }} />
        </div>
      ),
    },
  ];

  return (
    <section className="stats-cards stats-grid-layout">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <article key={card.key} className={`metric-card metric-card--${card.tone}`}>
            <div className="metric-card__top">
              <div>
                <div className="metric-card__label-row">
                  <p className="metric-card__label">{card.title}</p>
                  <span className="metric-card__badge">{card.badge}</span>
                </div>
                <div className="metric-card__value-row">
                  <h3>{card.value}</h3>
                  <span className="metric-card__icon">
                    {card.tone === 'negative' ? <ArrowDownRight size={16} /> : <ArrowUpRight size={16} />}
                    <Icon size={16} />
                  </span>
                </div>
              </div>
              <div className="metric-card__visual">{card.visual}</div>
            </div>

            <div className="metric-card__bottom">
              <span>{card.footer}</span>
              <span>{card.sideValue}</span>
            </div>
          </article>
        );
      })}
    </section>
  );
}

export default StatsCards;
