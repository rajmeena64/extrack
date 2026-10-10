import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  Calendar, Camera, ChartCandlestick, ChartLine, ChevronDown,
  CloudUpload, Maximize2, Play, Plus, RefreshCw, RotateCcw, RotateCw, Search, Settings, X
} from '@/icons/lucideIcons';
import { DropdownSelect } from '@/components/ui/dropdown';
import { formatTradePrice } from '@/utils/trading/tradeCalculations';
import { useInstruments, useDebouncedValue } from '@/hooks/useInstruments';

import { TIMEFRAME_GROUPS } from './utils/chartHelpers';

const formatPrice = (value, digits) => formatTradePrice(value, digits);
const UNIT_LABELS = { minute: 'Minute', hour: 'Hour', day: 'Day', week: 'Week', month: 'Month' };
const formatTimeframeLabel = (tf) => {
  for (const group of Object.values(TIMEFRAME_GROUPS)) {
    const item = group.find((i) => i.value === tf);
    if (item) return item.label;
  }
  const match = /^([1-9]\d*)(minute|hour|day|week|month)s?$/.exec(String(tf || '').trim());
  if (match) {
    const val = Number(match[1]);
    const unitName = UNIT_LABELS[match[2]] || match[2];
    return `${val} ${unitName}${val > 1 ? 's' : ''}`;
  }
  return tf;
};

const LAYOUT_LINES = {
  '2v': [[9, 1, 9, 17]],
  '2h': [[1, 9, 17, 9]],
  '3v': [[6.3, 1, 6.3, 17], [11.7, 1, 11.7, 17]],
  '3h': [[1, 6.3, 17, 6.3], [1, 11.7, 17, 11.7]],
  '3': [[1, 9, 17, 9], [9, 9, 9, 17]],
  '4': [[1, 9, 17, 9], [9, 1, 9, 17]],
  '5': [[1, 9, 17, 9], [6.3, 1, 6.3, 17], [11.7, 1, 11.7, 9]],
  '6': [[1, 9, 17, 9], [6.3, 1, 6.3, 17], [11.7, 1, 11.7, 17]],
};

export function LayoutIcon({ layout = '1', size = 16, className = '' }) {
  const lines = LAYOUT_LINES[layout] || [];
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.3" className={className}>
      <rect x="1" y="1" width="16" height="16" rx="2" />
      {lines.map(([x1, y1, x2, y2], i) => (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />
      ))}
    </svg>
  );
}

export const DEFAULT_LAYOUTS = [
  { value: '1', label: '1 Chart' },
  { value: '2v', label: '2 Vertical' },
  { value: '2h', label: '2 Horizontal' },
  { value: '3v', label: '3 Vertical' },
  { value: '3h', label: '3 Horizontal' },
  { value: '3', label: '3 Grid' },
  { value: '4', label: '4 Grid' },
  { value: '5', label: '5 Grid' },
  { value: '6', label: '6 Grid' },
];

