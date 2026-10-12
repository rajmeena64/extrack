const express = require('express');
const WebSocket = require('ws');
const { authCheck } = require('../../domains/auth/controller');
const { getInstrumentBySymbol, findBySymbol } = require('../../instruments/instrumentRegistry');
const { logInternalError, publicError } = require('../../core/errors/safeErrors');

const databaseProvider = require('./providers/database');
const binanceProvider = require('./providers/binance');
const entrackMicroProvider = require('./providers/entrackmicro');
const pool = require('../../infra/db/supabase');
const ccxtConnector = require('../../brokers/connectors/ccxt');
const { getClient } = require('../../brokers/connectors/ccxt/client');
const publicClients = {};
function getPublicClient(slug) {
  if (!publicClients[slug]) {
    const client = getClient(slug);
    client.options.adjustForTimeDifference = false;
    publicClients[slug] = client;
  }
  return publicClients[slug];
}

const DEFAULT_LIMIT = 1000;
const MAX_SYMBOLS_PER_CLIENT = 500;
const MAX_BUFFERED_BYTES = 1024 * 1024;
const RELAY_CONSUMER_ID = 'datafeed-stream-gateway';


// ============================================================================
// 1. Dynamic Provider Resolver (Single Canonical Source: trading_catalog.instruments)
// ============================================================================
async function resolveProvider(rawSymbol) {
  const symbol = String(rawSymbol || '').trim().toUpperCase();
  const instrument = (await findBySymbol(symbol)) || getInstrumentBySymbol(symbol);

  if (!instrument) {
    const error = new Error(`Symbol '${symbol}' is not found in instrument catalog`);
    error.status = 400;
    throw error;
  }

  const source = String(instrument?.marketSource || '').toLowerCase();
  if (source === 'entrackbfeed') {
    return {
      provider: binanceProvider,
      providerName: 'ENTRACK_B_FEED',
      symbol: instrument.symbol,
      instrument,
    };
  }

  return {
    provider: entrackMicroProvider,
    providerName: 'ENTRACK_C_FEED',
    symbol: instrument.symbol,
    instrument,
  };
}

// ============================================================================
// 2. PATH 1: Universal Candlesticks Service Function (Hybrid Tiered Stitching)
// ============================================================================

async function fetchWithTimeout(promise, ms = 3000) {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`Timed out after ${ms}ms`));
    }, ms);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timer);
  }
}

