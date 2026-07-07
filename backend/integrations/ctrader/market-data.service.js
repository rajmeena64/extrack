const { CTRADER_INTERVALS, PRICE_SCALE } = require('./constants');
const { ctraderConfig } = require('./state');
const { trendbarToBinanceKline } = require('./symbols.service');

const MAX_PRICE_DIGITS = 8;
const INTERVAL_SECONDS = {
  '1m': 60,
  '3m': 3 * 60,
  '5m': 5 * 60,
  '15m': 15 * 60,
  '30m': 30 * 60,
  '1h': 60 * 60,
  '4h': 4 * 60 * 60,
  '1d': 24 * 60 * 60,
  '1w': 7 * 24 * 60 * 60,
};

function getSymbol(symbolId) {
  return ctraderConfig.symbols.get(Number(symbolId)) || null;
}

function getSymbolName(symbolId) {
  return getSymbol(symbolId)?.name || null;
}

function getSymbolDigits(symbolId) {
  const digits = Number(getSymbol(symbolId)?.digits);
  return Number.isFinite(digits) && digits >= 0 ? Math.min(digits, MAX_PRICE_DIGITS) : null;
}

function countDecimalDigits(value) {
  const price = Number(value);
  if (!Number.isFinite(price)) return 0;

  const text = String(value);
  if (text && !/e/i.test(text)) {
    return Math.min((text.split('.')[1] || '').replace(/0+$/, '').length, MAX_PRICE_DIGITS);
  }

  const fixed = price.toFixed(MAX_PRICE_DIGITS).replace(/0+$/, '').replace(/\.$/, '');
  return Math.min((fixed.split('.')[1] || '').length, MAX_PRICE_DIGITS);
}

function inferPriceDigits(symbolId, ...values) {
  const configured = getSymbolDigits(symbolId);
  const inferred = Math.max(0, ...values.map(countDecimalDigits));
  if (configured === null) return inferred || null;
  return Math.min(Math.max(configured, inferred), MAX_PRICE_DIGITS);
}

function getMinMoveForDigits(digits) {
  return digits === null ? null : Number((10 ** -digits).toFixed(digits));
}

function getMinMove(symbolId) {
  const digits = getSymbolDigits(symbolId);
  return getMinMoveForDigits(digits);
}

function scaledPriceToNumber(value) {
  if (value === undefined || value === null) return null;
  const price = Number(value) / PRICE_SCALE;
  return Number.isFinite(price) ? price : null;
}

function formatPrice(value, symbolId, forcedDigits = undefined) {
  const price = Number(value);
  if (!Number.isFinite(price)) return null;
  const digits = forcedDigits ?? inferPriceDigits(symbolId, price);
  return digits === null ? String(price) : price.toFixed(digits);
}

function scaledPriceToText(value, symbolId) {
  return formatPrice(scaledPriceToNumber(value), symbolId);
}

function roundPrice(value, symbolId, forcedDigits = undefined) {
  const price = Number(value);
  if (!Number.isFinite(price)) return null;
  const digits = forcedDigits ?? inferPriceDigits(symbolId, price);
  return digits === null ? price : Number(price.toFixed(digits));
}

function getServerTimeSeconds(timestamp = Date.now()) {
  const value = Number(timestamp);
  if (!Number.isFinite(value) || value <= 0) return Math.floor(Date.now() / 1000);
  return value > 1e12 ? Math.floor(value / 1000) : Math.floor(value);
}

function getCandleBucketTime(timestampSeconds, interval = '1m') {
  const bucketSize = INTERVAL_SECONDS[interval] || INTERVAL_SECONDS['1m'];
  return Math.floor(Number(timestampSeconds) / bucketSize) * bucketSize;
}

function getClosedHistoryEndTime(interval = '1m') {
  const intervalMs = (INTERVAL_SECONDS[interval] || INTERVAL_SECONDS['1m']) * 1000;
  return Math.floor(Date.now() / intervalMs) * intervalMs - 1;
}

function getQuotePrice(tick) {
  const bid = Number(tick?.bid);
  const ask = Number(tick?.ask);
  if (Number.isFinite(bid) && Number.isFinite(ask)) return (bid + ask) / 2;
  if (Number.isFinite(bid)) return bid;
  if (Number.isFinite(ask)) return ask;
  return null;
}

