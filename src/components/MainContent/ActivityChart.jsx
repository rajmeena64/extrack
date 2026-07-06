import React, { useEffect, useMemo, useRef } from 'react';
import Chart from '../../utils/chartSetup';
import './ActivityChart.css';
import { formatCurrency } from '../../utils/Currency';
import { useTheme } from '../../context/ThemeContext';
import { toTradeDateKey } from '../../utils/tradeTime';
import InfoTooltip from '../Common/InfoTooltip';

const formatCompactNumber = (value) => (
  new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
    style: 'decimal',
  }).format(value)
);

function ActivityChart({ trades, currencyCode = 'USD' }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const { darkMode = false } = useTheme() || {};

  const { labels, dailyPnlData } = useMemo(() => {
    if (!Array.isArray(trades) || trades.length === 0) {
      return { labels: [], dailyPnlData: [] };
    }

    const daily = {};
    trades.forEach((trade) => {
      if (trade.pnl == null) return;

      const key = toTradeDateKey(trade);
      if (!key) return;

      daily[key] = (daily[key] || 0) + (Number(trade.pnl) || 0);
    });

    const sortedLabels = Object.keys(daily).sort();
    const visibleLabels = sortedLabels.slice(-30);

    return {
      labels: visibleLabels,
      dailyPnlData: visibleLabels.map((date) => daily[date]),
    };
  }, [trades]);

  useEffect(() => {
    if (!chartRef.current) {
      chartInstance.current?.destroy();
      chartInstance.current = null;
      return undefined;
    }

    chartInstance.current?.destroy();

    const ctx = chartRef.current.getContext('2d');
    const theme = getComputedStyle(document.body);
    const isDarkMode = Boolean(darkMode);
    const profitColor = theme.getPropertyValue('--profit-color').trim() || '#2563eb';
    const lossColor = theme.getPropertyValue('--loss-color').trim() || '#dc2626';
    const textPrimary = isDarkMode ? '#f8fafc' : '#0f172a';
    const textSecondary = isDarkMode ? '#f8fafc' : '#0f172a';
    const tooltipBg = isDarkMode ? '#0b0b0b' : '#ffffff';
    const tooltipBorder = isDarkMode ? '#2a2a2a' : '#cbd5e1';

    chartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Net Daily P&L',
            data: dailyPnlData,
            backgroundColor: (context) => {
              const value = context.raw || 0;
              return value >= 0 ? profitColor : lossColor;
            },
            hoverBackgroundColor: (context) => {
              const value = context.raw || 0;
              return value >= 0 ? (isDarkMode ? '#60a5fa' : '#1d4ed8') : '#b91c1c';
            },
            borderRadius: 4,
            borderSkipped: false,
            borderWidth: 0,
            barThickness: 8,
            maxBarThickness: 9,
            categoryPercentage: 0.72,
            barPercentage: 0.86,
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
            right: 0,
            left: 0,
          },
        },
        scales: {
          x: {
            offset: true,
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
                size: 12,
                weight: '700',
              },
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 7,
              padding: 6,
              callback: function (_value, index) {
                const label = labels[index];
                if (!label) return '';
                const [, month, day] = label.split('-');
                return `${month}/${day}`;
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
              color: 'transparent',
              drawTicks: false,
            },
            ticks: {
              color: textSecondary,
              padding: 3,
              maxTicksLimit: 7,
              font: {
                size: 12,
                weight: '700',
              },
              callback: function (value) {
                return formatCompactNumber(value);
              },
            },
          },
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: tooltipBg,
            titleColor: textPrimary,
            bodyColor: textPrimary,
            borderColor: tooltipBorder,
            borderWidth: 1,
            cornerRadius: 10,
            padding: 12,
            displayColors: true,
            boxWidth: 8,
            boxHeight: 8,
            boxPadding: 6,
            callbacks: {
              title: (items) => items?.[0]?.label || '',
              labelColor: function (context) {
                const value = context.parsed.y || 0;
                const color = value >= 0 ? profitColor : lossColor;
                return {
                  borderColor: color,
                  backgroundColor: color,
                };
              },
              label: function (context) {
                const value = context.parsed.y || 0;
                const sign = value > 0 ? '+' : '';
                return `Net P&L: ${sign}${formatCurrency(value, currencyCode)}`;
              },
            },
          },
        },
        interaction: {
          intersect: false,
          mode: 'nearest',
        },
      },
    });

    return () => chartInstance.current?.destroy();
  }, [currencyCode, dailyPnlData, darkMode, labels]);

  return (
    <div className="activity-card--daily-pnl">
      <div className="activity-card__header">
        <div className="activity-card__title-wrap">
          <div className="activity-card__title-row">
            <h3 className="app-panel-title">Net Daily P&L</h3>
            <InfoTooltip
              text="Shows each trading day's net P&L as a bar."
              size={13}
              side="bottom-left"
            />
          </div>
        </div>

      </div>

      <div className="activity-card__chart-shell">
        {labels.length === 0 ? (
          <div className="dashboard-empty-state">
            <strong>No trades yet</strong>
            <span>Daily P&L will appear here once trades match the current filter.</span>
          </div>
        ) : (
          <canvas ref={chartRef} />
        )}
      </div>
    </div>
  );
}

export default ActivityChart;