async function getCandles({ symbol, timeframe = '1m', startTime, endTime, limit, firstDataRequest, uniqueId }) {
  const reqStart = Date.now();
  if (uniqueId) {
    const tTradeLookupStart = Date.now();
    const tradeRes = await pool.query(`
      SELECT t.symbol, t.category, t.product_type, b.slug AS broker
      FROM trading.trades t
      JOIN broker_connections.user_broker_connections c ON c.id = t.broker_connection_id
      JOIN trading_catalog.broker_integrations i ON i.id = c.integration_id
      JOIN trading_catalog.brokers b ON b.id = i.broker_id
      WHERE t.unique_id = $1
      LIMIT 1
    `, [String(uniqueId).trim()]);
    const tTradeLookup = Date.now() - tTradeLookupStart;
    const tradeRow = tradeRes.rows[0];
    if (tradeRow?.broker && ccxtConnector.supports(tradeRow.broker)) {
      try {
        const client = getPublicClient(tradeRow.broker);
        const reqSymbol = tradeRow.symbol || symbol;
        const isPerp = tradeRow.category === 'perpetual';
        client.setMarkets([{
          id: reqSymbol,
          symbol: reqSymbol,
          type: isPerp ? 'swap' : 'spot',
          spot: !isPerp,
          linear: isPerp,
          swap: isPerp,
          contract: isPerp,
        }]);
        const tBrokerStart = Date.now();
        const since = startTime ? Number(startTime) : undefined;
        const extraParams = {
          ...(endTime ? { until: Number(endTime) } : {}),
          type: isPerp ? 'swap' : 'spot',
        };
        const ohlcv = await client.fetchOHLCV(reqSymbol, timeframe, since, Number(limit) || DEFAULT_LIMIT, extraParams);
        const data = ohlcv.map((c) => ({
          time: Math.floor(c[0] / 1000),
          open: Number(c[1]),
          high: Number(c[2]),
          low: Number(c[3]),
          close: Number(c[4]),
          volume: Number(c[5] || 0),
        }));
        const tBroker = Date.now() - tBrokerStart;
        const totalMs = Date.now() - reqStart;
        console.log(`[DATAFEED-PROFILER] ${reqSymbol} [${timeframe}] -> ${data.length} candles provided by ${tradeRow.broker.toUpperCase()} | TradeLookup: ${tTradeLookup}ms | ${tradeRow.broker.toUpperCase()}API: ${tBroker}ms | Total: ${totalMs}ms`);
        return { data, symbol: reqSymbol, source: tradeRow.broker.toUpperCase() };
      } catch (err) {
        logInternalError(null, err, 'datafeed.ccxt_candles_failed', { uniqueId, broker: tradeRow.broker });
      }
    }
  }
  const rawSymbol = String(symbol || '').trim().toUpperCase();

  const tInstStart = Date.now();
  const instrument = await getInstrumentBySymbol(rawSymbol);
  const tInst = Date.now() - tInstStart;

  if (!instrument) {
    const error = new Error(`Symbol '${rawSymbol}' is not found in instrument catalog`);
    error.status = 400;
    throw error;
  }

  const source = String(instrument?.marketSource || '').toLowerCase();
  if (source === 'entrackbfeed') {
    const tBinanceStart = Date.now();
    const data = await binanceProvider.fetchCandles({
      symbol: instrument.symbol,
      timeframe,
      startTime,
      endTime,
      limit,
    });
    const tBinance = Date.now() - tBinanceStart;
    const totalMs = Date.now() - reqStart;
    console.log(`[DATAFEED-PROFILER] ${instrument.symbol} [${timeframe}] -> ${data.length} candles provided by ENTRACK_B_FEED | InstrumentLookup: ${tInst}ms | BinanceAPI: ${tBinance}ms | Total: ${totalMs}ms`);
    return { data, symbol: instrument.symbol, source: 'ENTRACK_B_FEED' };
  }
  const requestedLimit = limit ? Number(limit) : DEFAULT_LIMIT;
  const tTbStart = Date.now();
  try {
    const tbData = await fetchWithTimeout(
      databaseProvider.fetchCandles({
        symbol: instrument.symbol,
        timeframe,
        startTime,
        endTime,
        limit: requestedLimit,
      }),
      3000
    );
    if (Array.isArray(tbData) && tbData.length > 0) {
      const tTb = Date.now() - tTbStart;
      const totalMs = Date.now() - reqStart;
      console.log(`[DATAFEED-PROFILER] ${instrument.symbol} [${timeframe}] -> ${tbData.length} candles provided by TINYBIRD | InstrumentLookup: ${tInst}ms | TinybirdQuery: ${tTb}ms | Total: ${totalMs}ms`);
      return { data: tbData, symbol: instrument.symbol, source: 'TINYBIRD' };
    }
  } catch (tbErr) {
    console.warn(`[DATAFEED] ${instrument.symbol} Tinybird unavailable or timed out (${tbErr.message}), falling back to cTrader...`);
  }
  const tFallbackStart = Date.now();
  const fallbackCandles = await entrackMicroProvider.fetchFromCtrader({
    symbol: instrument.symbol,
    timeframe,
    startTime,
    endTime,
    limit: requestedLimit,
  });
  const tFallback = Date.now() - tFallbackStart;
  const totalMs = Date.now() - reqStart;
  console.log(`[DATAFEED-PROFILER] ${instrument.symbol} [${timeframe}] -> ${fallbackCandles.length} candles provided by CTRADER_FALLBACK | InstrumentLookup: ${tInst}ms | CTraderAPI: ${tFallback}ms | Total: ${totalMs}ms`);
  return { data: fallbackCandles, symbol: instrument.symbol, source: 'CTRADER_FALLBACK' };
}

