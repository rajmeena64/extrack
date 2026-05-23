import React, { useEffect, useMemo, useRef } from 'react';
import Chart from '../../utils/chartSetup';
import './PerformanceChart.css';
import { formatCurrency } from '../../utils/Currency';
import { useTheme } from '../../context/ThemeContext';
import { getTradeDisplayDate, getTradeDisplayTime, toTradeDateKey } from '../../utils/tradeTime';
import InfoTooltip from '../Common/InfoTooltip';

const formatCompactNumber = (value) => (
  new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
    style: 'decimal',
  }).format(value)
);

function PerformanceChart({
  trades,
  currencyCode = 'USD',
  title = 'Daily Net Cumulative P&L',
  groupBy = 'day',
}) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const { darkMode = false } = useTheme() || {};

  const { labels, data } = useMemo(() => {
    if (!trades || trades.length === 0) {
      return { labels: [], data: [] };
    }

    if (groupBy === 'trade') {
      const sortedTrades = [...trades]
        .filter((trade) => getTradeDisplayDate(trade) && trade.pnl != null)
        .sort((left, right) => getTradeDisplayTime(left) - getTradeDisplayTime(right));

      return {
        labels: sortedTrades.map((trade, index) => {
          const date = getTradeDisplayDate(trade);
          if (!date) return `Trade ${index + 1}`;
          return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }),
        data: sortedTrades.map((trade) => Number(trade.pnl) || 0),
      };
    }

    const daily = {};

    trades.forEach((trade) => {
      if (trade.pnl == null) return;

      const dateKey = toTradeDateKey(trade);
      if (!dateKey) return;
      daily[dateKey] = (daily[dateKey] || 0) + Number(trade.pnl);
    });

    const labels = Object.keys(daily).sort();
    const data = labels.map((date) => daily[date]);

    return { labels, data };
  }, [groupBy, trades]);

  const cumulativePnL = (values) => {
    let total = 0;
    return values.map((value) => {
      total += value;
      return total;
    });
  };

  useEffect(() => {
    if (!chartRef.current) {
      chartInstance.current?.destroy();
      chartInstance.current = null;
      return undefined;
    }

    chartInstance.current?.destroy();

    const ctx = chartRef.current.getContext('2d');
    const isMobile = window.innerWidth <= 768;
    const isDark = Boolean(darkMode);
    const theme = getComputedStyle(document.body);
    const accentDanger = theme.getPropertyValue('--accent-danger').trim() || '#ef4444';
    const textPrimary = isDark ? '#f8fafc' : '#0f172a';
    const textSecondary = isDark ? '#f8fafc' : '#0f172a';
    const positiveLine = isDark ? '#4fb889' : '#2f8f63';
    const negativeLine = isDark ? '#f87171' : accentDanger;
    const positiveFillTop = isDark ? 'rgba(47, 143, 99, 0.42)' : 'rgba(47, 143, 99, 0.32)';
    const positiveFillMid = isDark ? 'rgba(47, 143, 99, 0.2)' : 'rgba(47, 143, 99, 0.14)';
    const negativeFill = isDark ? 'rgba(248, 113, 113, 0.18)' : 'rgba(220, 38, 38, 0.12)';
    const tooltipBg = isDark ? '#0b0b0b' : '#ffffff';
    const tooltipText = isDark ? '#f8fafc' : '#0f172a';
    const tooltipBorder = isDark ? '#2a2a2a' : '#cbd5e1';
    const curveData = cumulativePnL(data);

    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            data: curveData,
            borderColor: positiveLine,
            borderWidth: isMobile ? 0.9 : 1,
            fill: 'origin',
            tension: 0.18,
            pointRadius: 0,
            pointHoverRadius: 4,
            pointHitRadius: 18,
            pointHoverBackgroundColor: textPrimary,
            pointHoverBorderColor: '#ffffff',
            pointHoverBorderWidth: 2,
            segment: {
              borderColor: (context) => (context.p1.parsed.y >= 0 ? positiveLine : negativeLine),
              backgroundColor: (context) =>
                context.p1.parsed.y >= 0
                  ? 'rgba(88, 212, 126, 0.18)'
                  : isDark
                    ? 'rgba(248, 113, 113, 0.14)'
                    : 'rgba(239, 68, 68, 0.14)',
            },
            backgroundColor: (context) => {
              const chart = context.chart;
              const { ctx: chartCtx, chartArea } = chart;

              if (!chartArea) {
                return positiveFillMid;
              }

              const gradient = chartCtx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
              gradient.addColorStop(0, positiveFillTop);
              gradient.addColorStop(0.62, positiveFillMid);
              gradient.addColorStop(1, negativeFill);
              return gradient;
            },
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: {
            top: isMobile ? 4 : 0,
            right: isMobile ? 2 : 0,
            bottom: isMobile ? 2 : 0,
            left: 0,
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: tooltipBg,
            titleColor: tooltipText,
            bodyColor: tooltipText,
            borderColor: tooltipBorder,
            borderWidth: 1,
            padding: 10,
            displayColors: false,
            intersect: false,
            callbacks: {
              title: (items) => items?.[0]?.label || '',
              label: (tooltip) => formatCurrency(tooltip.parsed.y, currencyCode),
            },
          },
        },
        scales: {
          x: {
            offset: true,
            grid: { display: false, drawBorder: false, drawOnChartArea: false, drawTicks: false },
            border: { display: false },
            ticks: {
              color: textSecondary,
              font: { size: isMobile ? 10 : 11, weight: '600' },
              autoSkip: true,
              maxTicksLimit: isMobile ? 5 : 7,
              padding: 6,
              callback: function (value, index) {
                if (index === 0) return '';
                return this.getLabelForValue(value);
              },
            },
          },
          y: {
            display: true,
            grid: {
              display: false,
              color: 'transparent',
              drawBorder: false,
              drawOnChartArea: false,
              drawTicks: false,
              lineWidth: 0,
            },
            border: { display: false },
            ticks: {
              color: textSecondary,
              display: true,
              padding: 3,
              maxTicksLimit: isMobile ? 5 : 7,
              font: { size: 11, weight: '600' },
              callback: (value) => formatCompactNumber(value),
            },
          },
        },
        interaction: {
          intersect: false,
          mode: 'nearest',
        },
        elements: {
          line: {
            borderWidth: isMobile ? 0.9 : 1,
          },
        },
      },
    });

    return () => chartInstance.current?.destroy();
  }, [currencyCode, darkMode, data, labels]);

  return (
    <div className="chart-card performance-card">
      <div className="performance-header">
        <h3 className="app-panel-title">{title}</h3>
        <InfoTooltip
          text="Tracks cumulative net P&L over time so you can see your equity curve."
          size={13}
          side="bottom-left"
        />
      </div>

      <div className="chart-container">
        {labels.length === 0 ? (
          <div className="dashboard-empty-state">
            <strong>No trades yet</strong>
            <span>Cumulative P&L will appear here once trades match the current filter.</span>
          </div>
        ) : (
          <canvas ref={chartRef} />
        )}
      </div>
    </div>
  );
}

export default PerformanceChart;
