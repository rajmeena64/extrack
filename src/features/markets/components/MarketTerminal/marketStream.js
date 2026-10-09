import api from '@/utils/common/serve';
import { WS_URL } from '@/utils/common/constants';

const subscriptions = new Set();
let socket = null;
let reconnectTimer = null;
let reconnectAttempt = 0;
let connectionGeneration = 0;
let status = 'disconnected';

const normalizeSymbol = (value) => String(value || '').replace(/[^a-z0-9]/gi, '').toUpperCase();

const getRequestedSymbols = () => Array.from(new Set(
  Array.from(subscriptions).flatMap((subscription) => Array.from(subscription.symbols))
));

const notifyStatus = (nextStatus) => {
  status = nextStatus;
  subscriptions.forEach((subscription) => subscription.onStatus?.(nextStatus));
};

const syncSubscriptions = () => {
  if (socket?.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify({
    type: 'MARKET_SUBSCRIBE',
    symbols: getRequestedSymbols(),
  }));
};

let cachedToken = null;
let tokenExpiresAt = 0;

const getWsToken = async () => {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }
  const { data } = await api.get('/ws-token');
  if (data?.token) {
    cachedToken = data.token;
    tokenExpiresAt = Date.now() + 45000;
    return data.token;
  }
  return null;
};

const scheduleReconnect = () => {
  if (subscriptions.size === 0 || reconnectTimer) return;
  const delay = Math.min(2000 * (1.5 ** Math.min(reconnectAttempt, 6)), 15000);
  reconnectAttempt += 1;
  notifyStatus('reconnecting');
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, delay);
};

const connect = async () => {
  if (
    subscriptions.size === 0
    || socket?.readyState === WebSocket.OPEN
    || socket?.readyState === WebSocket.CONNECTING
  ) return;

  const generation = ++connectionGeneration;
  notifyStatus(reconnectAttempt ? 'reconnecting' : 'connecting');

  try {
    const token = await getWsToken();
    if (generation !== connectionGeneration || subscriptions.size === 0) return;

    const wsUrl = new URL(WS_URL);
    if (token) wsUrl.searchParams.set('token', token);
    const nextSocket = new WebSocket(wsUrl.toString());
    socket = nextSocket;

    nextSocket.onopen = () => {
      if (socket !== nextSocket) return;
      reconnectAttempt = 0;
      notifyStatus('connected');
      syncSubscriptions();
    };

    nextSocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'ALERT_TRIGGERED' && message.alert) {
          subscriptions.forEach((subscription) => subscription.onAlertTriggered?.(message.alert));
          return;
        }
        if (message.type !== 'MARKET_TICK' || !message.tick) return;
        const symbol = normalizeSymbol(message.tick.symbolName);
        subscriptions.forEach((subscription) => {
          if (subscription.symbols.has(symbol)) subscription.onTick?.(message.tick);
        });
      } catch {
      }
    };

    nextSocket.onerror = () => nextSocket.close();
    nextSocket.onclose = () => {
      if (socket === nextSocket) socket = null;
      scheduleReconnect();
    };
  } catch {
    scheduleReconnect();
  }
};

let disconnectTimer = null;

export const subscribeMarketStream = ({ symbols, onTick, onStatus, onAlertTriggered }) => {
  if (disconnectTimer) {
    clearTimeout(disconnectTimer);
    disconnectTimer = null;
  }
  const subscription = {
    symbols: new Set((symbols || []).map(normalizeSymbol).filter(Boolean)),
    onTick,
    onStatus,
    onAlertTriggered,
  };
  subscriptions.add(subscription);
  onStatus?.(status);
  syncSubscriptions();
  connect();

  return () => {
    subscriptions.delete(subscription);
    if (subscriptions.size === 0) {
      if (disconnectTimer) clearTimeout(disconnectTimer);
      disconnectTimer = setTimeout(() => {
        disconnectTimer = null;
        if (subscriptions.size === 0) {
          connectionGeneration += 1;
          if (reconnectTimer) window.clearTimeout(reconnectTimer);
          reconnectTimer = null;
          socket?.close(1000, 'No market subscriptions');
          socket = null;
          notifyStatus('disconnected');
        }
      }, 1000);
      return;
    }
    syncSubscriptions();
  };
};
