import React, { useEffect, useMemo, useRef } from 'react';
import Chart from '../../utils/chartSetup';
import './ActivityChart.css';
import { formatCompactCurrency, formatCurrency } from '../../utils/Currency';

const WEEK_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function ActivityChart({ trades, currencyCode = 'USD' }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  const { wins: winPnlData, losses: lossPnlData } = useMemo(() => {
    const wins = [0, 0, 0, 0, 0, 0, 0];
    const losses = [0, 0, 0, 0, 0, 0, 0];

    if (!trades || trades.length === 0) {
      return {
        wins,
        losses,
      };
    }

    trades.forEach((trade) => {
      if (!trade.timestamp || trade.pnl == null) return;

      const pnl = parseFloat(trade.pnl) || 0;
      const day = new Date(trade.timestamp).getDay();

      if (pnl > 0) {
        wins[day] += pnl;
      } else if (pnl < 0) {
        losses[day] += Math.abs(pnl);
      }
    });

    return {
      wins: [wins[1], wins[2], wins[3], wins[4], wins[5], wins[6], wins[0]],
      losses: [losses[1], losses[2], losses[3], losses[4], losses[5], losses[6], losses[0]],
    };
  }, [trades]);

  useEffect(() => {
    if (!chartRef.current) return;
    chartInstance.current?.destroy();

    const ctx = chartRef.current.getContext('2d');
    const theme = getComputedStyle(document.body);
    const isDarkMode = document.body.classList.contains('dark-mode');
    const accentSuccess = theme.getPropertyValue('--accent-success').trim() || '#58d47e';
    const accentSuccessStrong = theme.getPropertyValue('--accent-success-strong').trim() || '#1e8f49';
    const accentInk = theme.getPropertyValue('--accent-ink').trim() || '#111714';
    const accentInkSoft = theme.getPropertyValue('--accent-ink-soft').trim() || '#2b332d';
    const textSecondary = theme.getPropertyValue('--text-secondary').trim() || '#7b8a7d';
    const dividerStrong = theme.getPropertyValue('--divider-strong').trim() || 'rgba(22, 34, 25, 0.08)';
    const winPnlGradient = ctx.createLinearGradient(0, 0, 0, 220);
    winPnlGradient.addColorStop(0, accentSuccess);
    winPnlGradient.addColorStop(1, accentSuccessStrong);

    const lossPnlGradient = ctx.createLinearGradient(0, 0, 0, 220);
    lossPnlGradient.addColorStop(0, isDarkMode ? '#a8b3c7' : accentInkSoft);
    lossPnlGradient.addColorStop(1, isDarkMode ? '#6f7c93' : accentInk);

    chartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: WEEK_LABELS,
        datasets: [
          {
            label: 'Win P&L',
            data: winPnlData,
            backgroundColor: winPnlGradient,
            borderRadius: 999,
            borderSkipped: false,
            barThickness: 10,
            maxBarThickness: 10,
            categoryPercentage: 0.58,
            barPercentage: 0.92,
          },
          {
            label: 'Loss P&L',
            data: lossPnlData,
            backgroundColor: lossPnlGradient,
            borderRadius: 999,
            borderSkipped: false,
            barThickness: 10,
            maxBarThickness: 10,
            categoryPercentage: 0.58,
            barPercentage: 0.92,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 550,
          easing: 'easeOutQuart',
        },
        layout: {
          padding: {
            top: 8,
          },
        },
        scales: {
          x: {
            stacked: false,
            grid: {
              display: false,
              drawBorder: false,
            },
            border: {
              display: false,
            },
            ticks: {
              color: textSecondary,
              font: {
                size: 11,
                weight: '600',
              },
            },
          },
          y: {
            beginAtZero: true,
            border: {
              display: false,
            },
            grid: {
              display: false,
              color: dividerStrong,
              drawTicks: false,
            },
            ticks: {
              color: textSecondary,
              padding: 8,
              callback: function (value) {
                return formatCompactCurrency(value, currencyCode);
              },
            },
          },
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: theme.getPropertyValue('--text-primary').trim() || '#111714',
            cornerRadius: 10,
            padding: 12,
            callbacks: {
              label: function (context) {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                label += formatCurrency(context.parsed.y, currencyCode);
                return label;
              },
            },
          },
        },
      },
    });

    return () => chartInstance.current?.destroy();
  }, [currencyCode, lossPnlData, winPnlData]);

  return (
    <div className="activity-card--daily-pnl">
      <div className="activity-card__header">
        <div className="activity-card__title-wrap">
          <div className="activity-card__title-row">
            <h3 className="app-panel-title">Weekly Activity</h3>
          </div>
          <p>Win P&amp;L & Loss P&amp;L</p>
        </div>

      </div>

      <div className="activity-card__chart-shell">
        <canvas ref={chartRef} />
      </div>
    </div>
  );
}

export default ActivityChart;
