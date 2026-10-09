import React, { useEffect, useMemo, useRef } from 'react';
import Chart from './chartSetup';
import { formatCurrency } from '@/utils/user/Currency';
import { useTheme } from '@/context/ThemeContext';
import { Card, CardHeader, CardTitle, InfoTooltip } from '@/components/ui';
import { getTradeDisplayDate, formatDisplayTime, formatDisplayDate, toTradeDateKey } from '@/utils/trading/tradeTime';

const formatCompactNumber = (value) => (
  new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
    style: 'decimal',
  }).format(value)
);

const cumulativePnL = (values) => {
  let total = 0;
  return values.map((value) => (total += value));
};

function PerformanceChart({
  chartData = null,
  trades = null,
  groupBy = 'day',
  currencyCode = 'USD',
  title = 'Daily Net Cumulative P&L',
  className = '',
}) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const { darkMode = false } = useTheme() || {};

  const { labels, data } = useMemo(() => {
    if (Array.isArray(chartData) && chartData.length > 0) {
      return {
        labels: chartData.map((d) => d.date),
        data: chartData.map((d) => d.pnl),
      };
    }
    if (Array.isArray(trades) && trades.length > 0) {
      if (groupBy === 'trade') {
        const valid = trades.filter((t) => t?.pnl != null);
        return {
          labels: valid.map((t, i) => {
            const date = getTradeDisplayDate(t);
            return date ? formatDisplayTime(date) : `T${i + 1}`;
          }),
          data: valid.map((t) => (Number.isFinite(Number(t.pnl)) ? Number(t.pnl) : 0)),
        };
      }
      const daily = {};
      trades.forEach((t) => {
        if (t?.pnl == null) return;
        const dateKey = toTradeDateKey(t);
        if (!dateKey) return;
        daily[dateKey] = (daily[dateKey] || 0) + Number(t.pnl);
      });
      const sortedKeys = Object.keys(daily).sort();
      return {
        labels: sortedKeys.map((k) => formatDisplayDate(k)),
        data: sortedKeys.map((k) => daily[k]),
      };
    }
    return { labels: [], data: [] };
  }, [chartData, trades, groupBy]);

  const hasData = labels.length > 0;
  const latestData = useRef({ labels, data });
  latestData.current = { labels, data };

  useEffect(() => {
    if (!chartRef.current || !hasData) {
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
    const textSecondary = isDark ? '#f8fafc' : '#0f172a';
    const positiveLine = isDark ? '#4fb889' : '#2f8f63';
    const negativeLine = isDark ? '#f87171' : accentDanger;
    const positiveFillTop = isDark ? 'rgba(47, 143, 99, 0.42)' : 'rgba(47, 143, 99, 0.32)';
    const positiveFillMid = isDark ? 'rgba(47, 143, 99, 0.2)' : 'rgba(47, 143, 99, 0.14)';
    const negativeFill = isDark ? 'rgba(248, 113, 113, 0.18)' : 'rgba(220, 38, 38, 0.12)';
    const tooltipBg = isDark ? '#0b0b0b' : '#ffffff';
    const tooltipText = isDark ? '#f8fafc' : '#0f172a';
    const tooltipBorder = isDark ? '#2a2a2a' : '#cbd5e1';

    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: latestData.current.labels,
        datasets: [
          {
            label: 'Cumulative P&L',
            data: cumulativePnL(latestData.current.data),
            borderColor: (context) => {
              const currentVal = context.raw ?? 0;
              return currentVal >= 0 ? positiveLine : negativeLine;
            },
            backgroundColor: (context) => {
              const { chart } = context;
              const { ctx: c, chartArea } = chart;
              if (!chartArea) return null;

              const gradient = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
              const currentVal = context.raw ?? 0;

              if (currentVal >= 0) {
                gradient.addColorStop(0, positiveFillTop);
                gradient.addColorStop(0.5, positiveFillMid);
                gradient.addColorStop(1, 'rgba(47, 143, 99, 0.02)');
              } else {
                gradient.addColorStop(0, negativeFill);
                gradient.addColorStop(1, 'rgba(239, 68, 68, 0.02)');
              }

              return gradient;
            },
            fill: true,
            tension: 0.32,
            borderWidth: 1.5,
            pointRadius: 0,
            pointHoverRadius: 4,
            pointHoverBackgroundColor: (context) => {
              const currentVal = context.raw ?? 0;
              return currentVal >= 0 ? positiveLine : negativeLine;
            },
            pointHoverBorderColor: '#ffffff',
            pointHoverBorderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 300 },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: tooltipBg,
            titleColor: tooltipText,
            bodyColor: tooltipText,
            borderColor: tooltipBorder,
            borderWidth: 1,
            padding: 8,
            cornerRadius: 8,
            displayColors: false,
            callbacks: {
              title: (items) => items[0]?.label || '',
              label: (context) => `P&L: ${formatCurrency(context.raw, currencyCode)}`,
            },
          },
        },
        scales: {
          x: {
            display: true,
            grid: { display: false },
            border: { display: false },
            ticks: {
              color: textSecondary,
              font: { size: 10 },
              maxTicksLimit: isMobile ? 4 : 6,
              callback: function callback(value) {
                return this.getLabelForValue(value);
              },
            },
          },
          y: {
            display: true,
            grid: {
              color: isDark ? '#2a2a2a' : '#e2e8f0',
              drawBorder: false,
            },
            border: { display: false },
            ticks: {
              color: textSecondary,
              padding: 6,
              maxTicksLimit: 5,
              font: { size: 10 },
              callback: (value) => formatCompactNumber(value),
            },
          },
        },
        interaction: {
          intersect: false,
          mode: 'nearest',
        },
      },
    });

    const instance = chartInstance.current;
    return () => {
      instance.destroy();
      if (chartInstance.current === instance) chartInstance.current = null;
    };
  }, [currencyCode, darkMode, hasData]);

  useEffect(() => {
    const instance = chartInstance.current;
    if (!instance) return;
    instance.data.labels = labels;
    instance.data.datasets[0].data = cumulativePnL(data);
    instance.update('none');
  }, [data, labels]);

  return (
    <Card className={`w-full h-full min-h-0 flex flex-col overflow-hidden ${className}`.trim()} padding="none">
      <CardHeader className="flex items-center gap-2 p-3.5 pb-2 mb-0 border-b border-[var(--divider-strong)] min-h-[var(--title-card-row-height)] flex-nowrap shrink-0">
        <div className="inline-flex items-center gap-2 flex-nowrap min-w-0">
          <CardTitle className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">{title}</CardTitle>
          <InfoTooltip
            text="Tracks cumulative net P&L over time so you can see your equity curve."
            size={13}
            side="bottom-left"
          />
        </div>
      </CardHeader>

      <div className="flex-1 min-h-0 p-2 sm:p-3 flex relative w-full h-full">
        {labels.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-6 text-center text-[var(--text-secondary)] w-full">
            <strong className="text-[var(--heading)] font-semibold mb-1">No trades yet</strong>
            <span className="text-xs">Cumulative P&L will appear here once trades match the current filter.</span>
          </div>
        ) : (
          <canvas ref={chartRef} className="w-full h-full block" />
        )}
      </div>
    </Card>
  );
}

export default PerformanceChart;