export function ChartLayoutPicker({
  layout = '1',
  layouts = DEFAULT_LAYOUTS,
  onLayoutChange,
  buttonClassName = 'inline-flex items-center justify-center w-7 h-7 rounded-md border-0 bg-transparent text-[var(--text-secondary,#64748b)] hover:text-[var(--text-primary,#0f172a)] hover:bg-[var(--bg-hover,#f1f5f9)] transition-colors cursor-pointer',
}) {
  const [layoutOpen, setLayoutOpen] = useState(false);
  const layoutDropdownRef = useRef(null);

  useEffect(() => {
    if (!layoutOpen) return undefined;
    const handleOutsideClick = (e) => {
      if (layoutDropdownRef.current && !layoutDropdownRef.current.contains(e.target)) setLayoutOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [layoutOpen]);

  return (
    <div className="relative inline-block" ref={layoutDropdownRef}>
      <button className={`${buttonClassName}${layoutOpen ? ' is-active' : ''}`} type="button" title="Select chart layout" onClick={() => setLayoutOpen((p) => !p)}>
        <LayoutIcon layout={layout} size={15} />
      </button>
      {layoutOpen && (
        <div className="absolute top-[calc(100%+4px)] left-0 z-[1000] bg-[var(--bg-card,#ffffff)] border border-[var(--border-light,#e2e8f0)] rounded-md shadow-lg p-2 flex flex-col gap-1.5 min-w-[140px]">
          <div className="text-xs font-semibold text-[var(--text-secondary,#64748b)] px-1">Select Layout</div>
          <div className="grid grid-cols-3 gap-1.5">
            {(layouts || DEFAULT_LAYOUTS).map((item) => (
              <button
                key={item.value}
                type="button"
                className={`flex flex-col items-center justify-center p-1.5 rounded text-[10px] text-[var(--text-secondary,#64748b)] hover:text-[var(--text-primary,#0f172a)] hover:bg-[var(--bg-secondary,#f1f5f9)] cursor-pointer transition-colors border ${
                  item.value === layout ? 'border-[var(--primary,#2563eb)] bg-[var(--bg-secondary,#f1f5f9)] text-[var(--primary,#2563eb)] font-semibold' : 'border-transparent'
                }`}
                onClick={() => { onLayoutChange?.(item.value); setLayoutOpen(false); }}
                title={item.label}
              >
                <LayoutIcon layout={item.value} size={20} />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function TradingChartHeader({
  title,
  timeframe,
  timeframes,
  onTimeframeChange,
  candle,
  quote,
  priceDigits,
  status = 'Autosaved',
  replayActive = false,
  replayDisabled = true,
  onReplay,
  onFullscreen,
  onToggleFullscreen,
  onSnapshot,
  isFullscreen = false,
  onSymbolSearch,
  activeSymbol,
  availableSymbols = [],
  onSelectSymbol,
}) {
  const symbolTitle = title || activeSymbol || 'EURUSD';
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeframeOpen, setTimeframeOpen] = useState(false);
  const [customTimeframes, setCustomTimeframes] = useState(() => {
    try {
      const stored = localStorage.getItem('entrack_custom_timeframes');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [customValue, setCustomValue] = useState('1');
  const [customUnit, setCustomUnit] = useState('minute');
  const [customError, setCustomError] = useState('');
  const dropdownRef = useRef(null);
  const timeframeRef = useRef(null);

  useEffect(() => {
    if (!searchOpen && !timeframeOpen) return undefined;
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setSearchOpen(false);
        setSearchQuery('');
      }
      if (timeframeRef.current && !timeframeRef.current.contains(e.target)) {
        setTimeframeOpen(false);
        setCustomError('');
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [searchOpen, timeframeOpen]);

  const handleAddCustomTimeframe = (e) => {
    e.preventDefault();
    const val = parseInt(customValue, 10);
    if (!Number.isFinite(val) || val <= 0) {
      setCustomError('Enter a positive number');
      return;
    }
    setCustomError('');
    const raw = `${val}${customUnit}`;
    if (!customTimeframes.includes(raw) && !(timeframes || []).includes(raw)) {
      const updated = [...customTimeframes, raw];
      setCustomTimeframes(updated);
      try { localStorage.setItem('entrack_custom_timeframes', JSON.stringify(updated)); } catch {}
    }
    onTimeframeChange(raw);
    setCustomValue('1');
    setTimeframeOpen(false);
  };

  const handleRemoveCustomTimeframe = (e, tfToRemove) => {
    e.stopPropagation();
    const updated = customTimeframes.filter((tf) => tf !== tfToRemove);
    setCustomTimeframes(updated);
    try { localStorage.setItem('entrack_custom_timeframes', JSON.stringify(updated)); } catch {}
  };

  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);
  const isServerSearch = debouncedSearchQuery.trim().length > 0;
  const { data: serverResults = [] } = useInstruments(debouncedSearchQuery, { limit: 50 });

  const filteredSymbols = useMemo(() => {
    if (!isServerSearch) return (availableSymbols || []).slice(0, 50);
    if (serverResults.length > 0) return serverResults.slice(0, 50);
    const q = searchQuery.toLowerCase();
    return (availableSymbols || []).filter((item) => {
      const sym = typeof item === 'string' ? item : (item?.symbol || '');
      return sym.toLowerCase().includes(q);
    }).slice(0, 50);
  }, [availableSymbols, isServerSearch, searchQuery, serverResults]);

  const activeShortLabel = useMemo(() => {
    for (const group of Object.values(TIMEFRAME_GROUPS)) {
      const item = group.find((i) => i.value === timeframe);
      if (item) return item.short;
    }
    return timeframe;
  }, [timeframe]);

  return (
    <div className="flex justify-between items-center h-[38px] min-h-[38px] gap-2 px-2.5 rounded-md bg-[var(--bg-card,#ffffff)] relative z-50 overflow-visible shrink-0">
      <div className="flex items-center gap-1 flex-nowrap relative z-50">
        <div className="relative inline-block" ref={dropdownRef}>
          <button
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-transparent hover:bg-[var(--bg-hover)] border-0 text-[var(--text-primary,#0f172a)] cursor-pointer text-[13px] transition-colors"
            type="button"
            onClick={() => { if (onSymbolSearch) onSymbolSearch(); else setSearchOpen((p) => !p); }}
            title="Symbol Search"
          >
            <Search size={14} />
            <strong className="text-[14px] font-bold text-[var(--text-primary,#0f172a)] m-0 tracking-[0.2px]">{symbolTitle}</strong>
          </button>

          {searchOpen && (
            <div className="absolute top-[calc(100%+4px)] left-0 z-[1000] w-[220px] bg-[var(--bg-card,#ffffff)] border border-[var(--border-light,#e2e8f0)] rounded-md shadow-lg p-1.5 flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 px-2 py-1 bg-[var(--surface-subtle)] border border-[var(--border-light,#e2e8f0)] rounded">
                <Search size={13} />
                <input
                  type="text"
                  className="border-none outline-none bg-transparent w-full text-xs text-[var(--text-primary,#1e293b)]"
                  placeholder="Search symbol..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="max-h-[200px] overflow-y-auto flex flex-col gap-0.5">
                {filteredSymbols.length > 0 ? (
                  filteredSymbols.map((item) => {
                    const sym = typeof item === 'string' ? item : (item?.symbol || '');
                    return (
                      <button
                        key={sym}
                        type="button"
                        className={`flex items-center px-2 py-1.5 rounded text-xs text-left cursor-pointer transition-colors text-[var(--text-primary,#0f172a)] hover:bg-[var(--bg-hover)] ${sym === symbolTitle ? 'bg-[var(--bg-hover)] font-semibold' : ''}`}
                        onClick={() => { onSelectSymbol?.(sym); setSearchOpen(false); setSearchQuery(''); }}
                      >
                        <span>{sym}</span>
                      </button>
                    );
                  })
                ) : (
                  <div style={{ padding: '8px', fontSize: '12px', color: '#64748b' }}>No symbols found</div>
                )}
              </div>
            </div>
          )}
        </div>

        <button className="inline-flex items-center justify-center w-7 h-7 rounded text-[var(--text-secondary,#64748b)] hover:text-[var(--text-primary,#0f172a)] hover:bg-[var(--bg-hover)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors border-0 bg-transparent" type="button" title="Compare or Add Symbol">
          <Plus size={15} />
        </button>
        <span className="w-px h-4 bg-[var(--border-light,#e2e8f0)] mx-0.5 shrink-0" />

        <div className="relative inline-block" ref={timeframeRef}>
          <button
            type="button"
            className="inline-flex items-center justify-center px-2 py-1 rounded bg-transparent hover:bg-[var(--bg-hover)] text-[var(--text-primary,#0f172a)] font-bold text-xs cursor-pointer transition-colors border-0"
            onClick={() => setTimeframeOpen((p) => !p)}
            title="Select timeframe"
          >
            <span className="uppercase">{activeShortLabel}</span>
          </button>

          {timeframeOpen && (
            <div className="absolute top-[calc(100%+4px)] left-0 z-[1000] min-w-[160px] bg-[var(--bg-card,#ffffff)] border border-[var(--border-light,#e2e8f0)] rounded-md shadow-lg p-1 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100 max-h-[360px] overflow-y-auto">
              {Object.entries(TIMEFRAME_GROUPS).map(([category, items], idx) => (
                <div key={category} className="flex flex-col">
                  {idx > 0 && <div className="h-px bg-[var(--border-light,#e2e8f0)] my-1" />}
                  <div className="px-2.5 py-0.5 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">{category}</div>
                  {items.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      className={`flex items-center justify-between gap-3 px-2.5 py-1.5 rounded text-xs text-left cursor-pointer transition-colors border-0 ${
                        item.value === timeframe ? 'bg-[var(--bg-hover)] text-[var(--text-primary,#0f172a)] font-bold' : 'bg-transparent text-[var(--text-secondary,#64748b)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary,#0f172a)]'
                      }`}
                      onClick={() => { onTimeframeChange(item.value); setTimeframeOpen(false); }}
                    >
                      <span>{item.label}</span>
                      <span className="text-[10px] text-[var(--text-muted)] uppercase font-mono">{item.short}</span>
                    </button>
                  ))}
                </div>
              ))}
              {customTimeframes.length > 0 && (
                <>
                  <div className="h-px bg-[var(--border-light,#e2e8f0)] my-1" />
                  <div className="px-2 py-0.5 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Custom</div>
                  {customTimeframes.map((tf) => (
                    <div
                      key={tf}
                      className={`flex items-center justify-between gap-2 px-2.5 py-1 rounded text-xs cursor-pointer transition-colors ${
                        tf === timeframe ? 'bg-[var(--bg-hover)] text-[var(--text-primary,#0f172a)] font-bold' : 'text-[var(--text-secondary,#64748b)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary,#0f172a)]'
                      }`}
                      onClick={() => { onTimeframeChange(tf); setTimeframeOpen(false); }}
                    >
                      <span className="truncate">{formatTimeframeLabel(tf)}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] text-[var(--text-muted)] uppercase font-mono">
                          {tf.replace('minute', 'm').replace('hour', 'h').replace('day', 'd').replace('week', 'w').replace('month', 'M')}
                        </span>
                        <button
                          type="button"
                          className="w-4 h-4 rounded inline-flex items-center justify-center hover:bg-[var(--border-light,#e2e8f0)] text-[var(--text-muted)] hover:text-[var(--loss-color,#ef4444)] border-0 bg-transparent p-0 cursor-pointer"
                          onClick={(e) => handleRemoveCustomTimeframe(e, tf)}
                          title="Remove custom timeframe"
                        >
                          <X size={11} />
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}
              <div className="h-px bg-[var(--border-light,#e2e8f0)] my-1" />
              <form onSubmit={handleAddCustomTimeframe} className="p-1.5 flex flex-col gap-1.5">
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="1"
                    max="999"
                    value={customValue}
                    onChange={(e) => { setCustomValue(e.target.value); if (customError) setCustomError(''); }}
                    className="w-14 px-2 py-1 text-xs rounded border border-[var(--border-light,#e2e8f0)] bg-transparent text-[var(--text-primary,#0f172a)] focus:outline-none focus:border-[var(--primary,#2563eb)]"
                    placeholder="1"
                    aria-label="Custom timeframe value"
                  />
                  <div className="flex-1 min-w-[90px]">
                    <DropdownSelect
                      value={customUnit}
                      onChange={(e) => setCustomUnit(e.target.value)}
                      options={[
                        { value: 'minute', label: 'Minutes' },
                        { value: 'hour', label: 'Hours' },
                        { value: 'day', label: 'Days' },
                        { value: 'week', label: 'Weeks' },
                        { value: 'month', label: 'Months' },
                      ]}
                      size="sm"
                      ariaLabel="Custom timeframe unit"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-2 py-1 text-xs font-semibold rounded bg-[var(--primary,#2563eb)] text-white hover:opacity-90 border-0 cursor-pointer shrink-0"
                    title="Add custom timeframe"
                  >
                    Add
                  </button>
                </div>
                {customError && (
                  <span className="text-[10px] text-[var(--loss-color,#ef4444)] leading-tight px-0.5">{customError}</span>
                )}
              </form>
            </div>
          )}
        </div>

        <span className="w-px h-4 bg-[var(--border-light,#e2e8f0)] mx-0.5 shrink-0" />
        <button className="inline-flex items-center justify-center w-7 h-7 rounded text-[var(--text-secondary,#64748b)] hover:text-[var(--text-primary,#0f172a)] hover:bg-[var(--bg-hover)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors border-0 bg-transparent" type="button" title="Chart type (Candles)">
          <ChartCandlestick size={15} />
        </button>
        <button className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium text-[var(--text-secondary,#64748b)] hover:text-[var(--text-primary,#0f172a)] hover:bg-[var(--bg-hover)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors border-0 bg-transparent" type="button" disabled title="Indicators are coming soon">
          <ChartLine size={14} />
          <span>Indicators</span>
        </button>
        <span className="w-px h-4 bg-[var(--border-light,#e2e8f0)] mx-0.5 shrink-0" />
        <button className="inline-flex items-center justify-center w-7 h-7 rounded text-[var(--text-secondary,#64748b)] hover:text-[var(--text-primary,#0f172a)] hover:bg-[var(--bg-hover)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors border-0 bg-transparent" type="button" disabled title="Undo">
          <RotateCcw size={14} />
        </button>
        <button className="inline-flex items-center justify-center w-7 h-7 rounded text-[var(--text-secondary,#64748b)] hover:text-[var(--text-primary,#0f172a)] hover:bg-[var(--bg-hover)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors border-0 bg-transparent" type="button" disabled title="Redo">
          <RotateCw size={14} />
        </button>

        {onReplay && (
          <button
            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium cursor-pointer transition-colors border-0 ${
              replayActive ? 'bg-[var(--primary,#2563eb)] text-white hover:bg-[var(--primary-dark,#1d4ed8)]' : 'text-[var(--text-secondary,#64748b)] hover:text-[var(--text-primary,#0f172a)] hover:bg-[var(--bg-hover)] bg-transparent'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
            type="button"
            onClick={onReplay}
            disabled={replayDisabled}
            title="Replay"
          >
            <Play size={14} /> {replayActive ? 'Exit replay' : 'Replay'}
          </button>
        )}
      </div>

      <div className="flex items-center gap-1 flex-nowrap relative z-50">
        <button className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium text-[var(--text-secondary,#64748b)] hover:text-[var(--text-primary,#0f172a)] hover:bg-[var(--bg-hover)] cursor-pointer transition-colors border-0 bg-transparent" type="button" title={`Status: ${status}`}>
          <CloudUpload size={14} />
          <span>Save</span>
          <ChevronDown size={11} />
        </button>
        <span className="w-px h-4 bg-[var(--border-light,#e2e8f0)] mx-0.5 shrink-0" />
        <button className="inline-flex items-center justify-center w-7 h-7 rounded text-[var(--text-secondary,#64748b)] hover:text-[var(--text-primary,#0f172a)] hover:bg-[var(--bg-hover)] cursor-pointer transition-colors border-0 bg-transparent" type="button" title="Chart settings">
          <Settings size={14} />
        </button>
        <button
          className="inline-flex items-center justify-center w-7 h-7 rounded text-[var(--text-secondary,#64748b)] hover:text-[var(--text-primary,#0f172a)] hover:bg-[var(--bg-hover)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors border-0 bg-transparent"
          type="button"
          onClick={onFullscreen || onToggleFullscreen}
          disabled={!onFullscreen && !onToggleFullscreen}
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        >
          <Maximize2 size={14} />
        </button>
        <button
          className="inline-flex items-center justify-center w-7 h-7 rounded text-[var(--text-secondary,#64748b)] hover:text-[var(--text-primary,#0f172a)] hover:bg-[var(--bg-hover)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors border-0 bg-transparent"
          type="button"
          onClick={onSnapshot}
          disabled={!onSnapshot}
          title="Save chart image"
        >
          <Camera size={15} />
        </button>
      </div>
    </div>
  );
}

export function TradingChartLegend({ symbolTitle, timeframe, candle, quote, priceDigits, className = '' }) {
  const digits = Number.isInteger(Number(priceDigits)) ? Math.min(Math.max(Number(priceDigits), 0), 8) : null;
  const openPrice = Number(candle?.open ?? (quote?.open != null ? quote.open : quote?.last) ?? 0);
  const highPrice = Number(candle?.high ?? (quote?.high != null ? quote.high : quote?.last) ?? 0);
  const lowPrice = Number(candle?.low ?? (quote?.low != null ? quote.low : quote?.last) ?? 0);
  const closePrice = Number(candle?.close ?? (quote?.last != null ? quote.last : quote?.bid) ?? 0);
  const changeVal = closePrice && openPrice ? closePrice - openPrice : 0;
  const changePct = openPrice ? (changeVal / openPrice) * 100 : 0;
  const isPositive = changeVal >= 0;
  const valueColor = isPositive ? 'text-[var(--bull-candle,#089981)]' : 'text-[var(--bear-candle,#f23645)]';
  const tfBadge = useMemo(() => {
    const raw = String(timeframe || '').trim().toLowerCase();
    if (raw.includes('month')) return 'M';
    if (raw.includes('week')) return 'W';
    if (raw.includes('day')) return 'D';
    if (raw.includes('hour')) return `${raw.replace(/\D/g, '')}H`;
    if (raw.includes('minute')) return `${raw.replace(/\D/g, '')}m`;
    return raw.toUpperCase();
  }, [timeframe]);

  return (
    <div className={`absolute top-2 left-2.5 z-10 flex items-center gap-2 text-[11px] text-[var(--text-secondary,#64748b)] pointer-events-none select-none overflow-x-auto whitespace-nowrap scrollbar-none max-w-[calc(100%-16px)] ${className}`}>
      <span className="font-semibold text-[var(--text-primary,#0f172a)]">{symbolTitle} · {timeframe} · Cboe One</span>
      <span className="inline-block text-[9px] px-1 py-0.2 rounded bg-[var(--bg-secondary,#f1f5f9)] text-[var(--text-secondary,#64748b)] font-semibold">{tfBadge}</span>
      <span className="flex items-center gap-0.5">O<span className={`font-mono tabular-nums font-medium ${valueColor}`}>{openPrice ? formatPrice(openPrice, digits) : '--'}</span></span>
      <span className="flex items-center gap-0.5">H<span className={`font-mono tabular-nums font-medium ${valueColor}`}>{highPrice ? formatPrice(highPrice, digits) : '--'}</span></span>
      <span className="flex items-center gap-0.5">L<span className={`font-mono tabular-nums font-medium ${valueColor}`}>{lowPrice ? formatPrice(lowPrice, digits) : '--'}</span></span>
      <span className="flex items-center gap-0.5">C<span className={`font-mono tabular-nums font-medium ${valueColor}`}>{closePrice ? formatPrice(closePrice, digits) : '--'}</span></span>
      {closePrice && openPrice ? (
        <span className={`font-mono tabular-nums font-medium ${valueColor}`}>
          {isPositive ? '+' : ''}{formatPrice(changeVal, digits)} ({isPositive ? '+' : ''}{changePct.toFixed(2)}%)
        </span>
      ) : null}
      {candle?.volume ? (
        <span className="text-[var(--text-muted,#64748b)] ml-1 text-[10.5px]">Vol <span className={`font-mono tabular-nums font-medium ${valueColor}`}>{Number(candle.volume).toLocaleString()}</span></span>
      ) : null}
    </div>
  );
}

const RANGE_PRESETS = ['5y', '1y', '3m', '1m', '5d', '1d'];

export function TradingChartFooter({
  timeframe,
  onTimeframeChange,
  onFit,
  onGoToTrade,
  chartApi,
  onCalendarClick,
  onSettingsClick,
}) {
  const [clock, setClock] = useState(() => new Date());
  const [isPercent, setIsPercent] = useState(false);
  const [isLog, setIsLog] = useState(false);
  const [isAuto, setIsAuto] = useState(true);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const getTimeString = () => {
    const timeStr = clock.toLocaleTimeString([], { hour12: false });
    const offsetMin = -clock.getTimezoneOffset();
    const sign = offsetMin >= 0 ? '+' : '-';
    const absMin = Math.abs(offsetMin);
    const hours = Math.floor(absMin / 60);
    const mins = absMin % 60;
    const tzStr = mins === 0 ? `UTC${sign}${hours}` : `UTC${sign}${hours}:${mins < 10 ? '0' : ''}${mins}`;
    return `${timeStr} (${tzStr})`;
  };

  const handlePercentToggle = () => {
    const next = !isPercent;
    setIsPercent(next);
    if (next) setIsLog(false);
    try { chartApi?.priceScale('right')?.applyOptions({ mode: next ? 2 : 0 }); } catch {}
  };

  const handleLogToggle = () => {
    const next = !isLog;
    setIsLog(next);
    if (next) setIsPercent(false);
    try { chartApi?.priceScale('right')?.applyOptions({ mode: next ? 1 : 0 }); } catch {}
  };

  const handleAutoToggle = () => {
    const next = !isAuto;
    setIsAuto(next);
    try { chartApi?.priceScale('right')?.applyOptions({ autoScale: next }); } catch {}
  };

  return (
    <div className="flex justify-between items-center min-h-[30px] px-2 py-0.5 border-t border-[var(--border-light,#e2e8f0)] bg-[var(--bg-card,#ffffff)] text-xs text-[var(--text-secondary,#64748b)] select-none">
      <div className="flex items-center gap-1">
        {RANGE_PRESETS.map((item) => (
          <button
            key={item}
            type="button"
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium cursor-pointer transition-colors border-0 ${
              timeframe === item ? 'bg-[var(--bg-secondary,#e2e8f0)] text-[var(--text-primary,#0f172a)] font-bold' : 'text-[var(--text-secondary,#64748b)] hover:text-[var(--text-primary,#0f172a)] hover:bg-[var(--bg-secondary,#f1f5f9)] bg-transparent'
            }`}
            onClick={() => onTimeframeChange?.(item)}
            title={`Range: ${item}`}
          >
            {item}
          </button>
        ))}
        <button
          type="button"
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium text-[var(--text-secondary,#64748b)] hover:text-[var(--text-primary,#0f172a)] hover:bg-[var(--bg-secondary,#f1f5f9)] cursor-pointer transition-colors border-0 bg-transparent"
          onClick={onCalendarClick}
          title="Go to date"
        >
          <Calendar size={13} />
        </button>
        {(onFit || onGoToTrade) && <span className="w-[1px] h-[14px] bg-[var(--border-light,#e2e8f0)] mx-1 shrink-0" />}
        {onFit && (
          <button
            type="button"
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium text-[var(--text-secondary,#64748b)] hover:text-[var(--text-primary,#0f172a)] hover:bg-[var(--bg-secondary,#f1f5f9)] cursor-pointer transition-colors border-0 bg-transparent"
            onClick={onFit}
            title="Fit content"
          >
            <RefreshCw size={12} /> Fit
          </button>
        )}
        {onGoToTrade && (
          <button
            type="button"
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium text-[var(--text-secondary,#64748b)] hover:text-[var(--text-primary,#0f172a)] hover:bg-[var(--bg-secondary,#f1f5f9)] cursor-pointer transition-colors border-0 bg-transparent"
            onClick={onGoToTrade}
            title="Go to trade"
          >
            Go to trade
          </button>
        )}
      </div>

      <div className="flex items-center gap-1">
        <span className="text-[11px] text-[var(--text-secondary,#64748b)] px-1.5" title="Time & Timezone">
          {getTimeString()}
        </span>
        <button
          type="button"
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium cursor-pointer transition-colors border-0 ${
            isPercent ? 'bg-[var(--bg-secondary,#e2e8f0)] text-[var(--text-primary,#0f172a)] font-bold' : 'text-[var(--text-secondary,#64748b)] hover:text-[var(--text-primary,#0f172a)] hover:bg-[var(--bg-secondary,#f1f5f9)] bg-transparent'
          }`}
          onClick={handlePercentToggle}
          title="Toggle percent scale mode"
        >
          %
        </button>
        <button
          type="button"
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium cursor-pointer transition-colors border-0 ${
            isLog ? 'bg-[var(--bg-secondary,#e2e8f0)] text-[var(--text-primary,#0f172a)] font-bold' : 'text-[var(--text-secondary,#64748b)] hover:text-[var(--text-primary,#0f172a)] hover:bg-[var(--bg-secondary,#f1f5f9)] bg-transparent'
          }`}
          onClick={handleLogToggle}
          title="Toggle logarithmic scale mode"
        >
          log
        </button>
        <button
          type="button"
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium cursor-pointer transition-colors border-0 ${
            isAuto ? 'bg-[var(--bg-secondary,#e2e8f0)] text-[var(--text-primary,#0f172a)] font-bold' : 'text-[var(--text-secondary,#64748b)] hover:text-[var(--text-primary,#0f172a)] hover:bg-[var(--bg-secondary,#f1f5f9)] bg-transparent'
          }`}
          onClick={handleAutoToggle}
          title="Toggle auto scale"
        >
          auto
        </button>
        {onSettingsClick && (
          <button
            type="button"
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium text-[var(--text-secondary,#64748b)] hover:text-[var(--text-primary,#0f172a)] hover:bg-[var(--bg-secondary,#f1f5f9)] cursor-pointer transition-colors border-0 bg-transparent"
            onClick={onSettingsClick}
            title="Chart settings"
          >
            <Settings size={13} />
          </button>
        )}
      </div>
    </div>
  );
}
