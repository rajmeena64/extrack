const WebSocket = require('ws');
const { normalizeStoredSymbol } = require('../../shared/utils/symbols');
const {
  CTRADER_INTERVALS,
  CTRADER_PERIODS,
  MAX_RECONNECT_ATTEMPTS,
} = require('./constants');
const { getAccounts } = require('./accounts.service');
const { loadProtos: loadProtobufRoot } = require('./proto.service');
const { createProtocolClient } = require('./protocol.client');
const { registerCtraderRoutes: registerRoutes } = require('./routes');
const {
  cacheSymbols,
  resolveSymbolId,
  trendbarToBinanceKline,
} = require('./symbols.service');
const { connectionState, ctraderConfig, tokenState } = require('./state');
const {
  ensureCtraderTokenStore,
  ensureValidToken,
} = require('./token.service');

const protocol = createProtocolClient({
  getRoot: () => connectionState.root,
  getSocket: () => connectionState.ws,
});

async function loadProtos() {
  connectionState.root = await loadProtobufRoot();
  return connectionState.root;
}

function sendAppAuth() {
  protocol.sendMessage(2100, {
    clientId: ctraderConfig.clientId,
    clientSecret: ctraderConfig.clientSecret,
  });
}

function sendAccountAuth() {
  if (!ctraderConfig.accountId) return;

  protocol.sendMessage(2102, {
    ctidTraderAccountId: parseInt(ctraderConfig.accountId, 10),
    accessToken: ctraderConfig.accessToken,
  });
}

async function requestSymbolsAsync() {
  if (!ctraderConfig.accountId) {
    throw new Error('No cTrader account ID available');
  }

  const symbolsData = await protocol.requestMessage(2114, {
    ctidTraderAccountId: parseInt(ctraderConfig.accountId, 10),
  });

  cacheSymbols(symbolsData);
  return Array.from(ctraderConfig.symbols.values());
}

function requestCandles(symbolId = null, period = CTRADER_PERIODS.M1, count = 100) {
  const targetSymbolId = symbolId || ctraderConfig.currentSymbolId;

  if (!targetSymbolId || !ctraderConfig.accountId) return;

  protocol.sendMessage(2137, {
    ctidTraderAccountId: parseInt(ctraderConfig.accountId, 10),
    symbolId: targetSymbolId,
    period,
    count,
  });
}

async function requestTrendbars(symbolId, period, count, fromTimestamp, toTimestamp) {
  if (!symbolId) {
    throw new Error('No cTrader symbol ID available');
  }

  if (!ctraderConfig.accountId) {
    throw new Error('No cTrader account ID available');
  }

  const payload = {
    ctidTraderAccountId: parseInt(ctraderConfig.accountId, 10),
    symbolId: Number(symbolId),
    period,
    count,
  };

  if (Number.isFinite(fromTimestamp)) {
    payload.fromTimestamp = fromTimestamp;
  }

  if (Number.isFinite(toTimestamp)) {
    payload.toTimestamp = toTimestamp;
  }

  return protocol.requestMessage(2137, payload);
}

function sendHeartbeat() {
  try {
    protocol.sendMessage(51, {});
  } catch (err) {
  }
}

function startHeartbeat() {
  if (connectionState.heartbeatInterval) {
    clearInterval(connectionState.heartbeatInterval);
  }

  connectionState.heartbeatInterval = setInterval(() => {
    if (connectionState.ws && connectionState.ws.readyState === WebSocket.OPEN) {
      sendHeartbeat();
    }
  }, 30000);
}

function stopHeartbeat() {
  if (connectionState.heartbeatInterval) {
    clearInterval(connectionState.heartbeatInterval);
    connectionState.heartbeatInterval = null;
  }
}

async function reconnect() {
  if (connectionState.isConnecting) return;
  if (connectionState.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) return;

  connectionState.reconnectAttempts += 1;

  setTimeout(async () => {
    await connectSocket();
  }, 5000);
}

async function connectSocket() {
  if (connectionState.isConnecting) return;

  connectionState.isConnecting = true;

  try {
    if (connectionState.ws) {
      connectionState.ws.removeAllListeners();
      connectionState.ws.close();
      connectionState.ws = null;
    }

    ctraderConfig.isAppAuthed = false;
    ctraderConfig.isAccountAuthed = false;
    stopHeartbeat();

    const tokenReady = await ensureValidToken();
    if (!tokenReady) {
      throw new Error('cTrader access token could not be refreshed');
    }

    await getAccounts();

    if (!ctraderConfig.accountId) {
      connectionState.isConnecting = false;
      return;
    }

    const url = ctraderConfig.isDemo
      ? 'wss://demo.ctraderapi.com:5035'
      : 'wss://live.ctraderapi.com:5035';

    connectionState.ws = new WebSocket(url);

    connectionState.ws.on('open', () => {
      connectionState.reconnectAttempts = 0;
      connectionState.isConnecting = false;
      sendAppAuth();
      startHeartbeat();
    });

    connectionState.ws.on('message', (data) => {
      handleMessage(data);
    });

    connectionState.ws.on('error', () => {});

    connectionState.ws.on('close', () => {
      connectionState.isConnecting = false;
      stopHeartbeat();
      reconnect();
    });
  } catch (err) {
    connectionState.isConnecting = false;
    if (err.message.includes('access token could not be refreshed')) {
      return;
    }
    reconnect();
  }
}

