import React, { useMemo, useState } from 'react';
import MainContentWrapper from '@/components/Layout/MainContentWrapper';
import { Card } from '@/components/ui';
import {
  Calendar,
  Clock,
  FileSpreadsheet,
  Globe,
  LayoutDashboard,
  TrendingUp,
} from '@/icons/lucideIcons';
import { formatCurrency } from '@/utils/user/Currency';

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'time', label: 'Time Analysis', icon: Clock },
  { id: 'session', label: 'Session Analysis', icon: Globe },
  { id: 'day', label: 'Day Analysis', icon: Calendar },
  { id: 'symbol', label: 'Symbol Analysis', icon: TrendingUp },
  { id: 'reports', label: 'Monthly & Yearly Reports', icon: FileSpreadsheet },
];

export default function AnalyticsPage({ trades = [], currencyCode = 'USD' }) {
  const [activeTab, setActiveTab] = useState('overview');

  const stats = useMemo(() => {
    let totalPnL = 0;
    let wins = 0;
    let losses = 0;
    trades.forEach((t) => {
      const pnl = Number(t?.pnl);
      if (Number.isNaN(pnl)) return;
      totalPnL += pnl;
      if (pnl > 0) wins += 1;
      else if (pnl < 0) losses += 1;
    });
    const count = wins + losses;
    const winRate = count > 0 ? (wins / count) * 100 : 0;
    return { totalPnL, wins, losses, count, winRate };
  }, [trades]);

  return (
    <MainContentWrapper className="analytics-page flex flex-col h-full min-h-screen px-4 md:px-6 py-4 overflow-hidden">
      <div className="flex flex-col gap-4 flex-1 min-h-0">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div>
            <h1 className="text-xl font-bold text-[var(--heading)] tracking-tight">Trade Analytics</h1>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">Deep-dive analysis across time, sessions, days, and instruments.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg text-xs font-semibold [border:var(--dashboard-card-border)] bg-[var(--bg-card)] text-[var(--text-secondary)]">
              {trades.length} Trades Analyzed
            </span>
          </div>
        </header>

        <div className="flex flex-col md:flex-row gap-4 flex-1 min-h-0 overflow-hidden">
          <aside className="w-full md:w-60 shrink-0 rounded-2xl [border:var(--dashboard-card-border)] bg-[var(--bg-card)] p-2.5 flex md:flex-col gap-1 overflow-x-auto md:overflow-y-auto">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer text-left shrink-0 md:shrink border-0 ${
                    isActive
                      ? 'bg-[var(--accent-ink)] text-white dark:bg-[#202020] dark:text-white'
                      : 'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--heading)]'
                  }`}
                >
                  <Icon size={16} className="shrink-0" />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </aside>

          <main className="flex-1 rounded-2xl [border:var(--dashboard-card-border)] bg-[var(--bg-card)] p-4 md:p-6 overflow-y-auto min-h-0 flex flex-col gap-4">
            {activeTab === 'overview' && (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Card padding="none" className="p-4 flex flex-col gap-1">
                    <span className="text-[11px] font-bold uppercase text-[var(--text-secondary)]">Total Realized P&L</span>
                    <span className={`text-lg font-bold ${stats.totalPnL >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {formatCurrency(stats.totalPnL, currencyCode)}
                    </span>
                  </Card>
                  <Card padding="none" className="p-4 flex flex-col gap-1">
                    <span className="text-[11px] font-bold uppercase text-[var(--text-secondary)]">Win Rate</span>
                    <span className="text-lg font-bold text-[var(--heading)]">{stats.winRate.toFixed(1)}%</span>
                  </Card>
                  <Card padding="none" className="p-4 flex flex-col gap-1">
                    <span className="text-[11px] font-bold uppercase text-[var(--text-secondary)]">Total Trades</span>
                    <span className="text-lg font-bold text-[var(--heading)]">{stats.count}</span>
                  </Card>
                </div>
                <div className="rounded-xl border border-[var(--border-subtle)] p-6 text-center text-[var(--text-secondary)] text-sm">
                  Overview performance dashboards and charts are ready. Select sub-analyses from the left menu for deep breakdowns.
                </div>
              </div>
            )}

            {activeTab === 'time' && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-[var(--heading)]">Time of Day & Holding Time Analysis</h2>
                </div>
                <div className="rounded-xl border border-[var(--border-subtle)] p-8 text-center text-[var(--text-secondary)] text-sm">
                  Hourly execution performance and trade holding duration distribution will be charted here.
                </div>
              </div>
            )}

            {activeTab === 'session' && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-[var(--heading)]">Market Session Analysis</h2>
                </div>
                <div className="rounded-xl border border-[var(--border-subtle)] p-8 text-center text-[var(--text-secondary)] text-sm">
                  Asian (Tokyo), London (Europe), and New York session P&L and volume comparison breakdown will be charted here.
                </div>
              </div>
            )}

            {activeTab === 'day' && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-[var(--heading)]">Day of Week Performance</h2>
                </div>
                <div className="rounded-xl border border-[var(--border-subtle)] p-8 text-center text-[var(--text-secondary)] text-sm">
                  Monday to Friday win rate, profit factor, and average trade return breakdown will be charted here.
                </div>
              </div>
            )}

            {activeTab === 'symbol' && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-[var(--heading)]">Symbol & Asset Analysis</h2>
                </div>
                <div className="rounded-xl border border-[var(--border-subtle)] p-8 text-center text-[var(--text-secondary)] text-sm">
                  Per-symbol trade count, win rate, best setups, and long vs short return matrix will be charted here.
                </div>
              </div>
            )}

            {activeTab === 'reports' && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-[var(--heading)]">Monthly & Yearly Performance Reports</h2>
                </div>
                <div className="rounded-xl border border-[var(--border-subtle)] p-8 text-center text-[var(--text-secondary)] text-sm">
                  Comprehensive month-by-month and annual performance reports with seasonality metrics will be charted here.
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </MainContentWrapper>
  );
}
