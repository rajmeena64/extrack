import React from 'react';
import { EllipsisVertical, X } from '@/icons/lucideIcons';

export default function PositionsPanel({ quote, onClose }) {
  return (
    <section className="col-start-3 row-start-3 grid grid-rows-[50px_minmax(0,1fr)_34px] min-w-0 min-h-0 h-full overflow-hidden rounded-md bg-[var(--bg-card)]" aria-label="Open positions">
      <div className="grid grid-cols-[auto_auto_auto_minmax(0,1fr)_42px_42px] border-b border-[var(--border-light)]">
        <button className="flex items-center justify-center min-w-[72px] border-0 border-b-[3px] border-b-[var(--primary,#2563eb)] bg-transparent text-[var(--primary,#2563eb)] font-[750] text-xs cursor-pointer" type="button">Open</button>
        <button type="button" className="flex items-center justify-center min-w-[72px] border-0 bg-transparent text-[var(--text-muted)] font-[750] text-xs cursor-pointer hover:text-[var(--text-primary)] transition-colors">Pending</button>
        <button type="button" className="flex items-center justify-center min-w-[72px] border-0 bg-transparent text-[var(--text-muted)] font-[750] text-xs cursor-pointer hover:text-[var(--text-primary)] transition-colors">Closed</button>
        <span />
        <button aria-label="Panel options" type="button" className="flex items-center justify-center border-0 bg-transparent text-[var(--text-muted)] cursor-pointer hover:text-[var(--text-primary)] transition-colors"><EllipsisVertical size={17} aria-hidden="true" /></button>
        <button aria-label="Close positions panel" onClick={onClose} type="button" className="flex items-center justify-center border-0 bg-transparent text-[var(--text-muted)] cursor-pointer hover:text-[var(--text-primary)] transition-colors"><X size={17} aria-hidden="true" /></button>
      </div>
      <div className="flex flex-col items-center justify-center gap-2 text-[var(--text-muted)]">
        <span className="text-[28px]">▣</span>
        <p className="m-0 text-sm">No open positions</p>
      </div>
      <div className="flex items-center gap-[18px] min-w-0 overflow-x-auto border-t border-[var(--border-light)] text-[var(--text-secondary)] text-xs px-4 whitespace-nowrap">
        <span>Equity: <strong className="text-[var(--text-primary)]">420.31 USC</strong></span>
        <span>Free Margin: <strong className="text-[var(--text-primary)]">420.31 USC</strong></span>
        <span>Balance: <strong className="text-[var(--text-primary)]">420.31 USC</strong></span>
        <span>Last: <strong className="text-[var(--text-primary)]">{quote?.lastText || quote?.bidText || '-'}</strong></span>
      </div>
    </section>
  );
}

