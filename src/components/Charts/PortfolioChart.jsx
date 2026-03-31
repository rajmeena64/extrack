import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

function PortfolioChart({ trades }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  const calculatePortfolioAllocation = () => {
    if (!trades || trades.length === 0) {
      return {
        labels: ['No Data'],
        data: [1]
      };
    }

    const allocation = {};

    trades.forEach(trade => {
      const symbol = trade.symbol || 'Other';
      const qty = Number(trade.quantity || 0);
      const price = Number(trade.exit_price || 0);
      const value = qty * price;

      if (value > 0) {
        allocation[symbol] = (allocation[symbol] || 0) + value;
      }
    });

    const labels = Object.keys(allocation);
    const data = Object.values(allocation);

    if (labels.length === 0) {
      return {
        labels: ['No Data'],
        data: [1]
      };
    }

    return { labels, data };
  };

  useEffect(() => {
    if (!chartRef.current) return;
    chartInstance.current?.destroy();

    const ctx = chartRef.current.getContext('2d');
    const { labels, data } = calculatePortfolioAllocation();

    chartInstance.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor: [
              '#6366f1',
              '#22c55e',
              '#f59e0b',
              '#ef4444',
              '#06b6d4',
              '#a855f7'
            ],
            borderWidth: 2,
            borderColor: '#ffffff',
            hoverOffset: 10
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: {
            position: 'right',
            labels: {
              
              font: { size: 10, weight: '600' },
              usePointStyle: true,
              pointStyle: 'circle',
              padding: 14
            }
          },
          tooltip: {
            backgroundColor: '#111827',
            padding: 12,
            cornerRadius: 10,
            displayColors: false,
            callbacks: {
              label: ctx =>
                `${ctx.label}: ₹ ${ctx.parsed.toLocaleString('en-IN')}`
            }
          }
        }
      }
    });

    return () => chartInstance.current?.destroy();
  }, [trades]);

  return (
    <div className="chart-card portfolio-card">
      <div className="portfolio-header">
        <h3>Portfolio Metrics</h3>
        <span> Allocation</span>
      </div>

      <div className="chart-container">
        <canvas ref={chartRef} />
      </div>
    </div>
  );
}

export default PortfolioChart;
