const express = require('express');
const pool = require('../../../infra/db/supabase');
const { logInternalError, publicError } = require('../../../core/errors/safeErrors');
const { createRateLimiter } = require('../../../core/rateLimiter');
const repository = require('./repository');
const { connectBinance } = require('./service');
const { assembleRoundTrips } = require('./roundTrips');
const { pollTradeExport, requestTradeExport } = require('./tradeExport');
const { fetchBinanceTrades } = require('./trades');
const { validateExportRange, validateTradeQuery } = require('./tradeValidation');
const { validateCredentials } = require('./validation');
const { UUID_PATTERN } = require('../../connections/connectionValidation');

const router = express.Router();
const tradeRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 20,
  keyGenerator: (req) => `${req.userId}:${req.path}`,
  message: 'Too many Binance trade requests. Please try again shortly.',
});

function safeResponse(connection) {
  const capabilities = connection?.metadata?.capabilities || {};
  return {
    success: true,
    connected: connection?.status === 'connected',
    environment: connection?.metadata?.environment || 'real',
    capabilities: {
      spot: capabilities.spot === true,
      usdmFutures: capabilities.usdmFutures === true,
      coinmFutures: capabilities.coinmFutures === true,
    },
  };
}

router.get('/', async (req, res) => {
  try {
    return res.json(safeResponse(await repository.findByUser(req.userId)));
  } catch (error) {
    logInternalError(req, error, 'broker_connections.binance_status_failed');
    return publicError(res, { status: 503, code: 'SERVICE_UNAVAILABLE', req });
  }
});

router.post('/sync', async (req, res) => {
  const connectionId = String(req.body?.connectionId || '');
  if (!UUID_PATTERN.test(connectionId)) return publicError(res, { status: 400, code: 'VALIDATION_FAILED', req });
  try {
    const connResult = await pool.query(
      'SELECT metadata FROM broker_connections.user_broker_connections WHERE id = $1 AND user_id = $2',
      [connectionId, req.userId]
    );
    const capabilities = connResult.rows[0]?.metadata?.capabilities || {};
    const requestedMarket = req.body?.market;
    const targetMarkets = ['usdmFutures', 'coinmFutures'].includes(requestedMarket)
      ? [requestedMarket]
      : ['usdmFutures', 'coinmFutures'].filter((m) => Boolean(capabilities[m]));

    const now = Date.now();
    const rawStart = req.body?.startTime ?? req.body?.fromTimestamp;
    const rawEnd = req.body?.endTime ?? req.body?.toTimestamp;
    const startTime = Number.isSafeInteger(Number(rawStart)) ? Number(rawStart) : new Date(new Date().getFullYear(), 0, 1).getTime();
    const endTime = Number.isSafeInteger(Number(rawEnd)) ? Math.min(Number(rawEnd), now) : now;

    const environment = connResult.rows[0]?.metadata?.environment || 'real';
    if (environment === 'demo' && targetMarkets.length > 0) {
      let totalFetched = 0, totalSaved = 0;
      for (const market of targetMarkets) {
        const rawFills = await fetchBinanceTrades(req.userId, connectionId, market, {});
        totalFetched += rawFills.length;
        const roundTrips = assembleRoundTrips(market, rawFills);
        const result = await repository.saveTrades(req.userId, connectionId, market, roundTrips);
        totalSaved += (result?.savedCount ?? (typeof result === 'number' ? result : 0));
      }
      if (totalSaved > 0 || totalFetched > 0) await repository.setSyncStatus(req.userId, connectionId, 'success');
      return res.json({
        success: true, status: 'imported', startTime, endTime,
        fetchedCount: totalFetched, savedCount: totalSaved,
        newTradesCount: totalSaved, updatedTradesCount: Math.max(0, totalFetched - totalSaved),
      });
    }

    if (targetMarkets.length > 0) {
      const parsed = validateExportRange({ connectionId, startTime, endTime });
      if (parsed.error) return publicError(res, { status: 400, code: 'VALIDATION_FAILED', req });
      const exportFn = req.body?.poll ? pollTradeExport : requestTradeExport;
      const results = await Promise.allSettled(
        targetMarkets.map((m) => exportFn(req.userId, connectionId, m, parsed.value.startTime, parsed.value.endTime))
      );
      const isProcessing = results.some((r) => r.status === 'fulfilled' && r.value?.status === 'processing');
      const anyImported = results.some((r) => r.status === 'fulfilled' && r.value?.status === 'imported');
      if (anyImported) await repository.setSyncStatus(req.userId, connectionId, 'success');
      const totalFetched = results.reduce((acc, r) => acc + (r.status === 'fulfilled' ? Number(r.value?.fetchedCount || 0) : 0), 0);
      const totalSaved = results.reduce((acc, r) => acc + (r.status === 'fulfilled' ? Number(r.value?.savedCount || 0) : 0), 0);
      if (capabilities.spot) require('./liveSync').sendSnapshot(req.userId);
      return res.status(isProcessing ? 202 : 200).json({
        success: true,
        status: isProcessing ? 'processing' : 'imported',
        startTime: parsed.value.startTime,
        endTime: parsed.value.endTime,
        fetchedCount: totalFetched,
        savedCount: totalSaved,
        newTradesCount: totalSaved,
        updatedTradesCount: Math.max(0, totalFetched - totalSaved),
      });
    }

    const liveSync = require('./liveSync');
    liveSync.sendSnapshot(req.userId);
    return res.json({ success: true, message: 'Sync complete', fetchedCount: 0, newTradesCount: 0, updatedTradesCount: 0 });
  } catch (error) {
    logInternalError(req, error, 'broker_connections.binance_sync_failed');
    return tradeError(res, req, error);
  }
});

