import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DayPicker } from 'react-day-picker';
import MainContentWrapper from '../../components/Layout/MainContentWrapper';
import PageHeader from '../../components/Layout/PageHeader';
import {
  Calendar,
  CalendarDays,
  ChartLine,
  ChevronLeft,
  ChevronRight,
  EllipsisVertical,
  Gauge,
  PanelRightOpen,
  TrendingDown,
  TrendingUp,
} from '../../icons/lucideIcons';
import SymbolWithIcon from '../../components/Common/SymbolWithIcon';
import CustomTimePicker from '../../components/Common/CustomTimePicker';
import ActivityChart from '../../components/MainContent/ActivityChart';
import PerformanceChart from '../../components/MainContent/PerformanceChart';
import Radar from '../../components/MainContent/Radar';
import StatsCards from '../../components/StatsCards/StatsCards';
import BacktestBottomPanel from './components/BacktestBottomPanel';
import BacktestChart from './components/BacktestChart';
import BacktestOrderPanel from './components/BacktestOrderPanel';
import BacktestStatsBar from './components/BacktestStatsBar';
import { useBacktestSession } from './hooks/useBacktestSession';
import { filterInstruments, isAllowedInstrumentSymbol, useInstruments } from '../../hooks/useInstruments';
import backtestingExtraSymbols from './data/backtesting.json';
import '../../components/Common/DateRangePicker.css';
import './BacktestingPage.css';