function buildQuote(tick) {
  if (!tick) return null;
  const symbolId = Number(tick.symbolId);
  const bidValue = Number(tick.bid);
  const askValue = Number(tick.ask);
  const bid = Number.isFinite(bidValue) && bidValue > 0 ? bidValue : null;
  const ask = Number.isFinite(askValue) && askValue > 0 ? askValue : null;
  const lastPrice = getQuotePrice(tick);
  const priceDigits = inferPriceDigits(symbolId, bid, ask, lastPrice);
  const spread = bid !== null && ask !== null ? roundPrice(ask - bid, symbolId, priceDigits) : null;

  return {
    symbolId,
    symbolName: tick.symbolName || getSymbolName(symbolId),
    bid,
    ask,
    bidText: formatPrice(bid, symbolId, priceDigits),
    askText: formatPrice(ask, symbolId, priceDigits),
    spread,
    spreadText: spread === null ? null : formatPrice(spread, symbolId, priceDigits),
    last: roundPrice(lastPrice, symbolId, priceDigits),
    lastText: formatPrice(lastPrice, symbolId, priceDigits),
    changeText: '-',
    changePercentText: '-',
    priceDigits,
    minMove: getMinMoveForDigits(priceDigits),
    serverTime: getServerTimeSeconds(tick.timestamp),
    receivedAt: tick.receivedAt || null,
  };
}

function normalizeSpotEvent(event, toPlain) {
  const symbolId = Number(event.symbolId);
  const bid = scaledPriceToNumber(event.bid);
  const ask = scaledPriceToNumber(event.ask);
  const priceDigits = inferPriceDigits(symbolId, bid, ask);
  const normalized = {
    symbolId,
    symbolName: getSymbolName(symbolId),
    bid,
    ask,
    bidText: formatPrice(bid, symbolId, priceDigits),
    askText: formatPrice(ask, symbolId, priceDigits),
    priceDigits,
    minMove: getMinMoveForDigits(priceDigits),
    timestamp: event.timestamp !== undefined ? Number(event.timestamp) : null,
    serverTime: getServerTimeSeconds(event.timestamp),
    receivedAt: new Date().toISOString(),
  };

  if (Array.isArray(event.trendbar) && event.trendbar.length > 0) {
    normalized.trendbars = event.trendbar.map((trendbar) => ({
      raw: toPlain('ProtoOATrendbar', trendbar),
      candle: trendbarToCandle(trendbar, symbolId),
      kline: trendbarToBinanceKline(trendbar),
    }));
  }

  return normalized;
}

function normalizeDepthQuote(quote, symbolId) {
  const bid = scaledPriceToNumber(quote.bid);
  const ask = scaledPriceToNumber(quote.ask);
  return {
    id: String(quote.id),
    size: quote.size !== undefined ? Number(quote.size) : null,
    bid,
    ask,
    bidText: formatPrice(bid, symbolId),
    askText: formatPrice(ask, symbolId),
  };
}

function buildDepth(depth) {
  if (!depth) return null;
  const quotes = Array.isArray(depth.quotes) ? depth.quotes : [];
  const bids = quotes
    .filter((quote) => Number.isFinite(Number(quote.bid)))
    .sort((a, b) => Number(b.bid) - Number(a.bid));
  const asks = quotes
    .filter((quote) => Number.isFinite(Number(quote.ask)))
    .sort((a, b) => Number(a.ask) - Number(b.ask));

  return {
    symbolId: depth.symbolId,
    symbolName: depth.symbolName,
    bids,
    asks,
    quotes: [...bids, ...asks],
    newQuotes: depth.newQuotes || [],
    deletedQuoteIds: depth.deletedQuoteIds || [],
    receivedAt: depth.receivedAt || null,
  };
}

function normalizeDepthEvent(event) {
  const symbolId = Number(event.symbolId);
  const previous = ctraderConfig.latestDepth.get(symbolId);
  const quoteMap = previous?.quoteMap instanceof Map ? new Map(previous.quoteMap) : new Map();
  const deletedQuoteIds = (event.deletedQuotes || []).map((id) => String(id));
  const newQuotes = (event.newQuotes || []).map((quote) => normalizeDepthQuote(quote, symbolId));

  deletedQuoteIds.forEach((id) => quoteMap.delete(id));
  newQuotes.forEach((quote) => quoteMap.set(quote.id, quote));

  return {
    ...buildDepth({
      symbolId,
      symbolName: getSymbolName(symbolId),
      newQuotes,
      deletedQuoteIds,
      quotes: Array.from(quoteMap.values()),
      receivedAt: new Date().toISOString(),
    }),
    quoteMap,
  };
}

