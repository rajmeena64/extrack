// module.exports = require('../../domains/market-data/klines.service');

const express = require('express');
const { getOhlcvRange, getLatestCandle } = require('../../domains/market-data/Ohlcv.service');

const router = express.Router();

// GET /api/ohlcv?symbol=EURUSD&start=2026-06-01&end=2026-06-15
router.get('/', async (req, res) => {
  const { symbol, start, end } = req.query;

  if (!symbol || !start || !end) {
    return res.status(400).json({
      success: false,
      error: 'symbol, start, end are required',
    });
  }

  try {
    const data = await getOhlcvRange(symbol.toUpperCase(), start, end);
    return res.json({
      success: true,
      symbol: symbol.toUpperCase(),
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
    const candle = await getLatestCandle(symbol.toUpperCase());
    return res.json({
      success: true,
      symbol: symbol.toUpperCase(),
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
