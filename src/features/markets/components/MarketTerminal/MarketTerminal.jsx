import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, ChevronUp, RefreshCw, Settings, X } from '@/icons/lucideIcons';
import MainContentWrapper from '@/components/Layout/MainContentWrapper';
import PageHeader from '@/components/Layout/PageHeader';
import SymbolWithIcon from '@/components/Common/SymbolWithIcon/SymbolWithIcon';
import { ChartLayoutPicker } from '../TradingChart/TradingChartChrome';
import { useAppDialog } from '@/context/AppDialogContext';
import api from '@/utils/common/serve';
import { formatTradePrice } from '@/utils/trading/tradeCalculations';
import { subscribeMarketStream } from './marketStream';

import PriceAlertsDrawer from './alerts/components/PriceAlertsDrawer';
import { ALERTS_STORAGE_KEY } from './alerts/constants/alertConstants';
import { loadSavedAlerts } from './alerts/utils/alertStorage';
import { playAlertSound } from './alerts/utils/alertAudio';

import { useInstruments } from '@/hooks/useInstruments';
import { useUserSettings } from '@/hooks/useUserSettings';
import { saveUserSettings } from '@/utils/user/userSettings';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui';
import { ACTIVE_SYMBOL_STORAGE_KEY, DEFAULT_SYMBOL, LAYOUTS, MAX_CHARTS, WATCHLIST_SYMBOLS_STORAGE_KEY } from './utils/marketTerminalConstants';
import { instrumentDigitsCache, readInstrumentDigits } from './utils/instrumentDigits';
import {
  buildPrioritizedSymbolOptions, buildWatchlistSections, createChartId,
  enrichQuoteTodayDirection, getLocalDateKey, getPointerDropTarget,
  getRequestSymbol, normalizeStreamQuote, normalizeStreamSymbol,
  readDraggedSymbol, readStoredActiveSymbol, readStoredWatchlistSymbols, resolveWatchlistSymbols
} from './utils/terminalHelpers';

import Chart from '../TradingChart/Chart';
import AddChartSymbolPicker from './components/ChartPane/AddChartSymbolPicker';
import WatchlistPanel from './components/Watchlist/WatchlistPanel';
import OrderPanel from './components/OrderPanel/OrderPanel';
import PositionsPanel from './components/PositionsPanel/PositionsPanel';
import TerminalSettingsModal from './components/Settings/TerminalSettingsModal';

const readBoolStorage = (key, def = true) => {
  try {
    const saved = window.localStorage.getItem(key);
    return saved !== null ? JSON.parse(saved) : def;
  } catch {
    return def;
  }
};

