import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Search } from '@/icons/lucideIcons';
import SymbolWithIcon from '@/components/Common/SymbolWithIcon/SymbolWithIcon';
import { useInstruments, useDebouncedValue } from '@/hooks/useInstruments';
import {
  getDisplaySymbol,
  getRequestSymbol,
  getSymbolSubtitle,
} from '../../utils/terminalHelpers';

export default function AddChartSymbolPicker({ disabled, options, onSelect }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [menuStyle, setMenuStyle] = useState({});
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const debouncedQuery = useDebouncedValue(query, 300);
  const isServerSearch = debouncedQuery.trim().length > 0;
  const { data: serverResults = [] } = useInstruments(debouncedQuery, { limit: 50 });

  const filteredOptions = useMemo(() => {
    if (isServerSearch && serverResults.length > 0) {
      return serverResults.slice(0, 90);
    }
    const normalizedQuery = query.trim().toUpperCase();
    const source = normalizedQuery
      ? options.filter((item) => {
        const requestSymbol = getRequestSymbol(item);
        const displaySymbol = getDisplaySymbol(item);
        const subtitle = getSymbolSubtitle(item, displaySymbol);
        return (
          requestSymbol.toUpperCase().includes(normalizedQuery) ||
          displaySymbol.toUpperCase().includes(normalizedQuery) ||
          subtitle.toUpperCase().includes(normalizedQuery)
        );
      })
      : options;
    return source.slice(0, 90);
  }, [isServerSearch, options, query, serverResults]);

  const selectSymbol = useCallback((symbol) => {
    onSelect(symbol);
    setOpen(false);
    setQuery('');
  }, [onSelect]);

  const computeMenuStyle = useCallback((rect) => {
    const MENU_WIDTH = 246;
    const viewportWidth = window.innerWidth;
    const spaceOnRight = viewportWidth - rect.left;
    const style = {
      position: 'fixed',
      top: rect.bottom + 6,
      zIndex: 99999,
    };
    if (spaceOnRight >= MENU_WIDTH) {
      style.left = rect.left;
    } else {
      style.right = viewportWidth - rect.right;
    }
    return style;
  }, []);

  const openMenu = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setMenuStyle(computeMenuStyle(rect));
    }
    setOpen(true);
  }, [computeMenuStyle]);

  const closeMenu = useCallback(() => {
    setOpen(false);
    setQuery('');
  }, []);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event) => {
      if (
        menuRef.current && !menuRef.current.contains(event.target) &&
        triggerRef.current && !triggerRef.current.contains(event.target)
      ) {
        closeMenu();
      }
    };
    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => document.removeEventListener('pointerdown', handlePointerDown, true);
  }, [open, closeMenu]);

  useEffect(() => {
    if (!open) return;
    const reposition = () => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setMenuStyle(computeMenuStyle(rect));
      }
    };
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open, computeMenuStyle]);

  const menu = open
    ? createPortal(
        <div
          className="z-[99999] w-[246px] max-w-[calc(100vw-32px)] overflow-hidden border border-[var(--border-light,#e2e8f0)] dark:border-[#383838] rounded-lg bg-[var(--bg-card,#ffffff)] dark:bg-[#1e1e1e] shadow-[0_12px_28px_rgba(0,0,0,0.22),0_4px_10px_rgba(0,0,0,0.08)] dark:shadow-[0_14px_36px_rgba(0,0,0,0.6)] animate-in fade-in zoom-in-95 duration-120"
          ref={menuRef}
          style={menuStyle}
        >
          <label className="flex items-center gap-[7px] h-9 border-b border-[var(--border-light)] text-[var(--text-muted)] px-2.5">
            <Search size={14} aria-hidden="true" />
            <input
              aria-label="Search symbol to add chart"
              autoFocus
              className="min-w-0 w-full border-0 outline-none bg-transparent text-[var(--text-primary)] font-inherit text-xs"
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.preventDefault();
                  closeMenu();
                }
                if (event.key === 'Enter' && filteredOptions[0]) {
                  event.preventDefault();
                  selectSymbol(getRequestSymbol(filteredOptions[0]));
                }
              }}
              placeholder="Search symbol"
              value={query}
            />
          </label>
          <div className="max-h-[286px] overflow-y-auto overflow-x-hidden p-1 overscroll-contain touch-pan-y will-change-transform contain-content scrollbar-thin" role="listbox">
            {filteredOptions.length > 0 ? filteredOptions.map((item) => {
              const requestSymbol = getRequestSymbol(item);
              const displaySymbol = getDisplaySymbol(item);
              return (
                <button
                  className="flex items-center gap-2 w-full min-h-[38px] border-0 rounded bg-transparent text-[var(--text-primary)] cursor-pointer font-inherit px-[7px] py-[5px] text-left hover:bg-[var(--accent-info-soft)] transition-colors content-visibility-auto contain-intrinsic-size-[auto_38px]"
                  key={requestSymbol}
                  onClick={() => selectSymbol(requestSymbol)}
                  onMouseDown={(event) => event.preventDefault()}
                  type="button"
                >
                  <SymbolWithIcon symbol={displaySymbol} size="md" showLabel={false} />
                  <span className="grid min-w-0 flex-1">
                    <strong className="overflow-hidden text-[var(--text-primary)] text-xs font-bold leading-[1.15] text-ellipsis whitespace-nowrap">{displaySymbol}</strong>
                    <small className="overflow-hidden text-[var(--text-muted)] text-[10px] leading-[1.1] text-ellipsis whitespace-nowrap">{getSymbolSubtitle(item, displaySymbol)}</small>
                  </span>
                </button>
              );
            }) : (
              <span className="block p-2.5 text-center text-xs text-[var(--text-muted)]">No symbols</span>
            )}
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <div className="relative shrink-0">
      <button
        aria-expanded={open}
        aria-label="Add chart"
        className="inline-flex items-center justify-center w-7 h-7 rounded-md border-0 bg-transparent text-[var(--text-secondary)] cursor-pointer hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors disabled:cursor-not-allowed disabled:opacity-45"
        disabled={disabled}
        onClick={() => (open ? closeMenu() : openMenu())}
        ref={triggerRef}
        title="Add chart"
        type="button"
      >
        <Plus size={15} aria-hidden="true" />
      </button>
      {menu}
    </div>
  );
}