const BACKTEST_SESSIONS_KEY = 'entrack:backtest_sessions:v1';
const BACKTEST_SESSION_FORM_ID = 'backtest-session-form';
const MAX_SAVED_SESSIONS = 30;
const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
const PICKER_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function normalizePickerMonth(value) {
  const date = value instanceof Date && !Number.isNaN(value.getTime()) ? value : new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addPickerMonths(value, amount) {
  const date = normalizePickerMonth(value);
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function toDateTimeLocalValue(date) {
  const pad = (value) => String(value).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

function formatDateTime(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

function formatCompactSessionRange(startValue, endValue) {
  if (!startValue || !endValue) return '-';

  const start = new Date(startValue);
  const end = new Date(endValue);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '-';

  const dateFormatter = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const shortDateFormatter = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
  });
  const timeFormatter = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const sameDay = start.toDateString() === end.toDateString();

  if (sameDay) {
    return `${dateFormatter.format(start)}, ${timeFormatter.format(start)}-${timeFormatter.format(end)}`;
  }

  return `${shortDateFormatter.format(start)} ${timeFormatter.format(start)} - ${shortDateFormatter.format(end)} ${timeFormatter.format(end)}`;
}

function parseDateTimeLocalValue(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatPickerDate(value, fallback = 'Select date') {
  const date = parseDateTimeLocalValue(value);
  if (!date) return fallback;

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function getPickerTime(value) {
  const date = parseDateTimeLocalValue(value);
  if (!date) return '00:00';
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function mergeDateTime(value, nextDate, nextTime = getPickerTime(value)) {
  const base = nextDate || parseDateTimeLocalValue(value) || new Date();
  const [hours = '0', minutes = '0'] = String(nextTime || '00:00').split(':');
  const merged = new Date(base);
  merged.setHours(Number(hours), Number(minutes), 0, 0);
  return toDateTimeLocalValue(merged);
}

function CalendarTemplateHeader({ month, onMonthChange }) {
  const [monthMenuOpen, setMonthMenuOpen] = useState(false);
  const [yearMenuOpen, setYearMenuOpen] = useState(false);
  const [yearPageStart, setYearPageStart] = useState(() => normalizePickerMonth(month).getFullYear() - 5);
  const normalizedMonth = normalizePickerMonth(month);
  const yearOptions = Array.from({ length: 12 }, (_, index) => yearPageStart + index);

  return (
    <div className="calendar-month-controls">
      <button
        type="button"
        className="calendar-month-controls__nav"
        onClick={() => onMonthChange(addPickerMonths(normalizedMonth, -1))}
        aria-label="Previous month"
      >
        <ChevronLeft size={15} aria-hidden="true" />
      </button>

      <div className="calendar-month-controls__center">
        <button
          type="button"
          className="calendar-template-header__month-button"
          onClick={() => {
            setYearMenuOpen(false);
            setMonthMenuOpen((current) => !current);
          }}
          aria-expanded={monthMenuOpen}
          aria-label="Select month"
        >
          {PICKER_MONTHS[normalizedMonth.getMonth()]}
        </button>

        <button
          type="button"
          className="calendar-template-header__year"
          onClick={() => {
            setMonthMenuOpen(false);
            setYearPageStart(normalizedMonth.getFullYear() - 5);
            setYearMenuOpen((current) => !current);
          }}
          aria-expanded={yearMenuOpen}
          aria-label="Select year"
        >
          {normalizedMonth.getFullYear()}
        </button>
      </div>

      {monthMenuOpen && (
        <div className="calendar-template-header__month-menu">
          {PICKER_MONTHS.map((monthName, index) => (
            <button
              key={monthName}
              type="button"
              className={index === normalizedMonth.getMonth() ? 'is-active' : ''}
              onClick={() => {
                onMonthChange(new Date(normalizedMonth.getFullYear(), index, 1));
                setMonthMenuOpen(false);
              }}
            >
              {monthName}
            </button>
          ))}
        </div>
      )}

      {yearMenuOpen && (
        <div className="calendar-template-header__year-menu">
          <div className="calendar-template-header__year-menu-nav">
            <button type="button" onClick={() => setYearPageStart((year) => year - 12)} aria-label="Previous years">
              <ChevronLeft size={13} aria-hidden="true" />
            </button>
            <span>{yearPageStart}-{yearPageStart + 11}</span>
            <button type="button" onClick={() => setYearPageStart((year) => year + 12)} aria-label="Next years">
              <ChevronRight size={13} aria-hidden="true" />
            </button>
          </div>
          <div className="calendar-template-header__year-grid">
            {yearOptions.map((year) => (
              <button
                key={year}
                type="button"
                className={year === normalizedMonth.getFullYear() ? 'is-active' : ''}
                onClick={() => {
                  onMonthChange(new Date(year, normalizedMonth.getMonth(), 1));
                  setYearMenuOpen(false);
                }}
              >
                {year}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        className="calendar-month-controls__nav"
        onClick={() => onMonthChange(addPickerMonths(normalizedMonth, 1))}
        aria-label="Next month"
      >
        <ChevronRight size={15} aria-hidden="true" />
      </button>
    </div>
  );
}

function BacktestDateTimeField({ label, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(() => normalizePickerMonth(parseDateTimeLocalValue(value)));
  const wrapperRef = useRef(null);
  const selectedDate = parseDateTimeLocalValue(value);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (!wrapperRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  return (
    <div className="backtest-datetime-field" ref={wrapperRef}>
      <div className={selectedDate ? 'backtest-datetime-field__controls' : 'backtest-datetime-field__controls is-empty'}>
        <button
          type="button"
          className="backtest-date-trigger"
          onClick={() => {
            setPickerMonth(normalizePickerMonth(selectedDate || new Date()));
            setOpen((current) => !current);
          }}
          aria-label={label}
        >
          <Calendar size={14} aria-hidden="true" />
          <strong>{formatPickerDate(value, label)}</strong>
        </button>
        {selectedDate ? (
          <CustomTimePicker
            className="backtest-time-input"
            value={getPickerTime(value)}
            onChange={(nextTime) => onChange(mergeDateTime(value, selectedDate, nextTime))}
            ariaLabel={`${label} time`}
          />
        ) : null}
      </div>

      {open && (
        <div className="backtest-date-popover">
          <CalendarTemplateHeader month={pickerMonth} onMonthChange={setPickerMonth} />
          <DayPicker
            mode="single"
            selected={selectedDate || undefined}
            onSelect={(date) => {
              if (!date) return;
              onChange(mergeDateTime(value, date));
              setOpen(false);
            }}
            month={pickerMonth}
            onMonthChange={setPickerMonth}
            fixedWeeks
            showOutsideDays
            className="trade-rdp trade-calendar-template backtest-date-rdp"
          />
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
  const filteredSymbols = useMemo(() => {
    return filterInstruments(instruments, open ? searchQuery : normalizedValue, 8);
  }, [instruments, normalizedValue, open, searchQuery]);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (!wrapperRef.current?.contains(event.target)) {
        setOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  const formatInstrumentType = (type) => (
    String(type || '').trim().toUpperCase() || 'TYPE'
  );

  return (
    <div className="backtest-symbol-field" ref={wrapperRef}>
      <div className="backtest-symbol-field__input-row">
        <span className="backtest-symbol-field__main">
          {normalizedValue ? <SymbolWithIcon symbol={normalizedValue} size="md" showLabel={false} /> : null}
          <input
            value={open ? searchQuery : normalizedValue}
            onFocus={() => {
              setSearchQuery('');
              setOpen(true);
            }}
            onChange={(event) => {
              const nextQuery = event.target.value.toUpperCase();
              setSearchQuery(nextQuery);
              if (normalizedValue && nextQuery !== normalizedValue) {
                onChange('');
              }
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
          className="backtest-symbol-field__toggle"
          onClick={() => setOpen((current) => !current)}
          aria-label="Toggle symbol list"
          aria-expanded={open}
        >
          <ChevronRight size={15} aria-hidden="true" />
        </button>
      </div>

      {open && (
        <div className="backtest-symbol-menu" id="backtest-symbol-menu">
          {isLoading ? (
            <div className="backtest-symbol-menu__empty">Loading symbols...</div>
          ) : filteredSymbols.length ? (
            filteredSymbols.map((instrument) => (
              <button
                key={instrument.symbol}
                type="button"
                className={normalizedValue === instrument.symbol ? 'is-selected' : ''}
                onClick={() => {
                  onChange(instrument.symbol);
                  setSearchQuery('');
                  setOpen(false);
                }}
              >
                <span className="backtest-symbol-menu__asset">
                  <SymbolWithIcon symbol={instrument.symbol} size="md" />
                  <span>{instrument.name}</span>
                </span>
                <span className="backtest-symbol-menu__type">
                  {formatInstrumentType(instrument.type)}
                </span>
              </button>
            ))
          ) : (
            <div className="backtest-symbol-menu__empty">Symbol not available</div>
          )}
        </div>
      )}
    </div>
  );
}

function readSavedSessions() {
  try {
    const parsed = JSON.parse(localStorage.getItem(BACKTEST_SESSIONS_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    localStorage.removeItem(BACKTEST_SESSIONS_KEY);
    return [];
  }
}

function writeSavedSessions(sessions) {
  localStorage.setItem(BACKTEST_SESSIONS_KEY, JSON.stringify(sessions.slice(0, MAX_SAVED_SESSIONS)));
}

function buildSavedSession(state, stats, currentCandle, previousSession) {
  return {
    ...previousSession,
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
    currentTime: currentCandle?.time || previousSession?.currentTime || 0,
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
    createdAt: previousSession?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function SessionMetric({ label, value, tone = '', icon: Icon }) {
  return (
    <div className="backtest-session-metric">
      <span>{Icon && <Icon size={14} aria-hidden="true" />}{label}</span>
      <strong className={tone}>{value}</strong>
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

    const handlePointerDown = (event) => {
      if (
        !actionsRef.current?.contains(event.target) &&
        !menuPopoverRef.current?.contains(event.target)
      ) {
        setMenuOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };
    const closeMenu = () => setMenuOpen(false);

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', closeMenu);
    window.addEventListener('scroll', closeMenu, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', closeMenu);
      window.removeEventListener('scroll', closeMenu, true);
    };
  }, [menuOpen]);

  return (
    <article className={isActive ? 'backtest-saved-session is-active' : 'backtest-saved-session'}>
      <button className="backtest-saved-session__main" type="button" onClick={() => onOpen(session)}>
        <span className={pnl < 0 ? 'backtest-saved-session__icon is-loss' : 'backtest-saved-session__icon'}>
          <TrendIcon size={20} aria-hidden="true" />
        </span>

        <div className="backtest-saved-session__top">
          <div>
            <strong className="backtest-saved-session__title">
              <span>{session.sessionName}</span>
              <em>:</em>
              <span className="backtest-session-instrument">
                <strong>
                  <SymbolWithIcon symbol={session.symbol} size="md" />
                </strong>
              </span>
            </strong>
            <small>
              <CalendarDays size={13} aria-hidden="true" />
              {formatCompactSessionRange(session.startTime, session.endTime)}
            </small>
          </div>
        </div>

        <div className="backtest-session-metrics">
          <SessionMetric label="P&L" value={currency.format(pnl)} tone={pnl >= 0 ? 'is-positive' : 'is-negative'} />
          <SessionMetric label="Balance" value={currency.format(balance)} />
          <SessionMetric label="Win rate" value={`${winRate.toFixed(1)}%`} />
        </div>
      </button>

      <div className="backtest-saved-session__actions" ref={actionsRef}>
        <button
          className="backtest-saved-session__menu"
          type="button"
          aria-label={`Session actions for ${session.sessionName}`}
          aria-expanded={menuOpen}
          onClick={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            const menuWidth = 156;
            const menuHeight = 82;
            setMenuPosition({
              top: rect.bottom + menuHeight > window.innerHeight
                ? Math.max(12, rect.top - menuHeight - 8)
                : rect.bottom + 8,
              left: Math.min(
                window.innerWidth - menuWidth - 12,
                Math.max(12, rect.right - menuWidth)
              ),
            });
            setMenuOpen((current) => !current);
          }}
        >
          <EllipsisVertical size={18} aria-hidden="true" />
        </button>
        {menuOpen && createPortal(
          <div
            ref={menuPopoverRef}
            className="backtest-saved-session__menu-popover"
            style={{ top: menuPosition.top, left: menuPosition.left }}
          >
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onRename(session);
              }}
            >
              Rename session
            </button>
            <button
              type="button"
              className="is-danger"
              onClick={() => {
                setMenuOpen(false);
                onDelete(session);
              }}
            >
              Delete session
            </button>
          </div>,
          document.body
        )}
      </div>
    </article>
  );
}

function mapSessionTrades(session) {
  return (session.closedPositions || []).map((trade) => ({
    ...trade,
    pnl: Number(trade.pnl || 0),
    timestamp: trade.exitIso || trade.entryIso || session.updatedAt,
    date: trade.exitIso || trade.entryIso || session.updatedAt,
    trade_type: trade.side,
    quantity: trade.quantity,
    price: trade.entryPrice,
    exit_price: trade.exitPrice,
    symbol: trade.symbol || session.symbol,
  }));
}

function BacktestSessionDashboard({ session, onBack, onContinue }) {
  const trades = useMemo(() => mapSessionTrades(session), [session]);
  const stats = session.stats || {};
  const realizedPnL = Number(stats.realizedPnL || 0);

  return (
    <section className="backtest-review-page">
      <div className="backtest-review-header">
        <div>
          <h2>{session.sessionName || 'Backtest session'}</h2>
          <p className="backtest-review-symbol">
            <SymbolWithIcon symbol={session.symbol} size="md" />
          </p>
        </div>
        <div className="backtest-review-actions">
          <button type="button" onClick={onBack}>Sessions</button>
          <button type="button" className="is-primary" onClick={() => onContinue(session)}>
            Continue replay
          </button>
        </div>
      </div>

      <StatsCards
        trades={trades}
        currencyCode="USD"
        statsScopeKey={`backtest:${session.id}`}
      />

      <div className="backtest-review-grid">
        <div className="backtest-review-card backtest-review-card--wide">
          <PerformanceChart
            trades={trades}
            currencyCode="USD"
            title="Session P&L Curve"
            groupBy="trade"
          />
        </div>
        <div className="backtest-review-card">
          <ActivityChart trades={trades} currencyCode="USD" />
        </div>
        <div className="backtest-review-card">
          <Radar trades={trades} />
        </div>
        <div className="backtest-review-card backtest-review-summary">
          <h3>Session summary</h3>
          <div>
            <span>Balance</span>
            <strong>{currency.format(Number(stats.currentBalance || session.balance || 0))}</strong>
          </div>
          <div>
            <span>Realized P&L</span>
            <strong className={realizedPnL >= 0 ? 'is-positive' : 'is-negative'}>
              {currency.format(realizedPnL)}
            </strong>
          </div>
          <div>
            <span>Open trades</span>
            <strong>{Number(stats.openTrades || session.openPositions?.length || 0)}</strong>
          </div>
          <div>
            <span>Saved</span>
            <strong>{formatDateTime(session.updatedAt)}</strong>
          </div>
        </div>
      </div>
    </section>
  );
}

function BacktestingPage() {
  const defaultSessionDraft = useMemo(() => {
    return {
      sessionName: '',
      symbol: '',
      startTime: '',
      endTime: '',
      initialBalance: '',
    };
  }, []);
  const [sessionDraft, setSessionDraft] = useState(defaultSessionDraft);
  const [savedSessions, setSavedSessions] = useState(() => readSavedSessions());
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
    state,
    currentCandle,
    journalStatus,
    setField,
    step,
    placeOrder,
    closePosition,
    saveTradeToJournal,
    mergeLoadedCandles,
    startSession,
    resumeSession,
    changeTimeframe,
    hasSession,
    loadStatus,
    stats,
  } = useBacktestSession();
  const {
    data: allInstruments = [],
    isLoading: instrumentsLoading,
    isError: instrumentsLoadError,
  } = useInstruments();
  const instruments = useMemo(() => {
    const bySymbol = new Map();

    [...allInstruments.filter((instrument) => instrument.category === 'crypto'), ...backtestingExtraSymbols]
      .forEach((instrument) => {
        const symbol = String(instrument?.symbol || '').trim().toUpperCase();
        if (!symbol || bySymbol.has(symbol)) return;
        bySymbol.set(symbol, {
          ...instrument,
          symbol,
        });
      });

    return Array.from(bySymbol.values());
  }, [allInstruments]);

  useEffect(() => {
    setSessionDraft(defaultSessionDraft);
  }, [defaultSessionDraft]);

  const updateSessionDraft = useCallback((field, value) => {
    setSessionDraft((previous) => ({
      ...previous,
      [field]: value,
    }));
  }, []);

  const handleCreateSession = useCallback(async (event) => {
    event.preventDefault();
    const start = new Date(sessionDraft.startTime);
    const end = new Date(sessionDraft.endTime);
    const initialBalance = Number(sessionDraft.initialBalance);

    if (!sessionDraft.sessionName.trim()) {
      setSessionError('Session name required hai.');
      return;
    }
    if (!sessionDraft.symbol.trim()) {
      setSessionError('Symbol required hai.');
      return;
    }
    if (instrumentsLoading) {
      setSessionError('Symbols are still loading. Please try again in a moment.');
      return;
    }
    if (instrumentsLoadError) {
      setSessionError('Symbol list load nahi ho payi. Please reload and try again.');
      return;
    }
    if (!isAllowedInstrumentSymbol(instruments, sessionDraft.symbol)) {
      setSessionError('Symbol not available');
      return;
    }
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setSessionError('Start aur end time valid hone chahiye.');
      return;
    }
    if (start >= end) {
      setSessionError('End time start time ke baad hona chahiye.');
      return;
    }
    if (!Number.isFinite(initialBalance) || initialBalance <= 0) {
      setSessionError('Initial balance positive number hona chahiye.');
      return;
    }

    setSessionError('');
    try {
      const startedSession = await startSession({
        ...sessionDraft,
        sessionId: `bt-${Date.now()}`,
        sessionName: sessionDraft.sessionName.trim(),
        symbol: sessionDraft.symbol.trim().toUpperCase(),
        timeframe: '1m',
        initialBalance,
      });
      setActiveView('chart');
      setIsCreateSessionModalOpen(false);
      if (startedSession?.sessionId) {
        setSavedSessions((previous) => {
          const created = {
            id: startedSession.sessionId,
            sessionId: startedSession.sessionId,
            ...startedSession,
            stats: {
              currentBalance: initialBalance,
              realizedPnL: 0,
              unrealizedPnL: 0,
              winRate: 0,
              profitFactor: 0,
              totalTrades: 0,
              openTrades: 0,
            },
            balance: initialBalance,
            openPositions: [],
            closedPositions: [],
            orders: [],
            journalDrafts: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          const nextSessions = [created, ...previous.filter((session) => session.id !== created.id)];
          writeSavedSessions(nextSessions);
          return nextSessions;
        });
      }
    } catch (error) {
      const status = error?.response?.status;
      setSessionError(
        status === 404
          ? 'OHLCV chunk API backend par available nahi hai. Backend server restart karke phir try karein.'
          : error?.response?.data?.error || error?.message || 'Session load nahi ho paya.'
      );
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
    } catch (error) {
      setSessionError(error?.response?.data?.error || error?.message || 'Saved session open nahi ho paya.');
    }
  }, [resumeSession]);

  const handleRenameSavedSession = useCallback((session) => {
    const nextName = window.prompt('Rename session', session.sessionName || '');
    if (nextName === null) return;

    const trimmedName = nextName.trim();
    if (!trimmedName) return;

    setSavedSessions((previous) => {
      const nextSessions = previous.map((item) => (
        item.id === session.id
          ? { ...item, sessionName: trimmedName, updatedAt: new Date().toISOString() }
          : item
      ));
      writeSavedSessions(nextSessions);
      return nextSessions;
    });

    if (state.sessionId === session.id) {
      setField('sessionName', trimmedName);
    }
  }, [setField, state.sessionId]);

  const handleDeleteSavedSession = useCallback((session) => {
    const shouldDelete = window.confirm(`Delete "${session.sessionName || 'this session'}"?`);
    if (!shouldDelete) return;

    deletedSessionIdsRef.current.add(session.id);

    setSavedSessions((previous) => {
      const nextSessions = previous.filter((item) => item.id !== session.id);
      writeSavedSessions(nextSessions);
      return nextSessions;
    });

    if (reviewSessionId === session.id) {
      setReviewSessionId('');
      setActiveView('library');
    }
  }, [reviewSessionId]);

  useEffect(() => {
    if (!hasSession || !state.sessionId) return undefined;
    if (deletedSessionIdsRef.current.has(state.sessionId)) return undefined;

    const timeoutId = window.setTimeout(() => {
      setSavedSessions((previous) => {
        const previousSession = previous.find((session) => session.id === state.sessionId);
        const savedSession = buildSavedSession(state, stats, currentCandle, previousSession);
        const nextSessions = [
          savedSession,
          ...previous.filter((session) => session.id !== state.sessionId),
        ];
        writeSavedSessions(nextSessions);
        return nextSessions;
      });
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [currentCandle, hasSession, state, stats]);

  const reviewSession = useMemo(() => (
    savedSessions.find((session) => session.id === reviewSessionId) || savedSessions[0] || null
  ), [reviewSessionId, savedSessions]);

  const startBottomResize = useCallback((event) => {
    event.preventDefault();
    const startY = event.clientY;
    const startHeight = bottomPanelHeight;
    document.body.classList.add('backtest-is-resizing');

    const handlePointerMove = (moveEvent) => {
      const nextHeight = Math.min(460, Math.max(96, startHeight + startY - moveEvent.clientY));
      setBottomPanelHeight(nextHeight);
      setBottomPanelState('open');
    };

    const handlePointerUp = () => {
      document.body.classList.remove('backtest-is-resizing');
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp, { once: true });
  }, [bottomPanelHeight]);

  const startOrderResize = useCallback((event) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = orderPanelWidth;
    document.body.classList.add('backtest-is-resizing');

    const handlePointerMove = (moveEvent) => {
      setOrderPanelWidth(Math.min(430, Math.max(260, startWidth + startX - moveEvent.clientX)));
    };

    const handlePointerUp = () => {
      document.body.classList.remove('backtest-is-resizing');
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp, { once: true });
  }, [orderPanelWidth]);

  return (
    <MainContentWrapper className={activeView === 'library' ? 'backtesting-page backtesting-page--library' : 'backtesting-page'}>
      {activeView === 'library' && (
        <PageHeader
          title="Backtesting"
          actions={(
            <div className="backtest-header-actions">
              <div className="backtest-header-total">
                <span>Total sessions</span>
                <strong>{savedSessions.length.toLocaleString('en-US')}</strong>
              </div>
              <button
                className="backtest-session-submit backtest-session-submit--header"
                type="button"
                onClick={() => {
                  setSessionError('');
                  setSessionDraft(defaultSessionDraft);
                  setIsCreateSessionModalOpen(true);
                }}
                disabled={loadStatus === 'loading'}
              >
                <span>Create session</span>
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            </div>
          )}
        />
      )}

      <div className={isCreateSessionModalOpen ? 'backtest-terminal is-modal-open' : 'backtest-terminal'}>
        {activeView === 'library' ? (
          <div className="backtest-session-shell backtest-session-shell--results-only">
            <div className="backtest-session-column backtest-session-column--results">
              <section className="backtest-session-card backtest-session-card--saved">
                <div className="backtest-session-card__header backtest-session-card__header--inline">
                  <div className="backtest-saved-heading">
                    <span className="backtest-saved-heading__mark" aria-hidden="true" />
                    <div>
                      <strong>Saved sessions</strong>
                    </div>
                  </div>
                </div>

                <div className="backtest-saved-session-list">
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
                    <div className="backtest-session-empty">
                      Create a session. It will appear here with P&L, win rate and trade stats.
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        ) : activeView === 'review' && reviewSession ? (
          <BacktestSessionDashboard
            session={reviewSession}
            onBack={() => setActiveView('library')}
            onContinue={handleContinueSavedSession}
          />
        ) : !hasSession ? (
          <div className="backtest-session-shell">
            <section className="backtest-session-card">
              <div className="backtest-session-card__header">
                <span>Session setup</span>
                <strong>Create backtest session</strong>
              </div>
              <div className="backtest-session-empty">
                Select a saved session or create a new one first.
              </div>
            </section>
          </div>
        ) : (
        <>
        <div className="backtest-chart-strip">
          <span>{state.sessionName || state.symbol}</span>
          <div>
            <button type="button" onClick={() => setActiveView('library')}>Sessions</button>
            <button type="button" onClick={() => {
              setReviewSessionId(state.sessionId);
              setActiveView('review');
            }}>
              Performance
            </button>
          </div>
        </div>
        <BacktestStatsBar stats={stats} />
        <div
          className={orderPanelOpen ? 'backtest-workspace' : 'backtest-workspace backtest-workspace--full-chart'}
          style={orderPanelOpen ? { '--order-panel-width': `${orderPanelWidth}px` } : undefined}
        >
          <div className="backtest-center">
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
              onSideChange={(value) => setField('selectedOrderSide', value)}
              onOpenOrderPanel={() => setOrderPanelOpen(true)}
              onClosePosition={closePosition}
              isPlaying={state.isPlaying}
              playbackSpeed={state.playbackSpeed}
              onTogglePlay={() => setField('isPlaying', !state.isPlaying)}
              onStep={step}
              onSpeedChange={(value) => setField('playbackSpeed', value)}
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
                onCollapse={() => setBottomPanelState((value) => (value === 'collapsed' ? 'open' : 'collapsed'))}
                onClose={() => setBottomPanelState('hidden')}
                onClosePosition={closePosition}
                onJournalTrade={saveTradeToJournal}
              />
            ) : (
              <button
                className="backtest-panel-restore backtest-panel-restore--bottom"
                type="button"
                onClick={() => setBottomPanelState('open')}
              >
                Show orders
              </button>
            )}
          </div>

          {orderPanelOpen ? (
            <div className="backtest-order-dock" style={{ width: orderPanelWidth }}>
              <button
                className="backtest-pane-resizer backtest-pane-resizer--vertical"
                type="button"
                aria-label="Resize order panel"
                onPointerDown={startOrderResize}
              />
              <BacktestOrderPanel
                state={state}
                currentCandle={currentCandle}
                onClose={() => setOrderPanelOpen(false)}
                onFieldChange={setField}
                onPlaceOrder={placeOrder}
                onJournalTrade={saveTradeToJournal}
              />
            </div>
          ) : (
            <button
              className="backtest-panel-restore backtest-panel-restore--order"
              type="button"
              title="Show order panel"
              aria-label="Show order panel"
              onClick={() => setOrderPanelOpen(true)}
            >
              <PanelRightOpen size={16} aria-hidden="true" />
              Order
            </button>
          )}
        </div>
        </>
        )}

        {journalStatus && <div className="backtest-status-note">{journalStatus}</div>}
      </div>

      {activeView === 'library' && isCreateSessionModalOpen && (
        <div className="backtest-session-modal" role="dialog" aria-modal="true" aria-labelledby="backtest-session-modal-title">
          <button
            className="backtest-session-modal__backdrop"
            type="button"
            aria-label="Close create session"
            onClick={() => setIsCreateSessionModalOpen(false)}
          />
          <section className="backtest-session-card backtest-session-card--setup backtest-session-modal__panel">
            <div className="backtest-session-card__header backtest-session-modal__header">
              <span className="backtest-card-icon"><ChartLine size={16} aria-hidden="true" /></span>
              <div>
                <strong id="backtest-session-modal-title">Create backtest session</strong>
              </div>
              <button
                className="backtest-session-modal__close"
                type="button"
                onClick={() => setIsCreateSessionModalOpen(false)}
              >
                Close
              </button>
            </div>

            <form
              id={BACKTEST_SESSION_FORM_ID}
              className="backtest-session-form"
              onSubmit={handleCreateSession}
              autoComplete="off"
            >
              <label className="backtest-field">
                <input
                  value={sessionDraft.sessionName}
                  onChange={(event) => updateSessionDraft('sessionName', event.target.value)}
                  placeholder="Session name"
                  aria-label="Session name"
                  autoComplete="off"
                />
              </label>

              <BacktestSymbolField
                value={sessionDraft.symbol}
                onChange={(value) => updateSessionDraft('symbol', value)}
                instruments={instruments}
                isLoading={instrumentsLoading}
              />

              <BacktestDateTimeField
                label="Start time"
                value={sessionDraft.startTime}
                onChange={(value) => updateSessionDraft('startTime', value)}
              />

              <BacktestDateTimeField
                label="End time"
                value={sessionDraft.endTime}
                onChange={(value) => updateSessionDraft('endTime', value)}
              />

              <label className="backtest-field">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={sessionDraft.initialBalance}
                  onChange={(event) => updateSessionDraft('initialBalance', event.target.value)}
                  placeholder="Initial balance"
                  aria-label="Initial balance"
                  autoComplete="off"
                />
              </label>

              {sessionError && <div className="backtest-order-errors">{sessionError}</div>}

              <button className="backtest-session-submit" type="submit" disabled={loadStatus === 'loading'}>
                <span>{loadStatus === 'loading' ? 'Loading session...' : 'Create session'}</span>
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            </form>
          </section>
        </div>
      )}
    </MainContentWrapper>
  );
}

export default BacktestingPage;

