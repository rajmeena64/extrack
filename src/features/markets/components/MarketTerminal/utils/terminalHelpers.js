import {
  ACTIVE_SYMBOL_STORAGE_KEY,
  CHART_SYMBOL_DRAG_TYPE,
  DEFAULT_SYMBOL,
  DEFAULT_TERMINAL_LAYOUT,
  DEFAULT_WATCHLIST_SYMBOLS,
  HISTORY_OUTLIER_DEVIATION,
  TERMINAL_LAYOUT_STORAGE_KEY,
  WATCHLIST_PRIORITY,
  WATCHLIST_SECTION_ORDER,
  WATCHLIST_SYMBOLS_STORAGE_KEY,
} from './marketTerminalConstants';
import { inferPriceDigits } from './instrumentDigits';

export const candleChunkCache = new Map();

export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export const readDraggedSymbol = (event) => (
  normalizeStreamSymbol(
    event.dataTransfer?.getData(CHART_SYMBOL_DRAG_TYPE) ||
    event.dataTransfer?.getData('text/plain')
  )
);

export const getPointerDropTarget = (clientX, clientY) => {
  if (typeof document === 'undefined') return null;
  const element = document.elementFromPoint(clientX, clientY);
  return element?.closest?.('[data-chart-drop-target]');
};

export const readStoredTerminalLayout = () => {
  if (typeof window === 'undefined') return DEFAULT_TERMINAL_LAYOUT;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(TERMINAL_LAYOUT_STORAGE_KEY) || '{}');
    const parsedWatchlistWidth = Number(parsed.watchlistWidth);
    return {
      watchlistWidth: Number.isFinite(parsedWatchlistWidth) && parsedWatchlistWidth <= 380
        ? clamp(parsedWatchlistWidth, 260, 380)
        : DEFAULT_TERMINAL_LAYOUT.watchlistWidth,
      orderWidth: clamp(Number(parsed.orderWidth) || DEFAULT_TERMINAL_LAYOUT.orderWidth, 240, 520),
      bottomHeight: clamp(Number(parsed.bottomHeight) || DEFAULT_TERMINAL_LAYOUT.bottomHeight, 120, 380),
    };
  } catch {
    return DEFAULT_TERMINAL_LAYOUT;
  }
};

export const readStoredActiveSymbol = () => {
  if (typeof window === 'undefined') return DEFAULT_SYMBOL;
  try {
    const raw = window.localStorage.getItem(ACTIVE_SYMBOL_STORAGE_KEY);
    return raw ? normalizeStreamSymbol(raw) || DEFAULT_SYMBOL : DEFAULT_SYMBOL;
  } catch {
    return DEFAULT_SYMBOL;
  }
};

export const readStoredWatchlistSymbols = () => {
  if (typeof window === 'undefined') return DEFAULT_WATCHLIST_SYMBOLS;
  try {
    const raw = window.localStorage.getItem(WATCHLIST_SYMBOLS_STORAGE_KEY);
    if (raw === null) return DEFAULT_WATCHLIST_SYMBOLS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_WATCHLIST_SYMBOLS;
    return parsed.map(normalizeStreamSymbol).filter(Boolean);
  } catch {
    return DEFAULT_WATCHLIST_SYMBOLS;
  }
};

export const isFinitePositiveNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0;
};

export const normalizeCandle = (rawCandle) => {
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

export const isCandleNearPrice = (candle, referencePrice, maxDeviation) => {
  const reference = Number(referencePrice);
  if (!candle || !Number.isFinite(reference) || reference <= 0) return true;

  const upperBound = reference * (1 + maxDeviation);
  const lowerBound = reference * (1 - maxDeviation);
  return candle.low >= lowerBound && candle.high <= upperBound;
};

export const getMedianClose = (candles) => {
  if (!candles.length) return null;
  const closes = candles
    .map((candle) => candle.close)
    .filter((close) => Number.isFinite(close))
    .sort((a, b) => a - b);
  return closes.length ? closes[Math.floor(closes.length / 2)] : null;
};

export const cleanCandleSeries = (candles = [], maxDeviation = HISTORY_OUTLIER_DEVIATION) => {
  const normalized = candles
    .map(normalizeCandle)
    .filter(Boolean)
    .sort((a, b) => a.time - b.time);
  const medianClose = getMedianClose(normalized);

  return normalized.filter((candle) => isCandleNearPrice(candle, medianClose, maxDeviation));
};

export const normalizeStreamQuote = (tick, forcedDigits = null) => {
  const bid = Number(tick?.bid);
  const ask = Number(tick?.ask);
  const validBid = Number.isFinite(bid) && bid > 0 ? bid : null;
  const validAsk = Number.isFinite(ask) && ask > 0 ? ask : null;
  const last = validBid !== null && validAsk !== null
    ? (validBid + validAsk) / 2
    : validBid ?? validAsk;
  const databaseDigits = Number(forcedDigits);
  const inferredDigits = inferPriceDigits(tick, validBid, validAsk);
  const priceDigits = Number.isInteger(databaseDigits) && databaseDigits >= 0 && databaseDigits <= 8
    ? databaseDigits
    : Number.isInteger(inferredDigits) && inferredDigits >= 0 && inferredDigits <= 8
      ? inferredDigits
      : 2;
  const format = (value) => {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) return null;
    return Number(value).toFixed(priceDigits);
  };
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

export const getLocalDateKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export const getQuotePriceValue = (quote) => {
  const price = Number(quote?.last ?? quote?.bid ?? quote?.ask);
  return Number.isFinite(price) && price > 0 ? price : null;
};

export const formatSignedPercent = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return '0.00%';
  const normalized = Math.abs(number) < 0.005 ? 0 : number;
  return `${normalized > 0 ? '+' : ''}${normalized.toFixed(2)}%`;
};

