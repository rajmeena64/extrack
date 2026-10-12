const express = require('express');
const router = express.Router();
const { authCheck } = require('../../../../domains/auth/controller');
const { createRateLimiter } = require('../../../../core/rateLimiter/index');
const { logInternalError } = require('../../../../core/errors/safeErrors');
const { parseOptionContractSymbol } = require('../../../../shared/utils/optionContracts');
const pool = require('../../../../infra/db/supabase');

const { fetchOptionMarkKlines } = require('./binance.options');
const { getExchangeSymbols, validateFuturesSymbol } = require('./binance.exchange');
const { fetchRange, fetchChunk, fetchLatest } = require('./binance.historical');

const marketDataRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: Number(process.env.MARKET_DATA_RATE_LIMIT_MAX || 120),
  keyGenerator: (req) => req.ip,
  message: 'Too many market data requests. Please try again shortly.',
});

const clampLimit = (value) => {
  const limit = Number.parseInt(value, 10);
  if (Number.isNaN(limit)) return 1000;
  return Math.min(Math.max(limit, 1), 1000);
};

// GET /api/option-klines
router.get('/option-klines', authCheck, marketDataRateLimiter, async (req, res) => {
  const uniqueId = String(req.query.uniqueId || '').trim();
  const { interval, startTime, endTime } = req.query;
  const limit = clampLimit(req.query.limit);

  if (!uniqueId || !interval) {
    return res.status(400).json({ success: false, error: 'Invalid chart request' });
  }

  try {
    const result = await pool.query(`
      SELECT trade.symbol, broker.slug AS "brokerSlug"
      FROM trading.trades trade
      JOIN broker_connections.user_broker_connections connection
        ON connection.id = trade.broker_connection_id AND connection.user_id = trade.user_id
      JOIN trading_catalog.broker_integrations integration ON integration.id = connection.integration_id
      JOIN trading_catalog.brokers broker ON broker.id = integration.broker_id
      WHERE (trade.unique_id = $1 OR CAST(trade.id AS TEXT) = $1) AND trade.user_id = $2 AND trade.product_type = 'option'
      LIMIT 1
    `, [uniqueId, req.userId]);

    const trade = result.rows[0];
    if (!trade || trade.brokerSlug !== 'binance') {
      return res.status(404).json({ success: false, error: 'Chart data is unavailable' });
    }

    const contract = parseOptionContractSymbol('binance', trade.symbol);
    if (!contract) return res.status(400).json({ success: false, error: 'Chart data is unavailable' });

    const data = await fetchOptionMarkKlines({
      contractSymbol: contract.symbol,
      interval,
      startTime,
      endTime,
      limit,
    });

    return res.json(data);
  } catch (error) {
    if (error.status === 400 || error.status === 404) return res.json([]);
    logInternalError(req, error, 'binance.option_chart_failed');
    return res.status(503).json({ success: false, error: 'Chart data is unavailable' });
  }
});

// GET /api/symbols
router.get('/symbols', authCheck, marketDataRateLimiter, async (req, res) => {
  try {
    const symbols = await getExchangeSymbols();
    res.json({
      success: true,
      count: symbols.length,
      symbols,
    });
  } catch (err) {
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// GET /api/validate/:symbol
router.get('/validate/:symbol', authCheck, marketDataRateLimiter, async (req, res) => {
  try {
    const result = await validateFuturesSymbol(req.params.symbol);
    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

module.exports = router;
