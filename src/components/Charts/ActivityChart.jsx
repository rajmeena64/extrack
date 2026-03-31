import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

function ActivityChart({ trades }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  // Day-wise trades count
  const calculateTradesPerDay = () => {
    const counts = [0, 0, 0, 0, 0, 0, 0];
    if (!trades || trades.length === 0) return counts;

    trades.forEach(trade => {
      if (trade.timestamp) {
        const day = new Date(trade.timestamp).getDay();
        counts[day]++;
      }
    });

    // Reorder to Monday → Sunday
    return [
      counts[1], // Monday
      counts[2], // Tuesday
      counts[3], // Wednesday
      counts[4], // Thursday
      counts[5], // Friday
      counts[6], // Saturday
      counts[0]  // Sunday
    ];
  };

  // Day-wise P&L calculation
  const calculatePnLPerDay = () => {
    const pnl = [0, 0, 0, 0, 0, 0, 0];
    if (!trades || trades.length === 0) return pnl;

    trades.forEach(trade => {
      if (trade.timestamp && trade.pnl) {
        const day = new Date(trade.timestamp).getDay();
        pnl[day] += parseFloat(trade.pnl) || 0;
      }
    });

    // Reorder to Monday → Sunday
    return [
      pnl[1], // Monday
      pnl[2], // Tuesday
      pnl[3], // Wednesday
      pnl[4], // Thursday
      pnl[5], // Friday
      pnl[6], // Saturday
      pnl[0]  // Sunday
    ];
  };

  // Days labels
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  useEffect(() => {
    if (!chartRef.current) return;
    chartInstance.current?.destroy();

    const ctx = chartRef.current.getContext('2d');
    const tradesData = calculateTradesPerDay();
    const pnlData = calculatePnLPerDay();

    chartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Trades Count',
            data: tradesData,
            backgroundColor: '#34d399',
            borderRadius: 10,
            barThickness: 22
          },
          {
            label: 'Daily P&L',
            data: pnlData,
            backgroundColor: '#8b5cf6',
            borderRadius: 10,
            barThickness: 22
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            stacked: false,
            grid: { display: false },
            ticks: {
              color: '#6b7280',
              font: { size: 11 }
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0,0,0,0.06)',
              drawBorder: false
            },
            ticks: {
              color: '#6b7280',
              callback: function(value) {
                return Number.isInteger(value) ? value : value.toFixed(1);
              }
            }
          }
        },
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: {
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            backgroundColor: '#111827',
            cornerRadius: 10,
            padding: 12,
            callbacks: {
              label: function(context) {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.datasetIndex === 0) {
                  label += context.parsed.y + ' trades';
                } else {
                  label += context.parsed.y.toFixed(2) + ' P&L';
                }
                return label;
              }
            }
          }
        }
      }
    });

    return () => chartInstance.current?.destroy();
  }, [trades]);

  return (
    <div className="chart-card activity-card">
      <div className="activity-header">
        <h3>Weekly Activity</h3>
        <span className="activity-sub">Trades Count & Daily P&L</span>
      </div>

      <div className="chart-container">
        <canvas ref={chartRef} />
      </div>
    </div>
  );
}

export default ActivityChart;