function MarketTerminal({ pageActive = true }) {
  const navigate = useNavigate();
  const { data: userSettings } = useUserSettings();
  const [selectedWatchlistSymbols, setSelectedWatchlistSymbols] = useState(readStoredWatchlistSymbols);
  const [charts, setCharts] = useState(() => [{ id: createChartId(), symbol: readStoredActiveSymbol(), interval: '1minute' }]);
  const [activeChartId, setActiveChartId] = useState(charts[0].id);
  const [layout, setLayout] = useState('1');
  const [fitNonce, setFitNonce] = useState(0);
  const [quotes, setQuotes] = useState({});
  const [chartAreaDragActive, setChartAreaDragActive] = useState(false);
  const [pointerDrag, setPointerDrag] = useState(null);
  const pointerDragRef = useRef(null);
  const suppressWatchlistClickRef = useRef(false);
  const [layoutResetKey, setLayoutResetKey] = useState(0);
  const resetSizes = useCallback(() => setLayoutResetKey((k) => k + 1), []);
  const watchlistQuoteBufferRef = useRef({});
  const watchlistQuoteFlushTimerRef = useRef(null);
  const watchlistTodayBaselineRef = useRef({ dateKey: getLocalDateKey(), prices: {}, dailyReferences: {} });
  const [headerExpanded, setHeaderExpanded] = useState(false);

  const [showWatchlist, setShowWatchlist] = useState(() => readBoolStorage('market_terminal_show_watchlist'));
  const [showOrderPanel, setShowOrderPanel] = useState(() => readBoolStorage('market_terminal_show_order'));
  const [showPositionsPanel, setShowPositionsPanel] = useState(() => readBoolStorage('market_terminal_show_positions'));

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAlertsDrawer, setShowAlertsDrawer] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const alertsRef = useRef(alerts);
  const prevPricesRef = useRef({});
  const { notify } = useAppDialog();

  useEffect(() => {
    alertsRef.current = alerts;
  }, [alerts]);

  useEffect(() => {
    let cancelled = false;
    api.get('/notifications/alerts')
      .then((res) => {
        if (!cancelled && Array.isArray(res.data?.alerts)) setAlerts(res.data.alerts);
      })
      .catch(() => null);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (showAlertsDrawer && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => null);
    }
  }, [showAlertsDrawer]);

  useEffect(() => {
    try {
      window.localStorage.setItem('market_terminal_show_watchlist', JSON.stringify(showWatchlist));
      window.localStorage.setItem('market_terminal_show_order', JSON.stringify(showOrderPanel));
      window.localStorage.setItem('market_terminal_show_positions', JSON.stringify(showPositionsPanel));
    } catch {}
  }, [showWatchlist, showOrderPanel, showPositionsPanel]);

  const activeChart = charts.find((item) => item.id === activeChartId) || charts[0];
  const activeSymbol = activeChart?.symbol || DEFAULT_SYMBOL;
  const activeQuote = quotes[activeSymbol];
  const selectedLayout = LAYOUTS.find((item) => item.value === layout) || LAYOUTS[0];

  const visibleCharts = useMemo(() => {
    if (charts.length <= selectedLayout.capacity) return charts;
    const activeIndex = charts.findIndex((item) => item.id === activeChartId);
    if (activeIndex >= 0 && activeIndex < selectedLayout.capacity) return charts.slice(0, selectedLayout.capacity);
    if (selectedLayout.capacity === 1) return activeChart ? [activeChart] : charts.slice(0, 1);
    return [...charts.slice(0, selectedLayout.capacity - 1), activeChart].filter(Boolean);
  }, [activeChart, activeChartId, charts, selectedLayout.capacity]);

  const compact = visibleCharts.length > 1;
  const { data: dbInstruments = [] } = useInstruments('', { limit: 250 });

  const allAvailableSymbols = useMemo(() => {
    const bySymbol = new Map();
    dbInstruments.forEach((item) => {
      const key = normalizeStreamSymbol(getRequestSymbol(item));
      if (key && !bySymbol.has(key)) bySymbol.set(key, item);
    });
    return Array.from(bySymbol.values());
  }, [dbInstruments]);

  const instrumentDigitsBySymbol = useMemo(() => {
    const digitsMap = {};
    allAvailableSymbols.forEach((item) => {
      const key = normalizeStreamSymbol(getRequestSymbol(item));
      const digits = Number(item?.digits ?? item?.priceDigits ?? item?.precision);
      if (key && Number.isInteger(digits) && digits >= 0 && digits <= 8) {
        digitsMap[key] = digits;
        instrumentDigitsCache.set(key, digits);
      }
    });
    return digitsMap;
  }, [allAvailableSymbols]);

  const selectedWatchlistItems = useMemo(() => resolveWatchlistSymbols(allAvailableSymbols, selectedWatchlistSymbols), [allAvailableSymbols, selectedWatchlistSymbols]);
  const watchlistSections = useMemo(() => buildWatchlistSections(selectedWatchlistItems), [selectedWatchlistItems]);
  const watchlistSymbolsKey = useMemo(() => Array.from(new Set(watchlistSections.flatMap((s) => s.rows.map((r) => r.requestSymbol)).filter(Boolean))).sort().join(','), [watchlistSections]);
  const addChartSymbolOptions = useMemo(() => buildPrioritizedSymbolOptions(allAvailableSymbols, selectedWatchlistSymbols, ''), [allAvailableSymbols, selectedWatchlistSymbols]);

  const handleAddAlert = useCallback(({ symbol, targetPrice, condition, note }) => {
    const priceNum = Number(targetPrice);
    if (!Number.isFinite(priceNum) || priceNum <= 0) return;
    const currentQuote = quotes[symbol] || (activeSymbol === symbol ? activeQuote : null);
    const currPrice = Number(currentQuote?.last ?? currentQuote?.bid ?? currentQuote?.ask ?? 0);
    const finalCondition = condition || (priceNum >= currPrice ? 'ABOVE' : 'BELOW');
    const payload = { symbol, targetPrice: priceNum, condition: finalCondition, note: note || '' };
    api.post('/notifications/alerts', payload)
      .then((res) => {
        if (res.data?.alert) {
          setAlerts((prev) => [res.data.alert, ...prev.filter((a) => a.id !== res.data.alert.id)]);
          const digits = readInstrumentDigits(instrumentDigitsBySymbol, symbol);
          notify?.(`Alert created for ${symbol} at ${formatTradePrice(priceNum, digits)}`, 'info');
        }
      })
      .catch(() => {
        notify?.('Failed to create price alert', 'error');
      });
  }, [activeQuote, activeSymbol, instrumentDigitsBySymbol, notify, quotes]);

  const handleDeleteAlert = useCallback((alertId) => {
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    api.delete(`/notifications/alerts/${alertId}`).catch(() => null);
  }, []);

  const handleClearTriggeredAlerts = useCallback(() => {
    setAlerts((prev) => prev.filter((a) => a.status !== 'TRIGGERED'));
    api.delete('/notifications/alerts/triggered').catch(() => null);
  }, []);

  const handleUpdateAlertPrice = useCallback((alertId, newTargetPrice) => {
    const priceNum = Number(newTargetPrice);
    if (!Number.isFinite(priceNum) || priceNum <= 0) return;
    setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, targetPrice: priceNum } : a)));
  }, []);

  useEffect(() => {
    if (userSettings?.watchlistSymbols && Array.isArray(userSettings.watchlistSymbols) && userSettings.watchlistSymbols.length > 0) {
      setSelectedWatchlistSymbols(userSettings.watchlistSymbols);
    }
    if (userSettings?.activeSymbol) {
      const dbSymbol = normalizeStreamSymbol(userSettings.activeSymbol);
      if (dbSymbol) setCharts((cur) => cur.map((c, idx) => (idx === 0 ? { ...c, symbol: dbSymbol } : c)));
    }
  }, [userSettings]);

  useEffect(() => {
    try {
      window.localStorage.setItem(WATCHLIST_SYMBOLS_STORAGE_KEY, JSON.stringify(selectedWatchlistSymbols));
      if (activeSymbol) window.localStorage.setItem(ACTIVE_SYMBOL_STORAGE_KEY, activeSymbol);
    } catch {}
    saveUserSettings({ watchlistSymbols: selectedWatchlistSymbols, activeSymbol }).catch(() => null);
  }, [selectedWatchlistSymbols, activeSymbol]);

  const updateActiveChart = useCallback((patch) => {
    setCharts((cur) => cur.map((item) => (item.id === activeChartId ? { ...item, ...patch } : item)));
  }, [activeChartId]);

  const addWatchlistSymbol = useCallback((symbol) => {
    const normalized = normalizeStreamSymbol(symbol);
    if (!normalized) return;
    setSelectedWatchlistSymbols((cur) => cur.some((item) => normalizeStreamSymbol(item) === normalized) ? cur : [...cur, normalized]);
  }, []);

  const removeWatchlistSymbol = useCallback((symbol) => {
    const normalized = normalizeStreamSymbol(symbol);
    if (!normalized) return;
    setSelectedWatchlistSymbols((cur) => cur.filter((item) => normalizeStreamSymbol(item) !== normalized));
  }, []);

  const handleSelectWatchlistSymbol = useCallback((symbol) => {
    if (suppressWatchlistClickRef.current) return;
    updateActiveChart({ symbol });
  }, [updateActiveChart]);

  const handleCloseWatchlist = useCallback(() => setShowWatchlist(false), []);

  const flushWatchlistQuotes = useCallback(() => {
    watchlistQuoteFlushTimerRef.current = null;
    const buffered = watchlistQuoteBufferRef.current;
    watchlistQuoteBufferRef.current = {};
    if (Object.keys(buffered).length === 0) return;
    setQuotes((cur) => ({ ...cur, ...buffered }));
  }, []);

  const queueWatchlistQuote = useCallback((symbol, quote) => {
    watchlistQuoteBufferRef.current[symbol] = enrichQuoteTodayDirection(symbol, quote, watchlistTodayBaselineRef);
    if (watchlistQuoteFlushTimerRef.current) return;
    watchlistQuoteFlushTimerRef.current = window.setTimeout(flushWatchlistQuotes, 80);
  }, [flushWatchlistQuotes]);

  const handleQuote = useCallback((symbol, tick) => {
    if (!symbol || !tick) return;
    const digits = readInstrumentDigits(instrumentDigitsBySymbol, symbol);
    queueWatchlistQuote(symbol, normalizeStreamQuote(tick, digits));
  }, [instrumentDigitsBySymbol, queueWatchlistQuote]);

  useEffect(() => () => {
    if (watchlistQuoteFlushTimerRef.current) {
      window.clearTimeout(watchlistQuoteFlushTimerRef.current);
      watchlistQuoteFlushTimerRef.current = null;
    }
    pointerDragRef.current = null;
  }, []);

  useEffect(() => {
    if (!pageActive || !watchlistSymbolsKey) return undefined;
    const requestSymbols = watchlistSymbolsKey.split(',').filter(Boolean);
    const requestKeyBySymbol = new Map(requestSymbols.map((s) => [normalizeStreamSymbol(s), s]));
    let cancelled = false;

    api.get('/market-chart/watchlist-quotes', { params: { symbols: requestSymbols.join(',') } })
      .then((res) => {
        if (cancelled || !res.data?.quotes) return;
        const nextQuotes = {};
        for (const [key, value] of Object.entries(res.data.quotes)) {
          const requestSymbol = requestKeyBySymbol.get(normalizeStreamSymbol(key)) || key;
          nextQuotes[requestSymbol] = value
            ? enrichQuoteTodayDirection(requestSymbol, normalizeStreamQuote(value, readInstrumentDigits(instrumentDigitsBySymbol, requestSymbol)), watchlistTodayBaselineRef)
            : null;
        }
        setQuotes((cur) => ({ ...cur, ...nextQuotes }));
      }).catch(() => null);

    const unsubscribe = subscribeMarketStream({
      symbols: requestSymbols,
      onAlertTriggered: (serverAlert) => {
        playAlertSound();
        const displayPrice = formatTradePrice(serverAlert.targetPrice, readInstrumentDigits(instrumentDigitsBySymbol, serverAlert.symbol));
        notify?.(`ALERT: ${serverAlert.symbol} hit target price ${displayPrice}!`, 'warning');
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          try { new Notification(`Price Alert: ${serverAlert.symbol}`, { body: `Target price ${displayPrice} reached! ${serverAlert.note || ''}` }); } catch {}
        }
        setAlerts((prev) => [serverAlert, ...prev.filter((a) => a.id !== serverAlert.id)]);
      },
      onTick: (tick) => {
        const requestSymbol = requestKeyBySymbol.get(normalizeStreamSymbol(tick?.symbolName));
        if (!requestSymbol) return;
        const nextQuote = normalizeStreamQuote(tick, readInstrumentDigits(instrumentDigitsBySymbol, requestSymbol));
        queueWatchlistQuote(requestSymbol, nextQuote);

        const currentPrice = Number(nextQuote.last != null ? nextQuote.last : (nextQuote.bid != null ? nextQuote.bid : nextQuote.ask));
        if (Number.isFinite(currentPrice) && currentPrice > 0) {
          const prevPrice = prevPricesRef.current[requestSymbol];
          prevPricesRef.current[requestSymbol] = currentPrice;
          if (Number.isFinite(prevPrice) && prevPrice > 0 && prevPrice !== currentPrice) {
            let triggeredAny = false;
            const updatedAlerts = alertsRef.current.map((alert) => {
              if (alert.status !== 'ACTIVE' || alert.symbol !== requestSymbol) return alert;
              const target = Number(alert.targetPrice);
              if (!Number.isFinite(target)) return alert;
              let isTriggered = false;
              if (alert.condition === 'ABOVE' && prevPrice < target && currentPrice >= target) isTriggered = true;
              else if (alert.condition === 'BELOW' && prevPrice > target && currentPrice <= target) isTriggered = true;
              else if ((prevPrice < target && currentPrice >= target) || (prevPrice > target && currentPrice <= target)) isTriggered = true;

              if (isTriggered) {
                triggeredAny = true;
                playAlertSound();
                const displayPrice = formatTradePrice(target, readInstrumentDigits(instrumentDigitsBySymbol, requestSymbol));
                notify?.(`ALERT: ${alert.symbol} hit target price ${displayPrice}!`, 'warning');
                if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                  try { new Notification(`Price Alert: ${alert.symbol}`, { body: `Target price ${displayPrice} reached! ${alert.note || ''}` }); } catch {}
                }
                return { ...alert, status: 'TRIGGERED', triggeredAt: Date.now(), triggeredPrice: currentPrice };
              }
              return alert;
            });
            if (triggeredAny) setAlerts(updatedAlerts);
          }
        }
      },
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [instrumentDigitsBySymbol, notify, pageActive, queueWatchlistQuote, watchlistSymbolsKey]);

  useEffect(() => {
    if (!pageActive || !activeSymbol || quotes[activeSymbol]) return undefined;
    let cancelled = false;
    api.get('/market-chart/watchlist-quotes', { params: { symbols: activeSymbol } })
      .then((res) => {
        if (cancelled || !res.data?.quotes?.[activeSymbol]) return;
        const rawQuote = res.data.quotes[activeSymbol];
        const digits = readInstrumentDigits(instrumentDigitsBySymbol, activeSymbol);
        const nextQuote = enrichQuoteTodayDirection(activeSymbol, normalizeStreamQuote(rawQuote, digits), watchlistTodayBaselineRef);
        setQuotes((cur) => (cur[activeSymbol] ? cur : { ...cur, [activeSymbol]: nextQuote }));
      }).catch(() => null);
    return () => { cancelled = true; };
  }, [activeSymbol, instrumentDigitsBySymbol, pageActive, quotes]);

  const addChart = useCallback((symbol) => {
    const normalized = normalizeStreamSymbol(symbol);
    if (!normalized) return;
    setCharts((cur) => {
      if (cur.length >= MAX_CHARTS) return cur;
      const nextChart = { id: createChartId(), symbol: normalized, interval: activeChart?.interval || '1minute' };
      setActiveChartId(nextChart.id);
      return [...cur, nextChart];
    });
  }, [activeChart]);

  const replaceChartSymbol = useCallback((chartId, symbol) => {
    const normalized = normalizeStreamSymbol(symbol);
    if (!normalized) return;
    setActiveChartId(chartId);
    setCharts((cur) => cur.map((c) => (c.id === chartId ? { ...c, symbol: normalized } : c)));
  }, []);

  const handlePointerDragStart = useCallback((event, symbol, label) => {
    const normalized = normalizeStreamSymbol(symbol);
    if (!normalized || pointerDragRef.current) return;
    const { clientX: startX, clientY: startY } = event;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    pointerDragRef.current = { active: false, label: label || normalized, symbol: normalized, startX, startY, x: startX, y: startY };

    const handleMove = (e) => {
      const drag = pointerDragRef.current;
      if (!drag) return;
      if (!drag.active && Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) < 6) return;
      e.preventDefault?.();
      const nextDrag = { ...drag, active: true, x: e.clientX, y: e.clientY };
      pointerDragRef.current = nextDrag;
      setPointerDrag(nextDrag);
      setChartAreaDragActive(Boolean(getPointerDropTarget(e.clientX, e.clientY)));
    };

    const cleanup = () => {
      ['pointermove', 'mousemove'].forEach((evt) => window.removeEventListener(evt, handleMove));
      ['pointerup', 'mouseup'].forEach((evt) => window.removeEventListener(evt, handleUp));
      ['pointercancel', 'blur'].forEach((evt) => window.removeEventListener(evt, handleCancel));
    };

    function handleUp(e) {
      const drag = pointerDragRef.current;
      pointerDragRef.current = null;
      cleanup();
      setPointerDrag(null);
      setChartAreaDragActive(false);
      if (!drag?.active) return;
      suppressWatchlistClickRef.current = true;
      window.setTimeout(() => { suppressWatchlistClickRef.current = false; }, 0);
      const target = getPointerDropTarget(e.clientX, e.clientY);
      if (!target) return;
      const targetId = target.getAttribute('data-chart-id');
      if (targetId) replaceChartSymbol(targetId, drag.symbol);
      else addChart(drag.symbol);
    }

    function handleCancel() {
      pointerDragRef.current = null;
      cleanup();
      setPointerDrag(null);
      setChartAreaDragActive(false);
    }

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleCancel);
  }, [addChart, replaceChartSymbol]);

  const handleChartAreaDrop = useCallback((e) => {
    const symbol = readDraggedSymbol(e);
    if (!symbol) return;
    e.preventDefault();
    setChartAreaDragActive(false);
    addChart(symbol);
  }, [addChart]);

  const closeChart = useCallback((chartId) => {
    setCharts((cur) => {
      if (cur.length === 1) return cur;
      const next = cur.filter((item) => item.id !== chartId);
      if (activeChartId === chartId) setActiveChartId(next[0].id);
      return next;
    });
  }, [activeChartId]);

  const goBack = useCallback(() => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/dashboard');
  }, [navigate]);

  const terminalActions = (
    <div className="flex items-center gap-1 shrink-0">
      <ChartLayoutPicker layout={layout} layouts={LAYOUTS} onLayoutChange={setLayout} />
      <button className="relative inline-flex items-center justify-center w-7 h-7 rounded-md border-0 bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer" onClick={() => setFitNonce((v) => v + 1)} title="Fit active chart" type="button">
        <RefreshCw size={14} aria-hidden="true" />
      </button>
      <button className={`relative inline-flex items-center justify-center w-7 h-7 rounded-md border-0 bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer ${showAlertsDrawer ? 'bg-[var(--bg-hover)] text-[var(--text-primary)]' : ''}`} onClick={() => setShowAlertsDrawer((p) => !p)} title="Price Alerts" type="button">
        <Bell size={14} aria-hidden="true" />
        {alerts.filter((a) => a.status === 'ACTIVE').length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 px-0.5 rounded-full bg-[var(--accent-danger,#ef4444)] text-white text-[9px] font-bold flex items-center justify-center pointer-events-none shadow-sm">
            {alerts.filter((a) => a.status === 'ACTIVE').length}
          </span>
        )}
      </button>
      <button className={`relative inline-flex items-center justify-center w-7 h-7 rounded-md border-0 bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer ${showSettingsModal ? 'bg-[var(--bg-hover)] text-[var(--text-primary)]' : ''}`} onClick={() => setShowSettingsModal((p) => !p)} title="Terminal Settings" type="button">
        <Settings size={14} aria-hidden="true" />
      </button>
      <button className="relative inline-flex items-center justify-center w-7 h-7 rounded-md border-0 bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer" onClick={() => setHeaderExpanded((p) => !p)} title={headerExpanded ? 'Collapse header' : 'Expand header'} type="button">
        {headerExpanded ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
      </button>
    </div>
  );

  return (
    <MainContentWrapper className="flex flex-col h-screen h-[100dvh] max-h-screen max-h-[100dvh] overflow-hidden box-border pt-0 px-2.5 pb-2.5 max-[768px]:pt-[60px] max-[768px]:px-2 max-[768px]:pb-2 max-[520px]:px-1.5 max-[480px]:pb-[calc(82px+env(safe-area-inset-bottom,0px))]">
      {headerExpanded && <PageHeader title="Market Terminal" onBack={goBack} keepVisible className="relative z-10 mb-1.5 shrink-0" actions={terminalActions} />}
      <div className={`relative flex flex-col flex-1 min-w-0 min-h-0 gap-1.5 overflow-hidden ${!headerExpanded ? 'mt-2' : ''}`}>
        <header className="flex items-center justify-between min-h-[38px] rounded-md bg-[var(--bg-card)] shrink-0 overflow-x-auto scrollbar-none z-10">
          <div className="flex items-center min-w-0 flex-1 overflow-x-auto scrollbar-none">
            {charts.map((item) => {
              const tabQuote = quotes[item.symbol || DEFAULT_SYMBOL];
              const tabDirection = tabQuote?.todayDirection === 'down' ? 'down' : 'up';
              const tabPrice = tabQuote?.lastText || tabQuote?.bidText || '-';
              const tabChange = tabQuote?.todayChangePercentText || '0.00%';
              return (
                <button
                  className={`flex items-center gap-2 h-[38px] px-3 border-r border-[var(--border-light)] bg-transparent text-[var(--text-secondary)] text-xs font-semibold cursor-pointer whitespace-nowrap transition-colors select-none shrink-0 group hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] ${item.id === activeChartId ? 'bg-[var(--surface-subtle)] text-[var(--text-primary)]' : ''}`}
                  key={item.id}
                  onClick={() => setActiveChartId(item.id)}
                  type="button"
                >
                  <span className="flex items-center shrink-0">
                    <SymbolWithIcon symbol={item.symbol} size="md" showLabel={false} />
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5">
                      <strong className="text-xs font-bold text-[var(--text-primary)]">{item.symbol}</strong>
                      <span className={`w-1.5 h-1.5 rounded-full ${tabDirection === 'down' ? 'bg-[var(--bear-candle,#f23645)]' : 'bg-[var(--bull-candle,#089981)]'}`} aria-hidden="true" />
                    </span>
                    <span className="flex items-center gap-1.5 text-xs font-semibold font-mono tabular-nums">
                      <span className="text-[var(--text-primary)]">{tabPrice}</span>
                      <span className={`text-[11px] font-medium ${tabDirection === 'down' ? 'text-[var(--bear-candle,#f23645)]' : 'text-[var(--bull-candle,#089981)]'}`}>{tabChange}</span>
                    </span>
                  </span>
                  <span className="text-[10px] uppercase font-bold px-1 py-0.5 rounded bg-[var(--surface-muted-strong)] text-[var(--text-secondary)]">{item.interval}</span>
                  {charts.length > 1 && (
                    <i
                      role="button"
                      tabIndex={0}
                      title="Close chart"
                      className="flex items-center justify-center w-4 h-4 rounded text-[var(--text-muted)] hover:bg-black/10 dark:hover:bg-white/10 hover:text-[var(--text-primary)] transition-colors not-italic ml-1"
                      onClick={(e) => { e.stopPropagation(); closeChart(item.id); }}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); closeChart(item.id); } }}
                    >
                      <X size={12} aria-hidden="true" />
                    </i>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1 px-2 shrink-0">
            <AddChartSymbolPicker disabled={charts.length >= MAX_CHARTS} onSelect={addChart} options={addChartSymbolOptions} />
            {!headerExpanded && (
              <>
                <span className="w-px h-4 bg-[var(--border-light)] mx-0.5 shrink-0" />
                {terminalActions}
              </>
            )}
          </div>
        </header>

        <ResizablePanelGroup key={layoutResetKey} direction="horizontal" className="min-w-0 min-h-0 flex-1 overflow-hidden relative bg-[var(--bg-main)]">
          {showWatchlist && (
            <>
              <ResizablePanel id="market-watchlist" defaultSize="18%" minSize="12%" maxSize="32%" collapsible className="min-w-0 min-h-0 overflow-hidden">
                <WatchlistPanel
                  activeSymbol={activeSymbol}
                  availableSymbols={allAvailableSymbols}
                  onAddSymbol={addWatchlistSymbol}
                  onPointerDragStart={handlePointerDragStart}
                  onRemoveSymbol={removeWatchlistSymbol}
                  onSelectSymbol={handleSelectWatchlistSymbol}
                  quotes={quotes}
                  sections={watchlistSections}
                  onClose={handleCloseWatchlist}
                />
              </ResizablePanel>
              <ResizableHandle className="w-1.5 bg-transparent hover:bg-transparent" />
            </>
          )}

          <ResizablePanel id="market-center" minSize="30%" className="min-w-0 min-h-0 overflow-hidden">
            <ResizablePanelGroup direction="vertical" className="min-w-0 min-h-0 h-full w-full">
              <ResizablePanel id="market-charts" minSize="30%" className="min-w-0 min-h-0 overflow-hidden">
                <main
                  className={`w-full h-full min-w-0 min-h-0 overflow-hidden relative flex flex-col bg-transparent ${chartAreaDragActive ? 'ring-2 ring-inset ring-[var(--primary,#2563eb)] bg-[var(--accent-info-soft)]/20' : ''}`}
                  data-chart-drop-target="area"
                  onDragEnter={(e) => { if (readDraggedSymbol(e)) setChartAreaDragActive(true); }}
                  onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setChartAreaDragActive(false); }}
                  onDragOver={(e) => { if (!readDraggedSymbol(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
                  onDrop={handleChartAreaDrop}
                >
                  <div
                    className="grid gap-1.5 w-full h-full min-w-0 min-h-0 overflow-hidden"
                    style={{
                      gridTemplateColumns: `repeat(${selectedLayout.columns}, minmax(0, 1fr))`,
                      gridTemplateRows: `repeat(${selectedLayout.rows}, minmax(0, 1fr))`
                    }}
                  >
                    {charts.map((item) => {
                      const isGridVisible = visibleCharts.some((vc) => vc.id === item.id);
                      return (
                        <div key={item.id} className={isGridVisible ? 'w-full h-full min-w-0 min-h-0 overflow-hidden relative' : 'hidden'}>
                          <Chart
                            active={item.id === activeChartId}
                            alerts={alerts}
                            availableSymbols={allAvailableSymbols}
                            chart={item}
                            compact={compact}
                            fitNonce={fitNonce}
                            initialQuote={quotes[item.symbol || DEFAULT_SYMBOL]}
                            priceDigits={readInstrumentDigits(instrumentDigitsBySymbol, item.symbol)}
                            layout={layout}
                            onAddAlert={handleAddAlert}
                            onUpdateAlertPrice={handleUpdateAlertPrice}
                            onDeleteAlert={handleDeleteAlert}
                            onLayoutChange={setLayout}
                            pageActive={pageActive && isGridVisible}
                            prioritySymbols={selectedWatchlistSymbols}
                            onActivate={() => setActiveChartId(item.id)}
                            onDropSymbol={(sym) => replaceChartSymbol(item.id, sym)}
                            onIntervalChange={(interval) => {
                              setActiveChartId(item.id);
                              setCharts((cur) => cur.map((c) => (c.id === item.id ? { ...c, interval } : c)));
                            }}
                            onSymbolChange={(sym) => replaceChartSymbol(item.id, sym)}
                            onQuote={handleQuote}
                          />
                        </div>
                      );
                    })}
                  </div>
                </main>
              </ResizablePanel>

              {showPositionsPanel && (
                <>
                  <ResizableHandle className="h-1.5 w-full bg-transparent hover:bg-transparent" />
                  <ResizablePanel id="market-positions" defaultSize="25%" minSize="12%" maxSize="60%" collapsible className="min-w-0 min-h-0 overflow-hidden">
                    <PositionsPanel quote={activeQuote} onClose={() => setShowPositionsPanel(false)} />
                  </ResizablePanel>
                </>
              )}
            </ResizablePanelGroup>
          </ResizablePanel>

          {showOrderPanel && (
            <>
              <ResizableHandle className="w-1.5 bg-transparent hover:bg-transparent" />
              <ResizablePanel id="market-order" defaultSize="20%" minSize="14%" maxSize="35%" collapsible className="min-w-0 min-h-0 overflow-hidden">
                <OrderPanel symbol={activeSymbol} quote={activeQuote} onClose={() => setShowOrderPanel(false)} />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
        {pointerDrag?.active && (
          <div className="fixed top-0 left-0 z-[99999] pointer-events-none flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-medium,#94a3b8)] shadow-lg text-xs font-bold text-[var(--text-primary)]" style={{ transform: `translate(${pointerDrag.x + 12}px, ${pointerDrag.y + 12}px)` }}>
            <SymbolWithIcon symbol={pointerDrag.label} size="md" showLabel={false} />
            <span>{pointerDrag.label}</span>
          </div>
        )}
        <TerminalSettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          showWatchlist={showWatchlist}
          setShowWatchlist={setShowWatchlist}
          showOrderPanel={showOrderPanel}
          setShowOrderPanel={setShowOrderPanel}
          showPositionsPanel={showPositionsPanel}
          setShowPositionsPanel={setShowPositionsPanel}
          onResetLayout={resetSizes}
        />
        <PriceAlertsDrawer
          isOpen={showAlertsDrawer}
          onClose={() => setShowAlertsDrawer(false)}
          alerts={alerts}
          symbols={allAvailableSymbols}
          activeSymbol={activeSymbol}
          activeQuote={activeQuote}
          onAddAlert={handleAddAlert}
          onDeleteAlert={handleDeleteAlert}
          onClearTriggered={handleClearTriggeredAlerts}
          formatPrice={(price, sym) => formatTradePrice(price, readInstrumentDigits(instrumentDigitsBySymbol, sym || activeSymbol))}
        />
      </div>
    </MainContentWrapper>
  );
}

export default MarketTerminal;