import React from 'react';
import { X } from '@/icons/lucideIcons';
import OrderField from './OrderField';

export default function OrderPanel({ symbol, quote, onClose }) {
  const bidText = quote?.bidText || '-';
  const askText = quote?.askText || '-';
  const spreadText = quote?.spreadText || '-';

  return (
    <aside className="col-start-5 row-start-1 row-end-4 min-w-0 min-h-0 h-full overflow-y-auto rounded-md bg-[var(--bg-card)] p-2.5" aria-label="Order panel">
      <div className="flex items-center justify-between h-8 text-[var(--text-primary)]">
        <strong className="text-[var(--text-primary)] text-sm font-bold">{symbol}</strong>
        <button aria-label="Close order panel" onClick={onClose} type="button" className="flex items-center justify-center border-0 bg-transparent text-[var(--text-muted)] cursor-pointer hover:text-[var(--text-primary)] transition-colors"><X size={18} aria-hidden="true" /></button>
      </div>
      <label className="grid gap-2 mt-2.5">
        <span className="text-[var(--text-primary)] text-xs font-extrabold">Order form</span>
        <select defaultValue="Regular form" aria-label="Order form" className="h-10 border border-[var(--border-light)] rounded bg-[var(--surface-subtle)] text-[var(--text-primary)] px-3 font-inherit outline-none text-xs font-semibold">
          <option>Regular form</option>
          <option>Quick order</option>
        </select>
      </label>
      <div className="relative grid grid-cols-2 gap-1.5 mt-3">
        <button className="flex flex-col items-start gap-1.5 min-h-[72px] rounded border border-[var(--accent-danger,#ef4444)] text-[var(--accent-danger,#ef4444)] bg-[var(--surface-subtle)] cursor-pointer p-3 text-left hover:opacity-95 transition-opacity" type="button">
          <span className="text-[var(--text-muted)] text-xs">Sell</span>
          <strong className="overflow-hidden w-full text-lg font-mono tabular-nums font-black text-ellipsis whitespace-nowrap">
            {bidText}
          </strong>
        </button>
        <i className="absolute left-1/2 bottom-2.5 -translate-x-1/2 z-[1] rounded-[3px] bg-[var(--surface-muted-strong)] text-[var(--text-primary)] text-[11px] not-italic font-extrabold px-1 py-0.5 pointer-events-none">{spreadText}</i>
        <button className="flex flex-col items-end gap-1.5 min-h-[72px] rounded border border-[var(--primary,#2563eb)] text-[var(--primary,#2563eb)] bg-[var(--surface-subtle)] cursor-pointer p-3 text-right hover:opacity-95 transition-opacity" type="button">
          <span className="text-[var(--text-muted)] text-xs">Buy</span>
          <strong className="overflow-hidden w-full text-lg font-mono tabular-nums font-black text-ellipsis whitespace-nowrap">
            {askText}
          </strong>
        </button>
      </div>
      <div className="grid grid-cols-[68%_32%] gap-1 my-1 mb-4 text-[var(--accent-danger,#ef4444)] text-xs font-[750]" aria-hidden="true">
        <span className="border-t-[3px] border-t-current pt-1">68%</span>
        <span className="border-t-[3px] border-t-current pt-1 text-[var(--primary,#2563eb)] text-right">32%</span>
      </div>
      <div className="grid grid-cols-2 overflow-hidden border border-[var(--border-light)] rounded" role="tablist" aria-label="Order type">
        <button className="h-[38px] border-0 bg-[var(--accent-info-soft)] text-[var(--primary,#2563eb)] cursor-pointer font-inherit font-[750] text-xs" type="button">Market</button>
        <button type="button" className="h-[38px] border-0 bg-transparent text-[var(--text-secondary)] cursor-pointer font-inherit font-[750] text-xs hover:text-[var(--text-primary)] transition-colors">Pending</button>
      </div>
      <OrderField label="Volume" value="0.01" mode="Lots" />
      <OrderField label="Take Profit" value="Not set" />
      <OrderField label="Stop Loss" value="Not set" />
    </aside>
  );
}

