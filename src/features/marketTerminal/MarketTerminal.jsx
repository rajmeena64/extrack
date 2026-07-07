import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CandlestickSeries, ColorType, CrosshairMode, createChart } from 'lightweight-charts';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, EllipsisVertical, Grid2x2, Plus, RefreshCw, X } from '../../icons/lucideIcons';
import MainContentWrapper from '../../components/Layout/MainContentWrapper';
import api from '../../utils/serve';
import { CHART_ERROR_MESSAGE, getUserSafeError } from '../../utils/safeErrors';
import { subscribeMarketStream } from './marketStream';
import './MarketTerminal.css';

const INTERVALS = ['1m', '5m', '15m', '1h'];
const DEFAULT_SYMBOL = 'EURUSD';
const INITIAL_CANDLE_LIMIT = 1000;
const HISTORY_CHUNK_LIMIT = 1000;
const PAST_BUFFER_CHUNKS = 2;
const CANDLE_CHUNK_CACHE_MS = 30 * 1000;
const HISTORY_OUTLIER_DEVIATION = 0.4;
const MAX_CHARTS = 8;
const INTERVAL_SECONDS = {
  '1m': 60,
  '5m': 5 * 60,
  '15m': 15 * 60,
  '1h': 60 * 60,
};
const LAYOUTS = [
  { value: '1', label: '1 chart', columns: 1, rows: 1, capacity: 1 },
  { value: '2v', label: '2 vertical', columns: 2, rows: 1, capacity: 2 },
  { value: '2h', label: '2 horizontal', columns: 1, rows: 2, capacity: 2 },
  { value: '4', label: '4 grid', columns: 2, rows: 2, capacity: 4 },
];

const candleChunkCache = new Map();

const isFinitePositiveNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0;
};

const normalizeCandle = (rawCandle) => {
  const time = Math.floor(Number(rawCandle?.time));
  const open = Number(rawCandle?.open);
  const high = Number(rawCandle?.high);
  const low = Number(rawCandle?.low);
  const close = Number(rawCandle?.close);

  if (
    !Number.isFinite(time) ||
    !isFinitePositiveNumber(open) ||
    !isFinitePositiveNumber(high) ||
    !isFinitePositiveNumber(low) ||
    !isFinitePositiveNumber(close)
  ) {
    return null;
  }

  return {
    time,
    open,
    high: Math.max(high, open, close),
    low: Math.min(low, open, close),
    close,
  };
};

const isCandleNearPrice = (candle, referencePrice, maxDeviation) => {
  const reference = Number(referencePrice);
  if (!candle || !Number.isFinite(reference) || reference <= 0) return true;

  const upperBound = reference * (1 + maxDeviation);
  const lowerBound = reference * (1 - maxDeviation);
  return candle.low >= lowerBound && candle.high <= upperBound;
};

const getMedianClose = (candles) => {
  if (!candles.length) return null;
  const closes = candles
    .map((candle) => candle.close)
    .filter((close) => Number.isFinite(close))
    .sort((a, b) => a - b);
  return closes.length ? closes[Math.floor(closes.length / 2)] : null;
};

const cleanCandleSeries = (candles = [], maxDeviation = HISTORY_OUTLIER_DEVIATION) => {
  const normalized = candles
    .map(normalizeCandle)
    .filter(Boolean)
    .sort((a, b) => a.time - b.time);
  const medianClose = getMedianClose(normalized);

  return normalized.filter((candle) => isCandleNearPrice(candle, medianClose, maxDeviation));
};

const normalizeStreamQuote = (tick) => {
  const bid = Number(tick?.bid);
  const ask = Number(tick?.ask);
  const validBid = Number.isFinite(bid) && bid > 0 ? bid : null;
  const validAsk = Number.isFinite(ask) && ask > 0 ? ask : null;
  const last = validBid !== null && validAsk !== null
    ? (validBid + validAsk) / 2
    : validBid ?? validAsk;
  const priceDigits = Number.isFinite(Number(tick?.priceDigits)) ? Number(tick.priceDigits) : 5;
  const format = (value) => (
    value !== null && value !== undefined && Number.isFinite(Number(value))
      ? Number(value).toFixed(priceDigits)
      : null
  );
  const spread = validBid !== null && validAsk !== null ? validAsk - validBid : null;

  return {
    ...tick,
    bid: validBid,
    ask: validAsk,
    bidText: format(validBid),
    askText: format(validAsk),
    spread,
    spreadText: format(spread),
    last,
    lastText: format(last),
    changeText: '-',
    changePercentText: '-',
    priceDigits,
    minMove: 10 ** -priceDigits,
  };
};