const router = express.Router();
router.use(authCheck);

router.get('/candles', async (req, res) => {
  const { symbol, timeframe = '1m', startTime, start, endTime, end, limit, firstDataRequest, uniqueId } = req.query;
  if (!symbol && !uniqueId) return res.status(400).json({ success: false, error: 'symbol or uniqueId is required' });
  const effectiveStart = startTime || start;
  const effectiveEnd = endTime || end;
  try {
    const { data, symbol: resolvedSymbol, source } = await getCandles({
      symbol,
      timeframe,
      startTime: effectiveStart,
      endTime: effectiveEnd,
      limit,
      firstDataRequest,
      uniqueId,
    });
    return res.json({
      success: true,
      symbol: resolvedSymbol,
      timeframe: String(timeframe).toLowerCase(),
      startTime: effectiveStart || null,
      endTime: effectiveEnd || null,
      source,
      total: data.length,
      data,
    });
  } catch (err) {
    logInternalError(req, err, 'datafeed.candles_failed', { symbol, timeframe });
    return publicError(res, { status: 503, code: 'CHART_DATA_UNAVAILABLE', req });
  }
});

router.get('/', async (req, res) => {
  const { symbol, timeframe = '1m', startTime, start, endTime, end, limit, firstDataRequest, uniqueId } = req.query;
  if (!symbol && !uniqueId) return res.status(400).json({ success: false, error: 'symbol or uniqueId is required' });
  const effectiveStart = startTime || start;
  const effectiveEnd = endTime || end;
  try {
    const { data, symbol: resolvedSymbol, source } = await getCandles({
      symbol,
      timeframe,
      startTime: effectiveStart,
      endTime: effectiveEnd,
      limit,
      firstDataRequest,
      uniqueId,
    });
    return res.json({
      success: true,
      symbol: resolvedSymbol,
      timeframe: String(timeframe).toLowerCase(),
      startTime: effectiveStart || null,
      endTime: effectiveEnd || null,
      source,
      total: data.length,
      data,
    });
  } catch (err) {
    logInternalError(req, err, 'datafeed.candles_failed', { symbol, timeframe });
    return publicError(res, { status: 503, code: 'CHART_DATA_UNAVAILABLE', req });
  }
});

// ============================================================================
// 4. PATH 2: Live Stream Multiplexer Gateway (WebSocket)
// ============================================================================

function normalizeSymbol(value) {
  return String(value || '').replace(/[^a-z0-9]/gi, '').toUpperCase();
}

function readSymbols(value) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map(normalizeSymbol).filter(Boolean))).slice(0, MAX_SYMBOLS_PER_CLIENT);
}

function getRequestedSymbols(wss) {
  const symbols = new Set();
  for (const client of wss.clients) {
    if (client.readyState !== WebSocket.OPEN) continue;
    for (const symbol of client.marketSymbols || []) {
      symbols.add(symbol);
    }
  }
  return Array.from(symbols);
}

/**
 * Dynamically classify requested symbols from database:
 * - Crypto -> Binance WebSocket
 * - Forex, Metals, Commodities, Indices -> Entrack Microservice WebSocket
 */
let streamSyncTimer = null;
let lastLoggedStreamKey = '';

function scheduleSyncFeedStreamSymbols(wss) {
  if (streamSyncTimer) clearTimeout(streamSyncTimer);
  streamSyncTimer = setTimeout(() => {
    streamSyncTimer = null;
    syncFeedStreamSymbols(wss).catch(() => null);
  }, 300);
  streamSyncTimer.unref?.();
}

