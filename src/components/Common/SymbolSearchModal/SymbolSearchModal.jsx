import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, CircleCheck, Plus } from '@/icons/lucideIcons';
import SymbolWithIcon from '@/components/Common/SymbolWithIcon/SymbolWithIcon';
import { useInstruments } from '@/hooks/useInstruments';
import { normalizeStreamSymbol } from '@/features/markets/components/MarketTerminal/utils/terminalHelpers';

const CATEGORIES = [
  { id: 'All', label: 'All' },
  { id: 'stock', label: 'Stocks' },
  { id: 'crypto', label: 'Crypto' },
  { id: 'forex_cfd', label: 'Forex' },
  { id: 'future', label: 'Futures' },
  { id: 'bond', label: 'Bonds' },
];

export default function SymbolSearchModal({ isOpen, onClose, onSelectSymbol, watchlistSet = new Set(), onToggleWatchlist }) {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const filters = useMemo(() => {
    const f = { limit: 120 };
    if (activeCategory !== 'All') f.category = activeCategory;
    return f;
  }, [activeCategory]);

  const { data: instruments = [] } = useInstruments(query, filters);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
    if (listRef.current) listRef.current.scrollTop = 0;
  }, [query, activeCategory]);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, Math.max(0, instruments.length - 1)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (instruments[selectedIndex]) {
        onSelectSymbol?.(instruments[selectedIndex].symbol);
        onClose();
      }
    }
  };

  useEffect(() => {
    const el = listRef.current?.children?.[selectedIndex];
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[999999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-100" onClick={onClose}>
      <div className="w-[760px] max-w-[96vw] h-[590px] max-h-[88vh] flex flex-col rounded-xl bg-[var(--bg-card,#1e222d)] border border-[var(--border-light,#2a2e39)] shadow-2xl overflow-hidden text-[var(--text-primary,#d1d4dc)]" onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border-light,#2a2e39)]">
          <span className="font-bold text-[15px] text-[var(--text-primary,#d1d4dc)] tracking-[0.2px]">Symbol Search</span>
          <button type="button" onClick={onClose} aria-label="Close" className="w-7 h-7 flex items-center justify-center rounded-md border-0 bg-transparent text-[var(--text-muted,#787b86)] hover:bg-[var(--bg-hover,rgba(255,255,255,0.08))] hover:text-[var(--text-primary,#d1d4dc)] cursor-pointer transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-[var(--border-light,#2a2e39)]">
          <div className="flex items-center gap-3 h-[42px] px-3.5 bg-[var(--surface-subtle,#131722)] border border-[var(--border-light,#2a2e39)] rounded-lg text-[var(--text-muted,#787b86)] focus-within:border-[var(--primary,#2962ff)] transition-colors">
            <Search size={18} className="shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search symbol, company, or market..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 border-0 bg-transparent text-[var(--text-primary,#d1d4dc)] text-[14px] outline-none placeholder:text-[var(--text-muted,#787b86)] font-medium"
              autoComplete="off"
              spellCheck="false"
            />
            {query ? (
              <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="p-1 border-0 bg-transparent text-[var(--text-muted,#787b86)] hover:text-[var(--text-primary,#d1d4dc)] cursor-pointer rounded">
                <X size={14} />
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-5 py-2.5 border-b border-[var(--border-light,#2a2e39)] overflow-x-auto scrollbar-none">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveCategory(c.id)}
              className={`px-3 py-1 rounded-md text-[12px] font-medium cursor-pointer border transition-colors whitespace-nowrap ${
                activeCategory === c.id
                  ? 'bg-[var(--primary,#2962ff)] text-white border-transparent shadow-xs'
                  : 'bg-transparent border-transparent text-[var(--text-secondary,#a3a6af)] hover:text-[var(--text-primary,#d1d4dc)] hover:bg-[var(--bg-hover,rgba(255,255,255,0.06))]'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-[180px_minmax(0,1fr)_100px_90px_40px] items-center gap-3 px-5 py-2 bg-[var(--surface-subtle,#131722)]/70 border-b border-[var(--border-light,#2a2e39)] text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted,#787b86)]" aria-hidden="true">
          <span>SYMBOL</span>
          <span>DESCRIPTION</span>
          <span className="text-right">EXCHANGE</span>
          <span className="text-right">TYPE</span>
          <span></span>
        </div>

        <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto divide-y divide-[var(--border-light,#2a2e39)]/30">
          {instruments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center text-[var(--text-muted,#787b86)] gap-2">
              <Search size={28} className="opacity-40" />
              <span className="text-xs">No symbols found matching &quot;{query}&quot;</span>
            </div>
          ) : (
            instruments.map((inst, index) => {
              const normalized = normalizeStreamSymbol(inst.symbol);
              const inWatchlist = watchlistSet.has(normalized);
              const isSelected = index === selectedIndex;

              return (
                <div
                  key={inst.id}
                  onClick={() => {
                    onSelectSymbol?.(inst.symbol);
                    onClose();
                  }}
                  className={`grid grid-cols-[180px_minmax(0,1fr)_100px_90px_40px] items-center gap-3 px-5 py-2.5 cursor-pointer transition-colors duration-100 ${
                    isSelected ? 'bg-[var(--bg-hover,rgba(255,255,255,0.08))]' : 'hover:bg-[var(--bg-hover,rgba(255,255,255,0.04))]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <SymbolWithIcon symbol={inst.symbol} size="md" showLabel={false} />
                    <span className="text-[13px] font-bold text-[var(--text-primary,#d1d4dc)] truncate tracking-[0.2px]">{inst.symbol}</span>
                  </div>

                  <span className="text-[12.5px] text-[var(--text-secondary,#a3a6af)] truncate font-normal">{inst.displayName}</span>

                  <div className="flex justify-end min-w-0">
                    {inst.marketSource ? (
                      <span className="text-[11px] font-semibold text-[var(--text-primary,#d1d4dc)] uppercase tracking-wide truncate">
                        {inst.marketSource}
                      </span>
                    ) : null}
                  </div>

                  <div className="flex justify-end min-w-0">
                    <span className="text-[10px] uppercase font-semibold text-[var(--text-muted,#787b86)] tracking-[0.3px] px-2 py-0.5 rounded bg-[var(--surface-subtle,#131722)] border border-[var(--border-light,#2a2e39)]/70">
                      {inst.category}
                    </span>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      title={inWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleWatchlist?.(inst.symbol, inWatchlist);
                      }}
                      className={`w-7 h-7 flex items-center justify-center rounded-md border transition-all duration-120 cursor-pointer ${
                        inWatchlist
                          ? 'border-[var(--primary,#2962ff)] bg-[var(--primary,#2962ff)]/15 text-[var(--primary,#2962ff)]'
                          : 'border-[var(--border-light,#2a2e39)] bg-transparent text-[var(--text-muted,#787b86)] hover:border-[var(--primary,#2962ff)] hover:text-[var(--primary,#2962ff)] hover:bg-[var(--primary,#2962ff)]/10'
                      }`}
                    >
                      {inWatchlist ? <CircleCheck size={14} /> : <Plus size={14} />}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="px-5 py-2 border-t border-[var(--border-light,#2a2e39)] bg-[var(--surface-subtle,#131722)]/50 flex items-center justify-between text-[11px] text-[var(--text-muted,#787b86)]">
          <div className="flex items-center gap-3">
            <span>Navigate: <kbd className="px-1.5 py-0.5 rounded bg-[var(--border-light,#2a2e39)] text-[10px] text-[var(--text-primary,#d1d4dc)]">↑</kbd> <kbd className="px-1.5 py-0.5 rounded bg-[var(--border-light,#2a2e39)] text-[10px] text-[var(--text-primary,#d1d4dc)]">↓</kbd></span>
            <span>Select: <kbd className="px-1.5 py-0.5 rounded bg-[var(--border-light,#2a2e39)] text-[10px] text-[var(--text-primary,#d1d4dc)]">↵</kbd></span>
            <span>Close: <kbd className="px-1.5 py-0.5 rounded bg-[var(--border-light,#2a2e39)] text-[10px] text-[var(--text-primary,#d1d4dc)]">Esc</kbd></span>
          </div>
          <span>{instruments.length} results</span>
        </div>
      </div>
    </div>,
    document.body
  );
}
