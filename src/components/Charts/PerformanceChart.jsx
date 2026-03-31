import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

function PerformanceChart({ trades }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  // 📅 Daily Net PnL
  const calculateDailyPnL = () => {
    const daily = {};

    if (!trades || trades.length === 0) {
      return { labels: [], data: [] };
    }

    trades.forEach(trade => {
      if (!trade.timestamp || trade.pnl == null) return;

      const date = new Date(trade.timestamp)
        .toISOString()
        .split('T')[0]; // YYYY-MM-DD

      daily[date] = (daily[date] || 0) + Number(trade.pnl);
    });

    const labels = Object.keys(daily).sort();
    const data = labels.map(d => daily[d]);

    return { labels, data };
  };

  // 📈 Cumulative PnL
  const cumulativePnL = (arr) => {
    let sum = 0;
    return arr.map(v => (sum += v));
  };

  useEffect(() => {
    if (!chartRef.current) return;
    chartInstance.current?.destroy();

    const ctx = chartRef.current.getContext('2d');

    const { labels, data } = calculateDailyPnL();
    const curveData = cumulativePnL(data);

    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
{
  data: curveData,
  borderWidth: 1,
  fill: true,
  tension: 0.22,
  pointRadius: 0,

  // ✅ Dynamic line color
  segment: {
    borderColor: ctx => {
      const y = ctx.p1.parsed.y;
      return y >= 0 ? '#5c559b' : '#696997e7'; // green vs existing
    },
    backgroundColor: ctx => {
      const y = ctx.p1.parsed.y;
      return y >= 0
        ? 'rgba(0, 255, 136, 0.27)'
        : 'rgba(228, 63, 63, 0.31)';
    }
  }
}
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,

        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#141d44',
            padding: 10,
            displayColors: false,
            callbacks: {
              label: ctx =>
                `₹ ${ctx.parsed.y.toLocaleString('en-IN')}`
            }
          }
        },

        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: '#676b72',
              font: { size: 11 },

              // ✅ dates kam dikhenge
              autoSkip: true,
              maxTicksLimit: 6
            }
          },

          y: {
            grid: {
            color: 'rgba(0,0,0,0.06)',
            },
            ticks: {
              color: '#76787c',
              font: { size: 11 },
              callback: v =>
                v >= 1000 ? `${v / 1000}k` : v
            }
          }
        },

        interaction: {
          intersect: false,
          mode: 'index'
        }
      }
    });

    return () => chartInstance.current?.destroy();
  }, [trades]);

  return (
    <div className="chart-card performance-card">
      <div className="performance-header">
        <h3>Daily net cumulative P&L</h3>
      </div>

      <div className="chart-container">
        <canvas ref={chartRef} />
      </div>
    </div>
  );
}

export default PerformanceChart;
