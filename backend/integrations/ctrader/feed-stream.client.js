const WebSocket = require('ws');
const { createSignedHeaders, getFeedBaseUrl } = require('./feed.client');
const { getFeedApiKey } = require('./feed-key.service');

const STREAM_PATH = '/internal/stream';
const MAX_RECONNECT_MS = 10000;

let socket = null;
let reconnectTimer = null;
let reconnectAttempt = 0;
let forceKeyRefresh = false;
let stopped = true;
let tickHandler = null;

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

async function connect() {
  if (stopped || socket) return;

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
    console.info('market.feed_stream.connected');
  });

  ws.on('message', (buffer) => {
    if (buffer.length > 64 * 1024) return;
    try {
      const message = JSON.parse(buffer.toString('utf8'));
      if (message.type === 'MARKET_TICK' && message.tick && tickHandler) {
        tickHandler(message.tick);
      }
    } catch {
      // Ignore malformed upstream frames without exposing their contents.
    }
  });

  ws.on('unexpected-response', (_request, response) => {
    if (response.statusCode === 401) forceKeyRefresh = true;
    response.resume();
    if (socket === ws) socket = null;
    scheduleReconnect();
  });

  ws.on('error', () => {
    // The close handler owns reconnect scheduling.
  });

  ws.on('close', () => {
    if (socket === ws) socket = null;
    if (!stopped) {
      console.warn('market.feed_stream.disconnected');
      scheduleReconnect();
    }
  });
}

function startFeedStream(onTick) {
  tickHandler = onTick;
  stopped = false;
  connect().catch(() => scheduleReconnect());
}

function stopFeedStream() {
  stopped = true;
  tickHandler = null;
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = null;
  if (socket) socket.close(1000, 'Server shutting down');
  socket = null;
}

module.exports = {
  startFeedStream,
  stopFeedStream,
};
