import React, { useEffect, useMemo, useRef } from 'react';
import Chart from './chartSetup';
import { formatCurrency } from '@/utils/user/Currency';
import { useTheme } from '@/context/ThemeContext';
import { Card, CardHeader, CardTitle, InfoTooltip } from '@/components/ui';

const formatCompactNumber = (value) => (
  new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
    style: 'decimal',
  }).format(value)
);

function ActivityChart({ chartData = null, currencyCode = 'USD', className = '' }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const { darkMode = false } = useTheme() || {};

  const { labels, dailyPnlData } = useMemo(() => {
    if (Array.isArray(chartData) && chartData.length > 0) {
      return {
        labels: chartData.map((d) => d.date),
        dailyPnlData: chartData.map((d) => d.pnl),
      };
    }
    return { labels: [], dailyPnlData: [] };
  }, [chartData]);

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
    <Card className={`w-full h-full min-h-0 flex flex-col overflow-hidden ${className}`.trim()} padding="none">
      <CardHeader className="flex items-center gap-2 p-3.5 pb-2 mb-0 border-b border-[var(--divider-strong)] min-h-[var(--title-card-row-height)] flex-nowrap shrink-0">
        <div className="inline-flex items-center gap-2 flex-nowrap min-w-0">
          <CardTitle className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">Net Daily P&L</CardTitle>
          <InfoTooltip
            text="Shows each trading day's net P&L as a bar."
            size={13}
            side="bottom-left"
          />
        </div>
      </CardHeader>

      <div className="flex-1 min-h-0 p-3 flex relative w-full h-full">
        {labels.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-6 text-center text-[var(--text-secondary)] w-full">
            <strong className="text-[var(--heading)] font-semibold mb-1">No trades yet</strong>
            <span className="text-xs">Daily P&L will appear here once trades match the current filter.</span>
          </div>
        ) : (
          <canvas ref={chartRef} className="w-full h-full block" />
        )}
      </div>
    </Card>
  );
}

export default ActivityChart;
