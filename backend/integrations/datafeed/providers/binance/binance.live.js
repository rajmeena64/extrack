const WebSocket = require('ws');
const { getInstrumentBySymbol } = require('../../../../instruments/instrumentRegistry');

const BINANCE_WS_URL = 'wss://stream.binance.com:9443/stream?streams=';

// ─── Constants ───────────────────────────────────────────────────────────────
const MAX_RECONNECT_MS = 10000;
const MAX_STREAMS_PER_CONNECTION = 200;

// ─── State ───────────────────────────────────────────────────────────────────
let socket = null;
let reconnectTimer = null;
let reconnectAttempt = 0;
let stopped = true;
const consumers = new Map();
const streamSubscribers = new Map();
const streamSymbolMap = new Map();
const tickHandlers = new Map();

// ─── Symbol Helpers ──────────────────────────────────────────────────────────
function normalizeSymbol(value) {
  return String(value || '').replace(/[^a-z0-9]/gi, '').toUpperCase();
}

async function isCryptoSymbol(symbol) {
  const clean = normalizeSymbol(symbol);
  if (!clean) return false;
  const instrument = await getInstrumentBySymbol(symbol);
  if (instrument) {
    if (instrument.marketSource === 'entrackcfeed') return false;
    return instrument.marketSource === 'entrackbfeed' || instrument.marketSource === 'binance' || instrument.productType === 'crypto' || instrument.category === 'crypto' || instrument.type === 'crypto';
  }
  return false;
}

/**
 * Resolve Binance-compatible source symbol from database instrument metadata.
 */
async function resolveBinanceSymbol(symbol) {
  const clean = normalizeSymbol(symbol);
  if (!clean) return '';

  const instrument = await getInstrumentBySymbol(symbol);
  if (instrument?.sourceSymbol) {
    return instrument.sourceSymbol;
  }

  return clean;
}

function fromBinanceSymbol(binanceSymbol) {
  return normalizeSymbol(binanceSymbol);
}

// ─── WebSocket Engine ────────────────────────────────────────────────────────

async function buildStreamEntries(symbols) {
  const pairs = await Promise.all(symbols.map(async (symbol) => {
    const binanceSymbol = await resolveBinanceSymbol(symbol);
    if (!binanceSymbol) return null;
    return {
      streamName: `${String(binanceSymbol).toLowerCase()}@miniTicker`,
      platformSymbol: normalizeSymbol(symbol),
    };
  }));

  return pairs.filter(Boolean);
}

function scheduleReconnect() {
  if (stopped || reconnectTimer) return;
  const delay = Math.min(500 * (2 ** reconnectAttempt), MAX_RECONNECT_MS);
  reconnectAttempt += 1;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, delay);
  if (reconnectTimer.unref) reconnectTimer.unref();
}

function applyConsumerStreams(consumerId, streamEntries) {
  const previousStreams = consumers.get(consumerId) ? Array.from(consumers.get(consumerId).streams) : [];
  const nextStreamNames = new Set(streamEntries.map((e) => e.streamName));

  const toSubscribe = [];
  const toUnsubscribe = [];

  for (const entry of streamEntries) {
    let subs = streamSubscribers.get(entry.streamName);
    if (!subs) {
      subs = new Set();
      streamSubscribers.set(entry.streamName, subs);
      streamSymbolMap.set(entry.streamName, entry.platformSymbol);
      toSubscribe.push(entry.streamName);
    }
    subs.add(consumerId);
  }

  for (const streamName of previousStreams) {
    if (nextStreamNames.has(streamName)) continue;
    const subs = streamSubscribers.get(streamName);
    if (!subs) continue;
    subs.delete(consumerId);
    if (subs.size === 0) {
      streamSubscribers.delete(streamName);
      streamSymbolMap.delete(streamName);
      toUnsubscribe.push(streamName);
    }
  }

  if (socket && socket.readyState === WebSocket.OPEN) {
    if (toUnsubscribe.length > 0) {
      socket.send(JSON.stringify({ method: 'UNSUBSCRIBE', params: toUnsubscribe, id: Date.now() }));
    }
    if (toSubscribe.length > 0) {
      socket.send(JSON.stringify({ method: 'SUBSCRIBE', params: toSubscribe, id: Date.now() + 1 }));
    }
  }
}

