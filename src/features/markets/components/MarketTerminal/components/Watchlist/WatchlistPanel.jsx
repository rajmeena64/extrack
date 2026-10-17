import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, EllipsisVertical, Grid2x2, Info, LogOut, Plus, PlusCircle, Search, Trash2, X } from '@/icons/lucideIcons';
import { Skeleton } from '@/components/ui/skeleton';
import WatchlistRow from './WatchlistRow';
import AboutSymbolModal from './AboutSymbolModal';

export default function WatchlistPanel({
  activeSymbol,
  availableSymbols,
  isLoading = false,
  onAddSymbol,
  onRemoveSymbol,
  onSelectSymbol,
  quotes,
  sections,
  onClose,
  onOpenSymbolSearch,
  onAddSection,
  onRemoveSection,
  onGroupByMarket,
  onClearWatchlist,
  onReorderWatchlist,
}) {
  const [collapsedSections, setCollapsedSections] = useState(() => new Set());
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [rowContextMenu, setRowContextMenu] = useState(null);
  const [aboutSymbol, setAboutSymbol] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
        setIsAddingSection(false);
        setNewSectionTitle('');
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

  const handleRowContextMenu = useCallback((event, requestSymbol, symbol, section = '') => {
    event.preventDefault();
    event.stopPropagation();
    setRowContextMenu({
      x: event.clientX,
      y: event.clientY,
      requestSymbol,
      symbol,
      section,
    });
  }, []);

  const toggleSection = useCallback((title) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(title)) {
        next.delete(title);
      } else {
        next.add(title);
      }
      return next;
    });
  }, []);

  const handleAddSectionSubmit = (e) => {
    e.preventDefault();
    const trimmed = newSectionTitle.trim();
    if (trimmed) {
      onAddSection?.(trimmed);
      setNewSectionTitle('');
      setIsAddingSection(false);
      setMenuOpen(false);
    }
  };

  const handleRowDrop = useCallback((e, sourceSymbol, targetSymbol, position) => {
    if (sourceSymbol && targetSymbol && sourceSymbol !== targetSymbol) {
      onReorderWatchlist?.(sourceSymbol, null, targetSymbol, position || 'bottom');
    }
  }, [onReorderWatchlist]);

  return (
    <aside className="col-start-1 row-start-1 row-end-4 grid grid-rows-[42px_48px_24px_minmax(0,1fr)] min-w-0 min-h-0 h-full rounded-md bg-[var(--bg-card)] relative overflow-visible" aria-label="Instruments">
      <div className="relative overflow-visible z-10 flex items-center justify-between border-b border-[var(--border-light)] pl-3 pr-2">
        <strong className="text-[var(--text-secondary)] text-xs tracking-[0.02em] uppercase font-semibold">Instruments</strong>
        <div className="inline-flex items-center gap-1">
          <div className="relative inline-flex items-center" ref={menuRef}>
            <button
              aria-label="More options"
              type="button"
              onClick={() => {
                setMenuOpen((prev) => !prev);
                setIsAddingSection(false);
                setNewSectionTitle('');
              }}
              className={`inline-flex items-center justify-center w-8 h-8 border-0 rounded-md bg-transparent text-[var(--text-muted)] cursor-pointer hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors ${menuOpen ? 'bg-[var(--bg-hover)] text-[var(--text-primary)]' : ''}`}
            >
              <EllipsisVertical size={18} aria-hidden="true" />
            </button>
            {menuOpen && (
              <div className="absolute top-[calc(100%+6px)] right-0 z-[99999] w-max min-w-[210px] max-w-[260px] bg-[var(--bg-card,#ffffff)] dark:bg-[#1e1e1e] border border-[var(--border-light,#e2e8f0)] dark:border-[#333333] rounded-lg shadow-[0_10px_25px_-5px_rgba(0,0,0,0.12),0_4px_10px_-2px_rgba(0,0,0,0.05)] dark:shadow-[0_14px_38px_rgba(0,0,0,0.55)] p-1.5 box-border normal-case tracking-normal origin-top-right animate-in fade-in zoom-in-95 duration-150">
                {isAddingSection ? (
                  <form onSubmit={handleAddSectionSubmit} className="flex items-center gap-1.5 p-1">
                    <input
                      autoFocus
                      type="text"
                      placeholder="Section name..."
                      value={newSectionTitle}
                      onChange={(e) => setNewSectionTitle(e.target.value)}
                      className="w-full h-7 px-2 text-xs rounded border border-[var(--border-light)] bg-[var(--surface-subtle)] text-[var(--text-primary)] outline-none"
                    />
                    <button
                      type="submit"
                      className="h-7 px-2.5 text-xs font-semibold rounded bg-[var(--brand-primary,#3b82f6)] text-white border-0 cursor-pointer hover:opacity-90 transition-opacity shrink-0"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingSection(false);
                        setNewSectionTitle('');
                      }}
                      className="h-7 px-1 text-xs rounded border-0 bg-transparent text-[var(--text-muted)] cursor-pointer hover:text-[var(--text-primary)] shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </form>
                ) : (
                  <>
                    <button
                      type="button"
                      className="flex items-center justify-start gap-[9px] w-full h-[34px] px-3 border-0 rounded-md bg-transparent text-[var(--text-primary,#1e293b)] dark:text-[#e5e5e5] text-[12.5px] font-medium cursor-pointer text-left normal-case tracking-normal whitespace-nowrap box-border hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-[background,color] duration-120 group"
                      onClick={() => setIsAddingSection(true)}
                    >
                      <PlusCircle size={14} className="text-[var(--text-secondary,#64748b)] dark:text-[#a3a3a3] shrink-0 transition-colors duration-120 group-hover:text-[var(--text-primary)]" aria-hidden="true" />
                      <span>Add Section</span>
                    </button>
                    <button
                      type="button"
                      className="flex items-center justify-start gap-[9px] w-full h-[34px] px-3 border-0 rounded-md bg-transparent text-[var(--text-primary,#1e293b)] dark:text-[#e5e5e5] text-[12.5px] font-medium cursor-pointer text-left normal-case tracking-normal whitespace-nowrap box-border hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-[background,color] duration-120 group"
                      onClick={() => {
                        setMenuOpen(false);
                        onGroupByMarket?.();
                      }}
                    >
                      <Grid2x2 size={14} className="text-[var(--text-secondary,#64748b)] dark:text-[#a3a3a3] shrink-0 transition-colors duration-120 group-hover:text-[var(--text-primary)]" aria-hidden="true" />
                      <span>Group by Market (Suggestion)</span>
                    </button>
                    <div className="h-px bg-[var(--border-light,#e2e8f0)] dark:bg-[#333333] my-1" />
                    <button
                      type="button"
                      className="flex items-center justify-start gap-[9px] w-full h-[34px] px-3 border-0 rounded-md bg-transparent text-[var(--accent-danger,#dc2626)] hover:bg-[var(--accent-danger-soft,rgba(220,38,38,0.1))] text-[12.5px] font-medium cursor-pointer text-left normal-case tracking-normal whitespace-nowrap box-border transition-[background,color] duration-120 group"
                      onClick={() => {
                        setMenuOpen(false);
                        onClearWatchlist?.();
                      }}
                    >
                      <Trash2 size={14} className="shrink-0" aria-hidden="true" />
                      <span>Clear Watchlist</span>
                    </button>
                  </>
                )}
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
        <button
          type="button"
          onClick={() => onOpenSymbolSearch?.(null)}
          aria-label="Search instruments"
          className="flex items-center gap-[7px] h-[34px] w-full border border-[var(--border-light)] rounded bg-[var(--surface-subtle)] text-[var(--text-muted)] px-[9px] hover:border-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors cursor-pointer text-left"
        >
          <Search size={15} aria-hidden="true" />
          <span className="font-inherit text-xs select-none">Search instruments...</span>
        </button>
      </div>

      <div className="grid grid-cols-[minmax(70px,1fr)_minmax(52px,auto)_54px_54px] items-center gap-x-1.5 border-b border-[var(--border-light)] text-[var(--text-muted)] text-[10.5px] font-medium pl-2.5 pr-2 select-none" aria-hidden="true">
        <span>Symbol</span>
        <span>Today</span>
        <span>Bid</span>
        <span>Ask</span>
      </div>

      <div
        className="min-h-0 overflow-y-auto scrollbar-thin"
        onDragOver={(e) => {
          if (e.target === e.currentTarget) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
          }
        }}
        onDrop={(e) => {
          if (e.target === e.currentTarget) {
            e.preventDefault();
            const sourceSymbol = e.dataTransfer.getData('text/plain');
            if (sourceSymbol) {
              onReorderWatchlist?.(sourceSymbol, '__unsection', null, 'top');
            }
          }
        }}
      >
        {isLoading || sections.length === 0 ? (
          <div className="p-2 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="grid grid-cols-[minmax(70px,1fr)_minmax(52px,auto)_54px_54px] items-center gap-x-1.5 py-1">
                <div className="flex items-center gap-2">
                  <Skeleton className="w-5 h-5 rounded-full shrink-0" />
                  <div className="space-y-1 flex-1 min-w-0">
                    <Skeleton className="h-3 w-12" />
                    <Skeleton className="h-2 w-8" />
                  </div>
                </div>
                <Skeleton className="h-3 w-10 ml-auto" />
                <Skeleton className="h-3 w-9 ml-auto" />
                <Skeleton className="h-3 w-9 ml-auto" />
              </div>
            ))}
          </div>
        ) : sections.map((section, idx) => {
          const isNamedSection = Boolean(section.title);
          const collapsed = isNamedSection && collapsedSections.has(section.title);
          return (
            <section
              className={isNamedSection ? 'border-b border-[var(--border-light)] p-0' : 'p-0'}
              key={section.title || idx}
              data-watchlist-section={section.title || '__default'}
            >
              {isNamedSection && (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    const rect = e.currentTarget.getBoundingClientRect();
                    const isTop = (e.clientY - rect.top) < 7;
                    if (isTop) {
                      if (e.currentTarget.getAttribute('data-drop-position') !== 'top') {
                        e.currentTarget.setAttribute('data-drop-position', 'top');
                      }
                      e.currentTarget.removeAttribute('data-drop-over');
                    } else {
                      e.currentTarget.removeAttribute('data-drop-position');
                      if (e.currentTarget.getAttribute('data-drop-over') !== 'true') {
                        e.currentTarget.setAttribute('data-drop-over', 'true');
                      }
                    }
                  }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget)) {
                      e.currentTarget.removeAttribute('data-drop-over');
                      e.currentTarget.removeAttribute('data-drop-position');
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const isTop = e.currentTarget.getAttribute('data-drop-position') === 'top';
                    e.currentTarget.removeAttribute('data-drop-over');
                    e.currentTarget.removeAttribute('data-drop-position');
                    const sourceSymbol = e.dataTransfer.getData('text/plain');
                    if (sourceSymbol) {
                      if (isTop) {
                        onReorderWatchlist?.(sourceSymbol, '__unsection', null, 'top');
                      } else {
                        onReorderWatchlist?.(sourceSymbol, section.title, null, 'top');
                      }
                    }
                  }}
                  className="relative flex items-center justify-between h-[28px] pl-2.5 pr-2 border-b transition-colors bg-[var(--surface-subtle)]/50 border-[var(--border-light)] data-[drop-over='true']:bg-[var(--brand-primary,#2563eb)]/15 data-[drop-over='true']:border-[var(--brand-primary,#2563eb)] data-[drop-position='top']:before:absolute data-[drop-position='top']:before:top-0 data-[drop-position='top']:before:left-0 data-[drop-position='top']:before:right-0 data-[drop-position='top']:before:h-[2px] data-[drop-position='top']:before:bg-[var(--brand-primary,#2563eb)] data-[drop-position='top']:before:z-20"
                >
                  <button
                    aria-expanded={!collapsed}
                    className="flex items-center gap-1 border-0 bg-transparent text-[var(--text-secondary)] cursor-pointer font-inherit text-[11px] font-semibold text-left hover:text-[var(--text-primary)] transition-colors"
                    onClick={() => toggleSection(section.title)}
                    type="button"
                  >
                    <ChevronDown size={13} className={`transition-transform duration-150 ${collapsed ? '-rotate-90' : 'rotate-0'}`} aria-hidden="true" />
                    <span>{section.title}</span>
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label={`Add symbol to ${section.title}`}
                      title={`Add symbol to ${section.title}`}
                      onClick={() => onOpenSymbolSearch?.(section.title)}
                      className="flex items-center justify-center w-5 h-5 border-0 rounded bg-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                    >
                      <Plus size={12} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove section ${section.title}`}
                      title="Remove section"
                      onClick={() => onRemoveSection?.(section.title)}
                      className="flex items-center justify-center w-5 h-5 border-0 rounded bg-transparent text-[var(--text-muted)] hover:text-[var(--accent-danger,#dc2626)] hover:bg-[var(--accent-danger-soft,rgba(220,38,38,0.1))] transition-colors cursor-pointer"
                    >
                      <X size={12} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              )}
              {!collapsed && section.rows.map((row) => (
                <WatchlistRow
                  active={row.requestSymbol === activeSymbol}
                  inWatchlist
                  isSearchResult={false}
                  key={row.symbol}
                  onRowDrop={handleRowDrop}
                  onAddSymbol={onAddSymbol}
                  onContextMenu={(e, reqSym, sym) => handleRowContextMenu(e, reqSym, sym, section.title)}
                  onRemoveSymbol={onRemoveSymbol}
                  onSelect={onSelectSymbol}
                  quote={quotes[row.requestSymbol]}
                  row={row}
                />
              ))}
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
          {rowContextMenu.section && (
            <button
              type="button"
              className="flex items-center gap-[9px] w-full h-[34px] px-3 border-0 rounded-md bg-transparent text-[var(--text-primary)] text-[12.5px] font-medium cursor-pointer text-left whitespace-nowrap box-border hover:bg-[var(--bg-hover)] transition-[background,color] duration-120 group"
              onClick={() => {
                onReorderWatchlist?.(rowContextMenu.requestSymbol, '__unsection', null, 'top');
                setRowContextMenu(null);
              }}
            >
              <LogOut size={14} className="text-[var(--text-secondary,#64748b)] dark:text-[#a3a3a3] shrink-0 transition-colors duration-120 group-hover:text-[var(--text-primary)]" aria-hidden="true" />
              <span>Move out of section</span>
            </button>
          )}
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
