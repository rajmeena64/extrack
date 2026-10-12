const binanceHistorical = require('./binance.historical');
const binanceLive = require('./binance.live');
const binanceOptions = require('./binance.options');
const binanceExchange = require('./binance.exchange');
const binanceRoutes = require('./binance.routes');

module.exports = {
  // Candlesticks & Klines
  fetchCandles: binanceHistorical.fetchCandles,
  fetchBinanceMarketKlines: binanceHistorical.fetchBinanceMarketKlines,
  formatKlinesToCandles: binanceHistorical.formatKlinesToCandles,

  // Live WebSocket Streaming
  startBinanceStream: binanceLive.startBinanceStream,
  stopBinanceStream: binanceLive.stopBinanceStream,
  updateBinanceStreamSymbols: binanceLive.updateBinanceStreamSymbols,
  isCryptoSymbol: binanceLive.isCryptoSymbol,
  resolveBinanceSymbol: binanceLive.resolveBinanceSymbol,
  fromBinanceSymbol: binanceLive.fromBinanceSymbol,
  normalizeSymbol: binanceLive.normalizeSymbol,

  // Options
  fetchOptionMarkKlines: binanceOptions.fetchOptionMarkKlines,

  // Exchange & Symbols
  getExchangeSymbols: binanceExchange.getExchangeSymbols,
  validateFuturesSymbol: binanceExchange.validateFuturesSymbol,

  // Express Routes
  routes: binanceRoutes,
};