function normalizeBinanceTick(event) {
  const symbol = fromBinanceSymbol(event.s);
  const close = Number(event.c);
  const open = Number(event.o);
  const high = Number(event.h);
  const low = Number(event.l);
  const volume = Number(event.v || 0);
  const eventTime = Number(event.E);

  if (!symbol || !Number.isFinite(close) || close <= 0) return null;

  return {
    symbol,
    symbolName: symbol,
    bid: close,
    ask: close,
    mid: close,
    open: Number.isFinite(open) ? open : close,
    high: Number.isFinite(high) ? high : close,
    low: Number.isFinite(low) ? low : close,
    close,
    volume,
    timestamp: Number.isFinite(eventTime) && eventTime > 0 ? eventTime : Date.now(),
  };
}

function connect() {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return;
  }

  const allStreams = Array.from(streamSubscribers.keys());
  if (allStreams.length === 0) return;

  const url = `${BINANCE_WS_URL}${allStreams.join('/')}`;
  socket = new WebSocket(url);

  socket.on('open', () => {
    reconnectAttempt = 0;
  });

  socket.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);
      const event = msg.data || msg;
      if (event.e !== '24hrMiniTicker') return;

      const tick = normalizeBinanceTick(event);
      if (!tick) return;

      const streamName = `${String(event.s).toLowerCase()}@miniTicker`;
      const subs = streamSubscribers.get(streamName);
      if (!subs || subs.size === 0) return;

      for (const consumerId of subs) {
        const handler = tickHandlers.get(consumerId);
        if (handler) {
          try {
            handler(tick);
          } catch {
            // Ignore handler errors
          }
        }
      }
    } catch {
      // Ignore parse errors
    }
  });

  socket.on('error', () => {
    if (socket) {
      try { socket.close(); } catch { /* ignore */ }
    }
  });

  socket.on('close', () => {
    socket = null;
    scheduleReconnect();
  });
}

/**
 * Start streaming for a single consumer.
 */
async function startBinanceStream(consumerId, symbols = [], onTick = null) {
  if (!consumerId) throw new Error('startBinanceStream requires a consumerId');

  stopped = false;
  if (onTick) tickHandlers.set(consumerId, onTick);

  const isCryptoFlags = await Promise.all(symbols.map((s) => isCryptoSymbol(s)));
  const cryptoSymbols = symbols.filter((_, idx) => isCryptoFlags[idx]);

  const normalizedSymbols = Array.from(
    new Set(cryptoSymbols.map(normalizeSymbol).filter(Boolean))
  ).slice(0, MAX_STREAMS_PER_CONNECTION);

  const streamEntries = await buildStreamEntries(normalizedSymbols);
  applyConsumerStreams(consumerId, streamEntries);

  consumers.set(consumerId, {
    symbols: new Set(normalizedSymbols),
    streams: new Set(streamEntries.map((e) => e.streamName)),
  });

  if (streamEntries.length > 0) connect();
}

/**
 * Stop streaming for a single consumer.
 */
function stopBinanceStream(consumerId) {
  if (consumerId) {
    applyConsumerStreams(consumerId, []);
    consumers.delete(consumerId);
    tickHandlers.delete(consumerId);
  }

  if (consumers.size > 0) return;

  stopped = true;
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = null;
  streamSubscribers.clear();
  streamSymbolMap.clear();
  if (socket) socket.close(1000, 'No active consumers');
  socket = null;
}

/**
 * Update streaming symbols for a consumer.
 */
async function updateBinanceStreamSymbols(consumerId, symbols = []) {
  if (!consumerId) throw new Error('updateBinanceStreamSymbols requires a consumerId');

  const isCryptoFlags = await Promise.all(symbols.map((s) => isCryptoSymbol(s)));
  const cryptoSymbols = symbols.filter((_, idx) => isCryptoFlags[idx]);

  const normalizedSymbols = Array.from(
    new Set(cryptoSymbols.map(normalizeSymbol).filter(Boolean))
  ).slice(0, MAX_STREAMS_PER_CONNECTION);

  const streamEntries = await buildStreamEntries(normalizedSymbols);

  applyConsumerStreams(consumerId, streamEntries);
  consumers.set(consumerId, {
    symbols: new Set(normalizedSymbols),
    streams: new Set(streamEntries.map((e) => e.streamName)),
  });

  if (streamEntries.length > 0 && !socket && !stopped) connect();
}

module.exports = {
  isCryptoSymbol,
  resolveBinanceSymbol,
  fromBinanceSymbol,
  normalizeSymbol,
  startBinanceStream,
  stopBinanceStream,
  updateBinanceStreamSymbols,
};