async function waitForSocketReady(timeoutMs = 20000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (
      connectionState.ws &&
      connectionState.ws.readyState === WebSocket.OPEN &&
      ctraderConfig.isAppAuthed &&
      ctraderConfig.isAccountAuthed
    ) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error('cTrader connection is not ready');
}

async function ensureCtraderReady() {
  if (!connectionState.root) {
    await loadProtos();
  }

  if (
    !connectionState.ws ||
    connectionState.ws.readyState !== WebSocket.OPEN ||
    !ctraderConfig.isAppAuthed ||
    !ctraderConfig.isAccountAuthed
  ) {
    await connectSocket();
  }

  await waitForSocketReady();

  if (ctraderConfig.symbols.size === 0) {
    await requestSymbolsAsync();
  }
}

async function fetchCtraderKlines({ symbol, interval = '1m', startTime, endTime, limit = 1000 }) {
  const period = CTRADER_INTERVALS[interval];

  if (!period) {
    const error = new Error(`Unsupported cTrader interval: ${interval}`);
    error.status = 400;
    throw error;
  }

  await ensureCtraderReady();

  let symbolId = resolveSymbolId(symbol);

  if (!symbolId) {
    await requestSymbolsAsync();
    symbolId = resolveSymbolId(symbol);
  }

  if (!symbolId) {
    const normalizedSymbol = normalizeStoredSymbol(symbol);
    const error = new Error(`cTrader symbol not found: ${symbol}`);
    error.status = 404;
    error.payload = {
      error: error.message,
      symbol,
      normalizedSymbol,
      matchMode: 'exact',
      availableSymbolCount: ctraderConfig.symbols.size,
    };
    throw error;
  }

  const normalizedLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 1000, 1), 1000);
  const numericStartTime = startTime ? Number(startTime) : undefined;
  const numericEndTime = endTime ? Number(endTime) : Date.now();
  const trendData = await requestTrendbars(
    symbolId,
    period,
    normalizedLimit,
    Number.isFinite(numericStartTime) ? numericStartTime : undefined,
    Number.isFinite(numericEndTime) ? numericEndTime : undefined
  );

  return (trendData?.trendbar || trendData?.trendbars || [])
    .map(trendbarToBinanceKline)
    .filter((kline) => {
      const openTime = Number(kline[0]);
      if (!Number.isFinite(openTime)) return false;
      if (Number.isFinite(numericStartTime) && openTime < numericStartTime) return false;
      if (Number.isFinite(numericEndTime) && openTime > numericEndTime) return false;
      return true;
    })
    .sort((a, b) => Number(a[0]) - Number(b[0]));
}

function handleMessage(data) {
  try {
    const root = connectionState.root;
    const Message = root.lookupType('ProtoMessage');
    const decoded = Message.decode(new Uint8Array(data));

    if (protocol.resolvePendingResponse(decoded)) {
      return;
    }

    switch (decoded.payloadType) {
      case 2101:
        ctraderConfig.isAppAuthed = true;
        setTimeout(() => sendAccountAuth(), 500);
        break;

      case 2103:
        try {
          const AccAuthRes = root.lookupType('ProtoOAAccountAuthRes');
          AccAuthRes.decode(decoded.payload);
          ctraderConfig.isAccountAuthed = true;
        } catch (_err) {
          ctraderConfig.isAccountAuthed = true;
        }
        break;

      case 2115:
        try {
          const SymbolsRes = root.lookupType('ProtoOASymbolsListRes');
          const symbolsData = SymbolsRes.decode(decoded.payload);
          const symbols = symbolsData.symbols || symbolsData.symbol || [];

          if (symbols.length > 0) {
            cacheSymbols(symbolsData);
          }
        } catch (err) {
        }
        break;

      case 2138:
        try {
          const TrendRes = root.lookupType('ProtoOAGetTrendbarsRes');
          const trendData = TrendRes.decode(decoded.payload);

          if (trendData.trendbars) {
            const candles = trendData.trendbars.map((candle) => ({
              time: Number(candle.utcTimestamp) / 1000,
              open: candle.open,
              high: candle.high,
              low: candle.low,
              close: candle.close,
            }));

            if (candles.length > 0) {
              global.lastCandles = candles;
            }
          }
        } catch (err) {
        }
        break;

      case 2142:
        try {
          const ErrorRes = root.lookupType('ProtoOAErrorRes');
          const errorData = ErrorRes.decode(decoded.payload);
          tokenState.lastRefreshError = errorData.errorCode || '';
        } catch (_err) {
        }
        break;

      default:
        break;
    }
  } catch (err) {
  }
}

function cleanup() {
  stopHeartbeat();

  if (connectionState.ws) {
    connectionState.ws.removeAllListeners();
    connectionState.ws.close();
    connectionState.ws = null;
  }

  ctraderConfig.isAppAuthed = false;
  ctraderConfig.isAccountAuthed = false;
  connectionState.isConnecting = false;
  connectionState.reconnectAttempts = 0;
}

function registerCtraderRoutes(app) {
  registerRoutes(app, {
    cleanup,
    connectSocket,
    ensureCtraderReady,
    fetchCtraderKlines,
    loadProtos,
  });
}

module.exports = {
  cleanup,
  connectSocket,
  ensureCtraderReady,
  ensureCtraderTokenStore,
  fetchCtraderKlines,
  loadProtos,
  registerCtraderRoutes,
  requestCandles,
  requestSymbolsAsync,
};
