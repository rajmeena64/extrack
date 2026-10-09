import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, EllipsisVertical, Info, Search, SlidersHorizontal, Trash2, X } from '@/icons/lucideIcons';
import WatchlistRow from './WatchlistRow';
import EditWatchlistModal from './EditWatchlistModal';
import AboutSymbolModal from './AboutSymbolModal';
import {
  buildWatchlistSections,
  getDisplaySymbol,
  getRequestSymbol,
  getSymbolSubtitle,
  getWatchlistSymbolOptions,
  hasUsableQuote,
  normalizeStreamSymbol,
} from '../../utils/terminalHelpers';

export default function WatchlistPanel({
  activeSymbol,
  availableSymbols,
  onAddSymbol,
  onPointerDragStart,
  onRemoveSymbol,
  onSelectSymbol,
  quotes,
  sections,
  onClose,
}) {
  const [query, setQuery] = useState('');
  const [category] = useState('All');
  const [collapsedSections, setCollapsedSections] = useState(() => new Set());
  const [menuOpen, setMenuOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [rowContextMenu, setRowContextMenu] = useState(null);
  const [aboutSymbol, setAboutSymbol] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!rowContextMenu) return undefined;
    const handleClose = () => setRowContextMenu(null);
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setRowContextMenu(null);
    };
    document.addEventListener('click', handleClose);
    document.addEventListener('contextmenu', handleClose);
    document.addEventListener('scroll', handleClose, true);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', handleClose);
      document.removeEventListener('contextmenu', handleClose);
      document.removeEventListener('scroll', handleClose, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [rowContextMenu]);

  const handleRowContextMenu = useCallback((event, requestSymbol, symbol) => {
    event.preventDefault();
    event.stopPropagation();
    setRowContextMenu({
      x: event.clientX,
      y: event.clientY,
      requestSymbol,
      symbol,
    });
  }, []);

  const normalizedQuery = query.trim().toUpperCase();
  const selectedWatchlistSymbols = useMemo(() => (
    sections.flatMap((section) => section.rows.map((row) => row.requestSymbol))
  ), [sections]);
  const selectedWatchlistSet = useMemo(() => (
    new Set(selectedWatchlistSymbols.map(normalizeStreamSymbol))
  ), [selectedWatchlistSymbols]);
  const symbolOptions = useMemo(() => (
    getWatchlistSymbolOptions(availableSymbols)
  ), [availableSymbols]);

  const allSectionTitles = useMemo(() => sections.map((s) => s.title), [sections]);
  const areAllCollapsed = useMemo(() => (
    allSectionTitles.length > 0 && allSectionTitles.every((title) => collapsedSections.has(title))
  ), [allSectionTitles, collapsedSections]);

  const toggleCollapseAll = useCallback(() => {
    if (areAllCollapsed) {
      setCollapsedSections(new Set());
    } else {
      setCollapsedSections(new Set(allSectionTitles));
    }
  }, [allSectionTitles, areAllCollapsed]);

  const searchSections = useMemo(() => {
    if (!normalizedQuery) return [];
    const matchingSymbols = symbolOptions.filter((item) => {
      const displaySymbol = getDisplaySymbol(item);
      const requestSymbol = getRequestSymbol(item);
      const subtitle = getSymbolSubtitle(item, displaySymbol);
      return (
        displaySymbol.toUpperCase().includes(normalizedQuery) ||
        requestSymbol.toUpperCase().includes(normalizedQuery) ||
        subtitle.toUpperCase().includes(normalizedQuery)
      );
    });
    return buildWatchlistSections(matchingSymbols);
  }, [normalizedQuery, symbolOptions]);

  const filteredSections = useMemo(() => {
    if (normalizedQuery) return searchSections;
    return sections
      .filter((section) => category === 'All' || section.title === category)
      .filter((section) => section.rows.length > 0);
  }, [category, normalizedQuery, searchSections, sections]);

  const toggleSection = useCallback((title) => {
    setCollapsedSections((currentSections) => {
      const nextSections = new Set(currentSections);
      if (nextSections.has(title)) {
        nextSections.delete(title);
      } else {
        nextSections.add(title);
      }
      return nextSections;
    });
  }, []);

  const handleSelectSymbol = useCallback((symbol) => {
    if (normalizedQuery && !selectedWatchlistSet.has(normalizeStreamSymbol(symbol))) {
      onAddSymbol(symbol);
    }
    onSelectSymbol(symbol);
  }, [normalizedQuery, onAddSymbol, onSelectSymbol, selectedWatchlistSet]);

  return (
    <aside className="col-start-1 row-start-1 row-end-4 grid grid-rows-[42px_48px_24px_minmax(0,1fr)] min-w-0 min-h-0 h-full rounded-md bg-[var(--bg-card)] relative overflow-visible" aria-label="Instruments">
      <div className="relative overflow-visible z-10 flex items-center justify-between border-b border-[var(--border-light)] pl-3 pr-2">
        <strong className="text-[var(--text-secondary)] text-xs tracking-[0.02em] uppercase font-semibold">Instruments</strong>
        <div className="inline-flex items-center gap-1">
          <div className="relative inline-flex items-center" ref={menuRef}>
            <button
              aria-label="More options"
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className={`inline-flex items-center justify-center w-8 h-8 border-0 rounded-md bg-transparent text-[var(--text-muted)] cursor-pointer hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors ${menuOpen ? 'bg-[var(--bg-hover)] text-[var(--text-primary)]' : ''}`}
            >
              <EllipsisVertical size={18} aria-hidden="true" />
            </button>
            {menuOpen && (
              <div className="absolute top-[calc(100%+6px)] right-0 z-[99999] w-max min-w-[190px] max-w-[240px] bg-[var(--bg-card,#ffffff)] dark:bg-[#1e1e1e] border border-[var(--border-light,#e2e8f0)] dark:border-[#333333] rounded-lg shadow-[0_10px_25px_-5px_rgba(0,0,0,0.12),0_4px_10px_-2px_rgba(0,0,0,0.05)] dark:shadow-[0_14px_38px_rgba(0,0,0,0.55)] p-1.5 box-border normal-case tracking-normal origin-top-right animate-in fade-in zoom-in-95 duration-150">
                <button
                  type="button"
                  className="flex items-center justify-start gap-[9px] w-full h-[34px] px-3 border-0 rounded-md bg-transparent text-[var(--text-primary,#1e293b)] dark:text-[#e5e5e5] text-[12.5px] font-medium cursor-pointer text-left normal-case tracking-normal whitespace-nowrap box-border hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-[background,color] duration-120 group"
                  onClick={() => {
                    setMenuOpen(false);
                    setEditModalOpen(true);
                  }}
                >
                  <SlidersHorizontal size={14} className="text-[var(--text-secondary,#64748b)] dark:text-[#a3a3a3] shrink-0 transition-colors duration-120 group-hover:text-[var(--text-primary)]" aria-hidden="true" />
                  <span>Edit Watchlist</span>
                </button>
                <div className="h-px bg-[var(--border-light,#e2e8f0)] dark:bg-[#333333] my-1" />
                <button
                  type="button"
                  className="flex items-center justify-start gap-[9px] w-full h-[34px] px-3 border-0 rounded-md bg-transparent text-[var(--text-primary,#1e293b)] dark:text-[#e5e5e5] text-[12.5px] font-medium cursor-pointer text-left normal-case tracking-normal whitespace-nowrap box-border hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-[background,color] duration-120 group"
                  onClick={() => {
                    toggleCollapseAll();
                    setMenuOpen(false);
                  }}
                >
                  {areAllCollapsed ? (
                    <>
                      <ChevronDown size={14} className="text-[var(--text-secondary,#64748b)] dark:text-[#a3a3a3] shrink-0 transition-colors duration-120 group-hover:text-[var(--text-primary)]" aria-hidden="true" />
                      <span>Expand All Sections</span>
                    </>
                  ) : (
                    <>
                      <ChevronUp size={14} className="text-[var(--text-secondary,#64748b)] dark:text-[#a3a3a3] shrink-0 transition-colors duration-120 group-hover:text-[var(--text-primary)]" aria-hidden="true" />
                      <span>Collapse All Sections</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
          <button
            aria-label="Close instruments"
            className="inline-flex items-center justify-center w-8 h-8 border-0 rounded-md bg-transparent text-[var(--text-muted)] cursor-pointer hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
            onClick={onClose}
            type="button"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-2 items-center border-b border-[var(--border-light)] px-2.5 py-[7px]">
        <label className="flex items-center gap-[7px] h-[34px] border border-[var(--border-light)] rounded bg-[var(--surface-subtle)] text-[var(--text-muted)] px-[9px]">
          <Search size={16} aria-hidden="true" />
          <input
            aria-label="Search instruments"
            className="min-w-0 w-full border-0 outline-none bg-transparent text-[var(--text-primary)] font-inherit text-xs"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search"
            value={query}
          />
        </label>
      </div>

      <div className="grid grid-cols-[minmax(70px,1fr)_minmax(52px,auto)_54px_54px] items-center gap-x-1.5 border-b border-[var(--border-light)] text-[var(--text-muted)] text-[10.5px] font-medium pl-2.5 pr-2 select-none" aria-hidden="true">
        <span>Symbol</span>
        <span>Today</span>
        <span>Bid</span>
        <span>Ask</span>
      </div>

      <div className="min-h-0 overflow-y-auto scrollbar-thin">
        {filteredSections.map((section) => {
          const collapsed = !normalizedQuery && collapsedSections.has(section.title);
          return (
            <section className="border-b border-[var(--border-light)] p-0" key={section.title}>
              <button
                aria-expanded={!collapsed}
                className="flex items-center gap-1 w-full h-[26px] border-0 bg-transparent text-[var(--text-secondary)] cursor-pointer font-inherit text-[11.5px] font-semibold pl-2.5 pr-2 text-left hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
                onClick={() => toggleSection(section.title)}
                type="button"
              >
                <ChevronDown size={14} className={`transition-transform duration-150 ${collapsed ? '-rotate-90' : 'rotate-0'}`} aria-hidden="true" />
                <span>{section.title}</span>
              </button>
              {!collapsed && section.rows.map((row) => {
                const norm = normalizeStreamSymbol(row.requestSymbol);
                const isSearch = Boolean(normalizedQuery);
                const inWatchlist = selectedWatchlistSet.has(norm);
                return (
                  <WatchlistRow
                    active={row.requestSymbol === activeSymbol}
                    inWatchlist={inWatchlist}
                    isSearchResult={isSearch}
                    key={row.symbol}
                    onAddSymbol={onAddSymbol}
                    onContextMenu={handleRowContextMenu}
                    onPointerDragStart={onPointerDragStart}
                    onRemoveSymbol={onRemoveSymbol}
                    onSelect={handleSelectSymbol}
                    quote={quotes[row.requestSymbol]}
                    row={row}
                  />
                );
              })}
            </section>
          );
        })}
      </div>

      {rowContextMenu && (
        <div
          className="fixed z-[999999] min-w-[190px] bg-[var(--bg-card,#ffffff)] dark:bg-[#1e1e1e] border border-[var(--border-light,#e2e8f0)] dark:border-[#333333] rounded-lg shadow-[0_12px_30px_rgba(0,0,0,0.22),0_4px_10px_rgba(0,0,0,0.08)] dark:shadow-[0_14px_38px_rgba(0,0,0,0.6)] p-1 animate-in fade-in zoom-in-95 duration-120"
          style={{
            top: rowContextMenu.y,
            left: rowContextMenu.x,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="flex items-center gap-[9px] w-full h-[34px] px-3 border-0 rounded-md bg-transparent text-[var(--text-primary)] text-[12.5px] font-medium cursor-pointer text-left whitespace-nowrap box-border hover:bg-[var(--bg-hover)] transition-[background,color] duration-120 group"
            onClick={() => {
              setAboutSymbol(rowContextMenu.requestSymbol);
              setRowContextMenu(null);
            }}
          >
            <Info size={14} className="text-[var(--text-secondary,#64748b)] dark:text-[#a3a3a3] shrink-0 transition-colors duration-120 group-hover:text-[var(--text-primary)]" aria-hidden="true" />
            <span>About {rowContextMenu.symbol}</span>
          </button>
          <div className="h-px bg-[var(--border-light,#e2e8f0)] dark:bg-[#333333] my-1" />
          <button
            type="button"
            className="flex items-center gap-[9px] w-full h-[34px] px-3 border-0 rounded-md bg-transparent text-[var(--accent-danger,#dc2626)] hover:bg-[var(--accent-danger-soft,rgba(220,38,38,0.1))] text-[12.5px] font-medium cursor-pointer text-left whitespace-nowrap box-border transition-[background,color] duration-120 group [&>svg]:text-[var(--accent-danger,#dc2626)]"
            onClick={() => {
              onRemoveSymbol(rowContextMenu.requestSymbol);
              setRowContextMenu(null);
            }}
          >
            <Trash2 size={14} className="shrink-0" aria-hidden="true" />
            <span>Remove from Watchlist</span>
          </button>
        </div>
      )}

      <EditWatchlistModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        availableSymbols={availableSymbols}
        selectedWatchlistSet={selectedWatchlistSet}
        onAddSymbol={onAddSymbol}
        onRemoveSymbol={onRemoveSymbol}
      />

      <AboutSymbolModal
        isOpen={!!aboutSymbol}
        onClose={() => setAboutSymbol(null)}
        symbolValue={aboutSymbol}
        availableSymbols={availableSymbols}
        quotes={quotes}
      />
    </aside>
  );
}


