import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import MainContentWrapper from '@/components/Layout/MainContentWrapper';
import PageHeader from '@/components/Layout/PageHeader';
import {
  Calendar, CalendarDays, ChartLine, ChevronRight,
  EllipsisVertical, PanelRightOpen, TrendingDown, TrendingUp, X
} from '@/icons/lucideIcons';
import SymbolWithIcon from '@/components/Common/SymbolWithIcon/SymbolWithIcon';
import { CustomTimePicker } from '@/components/ui';
import BacktestChart from './components/BacktestChart';
import BacktestBottomPanel from './components/BacktestBottomPanel';
import BacktestOrderPanel from './components/BacktestOrderPanel';
import './BacktestingPage.css';
import StatsCards from '@/features/analytics/components/Widgets/StatsCards';
import PerformanceChart from '@/features/analytics/components/Widgets/PerformanceChart';
import ActivityChart from '@/features/analytics/components/Widgets/ActivityChart';
import Radar from '@/features/analytics/components/Widgets/Radar';
import { useAppDialog } from '@/context/AppDialogContext';
import { useBacktestSession } from './hooks/useBacktestSession';
import { filterInstruments, isAllowedInstrumentSymbol, useInstruments } from '@/hooks/useInstruments';
import backtestingExtraSymbols from './data/backtesting.json';
import { Calendar as UntitledCalendar } from '@/components/ui/date-picker/calendar';
import { jsDateToCalendarDate, calendarDateToJsDate } from '@/utils/common/dateConversions';

const BACKTEST_SESSIONS_KEY = 'entrack:backtest_sessions:v1';
const BACKTEST_SESSION_FORM_ID = 'backtest-session-form';
const MAX_SAVED_SESSIONS = 30;
const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

