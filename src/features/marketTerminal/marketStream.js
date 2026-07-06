import api from '../../utils/serve';
import { WS_URL } from '../../utils/constants';

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

const scheduleReconnect = () => {
  if (subscriptions.size === 0 || reconnectTimer) return;
  const delay = Math.min(500 * (2 ** reconnectAttempt), 10000);
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
    const { data } = await api.get('/ws-token');
    if (generation !== connectionGeneration || subscriptions.size === 0) return;

    const wsUrl = new URL(WS_URL);
    wsUrl.searchParams.set('token', data?.token || '');
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
        if (message.type !== 'MARKET_TICK' || !message.tick) return;
        const symbol = normalizeSymbol(message.tick.symbolName);
        subscriptions.forEach((subscription) => {
          if (subscription.symbols.has(symbol)) subscription.onTick?.(message.tick);
        });
      } catch {
        // Ignore malformed frames without interrupting the stream.
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

export const subscribeMarketStream = ({ symbols, onTick, onStatus }) => {
  const subscription = {
    symbols: new Set((symbols || []).map(normalizeSymbol).filter(Boolean)),
    onTick,
    onStatus,
  };
  subscriptions.add(subscription);
  onStatus?.(status);
  syncSubscriptions();
  connect();

  return () => {
    subscriptions.delete(subscription);
    if (subscriptions.size === 0) {
      connectionGeneration += 1;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      reconnectTimer = null;
      socket?.close(1000, 'No market subscriptions');
      socket = null;
      notifyStatus('disconnected');
      return;
    }
    syncSubscriptions();
  };
};