router.post('/connect', async (req, res) => {
  const parsed = validateCredentials(req.body);
  if (parsed.error) return publicError(res, { status: 400, code: 'VALIDATION_FAILED', req });
  try {
    const connected = await connectBinance(
      req.userId, parsed.value.connectionId, parsed.value.environment,
      { apiKey: parsed.value.apiKey, secretKey: parsed.value.secretKey }
    );
    require('./liveSync').reload().catch(() => {});
    return res.json({
      ...safeResponse({ status: 'connected', metadata: connected }),
      connectionId: connected.connectionId,
    });
  } catch (error) {
    logInternalError(req, error, 'broker_connections.binance_connect_failed');
    if (error.code === 'INVALID_CREDENTIALS') {
      return publicError(res, { status: 400, code: 'INVALID_CREDENTIALS', req });
    }
    if (error.code === 'BINANCE_PERMISSION_REQUIRED') {
      return publicError(res, { status: 403, code: 'BINANCE_PERMISSION_REQUIRED', req });
    }
    if (error.code === 'BINANCE_CONNECTION_REQUIRED') {
      return publicError(res, { status: 409, code: 'VALIDATION_FAILED', req });
    }
    return publicError(res, { status: 503, code: 'SERVICE_UNAVAILABLE', req });
  }
});

function tradeError(res, req, error) {
  if (error.code === 'INVALID_CREDENTIALS') return publicError(res, { status: 400, code: 'INVALID_CREDENTIALS', req });
  if (error.code === 'BINANCE_PERMISSION_REQUIRED') return publicError(res, { status: 403, code: 'BINANCE_PERMISSION_REQUIRED', req });
  if (error.code === 'BINANCE_CONNECTION_REQUIRED') return publicError(res, { status: 409, code: 'VALIDATION_FAILED', req });
  if (error.code === 'VALIDATION_FAILED') return publicError(res, { status: 400, code: 'VALIDATION_FAILED', req });
  if (error.code === 'RATE_LIMITED') return publicError(res, { status: 429, code: 'RATE_LIMITED', req });
  return publicError(res, { status: 503, code: 'SERVICE_UNAVAILABLE', req });
}

for (const [route, market] of [['/trades/spot', 'spot'], ['/trades/usdm-futures', 'usdmFutures'], ['/trades/coinm-futures', 'coinmFutures']]) {
  router.get(route, tradeRateLimiter, async (req, res) => {
    if (!UUID_PATTERN.test(String(req.query.connectionId || ''))) {
      return publicError(res, { status: 400, code: 'VALIDATION_FAILED', req });
    }
    const { connectionId, ...query } = req.query;
    const parsed = validateTradeQuery(query, market);
    if (parsed.error) return publicError(res, { status: 400, code: 'VALIDATION_FAILED', req });
    try {
      const trades = await fetchBinanceTrades(req.userId, connectionId, market, parsed.value);
      return res.json({ success: true, market, count: trades.length, trades });
    } catch (error) {
      logInternalError(req, error, `broker_connections.binance_${market}_trades_failed`);
      return tradeError(res, req, error);
    }
  });
}

for (const [route, market] of [['/trades/usdm-futures/history-export', 'usdmFutures'], ['/trades/coinm-futures/history-export', 'coinmFutures']]) {
  router.post(route, tradeRateLimiter, async (req, res) => {
    const parsed = validateExportRange(req.body);
    if (parsed.error) return publicError(res, { status: 400, code: 'VALIDATION_FAILED', req });
    try {
      const state = await requestTradeExport(
        req.userId, parsed.value.connectionId, market, parsed.value.startTime, parsed.value.endTime
      );
      if (state.status === 'imported') await repository.setSyncStatus(req.userId, parsed.value.connectionId, 'success');
      return res.status(state.status === 'processing' ? 202 : 200).json({
        success: true, market, status: state.status, startTime: state.startTime, endTime: state.endTime,
        fetchedCount: state.fetchedCount || 0, savedCount: state.savedCount || 0, source: state.source,
      });
    } catch (error) {
      logInternalError(req, error, `broker_connections.binance_${market}_export_failed`);
      return tradeError(res, req, error);
    }
  });

  router.post(`${route}/poll`, tradeRateLimiter, async (req, res) => {
    const parsed = validateExportRange(req.body);
    if (parsed.error) return publicError(res, { status: 400, code: 'VALIDATION_FAILED', req });
    try {
      const state = await pollTradeExport(
        req.userId, parsed.value.connectionId, market, parsed.value.startTime, parsed.value.endTime
      );
      if (state.status === 'imported') await repository.setSyncStatus(req.userId, parsed.value.connectionId, 'success');
      return res.status(state.status === 'processing' ? 202 : 200).json({
        success: true, market, status: state.status, startTime: state.startTime, endTime: state.endTime,
        fetchedCount: state.fetchedCount || 0, savedCount: state.savedCount || 0,
      });
    } catch (error) {
      logInternalError(req, error, `broker_connections.binance_${market}_export_poll_failed`);
      return tradeError(res, req, error);
    }
  });
}

module.exports = router;
module.exports.safeResponse = safeResponse;
