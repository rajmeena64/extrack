const WebSocket = require('ws');
const { startFeedStream, stopFeedStream } = require('./feed-stream.client');

const MAX_SYMBOLS_PER_CLIENT = 50;
const MAX_BUFFERED_BYTES = 1024 * 1024;

function normalizeSymbol(value) {
  return String(value || '').replace(/[^a-z0-9]/gi, '').toUpperCase();
}

function readSymbols(value) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map(normalizeSymbol).filter(Boolean))).slice(0, MAX_SYMBOLS_PER_CLIENT);
}

function attachMarketStreamRelay(wss) {
  wss.on('connection', (ws) => {
    ws.marketSymbols = new Set();
    ws.on('message', (buffer) => {
      if (buffer.length > 2048) return;
      try {
        const message = JSON.parse(buffer.toString('utf8'));
        if (message.type === 'MARKET_SUBSCRIBE') {
          ws.marketSymbols = new Set(readSymbols(message.symbols));
        } else if (message.type === 'MARKET_UNSUBSCRIBE') {
          for (const symbol of readSymbols(message.symbols)) ws.marketSymbols.delete(symbol);
        }
      } catch {
        // Ignore malformed client messages.
      }
    });
  });

  startFeedStream((tick) => {
    const symbol = normalizeSymbol(tick?.symbolName);
    if (!symbol) return;
    const payload = JSON.stringify({ type: 'MARKET_TICK', tick });

    for (const client of wss.clients) {
      if (
        client.readyState === WebSocket.OPEN
        && client.marketSymbols?.has(symbol)
        && client.bufferedAmount < MAX_BUFFERED_BYTES
      ) {
        client.send(payload);
      }
    }
  });
}

module.exports = {
  attachMarketStreamRelay,
  stopMarketStreamRelay: stopFeedStream,
};
