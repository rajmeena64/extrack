import React, { useEffect, useRef } from 'react';
import Chart from '../../utils/chartSetup';
import './PerformanceChart.css';

function PerformanceChart({ trades }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  const calculateDailyPnL = () => {
    const daily = {};

    if (!trades || trades.length === 0) {
      return { labels: [], data: [] };
    }

    trades.forEach((trade) => {
      if (!trade.timestamp || trade.pnl == null) return;

      const date = new Date(trade.timestamp).toISOString().split('T')[0];
      daily[date] = (daily[date] || 0) + Number(trade.pnl);
    });

    const labels = Object.keys(daily).sort();
    const data = labels.map((date) => daily[date]);

    return { labels, data };
  };

  const cumulativePnL = (values) => {
    let total = 0;
    return values.map((value) => {
      total += value;
      return total;
    });
  };

  useEffect(() => {
    if (!chartRef.current) return;
    chartInstance.current?.destroy();

    const ctx = chartRef.current.getContext('2d');
    const isMobile = window.innerWidth <= 768;
    const isDark = document.body.classList.contains('dark-mode');
    const theme = getComputedStyle(document.body);
    const accentSuccess = theme.getPropertyValue('--accent-success').trim() || '#58d47e';
    const accentSuccessStrong = theme.getPropertyValue('--accent-success-strong').trim() || '#1e8f49';
    const accentDanger = theme.getPropertyValue('--accent-danger').trim() || '#ef4444';
    const accentDangerSoft = theme.getPropertyValue('--accent-danger-soft').trim() || '#fca5a5';
    const textPrimary = theme.getPropertyValue('--text-primary').trim() || '#111714';
    const textSecondary = theme.getPropertyValue('--text-secondary').trim() || '#6a766d';
    const dividerStrong = theme.getPropertyValue('--divider-strong').trim() || 'rgba(17, 23, 20, 0.06)';
    const positiveLine = isDark ? '#86efac' : accentSuccessStrong;
    const negativeLine = isDark ? '#f871715b' : accentDanger;
    const positiveFillTop = isDark ? 'rgba(134, 239, 230, 0.26)' : 'rgb(88, 212, 160)';
    const positiveFillMid = isDark ? 'rgba(134, 239, 172, 0.12)' : 'rgba(88, 212, 126, 0.1)';
    const negativeFill = isDark ? 'rgba(248, 113, 113, 0.49)' : 'rgba(68, 79, 239, 0.74)';
    const { labels, data } = calculateDailyPnL();
    const curveData = cumulativePnL(data);

    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            data: curveData,
            borderColor: positiveLine,
            borderWidth: isMobile ? 0.6 : 0.6,
            fill: true,
            tension: 0.3,
            pointRadius: 0,
            pointHitRadius: 10,
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
              gradient.addColorStop(0.55, positiveFillMid);
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
            left: isMobile ? 2 : 0,
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: textPrimary,
            padding: 10,
            displayColors: false,
            callbacks: {
              label: (tooltip) => `Rs ${tooltip.parsed.y.toLocaleString('en-IN')}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false, drawBorder: false, drawOnChartArea: false, drawTicks: false },
            border: { display: false },
            ticks: {
              color: textSecondary,
              font: { size: isMobile ? 10 : 11 },
              autoSkip: true,
              maxTicksLimit: isMobile ? 4 : 6,
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
              font: { size: 11 },
              callback: (value) => (value >= 1000 ? `${value / 1000}k` : value),
            },
          },
        },
        interaction: {
          intersect: false,
          mode: 'index',
        },
        elements: {
          line: {
            borderWidth: isMobile ? 2.2 : 1.8,
          },
        },
      },
    });

    return () => chartInstance.current?.destroy();
  }, [trades]);

  return (
    <div className="chart-card performance-card">
      <div className="performance-header">
        <h3 className="app-panel-title">Daily Net Cumulative P&L</h3>
      </div>

      <div className="chart-container">
        <canvas ref={chartRef} />
      </div>
    </div>
  );
}

export default PerformanceChart;