async function syncFeedStreamSymbols(wss) {
  const allSymbols = getRequestedSymbols(wss);
  const currentKey = allSymbols.slice().sort().join(',');

  if (allSymbols.length === 0) {
    if (lastLoggedStreamKey !== '') {
      lastLoggedStreamKey = '';
      entrackMicroProvider.updateFeedStreamSymbols([]);
      binanceProvider.updateBinanceStreamSymbols(RELAY_CONSUMER_ID, []);
    }
    return;
  }

  const cryptoSymbols = [];
  const microSymbols = [];

  for (const sym of allSymbols) {
    const instrument = (await findBySymbol(sym)) || getInstrumentBySymbol(sym);
    const source = String(instrument?.marketSource || '').toLowerCase();
    if (source === 'entrackbfeed') {
      cryptoSymbols.push(sym);
    } else {
      microSymbols.push(sym);
    }
  }

  if (currentKey !== lastLoggedStreamKey) {
    lastLoggedStreamKey = currentKey;
    console.log(`[STREAM] Active subscriptions: ${allSymbols.length} symbols (${cryptoSymbols.length} Binance, ${microSymbols.length} Feed Service: ${allSymbols.join(', ')})`);
  }

  entrackMicroProvider.updateFeedStreamSymbols(microSymbols);
  binanceProvider.updateBinanceStreamSymbols(RELAY_CONSUMER_ID, cryptoSymbols);
}

/**
 * Broadcast unified MARKET_TICK to all subscribed clients.
 */
function broadcastTick(wss, tick) {
  const rawSymbol = normalizeSymbol(tick?.symbolName || tick?.symbol);
  if (!rawSymbol) return;

  for (const client of wss.clients) {
    if (
      client.readyState !== WebSocket.OPEN
      || !client.marketSymbols
      || client.bufferedAmount >= MAX_BUFFERED_BYTES
    ) continue;

    if (!client.marketSymbols.has(rawSymbol)) continue;

    const payload = JSON.stringify({
      type: 'MARKET_TICK',
      tick: {
        symbol: rawSymbol,
        symbolName: rawSymbol,
        bid: Number(tick.bid ?? 0),
        ask: Number(tick.ask ?? 0),
        mid: Number(tick.mid ?? 0),
        open: Number(tick.open ?? 0),
        high: Number(tick.high ?? 0),
        low: Number(tick.low ?? 0),
        close: Number(tick.close ?? 0),
        volume: Number(tick.volume ?? 0),
        timestamp: Number(tick.timestamp ?? Date.now()),
      },
    });

    client.send(payload);
  }
}

/**
 * Attach the unified live stream gateway to the WebSocket server.
 */
function attachDatafeedStream(wss) {
  wss.on('connection', (ws) => {
    ws.marketSymbols = new Set();

    ws.on('message', (buffer) => {
      if (buffer.length > 2048) return;
      try {
        const message = JSON.parse(buffer.toString('utf8'));
        if (message.type === 'MARKET_SUBSCRIBE') {
          ws.marketSymbols = new Set(readSymbols(message.symbols));
          scheduleSyncFeedStreamSymbols(wss);
        } else if (message.type === 'MARKET_UNSUBSCRIBE') {
          for (const symbol of readSymbols(message.symbols)) {
            ws.marketSymbols.delete(symbol);
          }
          scheduleSyncFeedStreamSymbols(wss);
        }
      } catch {
        // Ignore malformed messages
      }
    });

    ws.on('close', () => {
      scheduleSyncFeedStreamSymbols(wss);
    });
  });

  // Start Entrack microservice stream (Forex, Metals, Commodities, Indices)
  entrackMicroProvider.startFeedStream((tick) => broadcastTick(wss, tick));

  // Start Binance stream (Crypto)
  binanceProvider.startBinanceStream(RELAY_CONSUMER_ID, [], (tick) => broadcastTick(wss, tick));
}

function stopDatafeedStream() {
  entrackMicroProvider.stopFeedStream();
  binanceProvider.stopBinanceStream(RELAY_CONSUMER_ID);
}

// ============================================================================
// Programmatic Service Exports
// ============================================================================
router.resolveProvider = resolveProvider;
router.getCandles = getCandles;
router.attachDatafeedStream = attachDatafeedStream;
router.stopDatafeedStream = stopDatafeedStream;

module.exports = router;
