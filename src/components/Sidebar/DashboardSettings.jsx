import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { loadCachedUserSettings, saveUserSettings } from '../../utils/user/userSettings';
import { useUserSettings } from '../../hooks/useUserSettings';

const DEFAULT_DASHBOARD_LAYOUT = {
  rowOrder: 'overview-first',
  columnOrder: 'normal',
};

const getCachedDashboardLayout = () => {
  const cachedLayout = loadCachedUserSettings()?.dashboard || {};

  return {
    rowOrder: cachedLayout.rowOrder || DEFAULT_DASHBOARD_LAYOUT.rowOrder,
    columnOrder: cachedLayout.columnOrder || DEFAULT_DASHBOARD_LAYOUT.columnOrder,
  };
};

const notifyDashboardLayoutChange = (layout) => {
  window.dispatchEvent(new CustomEvent('dashboard-layout-change', {
    detail: { layout },
  }));
};


const PRESETS = [
  { id: 'cal-right-charts-bottom', rowOrder: 'overview-first', columnOrder: 'normal' },
  { id: 'cal-left-charts-bottom', rowOrder: 'overview-first', columnOrder: 'flipped' },
  { id: 'charts-top-cal-right', rowOrder: 'charts-first', columnOrder: 'normal' },
  { id: 'charts-top-cal-left', rowOrder: 'charts-first', columnOrder: 'flipped' },
];

const CAL_DAYS = ['g', 'g', 'n', 'r', 'g', 'n', 'n', 'g', 'r', 'g', 'g', 'n', 'n', 'g', 'n', 'g', 'r', 'g', 'g', 'n', 'n', 'g', 'g', 'g', 'n', 'r', 'g', 'g'];
const TRACKER_CELLS = [0, 1, 2, 1, 2, 0, 1, 1, 2, 2, 0, 1, 2, 2, 0, 1, 0, 2, 2, 1, 0];

