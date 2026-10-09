import React from 'react';
import { RotateCcw, Settings, X } from '@/icons/lucideIcons';
import { useTheme } from '@/context/ThemeContext';

export default function TerminalSettingsModal({
  isOpen,
  onClose,
  showWatchlist,
  setShowWatchlist,
  showOrderPanel,
  setShowOrderPanel,
  showPositionsPanel,
  setShowPositionsPanel,
  onResetLayout,
}) {
  const { darkMode = false, toggleDarkMode } = useTheme() || {};
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/45 flex items-center justify-center backdrop-blur-xs" onClick={onClose}>
      <div className="w-full max-w-[380px] bg-[var(--bg-card)] border border-[var(--border-light)] rounded-lg shadow-[0_16px_40px_var(--shadow-medium)] overflow-hidden text-[var(--text-primary)] animate-in fade-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-[var(--border-light)]">
          <div className="flex items-center gap-2 font-bold text-sm text-[var(--text-primary)]">
            <Settings size={16} aria-hidden="true" />
            <span>Terminal Settings</span>
          </div>
          <button
            type="button"
            className="flex items-center justify-center w-7 h-7 border-0 rounded bg-transparent text-[var(--text-muted)] cursor-pointer hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)] transition-colors"
            onClick={onClose}
            aria-label="Close settings"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-3">
          <div className="text-[11px] font-bold uppercase tracking-[0.5px] text-[var(--text-muted)] mb-0.5">Appearance</div>

          <div
            className="flex items-center justify-between gap-3 p-2.5 rounded-md bg-[var(--surface-subtle)] cursor-pointer hover:bg-[var(--surface-muted-strong)] transition-colors"
            onClick={toggleDarkMode}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleDarkMode?.();
              }
            }}
          >
            <div className="flex flex-col gap-0.5">
              <strong className="text-[13px] font-semibold text-[var(--text-primary)]">Dark Mode</strong>
              <small className="text-[11px] text-[var(--text-muted)]">Toggle dark or light theme across the terminal</small>
            </div>
            <button
              className="relative inline-flex items-center h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out bg-gray-300 dark:bg-gray-600 focus:outline-none"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleDarkMode?.();
              }}
              title="Toggle Dark Mode"
            >
              <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${darkMode ? 'translate-x-4 bg-white' : 'translate-x-0'}`} />
            </button>
          </div>

          <div className="text-[11px] font-bold uppercase tracking-[0.5px] text-[var(--text-muted)] mb-0.5">Panels Visibility</div>

          <label className="flex items-center justify-between gap-3 p-2.5 rounded-md bg-[var(--surface-subtle)] cursor-pointer hover:bg-[var(--surface-muted-strong)] transition-colors">
            <div className="flex flex-col gap-0.5">
              <strong className="text-[13px] font-semibold text-[var(--text-primary)]">Instruments / Watchlist</strong>
              <small className="text-[11px] text-[var(--text-muted)]">Show or hide the left watchlist panel</small>
            </div>
            <input
              type="checkbox"
              className="accent-[var(--checkbox-accent,#175CD3)] w-[18px] h-[18px] cursor-pointer"
              checked={showWatchlist}
              onChange={(e) => setShowWatchlist(e.target.checked)}
            />
          </label>

          <label className="flex items-center justify-between gap-3 p-2.5 rounded-md bg-[var(--surface-subtle)] cursor-pointer hover:bg-[var(--surface-muted-strong)] transition-colors">
            <div className="flex flex-col gap-0.5">
              <strong className="text-[13px] font-semibold text-[var(--text-primary)]">Order Panel</strong>
              <small className="text-[11px] text-[var(--text-muted)]">Show or hide the right trade order form</small>
            </div>
            <input
              type="checkbox"
              className="accent-[var(--checkbox-accent,#175CD3)] w-[18px] h-[18px] cursor-pointer"
              checked={showOrderPanel}
              onChange={(e) => setShowOrderPanel(e.target.checked)}
            />
          </label>

          <label className="flex items-center justify-between gap-3 p-2.5 rounded-md bg-[var(--surface-subtle)] cursor-pointer hover:bg-[var(--surface-muted-strong)] transition-colors">
            <div className="flex flex-col gap-0.5">
              <strong className="text-[13px] font-semibold text-[var(--text-primary)]">Positions & Orders Panel</strong>
              <small className="text-[11px] text-[var(--text-muted)]">Show or hide the bottom open positions table</small>
            </div>
            <input
              type="checkbox"
              className="accent-[var(--checkbox-accent,#175CD3)] w-[18px] h-[18px] cursor-pointer"
              checked={showPositionsPanel}
              onChange={(e) => setShowPositionsPanel(e.target.checked)}
            />
          </label>
        </div>

        <div className="px-4 py-3 border-t border-[var(--border-light)] bg-[var(--bg-card)] flex justify-end">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[5px] border border-[var(--border-light)] bg-[var(--surface-subtle)] text-[var(--text-primary)] text-xs font-[650] cursor-pointer hover:bg-[var(--accent-danger-soft,#fee2e2)] hover:text-[var(--accent-danger,#ef4444)] hover:border-[var(--accent-danger,#ef4444)] transition-all duration-150"
            onClick={() => {
              onResetLayout();
              setShowWatchlist(true);
              setShowOrderPanel(true);
              setShowPositionsPanel(true);
            }}
          >
            <RotateCcw size={14} aria-hidden="true" />
            <span>Reset All Panels & Sizes</span>
          </button>
        </div>
      </div>
    </div>
  );
}

