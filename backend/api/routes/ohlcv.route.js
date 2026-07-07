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
const { logInternalError, publicError } = require('../../core/errors/safeErrors');

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

  try {
    const instrument = await getInstrumentBySymbol(symbol);
    if (!instrument) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or unsupported symbol',
      });
    }

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
    logInternalError(req, err, 'ohlcv.range_failed', { symbol, timeframe });
    return publicError(res, {
      status: 503,
      code: 'MARKET_DATA_UNAVAILABLE',
      req,
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

  try {
    const instrument = await getInstrumentBySymbol(symbol);
    if (!instrument) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or unsupported symbol',
      });
    }

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
    logInternalError(req, err, 'ohlcv.chunk_failed', { symbol, timeframe, direction });
    return publicError(res, {
      status: 503,
      code: 'CHART_DATA_UNAVAILABLE',
      req,
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

  try {
    const instrument = await getInstrumentBySymbol(symbol);
    if (!instrument) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or unsupported symbol',
      });
    }

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
    logInternalError(req, err, 'ohlcv.latest_failed', { symbol });
    return publicError(res, {
      status: 503,
      code: 'LIVE_FEED_UNAVAILABLE',
      req,
    });
  }
});

module.exports = router;