function trendbarToCandle(trendbar, symbolId = null) {
  const low = Number(trendbar.low) / PRICE_SCALE;
  const open = (Number(trendbar.low) + Number(trendbar.deltaOpen || 0)) / PRICE_SCALE;
  const close = (Number(trendbar.low) + Number(trendbar.deltaClose || 0)) / PRICE_SCALE;
  const high = (Number(trendbar.low) + Number(trendbar.deltaHigh || 0)) / PRICE_SCALE;
  const time = Number(trendbar.utcTimestampInMinutes) * 60;

  return {
    time,
    open: roundPrice(open, symbolId),
    high: roundPrice(high, symbolId),
    low: roundPrice(low, symbolId),
    close: roundPrice(close, symbolId),
  };
}

function normalizeCandles(candles = []) {
  const byTime = new Map();
  candles.forEach((candle) => {
    const time = Number(candle?.time);
    const open = Number(candle?.open);
    const high = Number(candle?.high);
    const low = Number(candle?.low);
    const close = Number(candle?.close);
    if (
      Number.isFinite(time) &&
      Number.isFinite(open) &&
      Number.isFinite(high) &&
      Number.isFinite(low) &&
      Number.isFinite(close)
    ) {
      byTime.set(Math.floor(time), { time: Math.floor(time), open, high, low, close });
    }
  });
  return Array.from(byTime.values()).sort((a, b) => a.time - b.time);
}

function buildCurrentCandle({ tick, interval = '1m', previousCandle = null }) {
  if (!tick) return null;
  const symbolId = Number(tick.symbolId);
  const price = roundPrice(getQuotePrice(tick), symbolId);
  if (price === null) return null;

  const bucketTime = getCandleBucketTime(getServerTimeSeconds(tick.timestamp), interval);
  if (previousCandle && Number(previousCandle.time) > bucketTime) return null;

  if (previousCandle && Number(previousCandle.time) === bucketTime) {
    return {
      time: bucketTime,
      open: previousCandle.open,
      high: roundPrice(Math.max(Number(previousCandle.high), price), symbolId),
      low: roundPrice(Math.min(Number(previousCandle.low), price), symbolId),
      close: price,
    };
  }

  return { time: bucketTime, open: price, high: price, low: price, close: price };
}

function getLatestTrendbarCandle(symbolId, interval = '1m') {
  const period = CTRADER_INTERVALS[interval];
  if (!period) return null;
  const latest = ctraderConfig.latestTrendbars.get(`${Number(symbolId)}:${period}`);
  return latest?.candle || null;
}

function buildWatchlistQuotes(symbols = []) {
  return symbols.reduce((quotes, symbol) => {
    const symbolId = Number(symbol.id || symbol.symbolId);
    const quote = buildQuote(ctraderConfig.latestTicks.get(symbolId));
    quotes[symbol.requestSymbol || symbol.name || symbol.normalizedName || String(symbolId)] = quote || {
      symbolId,
      symbolName: symbol.name || null,
      bidText: '-',
      askText: '-',
      spreadText: '-',
      lastText: '-',
      changeText: '-',
      changePercentText: '-',
      priceDigits: getSymbolDigits(symbolId),
      minMove: getMinMove(symbolId),
      serverTime: Math.floor(Date.now() / 1000),
    };
    return quotes;
  }, {});
}

module.exports = {
  buildCurrentCandle,
  buildDepth,
  buildQuote,
  buildWatchlistQuotes,
  formatPrice,
  getClosedHistoryEndTime,
  getLatestTrendbarCandle,
  getMinMove,
  getServerTimeSeconds,
  getSymbolDigits,
  getSymbolName,
  normalizeCandles,
  normalizeDepthEvent,
  normalizeSpotEvent,
  scaledPriceToNumber,
  scaledPriceToText,
  trendbarToCandle,
};