const buildStreamCandle = (tick, interval, existingCandles) => {
  const quote = normalizeStreamQuote(tick);
  const price = Number(quote.last);
  if (!Number.isFinite(price) || price <= 0) return null;

  const timestamp = Number(tick?.serverTime || tick?.timestamp || Date.now() / 1000);
  const seconds = timestamp > 1e12 ? Math.floor(timestamp / 1000) : Math.floor(timestamp);
  const bucketSize = INTERVAL_SECONDS[interval] || INTERVAL_SECONDS['1m'];
  const time = Math.floor(seconds / bucketSize) * bucketSize;
  const previous = existingCandles[existingCandles.length - 1];

  if (previous && Number(previous.time) === time) {
    return {
      time,
      open: previous.open,
      high: Math.max(Number(previous.high), price),
      low: Math.min(Number(previous.low), price),
      close: price,
    };
  }

  return { time, open: price, high: price, low: price, close: price };
};

const createChartId = () => (
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `chart-${Date.now()}-${Math.random().toString(16).slice(2)}`
);

const mergeCandles = (existingCandles = [], newCandles = []) => {
  const byTime = new Map();
  for (const candle of existingCandles) {
    if (Number.isFinite(candle?.time)) byTime.set(candle.time, candle);
  }
  for (const candle of newCandles) {
    if (Number.isFinite(candle?.time)) byTime.set(candle.time, candle);
  }
  return Array.from(byTime.values()).sort((a, b) => a.time - b.time);
};

const getSeriesPriceFormat = (quote) => {
  const priceDigits = Number(quote?.priceDigits);
  const minMove = Number(quote?.minMove);
  return {
    type: 'price',
    precision: Number.isFinite(priceDigits) ? priceDigits : 5,
    minMove: Number.isFinite(minMove) && minMove > 0 ? minMove : 0.00001,
  };
};

const getRequestSymbol = (item) => String(item?.requestSymbol || item?.name || item?.symbol || item || DEFAULT_SYMBOL);

const normalizeStreamSymbol = (value) => String(value || '').replace(/[^a-z0-9]/gi, '').toUpperCase();

const getDisplaySymbol = (item) => String(item?.displayName || item?.name || item?.normalizedName || item?.symbol || item || DEFAULT_SYMBOL);

const getSymbolSubtitle = (item, symbol) => (
  item?.description ||
  item?.displayName ||
  item?.assetClass ||
  `${symbol.slice(0, 3)} / ${symbol.slice(3) || 'Market'}`
);

const classifySymbol = (symbol) => {
  if (/^(XAU|XAG|XPT|XPD)/.test(symbol)) return 'Metals';
  if (/^(BTC|ETH|LTC|XRP|SOL|ADA|DOGE)/.test(symbol)) return 'Crypto';
  if (/^[A-Z]{6}$/.test(symbol)) return 'Forex';
  return 'Stocks';
};

const getWatchlistIconClass = (section) => {
  if (section === 'Crypto') return 'is-crypto';
  if (section === 'Metals') return 'is-metal';
  if (section === 'Stocks') return 'is-stock';
  return 'is-forex';
};