const toDateTimeLocalValue = (d) => {
  const pad = (v) => String(v).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const formatDateTime = (v) => (v ? new Date(v).toLocaleString() : '-');

function formatCompactSessionRange(startValue, endValue) {
  if (!startValue || !endValue) return '-';
  const start = new Date(startValue);
  const end = new Date(endValue);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '-';
  const df = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const sdf = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' });
  const tf = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  return start.toDateString() === end.toDateString()
    ? `${df.format(start)}, ${tf.format(start)}-${tf.format(end)}`
    : `${sdf.format(start)} ${tf.format(start)} - ${sdf.format(end)} ${tf.format(end)}`;
}

const parseDateTimeLocalValue = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

const formatPickerDate = (value, fallback = 'Select date') => {
  const d = parseDateTimeLocalValue(value);
  return d ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(d) : fallback;
};

const getPickerTime = (v) => {
  const d = parseDateTimeLocalValue(v);
  return d ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : '00:00';
};

const mergeDateTime = (value, nextDate, nextTime = getPickerTime(value)) => {
  const base = nextDate || parseDateTimeLocalValue(value) || new Date();
  const [h = '0', m = '0'] = String(nextTime || '00:00').split(':');
  const merged = new Date(base);
  merged.setHours(Number(h), Number(m), 0, 0);
  return toDateTimeLocalValue(merged);
};

function BacktestDateTimeField({ label, value, onChange }) {
  const [open, setOpen] = useState(false);
  const selectedDate = parseDateTimeLocalValue(value);
  const [focusedCalDate, setFocusedCalDate] = useState(() => jsDateToCalendarDate(selectedDate || new Date()));
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (e) => {
      if (!wrapperRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  return (
    <div className="backtest-datetime-field relative min-w-0 min-h-[42px] px-2.5 py-[5px] flex flex-col justify-center gap-[5px] border border-[var(--border-light)] rounded-[8px] bg-[var(--bg-card)] transition-[border-color,box-shadow] duration-200 focus-within:border-[var(--primary)]" ref={wrapperRef}>
      <div className={`backtest-datetime-field__controls grid items-center gap-2 ${selectedDate ? 'grid-cols-[minmax(0,1fr)_72px]' : 'is-empty grid-cols-[minmax(0,1fr)]'}`}>
        <button
          type="button"
          className="backtest-date-trigger min-w-0 h-5 p-0 border-0 inline-flex items-center gap-1.5 bg-transparent text-[var(--accent-ink)] cursor-pointer text-left"
          onClick={() => { setFocusedCalDate(jsDateToCalendarDate(selectedDate || new Date())); setOpen((c) => !c); }}
          aria-label={label}
        >
          <Calendar size={14} aria-hidden="true" />
          <strong className={`min-w-0 overflow-hidden text-[12px] leading-[1.2] text-ellipsis whitespace-nowrap ${selectedDate ? 'text-[var(--accent-ink)] font-[550]' : 'text-[var(--text-secondary)] font-semibold'}`}>{formatPickerDate(value, label)}</strong>
        </button>
        {selectedDate && (
          <CustomTimePicker
            className="backtest-time-input w-[72px] [&_.custom-time-picker\_\_trigger]:w-[72px] [&_.custom-time-picker\_\_trigger]:h-[22px] [&_.custom-time-picker\_\_trigger]:min-h-[22px] [&_.custom-time-picker\_\_trigger]:px-1 [&_.custom-time-picker\_\_trigger]:py-0 [&_.custom-time-picker\_\_trigger]:border [&_.custom-time-picker\_\_trigger]:border-[color-mix(in_srgb,var(--border-light)_72%,transparent)] [&_.custom-time-picker\_\_trigger]:rounded-[6px] [&_.custom-time-picker\_\_trigger]:text-[var(--accent-ink)] [&_.custom-time-picker\_\_trigger]:text-[11px] [&_.custom-time-picker\_\_trigger]:font-[550] [&_.custom-time-picker\_\_trigger]:shadow-none [&_.custom-time-picker\_\_trigger_svg]:hidden [&_.custom-time-picker\_\_popover]:w-[220px] [&_.custom-time-picker\_\_popover]:z-[140]"
            value={getPickerTime(value)}
            onChange={(nextTime) => onChange(mergeDateTime(value, selectedDate, nextTime))}
            ariaLabel={`${label} time`}
          />
        )}
      </div>
      {open && (
        <div className="backtest-date-popover absolute left-0 top-[calc(100%+8px)] z-[120] w-[326px] max-w-[calc(100vw-32px)] p-2.5 border border-[var(--border-light)] rounded-[12px] bg-[var(--bg-card)] shadow-[0_24px_58px_-34px_rgba(15,23,42,0.48)]">
          <UntitledCalendar
            value={jsDateToCalendarDate(selectedDate)}
            onChange={(calDate) => {
              if (!calDate) return;
              onChange(mergeDateTime(value, calendarDateToJsDate(calDate)));
              setOpen(false);
            }}
            focusedValue={focusedCalDate}
            onFocusChange={setFocusedCalDate}
          ><span /></UntitledCalendar>
        </div>
      )}
    </div>
  );
}

function BacktestSymbolField({ value, onChange, instruments, isLoading }) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const wrapperRef = useRef(null);
  const normalizedValue = String(value || '').toUpperCase();
  const filteredSymbols = useMemo(() => filterInstruments(instruments, open ? searchQuery : normalizedValue, 8), [instruments, normalizedValue, open, searchQuery]);

  useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (e) => {
      if (!wrapperRef.current?.contains(e.target)) { setOpen(false); setSearchQuery(''); }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  return (
    <div className="backtest-symbol-field relative min-w-0 min-h-[42px] px-2.5 py-[5px] flex flex-col justify-center gap-[5px] border border-[var(--border-light)] rounded-[8px] bg-[var(--bg-card)] transition-[border-color,box-shadow,background] duration-200" ref={wrapperRef}>
      <div className="backtest-symbol-field__input-row w-full min-w-0 h-[22px] p-0 flex items-center justify-between gap-2">
        <span className="backtest-symbol-field__main flex-1 min-w-0 inline-flex items-center gap-2">
          {normalizedValue && <SymbolWithIcon symbol={normalizedValue} size="md" showLabel={false} />}
          <input
            className="w-full min-w-0 h-[22px] p-0 !border-0 !outline-none !shadow-none bg-transparent text-[var(--accent-ink)] text-[12px] font-bold tracking-[0.04em] uppercase placeholder:text-[var(--text-secondary)] placeholder:font-semibold"
            value={open ? searchQuery : normalizedValue}
            onFocus={() => { setSearchQuery(''); setOpen(true); }}
            onChange={(e) => {
              const q = e.target.value.toUpperCase();
              setSearchQuery(q);
              if (normalizedValue && q !== normalizedValue) onChange('');
              setOpen(true);
            }}
            placeholder="Search allowed symbols"
            aria-expanded={open}
            aria-controls="backtest-symbol-menu"
            autoComplete="off"
          />
        </span>
        <button
          type="button"
          className="backtest-symbol-field__toggle shrink-0 w-[22px] h-[22px] p-0 border-0 inline-flex items-center justify-center bg-transparent text-[var(--accent-ink)] cursor-pointer [&>svg]:text-[var(--text-secondary)] [&>svg]:rotate-90"
          onClick={() => setOpen((c) => !c)}
          aria-label="Toggle symbol list"
        >
          <ChevronRight size={15} aria-hidden="true" />
        </button>
      </div>

      {open && (
        <div className="backtest-symbol-menu absolute top-[calc(100%+7px)] left-0 z-[130] w-full max-h-[280px] p-1.5 grid gap-1 overflow-y-auto border border-[var(--border-light)] rounded-[10px] bg-[var(--bg-card)] shadow-[0_22px_54px_-32px_rgba(15,23,42,0.48)]" id="backtest-symbol-menu">
          {isLoading ? (
            <div className="backtest-symbol-menu__empty min-h-[34px] px-2 py-[9px] flex items-center text-[var(--accent-danger)] text-[11px] font-[650]">Loading symbols...</div>
          ) : filteredSymbols.length ? (
            filteredSymbols.map((inst) => (
              <button
                key={inst.symbol}
                type="button"
                className={`min-w-0 min-h-[34px] px-2 py-[7px] border-0 rounded-[8px] flex items-center justify-between gap-2.5 bg-transparent text-[var(--text-secondary)] text-[11px] font-[550] cursor-pointer hover:bg-[color-mix(in_srgb,var(--primary)_3%,var(--bg-card))] hover:text-[var(--heading)] ${normalizedValue === inst.symbol ? 'is-selected bg-[color-mix(in_srgb,var(--primary)_3%,var(--bg-card))] text-[var(--heading)] font-semibold' : ''}`}
                onClick={() => { onChange(inst.symbol); setSearchQuery(''); setOpen(false); }}
              >
                <span className="backtest-symbol-menu__asset min-w-0 inline-flex items-center gap-2">
                  <SymbolWithIcon symbol={inst.symbol} size="md" />
                  <span>{inst.name}</span>
                </span>
                <span className="backtest-symbol-menu__type shrink-0 min-w-[52px] px-[7px] py-[3px] rounded-full bg-[color-mix(in_srgb,var(--surface-subtle)_84%,white_16%)] text-[var(--text-muted)] text-[9px] font-extrabold tracking-[0.06em] text-center">
                  {String(inst.type || '').trim().toUpperCase() || 'TYPE'}
                </span>
              </button>
            ))
          ) : (
            <div className="backtest-symbol-menu__empty min-h-[34px] px-2 py-[9px] flex items-center text-[var(--accent-danger)] text-[11px] font-[650]">Symbol not available</div>
          )}
        </div>
      )}
    </div>
  );
}

const readSavedSessions = () => {
  try {
    const p = JSON.parse(localStorage.getItem(BACKTEST_SESSIONS_KEY) || '[]');
    return Array.isArray(p) ? p : [];
  } catch {
    localStorage.removeItem(BACKTEST_SESSIONS_KEY);
    return [];
  }
};

const writeSavedSessions = (sessions) => localStorage.setItem(BACKTEST_SESSIONS_KEY, JSON.stringify(sessions.slice(0, MAX_SAVED_SESSIONS)));

const buildSavedSession = (state, stats, currentCandle, prev) => ({
  ...prev,
  id: state.sessionId,
  sessionId: state.sessionId,
  sessionName: state.sessionName,
  symbol: state.symbol,
  timeframe: state.timeframe,
  startTime: state.sessionStartTime,
  endTime: state.sessionEndTime,
  initialBalance: state.initialBalance,
  balance: state.balance,
  currentIndex: state.currentIndex,
  currentTime: currentCandle?.time != null ? currentCandle.time : (prev?.currentTime != null ? prev.currentTime : 0),
  selectedOrderSide: state.selectedOrderSide,
  orderType: state.orderType,
  entryPrice: state.entryPrice,
  stopLoss: state.stopLoss,
  takeProfit: state.takeProfit,
  riskPercent: state.riskPercent,
  riskAmount: state.riskAmount,
  positionSize: state.positionSize,
  openPositions: state.openPositions,
  closedPositions: state.closedPositions,
  orders: state.orders,
  journalDrafts: state.journalDrafts,
  stats,
  createdAt: prev?.createdAt || new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

function SessionMetric({ label, value, tone = '', icon: Icon }) {
  return (
    <div className="backtest-session-metric min-w-0 px-3.5 py-0 border-0 border-r border-[var(--border-light)] bg-transparent max-md:p-0 max-md:border-r-0">
      <span className="flex items-center gap-1.5 text-[var(--text-secondary)] text-[10px] font-[550] leading-[1.1] tracking-[0.025em] uppercase">{Icon && <Icon size={14} aria-hidden="true" />}{label}</span>
      <strong className={`block mt-1 text-[var(--heading)] text-[12px] font-[680] leading-[1.15] overflow-hidden text-ellipsis whitespace-nowrap ${tone === 'is-profit' ? 'is-profit !text-[var(--profit-color)]' : tone === 'is-negative' ? 'is-negative !text-[var(--accent-danger)]' : tone}`}>{value}</strong>
    </div>
  );
}

function SavedSessionCard({ session, isActive, onOpen, onRename, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const actionsRef = useRef(null);
  const menuPopoverRef = useRef(null);
  const stats = session.stats || {};
  const pnl = Number(stats.realizedPnL || 0);
  const winRate = Number(stats.winRate || 0);
  const balance = Number(stats.currentBalance || session.balance || 0);
  const TrendIcon = pnl < 0 ? TrendingDown : TrendingUp;

  useEffect(() => {
    if (!menuOpen) return undefined;
    const handlePointerDown = (e) => {
      if (!actionsRef.current?.contains(e.target) && !menuPopoverRef.current?.contains(e.target)) setMenuOpen(false);
    };
    const handleKeyDown = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
    const close = () => setMenuOpen(false);
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [menuOpen]);

  return (
    <article className={`backtest-saved-session h-fit relative w-full min-w-0 min-h-[104px] p-0 border border-[var(--border-light)] rounded-[8px] bg-[var(--bg-card)] text-[var(--text-primary)] transition-[border-color,box-shadow,transform] duration-200 hover:border-[color-mix(in_srgb,var(--primary)_34%,var(--border-light))] hover:-translate-y-[1px] ${isActive ? 'is-active border-[color-mix(in_srgb,var(--primary)_34%,var(--border-light))] bg-[color-mix(in_srgb,var(--primary)_3%,var(--bg-card))] -translate-y-[1px]' : ''}`}>
      <button className="backtest-saved-session__main w-full min-w-0 min-h-[102px] pt-3.5 pb-3.5 pl-3.5 pr-[62px] grid grid-cols-[42px_minmax(210px,1fr)_minmax(320px,0.9fr)] max-[1100px]:grid-cols-[48px_minmax(210px,1fr)_minmax(300px,1fr)] max-md:grid-cols-[42px_minmax(0,1fr)_34px] max-sm:grid-cols-[40px_minmax(0,1fr)] max-sm:pr-14 items-center gap-4 max-md:gap-3 border-0 rounded-[8px] bg-transparent text-[var(--text-primary)] text-left cursor-pointer" type="button" onClick={() => onOpen(session)}>
        <span className={`backtest-saved-session__icon w-[38px] h-[38px] inline-flex items-center justify-center rounded-[9px] ${pnl < 0 ? 'is-loss bg-[color-mix(in_srgb,var(--accent-danger)_10%,var(--bg-card))] text-[var(--accent-danger)]' : 'bg-[color-mix(in_srgb,var(--profit-color)_11%,var(--bg-card))] text-[var(--profit-color)]'}`}>
          <TrendIcon size={20} aria-hidden="true" />
        </span>
        <div className="backtest-saved-session__top flex items-start justify-between gap-3 min-w-0">
          <div>
            <strong className="backtest-saved-session__title !flex items-center gap-1.5 !mt-0 min-w-0 text-[var(--heading)] text-[13px] font-[680] leading-[1.2]">
              <span className="truncate">{session.sessionName}</span>
              <em className="text-[var(--text-secondary)] not-italic">:</em>
              <span className="backtest-session-instrument inline-flex items-center gap-[5px] text-[var(--text-secondary)] text-[10px] uppercase">
                <strong className="px-2 py-0.5 rounded-full bg-[color-mix(in_srgb,#7c3aed_16%,var(--bg-card))] dark:bg-[rgba(124,58,237,0.24)] text-[#c4b5fd] text-[11px] font-bold">
                  <SymbolWithIcon symbol={session.symbol} size="md" />
                </strong>
              </span>
            </strong>
            <small className="mt-1.5 flex items-center gap-[5px] text-[var(--text-secondary)] text-[11px] font-medium leading-[1.25]">
              <CalendarDays size={13} aria-hidden="true" />
              {formatCompactSessionRange(session.startTime, session.endTime)}
            </small>
          </div>
        </div>
        <div className="backtest-session-metrics grid grid-cols-3 max-md:grid-cols-1 gap-0 max-md:gap-2.5 mt-0 border-l border-[var(--border-light)] max-md:border-l-0 max-md:border-t max-md:pt-3 max-md:col-span-full">
          <SessionMetric label="P&L" value={currency.format(pnl)} tone={pnl >= 0 ? 'is-profit' : 'is-negative'} />
          <SessionMetric label="Balance" value={currency.format(balance)} />
          <SessionMetric label="Win rate" value={`${winRate.toFixed(1)}%`} />
        </div>
      </button>

      <div className="backtest-saved-session__actions absolute top-1/2 right-3.5 z-[3] -translate-y-1/2" ref={actionsRef}>
        <button
          className="backtest-saved-session__menu w-8 h-8 inline-flex items-center justify-center border border-[var(--border-light)] rounded-[8px] text-[var(--text-muted)] bg-[var(--bg-card)] cursor-pointer hover:bg-[var(--bg-hover)] hover:text-[var(--heading)]"
          type="button"
          aria-label={`Session actions for ${session.sessionName}`}
          aria-expanded={menuOpen}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setMenuPosition({
              top: rect.bottom + 82 > window.innerHeight ? Math.max(12, rect.top - 90) : rect.bottom + 8,
              left: Math.min(window.innerWidth - 168, Math.max(12, rect.right - 156)),
            });
            setMenuOpen((c) => !c);
          }}
        >
          <EllipsisVertical size={18} aria-hidden="true" />
        </button>
        {menuOpen && createPortal(
          <div
            ref={menuPopoverRef}
            className="backtest-saved-session__menu-popover fixed z-[700] min-w-[156px] p-1.5 grid gap-1 border border-[var(--border-light)] rounded-[8px] bg-[var(--bg-card)] shadow-[0_20px_44px_-28px_rgba(15,23,42,0.5)] [&>button]:min-h-[32px] [&>button]:px-2.5 [&>button]:border-0 [&>button]:rounded-[7px] [&>button]:bg-transparent [&>button]:text-[var(--text-secondary)] [&>button]:text-[12px] [&>button]:font-bold [&>button]:text-left [&>button]:cursor-pointer hover:[&>button]:bg-[var(--bg-hover)] hover:[&>button]:text-[var(--heading)] [&>button.is-danger]:text-[var(--accent-danger)]"
            style={{ top: menuPosition.top, left: menuPosition.left }}
          >
            <button type="button" onClick={() => { setMenuOpen(false); onRename(session); }}>Rename session</button>
            <button type="button" className="is-danger" onClick={() => { setMenuOpen(false); onDelete(session); }}>Delete session</button>
          </div>,
          document.body
        )}
      </div>
    </article>
  );
}

const mapSessionTrades = (session) => (session.closedPositions || []).map((trade) => ({
  ...trade,
  pnl: Number(trade.pnl ?? 0),
  timestamp: trade.exitIso != null ? trade.exitIso : (trade.entryIso != null ? trade.entryIso : session.updatedAt),
  date: trade.exitIso != null ? trade.exitIso : (trade.entryIso != null ? trade.entryIso : session.updatedAt),
  trade_type: trade.side,
  quantity: trade.quantity,
  price: trade.entryPrice,
  exit_price: trade.exitPrice,
  symbol: trade.symbol || session.symbol,
}));

function BacktestSessionDashboard({ session, onBack, onContinue }) {
  const trades = useMemo(() => mapSessionTrades(session), [session]);
  const stats = session.stats || {};
  const realizedPnL = Number(stats.realizedPnL || 0);

  return (
    <section className="backtest-review-page w-[min(1360px,100%)] mx-auto flex flex-col gap-[var(--dashboard-grid-gap,14px)]">
      <div className="backtest-review-header flex items-center justify-between gap-3 px-3 py-2.5 border border-[var(--border-light)] rounded-[8px] bg-[var(--bg-card)] shadow-[0_14px_32px_-28px_rgba(15,23,42,0.42)] max-md:items-stretch max-md:flex-col">
        <div>
          <h2 className="mt-0.5 text-[var(--heading)] text-[18px] leading-[1.2]">{session.sessionName || 'Backtest session'}</h2>
          <p className="backtest-review-symbol inline-flex items-center gap-1.5 mt-[3px] text-[var(--text-secondary)] text-[12px] font-[650]">
            <SymbolWithIcon symbol={session.symbol} size="md" />
          </p>
        </div>
        <div className="backtest-review-actions shrink-0 inline-flex items-center gap-2 max-md:w-full [&>button]:h-8 [&>button]:px-3 [&>button]:border [&>button]:border-[var(--border-light)] [&>button]:rounded-[7px] [&>button]:bg-[var(--surface-subtle)] [&>button]:text-[var(--text-secondary)] [&>button]:text-[12px] [&>button]:font-[850] [&>button]:cursor-pointer hover:[&>button]:bg-[var(--bg-hover)] hover:[&>button]:text-[var(--accent-ink)] max-md:[&>button]:flex-1 [&>button.is-primary]:border-[var(--button-bg)] [&>button.is-primary]:bg-[var(--button-bg)] [&>button.is-primary]:text-[var(--button-text)]">
          <button type="button" onClick={onBack}>Sessions</button>
          <button type="button" className="is-primary" onClick={() => onContinue(session)}>Continue replay</button>
        </div>
      </div>

      <StatsCards trades={trades} currencyCode="USD" statsScopeKey={`backtest:${session.id}`} />

      <div className="backtest-review-grid grid grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)] max-[1100px]:grid-cols-1 gap-[var(--dashboard-grid-gap,14px)] items-stretch">
        <div className="backtest-review-card backtest-review-card--wide min-h-[520px] max-[1100px]:min-h-[360px] row-span-2 max-[1100px]:row-auto rounded-[8px] overflow-hidden">
          <PerformanceChart trades={trades} currencyCode="USD" title="Session P&L Curve" groupBy="trade" />
        </div>
        <div className="backtest-review-card min-h-[260px] rounded-[8px] overflow-hidden">
          <ActivityChart trades={trades} currencyCode="USD" />
        </div>
        <div className="backtest-review-card min-h-[260px] rounded-[8px] overflow-hidden">
          <Radar trades={trades} />
        </div>
        <div className="backtest-review-card backtest-review-summary min-h-[260px] rounded-[8px] overflow-hidden p-4 border border-[var(--border-light)] bg-[var(--bg-card)] shadow-[0_14px_32px_-28px_rgba(15,23,42,0.42)]">
          <h3 className="m-0 mb-3 text-[var(--heading)] text-[14px] leading-[1.2]">Session summary</h3>
          <div className="flex items-center justify-between py-2.5 border-t border-[var(--border-light)] text-xs">
            <span className="text-[var(--text-muted)] font-extrabold uppercase">Balance</span>
            <strong className="text-[var(--heading)] font-semibold">{currency.format(Number(stats.currentBalance || session.balance || 0))}</strong>
          </div>
          <div className="flex items-center justify-between py-2.5 border-t border-[var(--border-light)] text-xs">
            <span className="text-[var(--text-muted)] font-extrabold uppercase">Realized P&L</span>
            <strong className={realizedPnL >= 0 ? '!text-[var(--profit-color)] font-semibold' : '!text-[var(--accent-danger)] font-semibold'}>{currency.format(realizedPnL)}</strong>
          </div>
          <div className="flex items-center justify-between py-2.5 border-t border-[var(--border-light)] text-xs">
            <span className="text-[var(--text-muted)] font-extrabold uppercase">Open trades</span>
            <strong className="text-[var(--heading)] font-semibold">{Number(stats.openTrades || session.openPositions?.length || 0)}</strong>
          </div>
          <div className="flex items-center justify-between py-2.5 border-t border-[var(--border-light)] text-xs">
            <span className="text-[var(--text-muted)] font-extrabold uppercase">Saved</span>
            <strong className="text-[var(--heading)] font-semibold">{formatDateTime(session.updatedAt)}</strong>
          </div>
        </div>
      </div>
    </section>
  );
}

const DEFAULT_SESSION_DRAFT = { sessionName: '', symbol: '', startTime: '', endTime: '', initialBalance: '' };

function BacktestingPage() {
  const { confirm, notify, prompt: requestInput } = useAppDialog();
  const [sessionDraft, setSessionDraft] = useState(DEFAULT_SESSION_DRAFT);
  const [savedSessions, setSavedSessions] = useState(readSavedSessions);
  const [activeView, setActiveView] = useState('library');
  const [reviewSessionId, setReviewSessionId] = useState('');
  const [sessionError, setSessionError] = useState('');
  const [isCreateSessionModalOpen, setIsCreateSessionModalOpen] = useState(false);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(230);
  const [bottomPanelState, setBottomPanelState] = useState('open');
  const [orderPanelOpen, setOrderPanelOpen] = useState(true);
  const [orderPanelWidth, setOrderPanelWidth] = useState(310);
  const deletedSessionIdsRef = useRef(new Set());

  const {
    state, currentCandle, journalStatus, setField, step, placeOrder, closePosition,
    saveTradeToJournal, mergeLoadedCandles, startSession, resumeSession, changeTimeframe,
    hasSession, loadStatus, stats,
  } = useBacktestSession();

  const { data: allInstruments = [], isLoading: instrumentsLoading, isError: instrumentsLoadError } = useInstruments();

  const instruments = useMemo(() => {
    const bySymbol = new Map();
    [...allInstruments.filter((i) => i.category === 'crypto'), ...backtestingExtraSymbols].forEach((inst) => {
      const sym = String(inst?.symbol || '').trim().toUpperCase();
      if (!sym || bySymbol.has(sym)) return;
      bySymbol.set(sym, { ...inst, symbol: sym });
    });
    return Array.from(bySymbol.values());
  }, [allInstruments]);

  const updateSessionDraft = useCallback((f, v) => setSessionDraft((p) => ({ ...p, [f]: v })), []);

  const handleCreateSession = useCallback(async (e) => {
    e.preventDefault();
    const start = new Date(sessionDraft.startTime);
    const end = new Date(sessionDraft.endTime);
    const initialBalance = Number(sessionDraft.initialBalance);

    if (!sessionDraft.sessionName.trim()) return setSessionError('Session name is required.');
    if (!sessionDraft.symbol.trim()) return setSessionError('Symbol is required.');
    if (instrumentsLoading) return setSessionError('Symbols are still loading. Please try again in a moment.');
    if (instrumentsLoadError) return setSessionError('Symbol list could not be loaded. Please reload and try again.');
    if (!isAllowedInstrumentSymbol(instruments, sessionDraft.symbol)) return setSessionError('Symbol not available');
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return setSessionError('Start and end time must be valid.');
    if (start >= end) return setSessionError('End time must be after start time.');
    if (!Number.isFinite(initialBalance) || initialBalance <= 0) return setSessionError('Initial balance must be a positive number.');

    setSessionError('');
    try {
      const started = await startSession({
        ...sessionDraft,
        sessionId: `bt-${Date.now()}`,
        sessionName: sessionDraft.sessionName.trim(),
        symbol: sessionDraft.symbol.trim().toUpperCase(),
        timeframe: '1m',
        initialBalance,
      });
      setActiveView('chart');
      setIsCreateSessionModalOpen(false);
      if (started?.sessionId) {
        setSavedSessions((prev) => {
          const created = {
            id: started.sessionId,
            sessionId: started.sessionId,
            ...started,
            stats: { currentBalance: initialBalance, realizedPnL: 0, unrealizedPnL: 0, winRate: 0, profitFactor: 0, totalTrades: 0, openTrades: 0 },
            balance: initialBalance,
            openPositions: [],
            closedPositions: [],
            orders: [],
            journalDrafts: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          const next = [created, ...prev.filter((s) => s.id !== created.id)];
          writeSavedSessions(next);
          return next;
        });
      }
    } catch (err) {
      setSessionError(err?.response?.data?.error || err?.message || 'Session could not be loaded.');
    }
  }, [instruments, instrumentsLoadError, instrumentsLoading, sessionDraft, startSession]);

  const handleReviewSavedSession = useCallback((session) => {
    setSessionError('');
    setReviewSessionId(session.id);
    setActiveView('review');
  }, []);

  const handleContinueSavedSession = useCallback(async (session) => {
    setSessionError('');
    try {
      await resumeSession(session);
      setActiveView('chart');
    } catch (err) {
      setSessionError(err?.response?.data?.error || err?.message || 'Saved session could not be opened.');
    }
  }, [resumeSession]);

  const handleRenameSavedSession = useCallback(async (session) => {
    const nextName = await requestInput('Enter a new name for this backtest session.', {
      title: 'Rename session',
      value: session.sessionName || '',
      confirmText: 'Save name',
    });
    if (!nextName?.trim()) return;
    const trimmed = nextName.trim();
    setSavedSessions((prev) => {
      const next = prev.map((item) => (item.id === session.id ? { ...item, sessionName: trimmed, updatedAt: new Date().toISOString() } : item));
      writeSavedSessions(next);
      return next;
    });
    if (state.sessionId === session.id) setField('sessionName', trimmed);
    notify('Backtest session renamed', 'success');
  }, [notify, requestInput, setField, state.sessionId]);

  const handleDeleteSavedSession = useCallback(async (session) => {
    const shouldDelete = await confirm(`Delete "${session.sessionName || 'this session'}"?`, {
      title: 'Delete backtest session',
      confirmText: 'Delete session',
    });
    if (!shouldDelete) return;
    deletedSessionIdsRef.current.add(session.id);
    setSavedSessions((prev) => {
      const next = prev.filter((item) => item.id !== session.id);
      writeSavedSessions(next);
      return next;
    });
    if (reviewSessionId === session.id) {
      setReviewSessionId('');
      setActiveView('library');
    }
    notify('Backtest session deleted', 'success');
  }, [confirm, notify, reviewSessionId]);

  useEffect(() => {
    if (!hasSession || !state.sessionId || deletedSessionIdsRef.current.has(state.sessionId)) return undefined;
    const timer = window.setTimeout(() => {
      setSavedSessions((prev) => {
        const saved = buildSavedSession(state, stats, currentCandle, prev.find((s) => s.id === state.sessionId));
        const next = [saved, ...prev.filter((s) => s.id !== state.sessionId)];
        writeSavedSessions(next);
        return next;
      });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [currentCandle, hasSession, state, stats]);

  const reviewSession = useMemo(() => savedSessions.find((s) => s.id === reviewSessionId) || savedSessions[0] || null, [reviewSessionId, savedSessions]);

  const startBottomResize = useCallback((e) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = bottomPanelHeight;
    document.body.classList.add('backtest-is-resizing', 'cursor-grabbing', 'select-none');
    const handleMove = (me) => {
      setBottomPanelHeight(Math.min(460, Math.max(96, startHeight + startY - me.clientY)));
      setBottomPanelState('open');
    };
    const handleUp = () => {
      document.body.classList.remove('backtest-is-resizing', 'cursor-grabbing', 'select-none');
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp, { once: true });
  }, [bottomPanelHeight]);

  const startOrderResize = useCallback((e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = orderPanelWidth;
    document.body.classList.add('backtest-is-resizing', 'cursor-grabbing', 'select-none');
    const handleMove = (me) => setOrderPanelWidth(Math.min(430, Math.max(260, startWidth + startX - me.clientX)));
    const handleUp = () => {
      document.body.classList.remove('backtest-is-resizing', 'cursor-grabbing', 'select-none');
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp, { once: true });
  }, [orderPanelWidth]);

  return (
    <MainContentWrapper className={`backtesting-page min-h-screen overflow-x-clip max-md:ml-0 ${activeView === 'library' ? 'backtesting-page--library h-screen overflow-hidden' : ''}`}>
      {activeView === 'library' && (
        <PageHeader
          title="Backtesting"
          actions={(
            <div className="backtest-header-actions inline-flex items-center gap-2.5">
              <div className="backtest-header-total min-h-[34px] px-3 py-1 inline-flex items-center gap-2 border border-[var(--border-light)] rounded-[8px] bg-[var(--surface-subtle)] text-xs font-semibold">
                <span className="text-[var(--text-secondary)] text-[10px] font-bold uppercase">Total sessions</span>
                <strong className="text-[var(--heading)] font-bold">{savedSessions.length.toLocaleString('en-US')}</strong>
              </div>
              <button
                className="backtest-session-submit backtest-session-submit--header min-h-[34px] px-3.5 inline-flex items-center justify-center gap-3 border border-[var(--border-light)] rounded-[8px] bg-[var(--button-bg)] text-[var(--button-text)] text-[13px] font-bold cursor-pointer transition-transform duration-200 hover:-translate-y-[1px] disabled:opacity-70"
                type="button"
                onClick={() => { setSessionError(''); setSessionDraft(DEFAULT_SESSION_DRAFT); setIsCreateSessionModalOpen(true); }}
                disabled={loadStatus === 'loading'}
              >
                <span>Create session</span>
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            </div>
          )}
        />
      )}

      <div className={`backtest-terminal relative flex flex-col gap-[var(--dashboard-grid-gap,14px)] pt-2.5 pb-0 px-0 text-[var(--text-primary)] max-md:pt-3.5 max-md:pb-5 max-md:px-3 ${activeView === 'library' ? 'h-[calc(100vh-var(--app-shell-header-height,64px)-16px)] min-h-0 overflow-hidden' : ''} ${isCreateSessionModalOpen ? 'is-modal-open pointer-events-none select-none' : ''}`}>
        {activeView === 'library' && isCreateSessionModalOpen && (
          <div className="backtest-session-modal absolute inset-0 z-[500] flex items-center justify-center p-5 pointer-events-auto" role="dialog" aria-modal="true" aria-labelledby="backtest-session-modal-title">
            <button className="backtest-session-modal__backdrop absolute inset-0 border-0 bg-[rgba(15,23,42,0.16)] dark:bg-[rgba(0,0,0,0.42)] backdrop-blur-[6px] cursor-default" type="button" aria-label="Close create session" onClick={() => setIsCreateSessionModalOpen(false)} />
            <section className="backtest-session-modal__panel relative z-[1] w-[min(500px,calc(100vw-32px))] max-h-[calc(100vh-48px)] bg-[var(--bg-card)] border border-[var(--border-light)] rounded-[16px] shadow-[0_24px_60px_-15px_rgba(0,0,0,0.35)] overflow-hidden flex flex-col">
              <div className="backtest-session-modal__header flex items-start justify-between gap-4 pt-5 pb-4 px-6 border-b border-[var(--border-light)] bg-[var(--bg-card)]">
                <div className="backtest-session-modal__title-group flex items-start gap-3 min-w-0">
                  <span className="backtest-card-icon w-9 h-9 rounded-[10px] bg-[var(--surface-subtle)] border border-[var(--border-light)] text-[var(--heading)] flex items-center justify-center shrink-0 mt-0.5"><ChartLine size={18} aria-hidden="true" /></span>
                  <div>
                    <h3 id="backtest-session-modal-title" className="m-0 text-[var(--heading)] text-[17px] font-bold">Create Backtest Session</h3>
                    <p className="mt-1 mb-0 text-[var(--text-secondary)] text-[12px]">Configure symbol, date range, and starting balance</p>
                  </div>
                </div>
                <button className="w-8 h-8 p-0 border border-[var(--border-light)] rounded-full bg-[var(--surface-subtle)] text-[var(--text-secondary)] inline-flex items-center justify-center cursor-pointer hover:bg-[var(--bg-hover)]" type="button" aria-label="Close modal" onClick={() => setIsCreateSessionModalOpen(false)}>
                  <X size={18} aria-hidden="true" />
                </button>
              </div>

              <form id={BACKTEST_SESSION_FORM_ID} className="backtest-session-form pt-5 pb-6 px-6 flex flex-col gap-4 overflow-y-auto" onSubmit={handleCreateSession} autoComplete="off">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[var(--text-secondary)] text-[11px] font-bold tracking-[0.04em] uppercase">Session Name</label>
                  <div className="h-[42px] px-3 flex flex-col justify-center rounded-[10px] border border-[var(--border-light)] bg-[var(--surface-subtle)]">
                    <input className="w-full h-5 p-0 border-0 outline-none bg-transparent text-[var(--accent-ink)] text-[12px] font-[550]" value={sessionDraft.sessionName} onChange={(e) => updateSessionDraft('sessionName', e.target.value)} placeholder="e.g. BTC London Breakout Replay" aria-label="Session name" autoComplete="off" />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[var(--text-secondary)] text-[11px] font-bold tracking-[0.04em] uppercase">Symbol</label>
                  <BacktestSymbolField value={sessionDraft.symbol} onChange={(v) => updateSessionDraft('symbol', v)} instruments={instruments} isLoading={instrumentsLoading} />
                </div>
                <div className="grid grid-cols-2 max-[520px]:grid-cols-1 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[var(--text-secondary)] text-[11px] font-bold tracking-[0.04em] uppercase">Start Time</label>
                    <BacktestDateTimeField label="Start time" value={sessionDraft.startTime} onChange={(v) => updateSessionDraft('startTime', v)} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[var(--text-secondary)] text-[11px] font-bold tracking-[0.04em] uppercase">End Time</label>
                    <BacktestDateTimeField label="End time" value={sessionDraft.endTime} onChange={(v) => updateSessionDraft('endTime', v)} />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[var(--text-secondary)] text-[11px] font-bold tracking-[0.04em] uppercase">Initial Balance ($)</label>
                  <div className="h-[42px] px-3 flex flex-col justify-center rounded-[10px] border border-[var(--border-light)] bg-[var(--surface-subtle)]">
                    <input className="w-full h-5 p-0 border-0 outline-none bg-transparent text-[var(--accent-ink)] text-[12px] font-[550]" type="number" min="1" step="1" value={sessionDraft.initialBalance} onChange={(e) => updateSessionDraft('initialBalance', e.target.value)} placeholder="e.g. 10000" aria-label="Initial balance" autoComplete="off" />
                  </div>
                </div>
                {sessionError && <div className="px-2.5 py-2 border border-[var(--accent-danger-soft)] rounded-[7px] bg-[var(--accent-danger-soft)] text-[var(--accent-danger)] text-xs font-semibold">{sessionError}</div>}
                <button className="w-full min-h-[44px] mt-1.5 px-4 inline-flex items-center justify-center gap-3 border border-[var(--border-light)] rounded-[10px] bg-[var(--button-bg)] text-[var(--button-text)] text-[14px] font-bold cursor-pointer transition-transform duration-200 hover:-translate-y-[1px] disabled:opacity-70" type="submit" disabled={loadStatus === 'loading'}>
                  <span>{loadStatus === 'loading' ? 'Loading session...' : 'Create session'}</span>
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              </form>
            </section>
          </div>
        )}

        {activeView === 'library' ? (
          <div className="backtest-session-shell backtest-session-shell--results-only grid grid-cols-[minmax(0,1fr)] gap-[var(--dashboard-grid-gap,14px)] items-stretch w-full min-h-0 h-full overflow-hidden mx-auto">
            <div className="backtest-session-column backtest-session-column--results min-w-0 min-h-0 grid grid-rows-[minmax(0,1fr)] gap-[var(--dashboard-grid-gap,14px)]">
              <section className="backtest-session-card backtest-session-card--saved w-full min-h-0 overflow-hidden p-[var(--dashboard-card-padding,16px)] border border-[var(--border-light)] rounded-[8px] bg-[var(--bg-card)] shadow-[0_14px_32px_-28px_rgba(15,23,42,0.42)]">
                <div className="backtest-session-card__header backtest-session-card__header--inline mb-3 pb-0 border-b-0 flex items-center justify-between gap-2.5">
                  <div className="backtest-saved-heading min-w-0 flex items-center gap-2.5">
                    <span className="w-[3px] h-8 rounded-full [background:linear-gradient(180deg,color-mix(in_srgb,var(--primary)_86%,#fff),color-mix(in_srgb,var(--accent-success)_72%,var(--primary)))] shadow-[0_0_0_4px_color-mix(in_srgb,var(--primary)_8%,transparent)]" aria-hidden="true" />
                    <strong className="text-[14px] font-[670] text-[var(--heading)]">Saved sessions</strong>
                  </div>
                </div>
                <div className="backtest-saved-session-list content-start grid gap-2.5 max-h-none h-[calc(100%-48px)] min-h-0 overflow-auto pr-1">
                  {savedSessions.length ? (
                    savedSessions.map((session) => (
                      <SavedSessionCard
                        key={session.id}
                        session={session}
                        isActive={state.sessionId === session.id}
                        onOpen={handleReviewSavedSession}
                        onRename={handleRenameSavedSession}
                        onDelete={handleDeleteSavedSession}
                      />
                    ))
                  ) : (
                    <div className="backtest-session-empty min-h-[210px] grid place-items-center p-[18px] border border-dashed border-[var(--border-medium)] rounded-[8px] bg-[var(--surface-subtle)] text-[var(--text-muted)] text-[12px] font-[550] text-center">
                      Create a session. It will appear here with P&L, win rate and trade stats.
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        ) : activeView === 'review' && reviewSession ? (
          <BacktestSessionDashboard session={reviewSession} onBack={() => setActiveView('library')} onContinue={handleContinueSavedSession} />
        ) : !hasSession ? (
          <div className="backtest-session-shell grid grid-cols-[minmax(320px,430px)_minmax(0,1fr)] max-[1100px]:grid-cols-1 gap-[var(--dashboard-grid-gap,14px)] items-stretch w-full min-h-0 mx-auto">
            <section className="backtest-session-card w-full p-[var(--dashboard-card-padding,16px)] border border-[var(--border-light)] rounded-[8px] bg-[var(--bg-card)] shadow-[0_14px_32px_-28px_rgba(15,23,42,0.42)]">
              <div className="backtest-session-card__header mb-3 pb-0 border-b-0 flex items-start gap-2.5">
                <span className="text-[var(--text-secondary)] text-[10px] font-semibold uppercase">Session setup</span>
                <strong className="text-[var(--heading)] text-[14px] font-[650]">Create backtest session</strong>
              </div>
              <div className="backtest-session-empty min-h-[210px] grid place-items-center p-[18px] border border-dashed border-[var(--border-medium)] rounded-[8px] bg-[var(--surface-subtle)] text-[var(--text-muted)] text-[12px] font-[550] text-center">
                Select a saved session or create a new one first.
              </div>
            </section>
          </div>
        ) : (
          <>
            <div className="backtest-chart-strip flex items-center justify-between gap-3 px-3 py-2.5 border border-[var(--border-light)] rounded-[8px] bg-[var(--bg-card)] shadow-[0_14px_32px_-28px_rgba(15,23,42,0.42)] max-md:items-stretch max-md:flex-col">
              <span className="text-[var(--text-muted)] text-[10px] font-[850] uppercase">{state.sessionName ? state.sessionName : state.symbol}</span>
              <div className="shrink-0 inline-flex items-center gap-2 max-md:w-full [&>button]:h-8 [&>button]:px-3 [&>button]:border [&>button]:border-[var(--border-light)] [&>button]:rounded-[7px] [&>button]:bg-[var(--surface-subtle)] [&>button]:text-[var(--text-secondary)] [&>button]:text-[12px] [&>button]:font-[850] [&>button]:cursor-pointer hover:[&>button]:bg-[var(--bg-hover)] hover:[&>button]:text-[var(--accent-ink)] max-md:[&>button]:flex-1">
                <button type="button" onClick={() => setActiveView('library')}>Sessions</button>
                <button type="button" onClick={() => { setReviewSessionId(state.sessionId); setActiveView('review'); }}>Performance</button>
              </div>
            </div>
            <div className={`backtest-workspace relative grid gap-2.5 items-stretch min-h-[calc(100vh-260px)] ${orderPanelOpen ? 'grid-cols-[minmax(0,1fr)_var(--order-panel-width,310px)] max-[1100px]:grid-cols-1' : 'backtest-workspace--full-chart grid-cols-[minmax(0,1fr)]'}`} style={orderPanelOpen ? { '--order-panel-width': `${orderPanelWidth}px` } : undefined}>
              <div className="backtest-center min-w-0 min-h-0 flex flex-col gap-2.5">
                <BacktestChart
                  candles={state.candles}
                  symbol={state.symbol}
                  sessionDate={state.sessionDate}
                  sessionStartTime={state.sessionStartTime}
                  sessionEndTime={state.sessionEndTime}
                  currentIndex={state.currentIndex}
                  strictReplay={state.strictReplay}
                  currentCandle={currentCandle}
                  entryPrice={state.entryPrice}
                  stopLoss={state.stopLoss}
                  takeProfit={state.takeProfit}
                  openPositions={state.openPositions}
                  closedPositions={state.closedPositions}
                  timeframe={state.timeframe}
                  selectedOrderSide={state.selectedOrderSide}
                  marketPrice={currentCandle?.close || state.entryPrice || 0}
                  isLoading={loadStatus === 'loading'}
                  onCandlesLoaded={mergeLoadedCandles}
                  onTimeframeChange={changeTimeframe}
                  onSideChange={(v) => setField('selectedOrderSide', v)}
                  onOpenOrderPanel={() => setOrderPanelOpen(true)}
                  onClosePosition={closePosition}
                  isPlaying={state.isPlaying}
                  playbackSpeed={state.playbackSpeed}
                  onTogglePlay={() => setField('isPlaying', !state.isPlaying)}
                  onStep={step}
                  onSpeedChange={(v) => setField('playbackSpeed', v)}
                />
                {bottomPanelState !== 'hidden' ? (
                  <BacktestBottomPanel
                    orders={state.orders}
                    openPositions={state.openPositions}
                    closedPositions={state.closedPositions}
                    journalDrafts={state.journalDrafts}
                    collapsed={bottomPanelState === 'collapsed'}
                    style={{ height: bottomPanelState === 'collapsed' ? 48 : bottomPanelHeight }}
                    onResizeStart={startBottomResize}
                    onCollapse={() => setBottomPanelState((v) => (v === 'collapsed' ? 'open' : 'collapsed'))}
                    onClose={() => setBottomPanelState('hidden')}
                    onClosePosition={closePosition}
                    onJournalTrade={saveTradeToJournal}
                  />
                ) : (
                  <button className="backtest-panel-restore backtest-panel-restore--bottom self-stretch h-[38px] min-w-0 inline-flex items-center justify-center gap-1.5 border border-[var(--border-light)] rounded-[7px] bg-[var(--bg-card)] text-[var(--text-secondary)] text-[12px] font-[850] cursor-pointer hover:bg-[var(--bg-hover)] hover:text-[var(--accent-ink)]" type="button" onClick={() => setBottomPanelState('open')}>
                    Show orders
                  </button>
                )}
              </div>

              {orderPanelOpen ? (
                <div className="backtest-order-dock relative min-w-[260px] max-w-[430px] min-h-0 max-[1100px]:!w-full max-[1100px]:max-w-none" style={{ width: orderPanelWidth }}>
                  <button className="backtest-pane-resizer backtest-pane-resizer--vertical border-0 bg-transparent text-[var(--text-muted)] touch-none absolute inset-y-0 -left-[7px] z-[3] w-3 cursor-col-resize before:content-[''] before:absolute before:top-3.5 before:bottom-3.5 before:left-[5px] before:border-l before:border-[var(--border-medium)] max-[1100px]:hidden" type="button" aria-label="Resize order panel" onPointerDown={startOrderResize} />
                  <BacktestOrderPanel state={state} currentCandle={currentCandle} onClose={() => setOrderPanelOpen(false)} onFieldChange={setField} onPlaceOrder={placeOrder} onJournalTrade={saveTradeToJournal} />
                </div>
              ) : (
                <button className="backtest-panel-restore backtest-panel-restore--order absolute top-2 right-2 z-[6] px-2.5 h-[38px] min-w-0 inline-flex items-center justify-center gap-1.5 border border-[var(--border-light)] rounded-[7px] bg-[var(--bg-card)] text-[var(--text-secondary)] text-[12px] font-[850] cursor-pointer hover:bg-[var(--bg-hover)] hover:text-[var(--accent-ink)]" type="button" title="Show order panel" aria-label="Show order panel" onClick={() => setOrderPanelOpen(true)}>
                  <PanelRightOpen size={16} aria-hidden="true" />
                  Order
                </button>
              )}
            </div>
          </>
        )}

        {journalStatus && <div className="backtest-status-note mx-[22px] mb-3.5 mt-0 px-2.5 py-[9px] border border-[var(--accent-danger-soft)] rounded-[7px] bg-[var(--accent-danger-soft)] text-[var(--accent-danger)] text-[12px] font-[650]">{journalStatus}</div>}
      </div>
    </MainContentWrapper>
  );
}

export default BacktestingPage;
