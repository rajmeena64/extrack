import React, { useMemo, useState } from 'react';
import { Search, SlidersHorizontal, X } from '@/icons/lucideIcons';
import SymbolWithIcon from '@/components/Common/SymbolWithIcon/SymbolWithIcon';
import { useInstruments, useDebouncedValue } from '@/hooks/useInstruments';
import {
  classifySymbol,
  getDisplaySymbol,
  getRequestSymbol,
  getSymbolSubtitle,
  getWatchlistSymbolOptions,
  normalizeStreamSymbol,
} from '../../utils/terminalHelpers';

export default function EditWatchlistModal({
  isOpen,
  onClose,
  availableSymbols = [],
  selectedWatchlistSet = new Set(),
  onAddSymbol,
  onRemoveSymbol,
}) {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const symbolOptions = useMemo(() => (
    getWatchlistSymbolOptions(availableSymbols)
  ), [availableSymbols]);

  const categories = ['All', 'Forex & CFD', 'Crypto', 'Stocks & ETFs', 'Futures', 'Options', 'Bonds'];

  const debouncedQuery = useDebouncedValue(query, 300);
  const isServerSearch = debouncedQuery.trim().length > 0;
  const { data: serverResults = [] } = useInstruments(debouncedQuery, { limit: 50 });

  const filteredSymbols = useMemo(() => {
    if (isServerSearch && serverResults.length > 0) {
      const serverOptions = getWatchlistSymbolOptions(serverResults);
      if (activeCategory === 'All') return serverOptions;
      return serverOptions.filter((item) => classifySymbol(getDisplaySymbol(item), item) === activeCategory);
    }

    const normQuery = query.trim().toUpperCase();
    return symbolOptions.filter((item) => {
      const displaySymbol = getDisplaySymbol(item);
      const requestSymbol = getRequestSymbol(item);
      const subtitle = getSymbolSubtitle(item, displaySymbol);
      const section = classifySymbol(displaySymbol, item);

      if (activeCategory !== 'All' && section !== activeCategory) {
        return false;
      }

      if (!normQuery) return true;

      return (
        displaySymbol.toUpperCase().includes(normQuery) ||
        requestSymbol.toUpperCase().includes(normQuery) ||
        subtitle.toUpperCase().includes(normQuery)
      );
    });
  }, [activeCategory, isServerSearch, query, serverResults, symbolOptions]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/45 flex items-center justify-center backdrop-blur-xs" onClick={onClose}>
      <div className="w-[480px] max-w-[92vw] h-[540px] max-h-[85vh] flex flex-col bg-[var(--bg-card)] border border-[var(--border-light)] rounded-lg shadow-[0_16px_40px_var(--shadow-medium)] overflow-hidden text-[var(--text-primary)] animate-in fade-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-[var(--border-light)]">
          <div className="flex items-center gap-2 font-bold text-sm text-[var(--text-primary)]">
            <SlidersHorizontal size={16} aria-hidden="true" />
            <span>Edit Watchlist</span>
          </div>
          <button
            type="button"
            className="flex items-center justify-center w-7 h-7 border-0 rounded bg-transparent text-[var(--text-muted)] cursor-pointer hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)] transition-colors"
            onClick={onClose}
            aria-label="Close edit watchlist"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="p-3 px-4 flex flex-col gap-2.5 border-b border-[var(--border-light,#e2e8f0)] dark:border-[#2e2e2e]">
          <div className="flex items-center gap-2 h-[38px] px-2.5 bg-[var(--surface-subtle,#f8fafc)] dark:bg-[#18181b] border border-[var(--border-light,#e2e8f0)] dark:border-[#27272a] rounded-md text-[var(--text-muted,#64748b)]">
            <Search size={16} aria-hidden="true" />
            <input
              type="text"
              placeholder="Search instruments..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 border-0 bg-transparent text-[var(--text-primary,#0f172a)] text-[13px] outline-none"
              autoFocus
            />
            {query && (
              <button
                type="button"
                className="border-0 bg-transparent text-[var(--text-muted)] cursor-pointer p-0.5 flex items-center justify-center rounded hover:text-[var(--text-primary)]"
                onClick={() => setQuery('')}
                aria-label="Clear search"
              >
                <X size={14} aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`px-2.5 py-1 rounded-md border border-[var(--border-light,#e2e8f0)] dark:border-[#27272a] bg-transparent text-[var(--text-secondary,#475569)] dark:text-[#a1a1aa] text-xs font-medium cursor-pointer whitespace-nowrap transition-all duration-150 hover:bg-[var(--bg-hover,rgba(0,0,0,0.04))] hover:text-[var(--text-primary)] ${
                  activeCategory === cat ? 'bg-[var(--button-bg)] border-[var(--button-bg)] text-[var(--button-text)] hover:bg-[var(--button-bg)] hover:text-[var(--button-text)]' : ''
                }`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 py-2 text-[11.5px] font-semibold text-[var(--text-muted,#64748b)] bg-[var(--surface-subtle,#f8fafc)] dark:bg-[#141414] border-b border-[var(--border-light,#e2e8f0)] dark:border-[#2e2e2e]">
          <span>{selectedWatchlistSet.size} instruments selected in watchlist</span>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-2 py-1 flex flex-col">
          {filteredSymbols.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-8 text-center text-[var(--text-muted,#64748b)] text-[13px]">
              No instruments found matching &quot;{query}&quot;
            </div>
          ) : (
            filteredSymbols.map((item) => {
              const displaySymbol = getDisplaySymbol(item);
              const requestSymbol = getRequestSymbol(item);
              const subtitle = getSymbolSubtitle(item, displaySymbol);
              const normalized = normalizeStreamSymbol(requestSymbol);
              const isChecked = selectedWatchlistSet.has(normalized);

              return (
                <label key={normalized} className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer transition-colors duration-120 select-none hover:bg-[var(--bg-hover,rgba(0,0,0,0.04))] dark:hover:bg-white/5 ${isChecked ? 'bg-[var(--surface-subtle)]' : ''}`}>
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-[var(--checkbox-accent,#175CD3)] cursor-pointer shrink-0"
                    checked={isChecked}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onAddSymbol(requestSymbol);
                      } else {
                        onRemoveSymbol(requestSymbol);
                      }
                    }}
                  />
                  <SymbolWithIcon symbol={displaySymbol} size="md" showLabel={false} />
                  <div className="flex flex-col flex-1 min-w-0">
                    <strong className="text-[13px] font-semibold text-[var(--text-primary,#0f172a)]">{displaySymbol}</strong>
                    <small className="text-[11px] text-[var(--text-muted,#64748b)] overflow-hidden text-ellipsis whitespace-nowrap">{subtitle}</small>
                  </div>
                  <span className="text-[10.5px] font-semibold px-1.5 py-0.5 rounded bg-[var(--surface-subtle,#f1f5f9)] dark:bg-[#27272a] text-[var(--text-secondary,#475569)] dark:text-[#a1a1aa] uppercase">
                    {classifySymbol(displaySymbol, item)}
                  </span>
                </label>
              );
            })
          )}
        </div>

        <div className="px-4 py-3 border-t border-[var(--border-light)] bg-[var(--bg-card)] flex justify-end">
          <button
            type="button"
            className="px-5 py-[7px] rounded-md border border-[var(--button-bg)] bg-[var(--button-bg)] text-[var(--button-text)] font-semibold text-[13px] cursor-pointer ml-auto hover:bg-[var(--button-bg-hover)] hover:border-[var(--button-bg-hover)] transition-all duration-150"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