export const enrichQuoteTodayDirection = (symbol, quote, baselineRef) => {
  if (!quote) return quote;
  const normalizedSymbol = normalizeStreamSymbol(symbol || quote?.symbolName);
  const price = getQuotePriceValue(quote);
  if (!normalizedSymbol || price === null) return quote;

  const todayKey = getLocalDateKey();
  if (baselineRef.current.dateKey !== todayKey) {
    baselineRef.current = {
      dateKey: todayKey,
      prices: {},
      dailyReferences: baselineRef.current.dailyReferences || {},
    };
  }

  const dailyReferences = baselineRef.current.dailyReferences || {};
  baselineRef.current.dailyReferences = dailyReferences;
  const incomingReference = Number(quote.dailyReferencePrice);
  if (Number.isFinite(incomingReference) && incomingReference > 0) {
    dailyReferences[normalizedSymbol] = incomingReference;
  }
  const dailyReference = Number(dailyReferences[normalizedSymbol]);
  if (Number.isFinite(dailyReference) && dailyReference > 0) {
    const percent = ((price - dailyReference) / dailyReference) * 100;
    return {
      ...quote,
      dailyReferencePrice: dailyReference,
      todayChangePercent: percent,
      todayChangePercentText: formatSignedPercent(percent),
      todayDirection: percent < 0 ? 'down' : 'up',
    };
  }

  const baselinePrices = baselineRef.current.prices;
  if (!Number.isFinite(Number(baselinePrices[normalizedSymbol]))) {
    baselinePrices[normalizedSymbol] = price;
  }
  const baseline = Number(baselinePrices[normalizedSymbol]);
  const percent = baseline > 0 ? ((price - baseline) / baseline) * 100 : 0;
  return {
    ...quote,
    todayChangePercent: percent,
    todayChangePercentText: formatSignedPercent(percent),
    todayDirection: percent < 0 ? 'down' : 'up',
  };
};

export const createChartId = () => (
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `chart-${Date.now()}-${Math.random().toString(16).slice(2)}`
);

export const mergeCandles = (existingCandles = [], newCandles = []) => {
  const byTime = new Map();
  for (const candle of existingCandles) {
    if (Number.isFinite(candle?.time)) byTime.set(candle.time, candle);
  }
  for (const candle of newCandles) {
    if (Number.isFinite(candle?.time)) byTime.set(candle.time, candle);
  }
  return Array.from(byTime.values()).sort((a, b) => a.time - b.time);
};

export const getSeriesPriceFormat = (digits) => {
  const requestedDigits = Number(digits);
  if (Number.isInteger(requestedDigits) && requestedDigits >= 0 && requestedDigits <= 8) {
    return {
      type: 'custom',
      formatter: (value) => Number(value).toFixed(requestedDigits),
      minMove: 10 ** -requestedDigits,
    };
  }

  return {
    type: 'custom',
    formatter: (value) => {
      const num = Number(value);
      if (!Number.isFinite(num)) return '';
      return num.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 8,
        useGrouping: false,
      });
    },
    minMove: 0.00001,
  };
};

export const getItemKey = (item) => String(item?.id || item?.symbol || item || DEFAULT_SYMBOL).toUpperCase();

export const getRequestSymbol = (item) => String(item?.symbol || item || DEFAULT_SYMBOL);

export const normalizeStreamSymbol = (value) => String(value || '').replace(/[^a-z0-9]/gi, '').toUpperCase();

export const getDisplaySymbol = (item) => String(item?.displayName || item?.symbol || item || DEFAULT_SYMBOL);

export const getSymbolSubtitle = (item, symbol) => {
  if (item?.description) return item.description;
  if (item?.displayName) return item.displayName;
  if (item?.baseAsset && item?.quoteAsset) return `${item.baseAsset} / ${item.quoteAsset}`;
  if (item?.assetClass) return item.assetClass;
  return String(symbol || DEFAULT_SYMBOL);
};