const buildWatchlistSections = (symbols, activeSymbol) => {
  const source = symbols.length ? symbols : [{ name: activeSymbol || DEFAULT_SYMBOL }];
  const seen = new Set();
  const grouped = {
    Stocks: [],
    Forex: [],
    Crypto: [],
    Metals: [],
  };

  for (const item of source) {
    const symbol = getDisplaySymbol(item);
    const requestSymbol = getRequestSymbol(item);
    if (!symbol || seen.has(symbol)) continue;
    seen.add(symbol);
    const section = classifySymbol(String(symbol).replace(/[^a-z0-9]/gi, '').toUpperCase());
    grouped[section].push({
      symbol,
      requestSymbol,
      subtitle: getSymbolSubtitle(item, symbol),
      section,
    });
  }

  return ['Stocks', 'Forex', 'Crypto', 'Metals']
    .map((title) => ({ title, rows: grouped[title].slice(0, 5) }))
    .filter((section) => section.rows.length > 0);
};

function ChartPane({ chart, active, compact, fitNonce, pageActive, onActivate, onQuote }) {
  const chartContainerRef = useRef(null);
  const chartApiRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const candlesRef = useRef([]);
  const loadedHistoryKeysRef = useRef(new Set());
  const isLoadingPastRef = useRef(false);
  const isPrefetchingPastRef = useRef(false);
  const pastBufferRef = useRef([]);
  const lastRangeCheckRef = useRef(0);
  const loadPastRef = useRef(null);
  const resetKeyRef = useRef('');
  const hasFitInitialContentRef = useRef(false);
  const hasUserMovedChartRef = useRef(false);
  const wasPageActiveRef = useRef(pageActive);

  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [historyReady, setHistoryReady] = useState(false);
  const [loadingPast, setLoadingPast] = useState(false);
  const [status, setStatus] = useState('Connecting');
  const [error, setError] = useState('');

  const selectedSymbol = chart.symbol || DEFAULT_SYMBOL;
  const interval = chart.interval || '1m';
  const priceFormat = useMemo(() => getSeriesPriceFormat(quote), [quote]);

  const applyCandles = useCallback(({ preserveRange = false, prependedCount = 0, fit = false } = {}) => {
    const chartApi = chartApiRef.current;
    const candleSeries = candleSeriesRef.current;
    if (!chartApi || !candleSeries) return;

    const oldRange = preserveRange ? chartApi.timeScale().getVisibleLogicalRange() : null;
    candleSeries.setData(candlesRef.current);

    if (fit || (!hasFitInitialContentRef.current && candlesRef.current.length > 8)) {
      chartApi.timeScale().fitContent();
      hasFitInitialContentRef.current = true;
    }

    if (oldRange && prependedCount > 0) {
      chartApi.timeScale().setVisibleLogicalRange({
        from: oldRange.from + prependedCount,
        to: oldRange.to + prependedCount,
      });
    }
  }, []);

  const fetchCandlesChunk = useCallback(async ({ endTime, limit, force = false }) => {
    const normalizedLimit = Number(limit || INITIAL_CANDLE_LIMIT);
    const normalizedEndTime = Number.isFinite(Number(endTime)) ? Number(endTime) : 'latest';
    const cacheKey = [selectedSymbol, interval, normalizedEndTime, normalizedLimit].join(':');
    const cached = candleChunkCache.get(cacheKey);

    if (!force && cached && Date.now() - cached.createdAt < CANDLE_CHUNK_CACHE_MS) return cached.promise;

    const promise = api.get('/market-chart/candles', {
      params: {
        symbol: selectedSymbol,
        interval,
        ...(normalizedEndTime !== 'latest' ? { endTime: normalizedEndTime } : {}),
        limit: normalizedLimit,
      },
    }).then((response) => (
      Array.isArray(response.data?.candles)
        ? cleanCandleSeries(response.data.candles)
        : []
    ));

    candleChunkCache.set(cacheKey, { createdAt: Date.now(), promise });
    promise.catch(() => candleChunkCache.delete(cacheKey));
    return promise;
  }, [interval, selectedSymbol]);

  const getPastChunkRequest = useCallback((anchorCandle = candlesRef.current[0]) => {
    if (!anchorCandle) return null;
    const endTime = (Number(anchorCandle.time) * 1000) - 1;
    return { endTime, key: `${selectedSymbol}:${interval}:past:${endTime}` };
  }, [interval, selectedSymbol]);

  const prefetchPastBuffer = useCallback(async () => {
    const requestSessionKey = resetKeyRef.current;
    if (isPrefetchingPastRef.current || isLoadingPastRef.current) return;
    isPrefetchingPastRef.current = true;

    try {
      while (resetKeyRef.current === requestSessionKey && pastBufferRef.current.length < PAST_BUFFER_CHUNKS) {
        const lastBufferedChunk = pastBufferRef.current[pastBufferRef.current.length - 1]?.candles;
        const anchorCandle = lastBufferedChunk?.[0] || candlesRef.current[0];
        const request = getPastChunkRequest(anchorCandle);

        if (
          !request ||
          loadedHistoryKeysRef.current.has(request.key) ||
          pastBufferRef.current.some((buffered) => buffered.key === request.key)
        ) break;

        const chunk = await fetchCandlesChunk({ endTime: request.endTime, limit: HISTORY_CHUNK_LIMIT });
        if (resetKeyRef.current !== requestSessionKey || chunk.length === 0) break;
        pastBufferRef.current = [...pastBufferRef.current, { key: request.key, candles: chunk }];
      }
    } catch {
      pastBufferRef.current = [];
    } finally {
      isPrefetchingPastRef.current = false;
    }
  }, [fetchCandlesChunk, getPastChunkRequest]);

  const loadPastCandles = useCallback(async () => {
    const currentData = candlesRef.current;
    const firstCandle = currentData[0];
    const requestSessionKey = resetKeyRef.current;
    let shouldPrefetchNext = false;
    if (!firstCandle || isLoadingPastRef.current) return;

    const request = getPastChunkRequest();
    if (!request || loadedHistoryKeysRef.current.has(request.key)) return;

    isLoadingPastRef.current = true;
    const bufferedChunkIndex = pastBufferRef.current.findIndex((buffered) => buffered.key === request.key);
    const bufferedChunk = bufferedChunkIndex >= 0 ? pastBufferRef.current[bufferedChunkIndex].candles : null;
    if (!bufferedChunk) {
      setLoadingPast(true);
      setStatus('Loading older');
    }

    try {
      const oldFirstTime = firstCandle.time;
      const oldLength = currentData.length;
      const chunk = bufferedChunk || await fetchCandlesChunk({ endTime: request.endTime, limit: HISTORY_CHUNK_LIMIT });
      loadedHistoryKeysRef.current.add(request.key);
      if (resetKeyRef.current !== requestSessionKey || chunk.length === 0) return;
      if (bufferedChunkIndex >= 0) {
        pastBufferRef.current = pastBufferRef.current.filter((buffered) => buffered.key !== request.key);
      }

      candlesRef.current = mergeCandles(candlesRef.current, chunk);
      const prependedCount = candlesRef.current.filter((candle) => candle.time < oldFirstTime).length;
      applyCandles({
        preserveRange: true,
        prependedCount: prependedCount || Math.max(candlesRef.current.length - oldLength, 0),
      });
      setStatus('Live');
      shouldPrefetchNext = true;
    } catch (requestError) {
      setError(getUserSafeError(requestError, CHART_ERROR_MESSAGE));
      setStatus('Live');
    } finally {
      isLoadingPastRef.current = false;
      setLoadingPast(false);
      if (shouldPrefetchNext && resetKeyRef.current === requestSessionKey) prefetchPastBuffer();
    }
  }, [applyCandles, fetchCandlesChunk, getPastChunkRequest, prefetchPastBuffer]);

  useEffect(() => {
    loadPastRef.current = loadPastCandles;
  }, [loadPastCandles]);

  useEffect(() => {
    if (!chartContainerRef.current) return undefined;

    const chartApi = createChart(chartContainerRef.current, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: '#ffffff' },
        textColor: '#111827',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: '#eef2f7' },
        horzLines: { color: '#f3f4f6' },
      },
      rightPriceScale: {
        borderColor: '#e5e7eb',
        entireTextOnly: true,
        scaleMargins: { top: 0.12, bottom: 0.12 },
      },
      timeScale: {
        borderColor: '#e5e7eb',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 12,
        barSpacing: compact ? 6 : 9,
      },
      crosshair: { mode: CrosshairMode.Normal },
    });

    const candleSeries = chartApi.addSeries(CandlestickSeries, {
      upColor: '#089981',
      downColor: '#f23645',
      wickUpColor: '#089981',
      wickDownColor: '#f23645',
      borderVisible: false,
      priceFormat: getSeriesPriceFormat(),
    });

    chartApiRef.current = chartApi;
    candleSeriesRef.current = candleSeries;

    const handleVisibleRangeChange = (range) => {
      if (!range || !hasUserMovedChartRef.current) return;
      const now = performance.now();
      if (now - lastRangeCheckRef.current < 150) return;
      lastRangeCheckRef.current = now;
      if (range.from < 60) loadPastRef.current?.();
    };

    const markChartMoved = () => {
      hasUserMovedChartRef.current = true;
    };

    const container = chartContainerRef.current;
    chartApi.timeScale().subscribeVisibleLogicalRangeChange(handleVisibleRangeChange);
    container?.addEventListener('wheel', markChartMoved, { passive: true });
    container?.addEventListener('pointerdown', markChartMoved);
    container?.addEventListener('touchstart', markChartMoved, { passive: true });

    return () => {
      chartApi.timeScale().unsubscribeVisibleLogicalRangeChange(handleVisibleRangeChange);
      container?.removeEventListener('wheel', markChartMoved);
      container?.removeEventListener('pointerdown', markChartMoved);
      container?.removeEventListener('touchstart', markChartMoved);
      chartApi.remove();
      chartApiRef.current = null;
      candleSeriesRef.current = null;
    };
  }, [compact, selectedSymbol]);

  useEffect(() => {
    candleSeriesRef.current?.applyOptions({ priceFormat });
  }, [priceFormat]);

  useEffect(() => {
    if (active && fitNonce > 0) chartApiRef.current?.timeScale().fitContent();
  }, [active, fitNonce]);

  useEffect(() => {
    if (!pageActive) return undefined;

    const frameId = window.requestAnimationFrame(() => {
      const container = chartContainerRef.current;
      const chartApi = chartApiRef.current;
      if (!container || !chartApi || !container.clientWidth || !container.clientHeight) return;
      chartApi.resize(container.clientWidth, container.clientHeight);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [compact, pageActive]);

  useEffect(() => {
    const wasActive = wasPageActiveRef.current;
    wasPageActiveRef.current = pageActive;
    if (!pageActive || wasActive || !historyReady || candlesRef.current.length === 0) return undefined;

    let cancelled = false;

    async function refreshLatestCandles() {
      try {
        const latestCandles = await fetchCandlesChunk({
          limit: Math.min(INITIAL_CANDLE_LIMIT, 300),
          force: true,
        });
        if (cancelled || latestCandles.length === 0) return;

        candlesRef.current = mergeCandles(candlesRef.current, latestCandles);
        applyCandles({ preserveRange: hasUserMovedChartRef.current });

        if (!hasUserMovedChartRef.current) {
          chartApiRef.current?.timeScale().scrollToRealTime();
        }
      } catch {
        // Keep the cached chart visible; live polling will retry shortly.
      }
    }

    refreshLatestCandles();

    return () => {
      cancelled = true;
    };
  }, [applyCandles, fetchCandlesChunk, historyReady, pageActive]);

  useEffect(() => {
    let cancelled = false;

    async function loadCandles() {
      setLoading(true);
      setLoadingPast(false);
      setHistoryReady(false);
      setQuote(null);
      setError('');
      setStatus('Loading');
      resetKeyRef.current = `${selectedSymbol}:${interval}`;
      loadedHistoryKeysRef.current = new Set();
      isLoadingPastRef.current = false;
      isPrefetchingPastRef.current = false;
      pastBufferRef.current = [];
      hasFitInitialContentRef.current = false;
      hasUserMovedChartRef.current = false;

      try {
        const candles = await fetchCandlesChunk({ limit: INITIAL_CANDLE_LIMIT });
        if (cancelled) return;
        candlesRef.current = candles;
        applyCandles({ fit: true });
        setHistoryReady(candles.length > 0);
        setStatus(candles.length ? 'Live' : 'Waiting');
        window.setTimeout(() => {
          if (!cancelled && resetKeyRef.current === `${selectedSymbol}:${interval}`) prefetchPastBuffer();
        }, 800);
      } catch (requestError) {
        if (!cancelled) {
          setError(getUserSafeError(requestError, CHART_ERROR_MESSAGE));
          setStatus('Offline');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadCandles();
    return () => {
      cancelled = true;
    };
  }, [applyCandles, fetchCandlesChunk, interval, prefetchPastBuffer, selectedSymbol]);

  useEffect(() => {
    if (!historyReady || !pageActive) return undefined;

    return subscribeMarketStream({
      symbols: [selectedSymbol],
      onTick: (tick) => {
        const nextQuote = normalizeStreamQuote(tick);
        const liveCandle = buildStreamCandle(tick, interval, candlesRef.current);
        onQuote(selectedSymbol, nextQuote);
        setQuote(nextQuote);

        if (liveCandle && candleSeriesRef.current) {
          const latestTime = Number(candlesRef.current[candlesRef.current.length - 1]?.time);
          candlesRef.current = mergeCandles(candlesRef.current, [liveCandle]);
          if (Number.isFinite(latestTime) && Number(liveCandle.time) < latestTime) {
            candleSeriesRef.current.setData(candlesRef.current);
          } else {
            candleSeriesRef.current.update(liveCandle);
          }
        }

        setError('');
        setStatus('Live');
      },
      onStatus: (streamStatus) => {
        if (streamStatus === 'connected') setStatus('Subscribed');
        if (streamStatus === 'connecting') setStatus('Connecting');
        if (streamStatus === 'reconnecting') setStatus('Reconnecting');
      },
    });
  }, [historyReady, interval, onQuote, pageActive, selectedSymbol]);

  return (
    <section
      aria-label={`${selectedSymbol} ${interval} chart`}
      className={`market-pane${active ? ' is-active' : ''}`}
      onPointerDown={onActivate}
    >
      <div className="market-pane__header">
        <div className="market-pane__identity">
          <strong>{selectedSymbol}</strong>
          <span>{interval}</span>
          <i className={status === 'Live' ? 'is-live' : ''} />
          <span>{status}</span>
        </div>
        <div className="market-pane__quote">
          <span>B {quote?.bidText || '-'}</span>
          <span>A {quote?.askText || '-'}</span>
          <span>S {quote?.spreadText || '-'}</span>
        </div>
      </div>

      {loading && <div className="market-pane__badge">Loading {selectedSymbol}</div>}
      {loadingPast && <div className="market-pane__badge market-pane__badge--right">Loading history</div>}
      {error && <div className="market-pane__error">{error}</div>}
      <div ref={chartContainerRef} className="market-pane__canvas" />
    </section>
  );
}

function WatchlistRow({ row, quote, active, onSelect }) {
  return (
    <button
      className={`market-watchlist__row${active ? ' is-active' : ''}`}
      onClick={() => onSelect(row.requestSymbol)}
      type="button"
    >
      <span className={`market-watchlist__symbol-icon ${getWatchlistIconClass(row.section)}`}>
        {row.symbol.slice(0, 1)}
      </span>
      <span className="market-watchlist__name">
        <strong>{row.symbol}</strong>
        <small>{row.subtitle}</small>
      </span>
      <span className="market-watchlist__values">
        <span>{quote?.lastText || quote?.bidText || '-'}</span>
        <small className="is-muted">{quote?.changeText || '-'}</small>
        <small className="is-muted">{quote?.changePercentText || '-'}</small>
      </span>
    </button>
  );
}

function WatchlistPanel({ activeSymbol, quotes, sections, onSelectSymbol }) {
  return (
    <aside className="market-watchlist" aria-label="Watchlist">
      <div className="market-watchlist__header">
        <strong>Watchlist</strong>
        <span>
          <button aria-label="Add symbol" type="button"><Plus size={18} aria-hidden="true" /></button>
          <button aria-label="More options" type="button"><EllipsisVertical size={18} aria-hidden="true" /></button>
        </span>
      </div>

      <div className="market-watchlist__body">
        {sections.map((section) => (
          <section className="market-watchlist__section" key={section.title}>
            <div className="market-watchlist__section-title">
              <ChevronDown size={14} aria-hidden="true" />
              <span>{section.title}</span>
            </div>
            {section.rows.map((row) => (
              <WatchlistRow
                active={row.requestSymbol === activeSymbol}
                key={row.symbol}
                onSelect={onSelectSymbol}
                quote={quotes[row.requestSymbol]}
                row={row}
              />
            ))}
          </section>
        ))}
      </div>

      <button className="market-watchlist__add" type="button">
        <Plus size={18} aria-hidden="true" />
        <span>Add symbol</span>
      </button>
    </aside>
  );
}

function MarketTerminal({ pageActive = true }) {
  const navigate = useNavigate();
  const [symbols, setSymbols] = useState([]);
  const [charts, setCharts] = useState([{ id: createChartId(), symbol: DEFAULT_SYMBOL, interval: '1m' }]);
  const [activeChartId, setActiveChartId] = useState(charts[0].id);
  const [layout, setLayout] = useState('1');
  const [fitNonce, setFitNonce] = useState(0);
  const [quotes, setQuotes] = useState({});

  const activeChart = charts.find((item) => item.id === activeChartId) || charts[0];
  const activeSymbol = activeChart?.symbol || DEFAULT_SYMBOL;
  const selectedLayout = LAYOUTS.find((item) => item.value === layout) || LAYOUTS[0];
  const visibleCharts = charts.slice(0, selectedLayout.capacity);
  const compact = visibleCharts.length > 1;
  const watchlistSections = useMemo(() => buildWatchlistSections(symbols, activeSymbol), [activeSymbol, symbols]);

  const updateActiveChart = useCallback((patch) => {
    setCharts((currentCharts) => currentCharts.map((item) => (
      item.id === activeChartId ? { ...item, ...patch } : item
    )));
  }, [activeChartId]);

  const handleSymbols = useCallback((nextSymbols) => {
    setSymbols((currentSymbols) => (currentSymbols.length ? currentSymbols : nextSymbols));
  }, []);

  const handleQuote = useCallback((symbol, tick) => {
    if (!symbol || !tick) return;
    setQuotes((currentQuotes) => ({ ...currentQuotes, [symbol]: tick }));
  }, []);

  useEffect(() => {
    if (!pageActive || symbols.length > 0) return undefined;
    let cancelled = false;

    api.get('/market-chart/live', {
      params: {
        symbol: activeSymbol,
        interval: activeChart?.interval || '1m',
        subscribe: false,
      },
    }).then((response) => {
      if (cancelled) return;
      if (Array.isArray(response.data?.symbols)) handleSymbols(response.data.symbols);
      if (response.data?.quote) handleQuote(activeSymbol, response.data.quote);
    }).catch(() => null);

    return () => {
      cancelled = true;
    };
  }, [activeChart?.interval, activeSymbol, handleQuote, handleSymbols, pageActive, symbols.length]);

  useEffect(() => {
    if (!pageActive || watchlistSections.length === 0) return undefined;

    const requestSymbols = watchlistSections
      .flatMap((section) => section.rows.map((row) => row.requestSymbol))
      .filter(Boolean);
    const requestKeyBySymbol = new Map(
      requestSymbols.map((symbol) => [normalizeStreamSymbol(symbol), symbol])
    );

    return subscribeMarketStream({
      symbols: requestSymbols,
      onTick: (tick) => {
        const requestSymbol = requestKeyBySymbol.get(normalizeStreamSymbol(tick?.symbolName));
        if (!requestSymbol) return;
        const nextQuote = normalizeStreamQuote(tick);
        setQuotes((currentQuotes) => ({ ...currentQuotes, [requestSymbol]: nextQuote }));
      },
    });
  }, [pageActive, watchlistSections]);

  const addChart = useCallback(() => {
    setCharts((currentCharts) => {
      if (currentCharts.length >= MAX_CHARTS) return currentCharts;
      const nextChart = {
        id: createChartId(),
        symbol: activeChart?.symbol || DEFAULT_SYMBOL,
        interval: activeChart?.interval || '1m',
      };
      setActiveChartId(nextChart.id);
      if (currentCharts.length === 1) setLayout('2v');
      if (currentCharts.length === 3) setLayout('4');
      return [...currentCharts, nextChart];
    });
  }, [activeChart]);

  const closeChart = useCallback((chartId) => {
    setCharts((currentCharts) => {
      if (currentCharts.length === 1) return currentCharts;
      const nextCharts = currentCharts.filter((item) => item.id !== chartId);
      if (activeChartId === chartId) setActiveChartId(nextCharts[0].id);
      return nextCharts;
    });
  }, [activeChartId]);

  const goBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate('/dashboard');
  }, [navigate]);

  const workspaceStyle = {
    '--market-grid-columns': selectedLayout.columns,
    '--market-grid-rows': selectedLayout.rows,
  };

  return (
    <MainContentWrapper className="market-terminal-page">
      <div className="market-terminal">
        <div className="market-tabs" aria-label="Open chart tabs">
          <button className="market-back-button" onClick={goBack} title="Back" type="button" aria-label="Back">
            <ArrowLeft size={16} aria-hidden="true" />
            <span>Back</span>
          </button>
          <div className="market-tabs__list">
            {charts.map((item, index) => (
              <button
                className={`market-tab${item.id === activeChartId ? ' is-active' : ''}`}
                key={item.id}
                onClick={() => setActiveChartId(item.id)}
                type="button"
              >
                <em>{index + 1}</em>
                <strong>{item.symbol}</strong>
                <span>{item.interval}</span>
                {charts.length > 1 && (
                  <i
                    role="button"
                    tabIndex={0}
                    title="Close chart"
                    onClick={(event) => {
                      event.stopPropagation();
                      closeChart(item.id);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        event.stopPropagation();
                        closeChart(item.id);
                      }
                    }}
                  >
                    <X size={12} aria-hidden="true" />
                  </i>
                )}
              </button>
            ))}
          </div>
          <button className="market-icon-button" onClick={addChart} title="Add chart" type="button">
            <Plus size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="market-toolbar" aria-label="Chart controls">
          <div className="market-toolbar__left">
            <select
              aria-label="Symbol"
              onChange={(event) => updateActiveChart({ symbol: event.target.value })}
              value={activeChart?.symbol || DEFAULT_SYMBOL}
            >
              {symbols.length === 0 && <option value={activeChart?.symbol || DEFAULT_SYMBOL}>{activeChart?.symbol || DEFAULT_SYMBOL}</option>}
              {symbols.map((item) => (
                <option key={item.id || item.name || item.normalizedName} value={item.name || item.normalizedName}>
                  {item.name || item.normalizedName}
                </option>
              ))}
            </select>
            <select
              aria-label="Interval"
              onChange={(event) => updateActiveChart({ interval: event.target.value })}
              value={activeChart?.interval || '1m'}
            >
              {INTERVALS.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>

          <div className="market-toolbar__right">
            <Grid2x2 size={16} aria-hidden="true" />
            <select aria-label="Chart layout" onChange={(event) => setLayout(event.target.value)} value={layout}>
              {LAYOUTS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
            <button className="market-icon-button" onClick={() => setFitNonce((value) => value + 1)} title="Fit active chart" type="button">
              <RefreshCw size={16} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="market-workspace">
          <div className="market-grid" style={workspaceStyle}>
            {visibleCharts.map((item) => (
              <ChartPane
                active={item.id === activeChartId}
                chart={item}
                compact={compact}
                fitNonce={fitNonce}
                key={item.id}
                pageActive={pageActive}
                onActivate={() => setActiveChartId(item.id)}
                onQuote={handleQuote}
              />
            ))}
          </div>
          <WatchlistPanel
            activeSymbol={activeSymbol}
            onSelectSymbol={(symbol) => updateActiveChart({ symbol })}
            quotes={quotes}
            sections={watchlistSections}
          />
        </div>
      </div>
    </MainContentWrapper>
  );
}

export default MarketTerminal;

