const WebSocket = require('ws');
const { createSignedHeaders, getFeedBaseUrl, getQuotes, getFeedApiKey } = require('../../../../infra/entrackmicro/feedservice');

const STREAM_PATH = '/internal/stream';
const MAX_RECONNECT_MS = 10000;
const FALLBACK_POLL_INTERVAL_MS = 1500;
const HEARTBEAT_INTERVAL_MS = 20000;

let socket = null;
let reconnectTimer = null;
let pollTimer = null;
let heartbeatTimer = null;
let reconnectAttempt = 0;
let forceKeyRefresh = false;
let stopped = true;
let tickHandler = null;
let requestedSymbols = [];
let lastWsTickTime = 0;
let isConnected = false;

function normalizeSymbol(value) {
  return String(value || '').replace(/[^a-z0-9]/gi, '').toUpperCase();
}

function sendSubscription() {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify({
    type: 'MARKET_SUBSCRIBE',
    symbols: requestedSymbols,
  }));
}

function startHeartbeat() {
  stopHeartbeat();
  heartbeatTimer = setInterval(() => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      try {
        socket.send(JSON.stringify({ type: 'PING' }));
      } catch (_err) {
        // Socket send error handled by error listener
      }
    }
  }, HEARTBEAT_INTERVAL_MS);
  heartbeatTimer.unref?.();
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

function getStreamUrl() {
  const url = new URL(getFeedBaseUrl());
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = STREAM_PATH;
  url.search = '';
  return url.toString();
}

function scheduleReconnect() {
  if (stopped || reconnectTimer) return;
  const delay = Math.min(500 * (2 ** reconnectAttempt), MAX_RECONNECT_MS);
  reconnectAttempt += 1;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect().catch(() => scheduleReconnect());
  }, delay);
  reconnectTimer.unref?.();
}

async function pollFallbackQuotes() {
  if (stopped || requestedSymbols.length === 0 || !tickHandler) return;

  if (socket?.readyState === WebSocket.OPEN && Date.now() - lastWsTickTime < 4000) {
    return;
  }

  try {
    const res = await getQuotes(requestedSymbols);
    const quotesMap = res?.quotes?.quotes || res?.quotes;
    if (quotesMap && tickHandler) {
      for (const quote of Object.values(quotesMap)) {
        if (quote && (Number(quote.bid) > 0 || Number(quote.ask) > 0)) {
          tickHandler(quote);
        }
      }
    }
  } catch (_err) {}
}

function startPolling() {
  if (pollTimer) return;
  pollTimer = setInterval(pollFallbackQuotes, FALLBACK_POLL_INTERVAL_MS);
  pollTimer.unref?.();
  pollFallbackQuotes().catch(() => null);
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

async function connect() {
  if (stopped || socket) return;

  try {
    const apiKey = await getFeedApiKey({ force: forceKeyRefresh });
    forceKeyRefresh = false;
    const ws = new WebSocket(getStreamUrl(), {
      headers: createSignedHeaders(apiKey, STREAM_PATH),
      handshakeTimeout: 10000,
      maxPayload: 64 * 1024,
    });
    socket = ws;

    ws.on('open', () => {
      reconnectAttempt = 0;
      if (!isConnected) {
        isConnected = true;
        console.log('[STREAM] Microservice feed connected');
      }
      startHeartbeat();
      sendSubscription();
    });

    ws.on('message', (buffer) => {
      if (buffer.length > 64 * 1024) return;
      try {
        const message = JSON.parse(buffer.toString('utf8'));
        if (message.type === 'MARKET_TICK' && message.tick && tickHandler) {
          lastWsTickTime = Date.now();
          tickHandler(message.tick);
        }
      } catch (_err) {
        // Ignore malformed upstream frames
      }
    });

    ws.on('unexpected-response', (_request, response) => {
      if (response.statusCode === 401) forceKeyRefresh = true;
      response.resume();
      stopHeartbeat();
      if (socket === ws) socket = null;
      if (isConnected) {
        isConnected = false;
        console.log('[STREAM] Microservice feed disconnected');
      }
      scheduleReconnect();
    });

    ws.on('error', () => {
      // Handled by close event
    });

    ws.on('close', () => {
      stopHeartbeat();
      if (socket === ws) socket = null;
      if (isConnected) {
        isConnected = false;
        console.log('[STREAM] Microservice feed disconnected');
      }
      if (!stopped) {
        scheduleReconnect();
      }
    });
  } catch (_err) {
    stopHeartbeat();
    scheduleReconnect();
  }
}

function startFeedStream(onTick) {
  tickHandler = onTick;
  stopped = false;
  connect().catch(() => scheduleReconnect());
  if (requestedSymbols.length > 0) {
    startPolling();
  }
}

function stopFeedStream() {
  stopped = true;
  isConnected = false;
  tickHandler = null;
  stopHeartbeat();
  stopPolling();
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = null;
  if (socket) socket.close(1000, 'Server shutting down');
  socket = null;
}

function updateFeedStreamSymbols(symbols = []) {
  requestedSymbols = Array.from(new Set(symbols.map(normalizeSymbol).filter(Boolean))).slice(0, 500);
  sendSubscription();
  if (requestedSymbols.length > 0 && !stopped) {
    startPolling();
  } else if (requestedSymbols.length === 0) {
    stopPolling();
  }
}

module.exports = {
  startFeedStream,
  stopFeedStream,
  updateFeedStreamSymbols,
};