export const classifySymbol = (symbol, item = null) => {
  const pt = String(item?.productType || item?.category || '').toLowerCase();
  if (['crypto', 'crypto_spot', 'perpetual'].includes(pt) || pt.includes('crypto')) return 'Crypto';
  if (['forex_cfd', 'forex', 'cfd'].includes(pt) || pt.includes('forex')) return 'Forex & CFD';
  if (['stock_etf', 'stock', 'equity', 'stocks'].includes(pt) || pt.includes('stock')) return 'Stocks & ETFs';
  if (['future', 'futures'].includes(pt) || pt.includes('future')) return 'Futures';
  if (['option', 'options'].includes(pt)) return 'Options';
  if (['bond', 'bonds'].includes(pt)) return 'Bonds';
  return 'Stocks & ETFs';
};

export const getWatchlistSortScore = (row, activeSymbol) => {
  const normalizedSymbol = normalizeStreamSymbol(row.symbol);
  if (normalizedSymbol === normalizeStreamSymbol(activeSymbol)) return -3;
  if (row.hasLiveQuote) return -2;
  return 0;
};

export const sortWatchlistRows = (rows) => [...rows];

export const hasUsableQuote = (quote) => {
  const bid = Number(quote?.bid);
  const ask = Number(quote?.ask);
  return (Number.isFinite(bid) && bid > 0) || (Number.isFinite(ask) && ask > 0);
};

export const buildWatchlistSections = (symbols = []) => {
  const source = Array.isArray(symbols) && symbols.length > 0 ? symbols : [];
  const seen = new Set();
  const grouped = {
    'Forex & CFD': [],
    'Crypto': [],
    'Stocks & ETFs': [],
    'Futures': [],
    'Options': [],
    'Bonds': [],
  };

  for (const item of source) {
    const symbol = getDisplaySymbol(item);
    const requestSymbol = getRequestSymbol(item);
    const uniqueKey = getItemKey(item);
    if (!symbol || !uniqueKey || seen.has(uniqueKey)) continue;
    seen.add(uniqueKey);
    const section = classifySymbol(String(requestSymbol || symbol).replace(/[^a-z0-9]/gi, '').toUpperCase(), item);
    if (!grouped[section]) grouped[section] = [];
    grouped[section].push({
      id: item?.id,
      symbol,
      requestSymbol,
      productType: item?.productType || item?.product_type || (section === 'Crypto' ? 'crypto' : section === 'Forex & CFD' ? 'forex_cfd' : 'stock_etf'),
      assetClass: item?.assetClass || section,
      subtitle: getSymbolSubtitle(item, symbol),
      section,
      hasLiveQuote: item?.hasQuote !== false,
    });
  }

  return WATCHLIST_SECTION_ORDER
    .map((title) => ({ title, rows: (grouped[title] || []).slice(0, 100) }))
    .filter((section) => section.rows.length > 0);
};

export const findSymbolItem = (symbols, symbolValue) => {
  if (!symbolValue) return null;
  const targetKey = String(symbolValue || '').trim().toUpperCase();
  const normalizedTarget = normalizeStreamSymbol(symbolValue);

  return symbols.find((item) => (
    (item?.id && String(item.id).toUpperCase() === targetKey) ||
    (item?.symbol && String(item.symbol).toUpperCase() === targetKey) ||
    (item?.requestSymbol && String(item.requestSymbol).toUpperCase() === targetKey) ||
    normalizeStreamSymbol(getRequestSymbol(item)) === normalizedTarget
  )) || null;
};

export const resolveWatchlistSymbols = (symbols, selectedSymbols = []) => {
  const source = Array.isArray(selectedSymbols) && selectedSymbols.length > 0
    ? selectedSymbols
    : DEFAULT_WATCHLIST_SYMBOLS;
  const seen = new Set();
  return source.reduce((items, symbolValue) => {
    const targetKey = String(symbolValue || '').trim().toUpperCase();
    if (!targetKey || seen.has(targetKey)) return items;
    seen.add(targetKey);
    items.push(findSymbolItem(symbols, symbolValue) || { name: targetKey, symbol: targetKey, requestSymbol: targetKey });
    return items;
  }, []);
};

export const getWatchlistSymbolOptions = (symbols) => {
  const seen = new Set();
  return symbols
    .filter((item) => {
      const key = getItemKey(item);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((left, right) => getDisplaySymbol(left).localeCompare(getDisplaySymbol(right)));
};

export const buildPrioritizedSymbolOptions = (availableSymbols, prioritySymbols = [], selectedSymbol = DEFAULT_SYMBOL) => {
  const allOptions = getWatchlistSymbolOptions(availableSymbols || []);
  const optionBySymbol = new Map(allOptions.map((item) => [getItemKey(item), item]));
  const seen = new Set();
  const options = [];
  const pushSymbol = (symbolValue) => {
    const key = String(symbolValue || '').trim().toUpperCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    options.push(optionBySymbol.get(key) || { name: key, symbol: key, requestSymbol: key });
  };

  pushSymbol(selectedSymbol);
  prioritySymbols.forEach(pushSymbol);
  allOptions.forEach((item) => pushSymbol(getRequestSymbol(item)));
  return options;
};
