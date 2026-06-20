// module.exports = require('../../domains/market-data/klines.service');

const express = require('express');
const {
  DEFAULT_CHUNK_LIMIT,
  getOhlcvChunk,
  getOhlcvRange,
  getLatestCandle,
} = require('../../domains/market-data/Ohlcv.service');
const {
  getBinanceBacktestChunk,
  getBinanceBacktestRange,
  getLatestBinanceBacktestCandle,
} = require('../../domains/market-data/BinanceBacktesting.service');
const { getInstrumentBySymbol } = require('../../instruments/instrumentRegistry');

const router = express.Router();

// GET /api/ohlcv?symbol=EURUSD&timeframe=15m&start=2026-06-01&end=2026-06-15
router.get('/', async (req, res) => {
  const { symbol, start, end, timeframe = '1m' } = req.query;

  if (!symbol || !start || !end) {
    return res.status(400).json({
      success: false,
      error: 'symbol, start, end are required',
    });
  }

  const instrument = getInstrumentBySymbol(symbol);
  if (!instrument) {
    return res.status(400).json({
      success: false,
      error: 'Invalid or unsupported symbol',
    });
  }

  try {
    const useBinanceFeed = instrument.category === 'crypto';
    const data = useBinanceFeed
      ? await getBinanceBacktestRange(instrument.symbol, start, end, timeframe)
      : await getOhlcvRange(instrument.symbol, start, end, timeframe);

    return res.json({
      success: true,
      symbol: instrument.symbol,
      timeframe: data[0]?.timeframe || String(timeframe).toLowerCase(),
      source: useBinanceFeed ? 'binance' : 'database',
      start,
      end,
      total: data.length,
      data,
    });
  } catch (err) {
    console.error('ohlcv.range_failed', { error: err.message });
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }
});

// GET /api/ohlcv/chunk?symbol=EURUSD&timeframe=15m&cursor=2022-01-01T00:00:00Z&direction=past&limit=1000
router.get('/chunk', async (req, res) => {
  const {
    symbol,
    timeframe = '1m',
    cursor,
    direction,
    limit = DEFAULT_CHUNK_LIMIT,
  } = req.query;

  if (!symbol || !cursor || !direction || !limit) {
    return res.status(400).json({
      success: false,
      error: 'symbol, cursor, direction, limit are required',
    });
  }

  const instrument = getInstrumentBySymbol(symbol);
  if (!instrument) {
    return res.status(400).json({
      success: false,
      error: 'Invalid or unsupported symbol',
    });
  }

  try {
    const useBinanceFeed = instrument.category === 'crypto';
    const data = useBinanceFeed
      ? await getBinanceBacktestChunk({
          symbol: instrument.symbol,
          timeframe,
          cursor,
          direction,
          limit,
        })
      : await getOhlcvChunk({
          symbol: instrument.symbol,
          timeframe,
          cursor,
          direction,
          limit,
        });

    return res.json({
      success: true,
      symbol: instrument.symbol,
      timeframe: data[0]?.timeframe || String(timeframe).toLowerCase(),
      source: useBinanceFeed ? 'binance' : 'database',
      cursor,
      direction,
      limit: Number(limit),
      total: data.length,
      data,
    });
  } catch (err) {
    console.error('ohlcv.chunk_failed', { error: err.message });
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }
});

// GET /api/ohlcv/latest?symbol=EURUSD
router.get('/latest', async (req, res) => {
  const { symbol } = req.query;

  if (!symbol) {
    return res.status(400).json({
      success: false,
      error: 'symbol is required',
    });
  }

  const instrument = getInstrumentBySymbol(symbol);
  if (!instrument) {
    return res.status(400).json({
      success: false,
      error: 'Invalid or unsupported symbol',
    });
  }

  try {
    const useBinanceFeed = instrument.category === 'crypto';
    const candle = useBinanceFeed
      ? await getLatestBinanceBacktestCandle(instrument.symbol)
      : await getLatestCandle(instrument.symbol);

    return res.json({
      success: true,
      symbol: instrument.symbol,
      source: useBinanceFeed ? 'binance' : 'database',
      data: candle,
    });
  } catch (err) {
    console.error('ohlcv.latest_failed', { error: err.message });
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }
});

module.exports = router;
