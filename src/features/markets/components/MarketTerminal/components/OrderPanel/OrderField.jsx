import React from 'react';

export default function OrderField({ label, value, mode = 'Price' }) {
  return (
    <label className="grid gap-2 mt-2.5">
      <span className="text-[var(--text-primary)] text-xs font-extrabold">{label}</span>
      <div className="grid grid-cols-[minmax(0,1fr)_70px_40px_40px] overflow-hidden h-[42px] border border-[var(--border-light)] rounded bg-[var(--surface-subtle)]">
        <strong className="flex items-center min-w-0 border-0 bg-transparent text-[var(--text-primary)] font-extrabold px-2.5 text-xs">{value}</strong>
        <em className="flex items-center justify-end min-w-0 border-l border-[var(--border-light)] bg-transparent text-[var(--text-muted)] not-italic text-xs px-2.5">{mode}</em>
        <button type="button" aria-label={`Decrease ${label}`} className="flex items-center justify-center min-w-0 border-0 border-l border-[var(--border-light)] bg-transparent text-[var(--text-muted)] cursor-pointer hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors">−</button>
        <button type="button" aria-label={`Increase ${label}`} className="flex items-center justify-center min-w-0 border-0 border-l border-[var(--border-light)] bg-transparent text-[var(--text-muted)] cursor-pointer hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors">+</button>
      </div>
    </label>
  );
}

