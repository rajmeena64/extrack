import React, { useEffect, useMemo, useRef } from 'react';
import { Info } from 'lucide-react';
import Chart from '../../utils/chartSetup';
import './AccountBalance.css';

function formatCurrencyTick(value) {
  const amount = Number(value) || 0;
  return `$${amount.toFixed(0)}`;
}

function buildSeries(trades = []) {
  const sortedTrades = [...(trades || [])]
    .filter((trade) => trade?.timestamp)
    .sort((left, right) => new Date(left.timestamp) - new Date(right.timestamp));

  if (sortedTrades.length === 0) {
    return { labels: [], balance: [], cashflow: [] };
  }

  let balanceRunning = 0;
  let cashflowRunning = 0;

  return sortedTrades.reduce(
    (acc, trade) => {
      const label = new Date(trade.timestamp).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
      });

      const pnl = Number(trade.pnl) || 0;
      const quantity = Math.abs(Number(trade.quantity) || 0);
      const price = Math.abs(Number(trade.price || trade.entry_price || trade.exit_price) || 0);
      const estimatedFlow = quantity * price * 0.015;

      balanceRunning += pnl;
      cashflowRunning += pnl < 0 ? estimatedFlow : estimatedFlow * 0.55;

      acc.labels.push(label);
      acc.balance.push(balanceRunning);
      acc.cashflow.push(cashflowRunning);
      return acc;
    },
    { labels: [], balance: [], cashflow: [] }
  );
}

function AccountBalance({ trades }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const series = useMemo(() => buildSeries(trades), [trades]);

  useEffect(() => {
    if (!chartRef.current) return;
    chartInstance.current?.destroy();

    const ctx = chartRef.current.getContext('2d');

    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: series.labels,
        datasets: [
          {
            label: 'Account Balance',
            data: series.balance,
            borderColor: '#4b6bff',
            backgroundColor: 'rgba(75, 107, 255, 0.08)',
            borderWidth: 2,
            tension: 0.3,
            pointRadius: 0,
          },
          {
            label: 'Deposits / Withdrawals',
            data: series.cashflow,
            borderColor: '#ff6b6b',
            backgroundColor: 'rgba(255, 107, 107, 0.08)',
            borderWidth: 2,
            tension: 0.3,
            pointRadius: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            align: 'start',
            labels: {
              usePointStyle: true,
              pointStyle: 'circle',
              boxWidth: 8,
              boxHeight: 8,
              font: { size: 11, weight: '500' },
            },
          },
          tooltip: {
            backgroundColor: '#111827',
            padding: 10,
            displayColors: true,
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: '#8a94a6',
              font: { size: 10 },
              maxTicksLimit: 6,
            },
          },
          y: {
            grid: { color: 'rgba(148, 163, 184, 0.22)' },
            ticks: {
              color: '#8a94a6',
              font: { size: 10 },
              callback: (value) => formatCurrencyTick(value),
            },
          },
        },
      },
    });

    return () => chartInstance.current?.destroy();
  }, [series]);

  return (
    <div className="chart-card account-balance-card">
      <div className="account-balance-card__header">
        <div className="account-balance-card__title-wrap">
          <h3>Account Balance</h3>
          <p>Running balance vs estimated cash movement</p>
        </div>

        <span className="account-balance-card__info" aria-label="Account balance info">
          <Info size={14} />
        </span>
      </div>

      <div className="chart-container account-balance-card__chart">
        <canvas ref={chartRef} />
      </div>
    </div>
  );
}

export default AccountBalance;