function MiniCalendar() {
  return (
    <div className="flex-1 rounded-md border border-[color-mix(in_srgb,var(--accent-ink)_25%,transparent)] bg-[color-mix(in_srgb,var(--accent-ink)_6%,var(--bg-primary))] p-2 flex flex-col justify-between h-[105px]">
      <div className="flex items-center justify-between">
        <span className="text-[9.5px] font-bold text-[var(--accent-ink)] tracking-tight">P&L Calendar</span>
        <span className="text-[8.5px] font-bold text-emerald-500">+$2.4k</span>
      </div>
      <div className="grid grid-cols-7 gap-1 mt-1">
        {CAL_DAYS.map((status, i) => (
          <div
            key={i}
            className={`h-2 rounded-[2px] ${
              status === 'g' ? 'bg-emerald-500/70' : status === 'r' ? 'bg-rose-500/70' : 'bg-[var(--border-light)]'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function MiniProgress() {
  return (
    <div className="flex-1 rounded-md border border-[var(--border-light)] bg-[var(--bg-secondary)] p-1.5 flex flex-col justify-between h-[50px]">
      <span className="text-[8px] font-semibold text-[var(--text-secondary)] leading-none">Tracker</span>
      <div className="grid grid-cols-7 gap-0.5 mt-1">
        {TRACKER_CELLS.map((v, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-[1px] ${
              v === 2 ? 'bg-blue-500' : v === 1 ? 'bg-blue-400/50' : 'bg-[var(--border-light)]'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function MiniTrades() {
  return (
    <div className="flex-1 rounded-md border border-[var(--border-light)] bg-[var(--bg-secondary)] p-1.5 flex flex-col justify-between h-[50px]">
      <span className="text-[8px] font-semibold text-[var(--text-secondary)] leading-none">Trades</span>
      <div className="flex flex-col gap-0.5 mt-0.5">
        <div className="flex items-center justify-between text-[7px]">
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-[var(--text-primary)] font-medium">BTC</span>
          </div>
          <span className="font-semibold text-emerald-500">+1.2%</span>
        </div>
        <div className="flex items-center justify-between text-[7px]">
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
            <span className="text-[var(--text-primary)] font-medium">ETH</span>
          </div>
          <span className="font-semibold text-rose-500">-0.8%</span>
        </div>
        <div className="flex items-center justify-between text-[7px]">
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-[var(--text-primary)] font-medium">SOL</span>
          </div>
          <span className="font-semibold text-emerald-500">+3.4%</span>
        </div>
      </div>
    </div>
  );
}

function MiniPerformance() {
  return (
    <div className="rounded-md border border-[var(--border-light)] bg-[var(--bg-secondary)] p-2 flex flex-col justify-between h-[65px]">
      <span className="text-[8.5px] font-medium text-[var(--text-muted)]">Performance</span>
      <svg viewBox="0 0 40 16" className="w-full h-6 mt-0.5 overflow-visible">
        <path
          d="M0 14 Q 8 10, 16 12 T 28 6 T 40 2"
          fill="none"
          stroke="var(--accent-ink,#2563eb)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

function MiniActivity() {
  return (
    <div className="rounded-md border border-[var(--border-light)] bg-[var(--bg-secondary)] p-2 flex flex-col justify-between h-[65px]">
      <span className="text-[8.5px] font-medium text-[var(--text-muted)]">Activity</span>
      <div className="flex items-end justify-between h-6 gap-0.5 mt-0.5 px-0.5">
        <div className="w-1.5 h-[40%] rounded-xs bg-[var(--text-muted)]/40" />
        <div className="w-1.5 h-[75%] rounded-xs bg-emerald-500/70" />
        <div className="w-1.5 h-[50%] rounded-xs bg-[var(--text-muted)]/40" />
        <div className="w-1.5 h-[90%] rounded-xs bg-emerald-500/80" />
        <div className="w-1.5 h-[60%] rounded-xs bg-emerald-500/70" />
      </div>
    </div>
  );
}

function MiniRadar() {
  return (
    <div className="rounded-md border border-[var(--border-light)] bg-[var(--bg-secondary)] p-2 flex flex-col justify-between h-[65px]">
      <span className="text-[8.5px] font-medium text-[var(--text-muted)]">Radar</span>
      <svg viewBox="0 0 24 24" className="w-full h-6 mt-0.5 mx-auto text-indigo-500">
        <polygon
          points="12,2 22,8 19,21 5,21 2,8"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.8"
          strokeOpacity="0.3"
        />
        <polygon
          points="12,5 18,9 16,18 7,17 4,10"
          fill="currentColor"
          fillOpacity="0.25"
          stroke="currentColor"
          strokeWidth="1.2"
        />
      </svg>
    </div>
  );
}

function LayoutWireframe({ rowOrder, columnOrder }) {
  const isChartsFirst = rowOrder === 'charts-first';
  const isFlipped = columnOrder === 'flipped';

  const sideCol = (
    <div className="w-[36%] flex flex-col gap-1.5 h-[105px]">
      <MiniProgress />
      <MiniTrades />
    </div>
  );

  const overviewRow = (
    <div className="flex gap-2 w-full">
      {isFlipped ? (
        <>
          <MiniCalendar />
          {sideCol}
        </>
      ) : (
        <>
          {sideCol}
          <MiniCalendar />
        </>
      )}
    </div>
  );

  const chartsRow = (
    <div className="grid grid-cols-3 gap-2 w-full">
      {isFlipped ? (
        <>
          <MiniRadar />
          <MiniActivity />
          <MiniPerformance />
        </>
      ) : (
        <>
          <MiniPerformance />
          <MiniActivity />
          <MiniRadar />
        </>
      )}
    </div>
  );

  return (
    <div className="w-full rounded-lg border border-[var(--border-light)] bg-[var(--bg-card)] p-2.5 flex flex-col gap-2 pointer-events-none select-none">
      {isChartsFirst ? (
        <>
          {chartsRow}
          {overviewRow}
        </>
      ) : (
        <>
          {overviewRow}
          {chartsRow}
        </>
      )}
    </div>
  );
}

function DashboardSettings() {
  const { isAuthenticated } = useAuth();
  const userSettingsQuery = useUserSettings();
  const hasLocalLayoutChange = useRef(false);
  const [rowOrder, setRowOrder] = useState(() => getCachedDashboardLayout().rowOrder);
  const [columnOrder, setColumnOrder] = useState(() => getCachedDashboardLayout().columnOrder);

  useEffect(() => {
    if (!isAuthenticated) return;

    const savedOrder = userSettingsQuery.data?.dashboard?.rowOrder || DEFAULT_DASHBOARD_LAYOUT.rowOrder;
    const savedColOrder = userSettingsQuery.data?.dashboard?.columnOrder || DEFAULT_DASHBOARD_LAYOUT.columnOrder;
    if (!hasLocalLayoutChange.current) {
      window.queueMicrotask(() => {
        if (hasLocalLayoutChange.current) return;
        setRowOrder(savedOrder);
        setColumnOrder(savedColOrder);
        notifyDashboardLayoutChange({
          rowOrder: savedOrder,
          columnOrder: savedColOrder,
        });
      });
    }
  }, [isAuthenticated, userSettingsQuery.data]);

  const updateLayout = (updates) => {
    const nextRowOrder = updates.rowOrder !== undefined ? updates.rowOrder : rowOrder;
    const nextColOrder = updates.columnOrder !== undefined ? updates.columnOrder : columnOrder;
    const nextLayout = {
      rowOrder: nextRowOrder,
      columnOrder: nextColOrder,
    };

    hasLocalLayoutChange.current = true;
    setRowOrder(nextRowOrder);
    setColumnOrder(nextColOrder);
    notifyDashboardLayoutChange(nextLayout);

    if (isAuthenticated) {
      saveUserSettings({ 
        dashboard: nextLayout,
      }).catch(() => null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Select Dashboard Layout</span>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {PRESETS.map((p) => {
          const isSelected = rowOrder === p.rowOrder && columnOrder === p.columnOrder;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => updateLayout({ rowOrder: p.rowOrder, columnOrder: p.columnOrder })}
              className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                isSelected
                  ? 'border-[var(--accent-ink,#2563eb)] bg-[color-mix(in_srgb,var(--accent-ink)_8%,var(--bg-secondary))] shadow-sm ring-2 ring-[var(--accent-ink,#2563eb)]'
                  : 'border-[var(--border-light)] bg-[var(--bg-secondary)] hover:border-[var(--border-medium)]'
              }`}
            >
              <LayoutWireframe rowOrder={p.rowOrder} columnOrder={p.columnOrder} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default DashboardSettings;

