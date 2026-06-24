const { authCheck } = require('../../domains/auth/controller');
const { createRateLimiter } = require('../../core/rateLimiter/index');
const { connectionState, ctraderConfig, tokenState } = require('./state');
const { requireCtraderAdmin } = require('./admin.middleware');

const ctraderKlineRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: Number(process.env.CTRADER_KLINE_RATE_LIMIT_MAX || 60),
  keyGenerator: (req) => req.userId || req.ip,
  message: 'Too many cTrader kline requests. Please try again shortly.',
});

const ctraderDataRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: Number(process.env.CTRADER_DATA_RATE_LIMIT_MAX || 120),
  keyGenerator: (req) => req.userId || req.ip,
  message: 'Too many cTrader data requests. Please try again shortly.',
});

const adminOnly = [authCheck, requireCtraderAdmin];

function sendRouteError(res, error) {
  return res.status(error.status || 500).json(error.payload || {
    success: false,
    error: error.message,
  });
}

function asyncRoute(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      sendRouteError(res, error);
    }
  };
}

function publicDepth(depth) {
  if (!depth) return null;
  const { quoteMap: _quoteMap, ...safeDepth } = depth;
  return safeDepth;
}

function findPublicSymbol(symbols, value) {
  const normalizedSymbol = String(value || '').replace(/[^a-z0-9]/gi, '').toUpperCase();
  if (!normalizedSymbol) return null;
  return symbols.find((symbol) => symbol.normalizedName === normalizedSymbol) || null;
}

function getChartSubscriptionSnapshot() {
  return Array.from(ctraderConfig.chartLiveConsumers.entries()).map(([symbolId, consumers]) => ({
    symbolId: Number(symbolId),
    symbolName: ctraderConfig.symbols.get(Number(symbolId))?.name || null,
    consumers: Array.from(consumers.values()),
    consumerCount: consumers.size,
  }));
}

async function releaseChartConsumer(service, chartId, symbolId = null) {
  const released = [];

  for (const [subscribedSymbolId, consumers] of ctraderConfig.chartLiveConsumers.entries()) {
    if (symbolId !== null && Number(subscribedSymbolId) !== Number(symbolId)) {
      continue;
    }

    if (!consumers.delete(chartId)) {
      continue;
    }

    const symbol = ctraderConfig.symbols.get(Number(subscribedSymbolId));
    released.push({
      symbolId: Number(subscribedSymbolId),
      symbolName: symbol?.name || null,
    });

    if (consumers.size === 0) {
      ctraderConfig.chartLiveConsumers.delete(subscribedSymbolId);

      if (symbol?.name) {
        await service.unsubscribeLiveTicks(symbol.name);
        await service.unsubscribeDepth(symbol.name);
      }
    }
  }

  return released;
}

async function subscribeChartConsumer(service, chartId, symbolName) {
  if (!chartId) {
    const error = new Error('Missing chartId');
    error.status = 400;
    throw error;
  }

  await service.ensureCtraderReady();
  const symbols = await service.getSymbols();
  const match = findPublicSymbol(symbols, symbolName);

  if (!match) {
    const error = new Error('Unknown cTrader symbol');
    error.status = 404;
    throw error;
  }

  await releaseChartConsumer(service, chartId);

  const key = String(match.id);
  const consumers = ctraderConfig.chartLiveConsumers.get(key) || new Set();
  const shouldSubscribe = consumers.size === 0;
  consumers.add(chartId);
  ctraderConfig.chartLiveConsumers.set(key, consumers);

  if (shouldSubscribe) {
    await service.subscribeLiveTicks(match.name);
    await service.subscribeDepth(match.name);
  }

  return {
    symbol: match,
    subscriptions: getChartSubscriptionSnapshot(),
  };
}

function getTokenStatus() {
  const expiresAt = Number(ctraderConfig.expiresAt || 0);
  const expiresInSeconds = expiresAt ? Math.max(0, Math.floor((expiresAt - Date.now()) / 1000)) : null;

  return {
    hasAccessToken: Boolean(ctraderConfig.accessToken),
    hasRefreshToken: Boolean(ctraderConfig.refreshToken),
    hasClientId: Boolean(ctraderConfig.clientId),
    hasClientSecret: Boolean(ctraderConfig.clientSecret),
    expiresAtIso: expiresAt ? new Date(expiresAt).toISOString() : null,
    expiresInSeconds,
    lastTokenRefreshError: tokenState.lastRefreshError || null,
    tokenRefreshBlockedUntil: tokenState.refreshBlockedUntil || null,
  };
}

function registerCtraderRoutes(app, service) {
  app.get('/api/start-ctrader', ...adminOnly, async (req, res) => {
    try {
      if (!ctraderConfig.clientId || !ctraderConfig.clientSecret || !ctraderConfig.accessToken) {
        return res.status(500).json({
          success: false,
          error: 'cTrader environment variables are not configured',
        });
      }

      service.cleanup();
      await service.loadProtos();
      await service.connectSocket();

      return res.json({
        success: true,
        // TODO: Switch this to POST after frontend callers are updated.
        message: 'cTrader started',
        accountId: ctraderConfig.accountId,
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/ctrader-status', ...adminOnly, (req, res) => {
    res.json({
      success: true,
      connected: connectionState.ws && connectionState.ws.readyState === connectionState.ws.OPEN,
      accountId: ctraderConfig.accountId,
      isDemo: ctraderConfig.isDemo,
      isAppAuthed: ctraderConfig.isAppAuthed,
      isAccountAuthed: ctraderConfig.isAccountAuthed,
      symbolCount: ctraderConfig.symbols.size,
      currentSymbolId: ctraderConfig.currentSymbolId,
      liveTickSubscriptionCount: ctraderConfig.liveTickSubscriptions.size,
      depthSubscriptionCount: ctraderConfig.depthSubscriptions.size,
      liveTrendbarSubscriptionCount: ctraderConfig.liveTrendbarSubscriptions.size,
      token: getTokenStatus(),
    });
  });

  app.get('/api/ctrader-cache', ...adminOnly, (req, res) => {
    res.json({
      success: true,
      symbols: Array.from(ctraderConfig.symbols.values()),
      latestTicks: Array.from(ctraderConfig.latestTicks.values()),
      latestDepth: Array.from(ctraderConfig.latestDepth.values()).map(publicDepth),
      latestTrendbars: Array.from(ctraderConfig.latestTrendbars.values()),
      liveTickSubscriptions: Array.from(ctraderConfig.liveTickSubscriptions.values()),
      depthSubscriptions: Array.from(ctraderConfig.depthSubscriptions.values()),
      liveTrendbarSubscriptions: Array.from(ctraderConfig.liveTrendbarSubscriptions.values()),
      chartLiveConsumers: getChartSubscriptionSnapshot(),
    });
  });

  app.get('/api/ctrader-latest-tick', ...adminOnly, asyncRoute(async (req, res) => {
    await service.ensureCtraderReady();
    const symbols = await service.getSymbols();
    const match = findPublicSymbol(symbols, req.query.symbol);
    const tick = match ? ctraderConfig.latestTicks.get(match.id) : null;
    res.json({ success: true, tick: tick || null });
  }));

  app.get('/api/ctrader-latest-depth', ...adminOnly, asyncRoute(async (req, res) => {
    await service.ensureCtraderReady();
    const symbols = await service.getSymbols();
    const match = findPublicSymbol(symbols, req.query.symbol);
    const depth = match ? publicDepth(ctraderConfig.latestDepth.get(match.id)) : null;
    res.json({ success: true, depth: depth || null });
  }));

  app.get('/api/ctrader-live-market', ...adminOnly, asyncRoute(async (req, res) => {
    res.json({
      success: true,
      ...(await service.getLiveMarketSnapshot({
        symbol: req.query.symbol,
        interval: req.query.interval || '1m',
        subscribe: req.query.subscribe !== 'false',
      })),
    });
  }));

  app.get('/api/market-chart/live', ...adminOnly, asyncRoute(async (req, res) => {
    res.json({
      success: true,
      ...(await service.getLiveMarketSnapshot({
        symbol: req.query.symbol,
        interval: req.query.interval || '1m',
        subscribe: req.query.subscribe !== 'false',
      })),
    });
  }));

  app.post('/api/ctrader-chart-subscription', ...adminOnly, asyncRoute(async (req, res) => {
    res.json({
      success: true,
      ...(await subscribeChartConsumer(service, String(req.body?.chartId || ''), req.body?.symbol)),
    });
  }));

  app.post('/api/market-chart/subscription', ...adminOnly, asyncRoute(async (req, res) => {
    res.json({
      success: true,
      ...(await subscribeChartConsumer(service, String(req.body?.chartId || ''), req.body?.symbol)),
    });
  }));

  app.post('/api/ctrader-chart-subscription/release', ...adminOnly, asyncRoute(async (req, res) => {
    const chartId = String(req.body?.chartId || '');
    if (!chartId) {
      return res.status(400).json({ success: false, error: 'Missing chartId' });
    }

    res.json({
      success: true,
      released: await releaseChartConsumer(service, chartId, req.body?.symbolId ?? null),
      subscriptions: getChartSubscriptionSnapshot(),
    });
  }));

  app.post('/api/market-chart/subscription/release', ...adminOnly, asyncRoute(async (req, res) => {
    const chartId = String(req.body?.chartId || '');
    if (!chartId) {
      return res.status(400).json({ success: false, error: 'Missing chartId' });
    }

    res.json({
      success: true,
      released: await releaseChartConsumer(service, chartId, req.body?.symbolId ?? null),
      subscriptions: getChartSubscriptionSnapshot(),
    });
  }));

  app.delete('/api/ctrader-chart-subscription', ...adminOnly, asyncRoute(async (req, res) => {
    const chartId = String(req.body?.chartId || '');
    if (!chartId) {
      return res.status(400).json({ success: false, error: 'Missing chartId' });
    }

    res.json({
      success: true,
      released: await releaseChartConsumer(service, chartId, req.body?.symbolId ?? null),
      subscriptions: getChartSubscriptionSnapshot(),
    });
  }));

  app.get('/api/ctrader-symbols', ...adminOnly, async (req, res) => {
    try {
      const symbols = await service.getSymbols();

      return res.json({
        success: true,
        symbols,
        currentSymbolId: ctraderConfig.currentSymbolId,
      });
    } catch (err) {
      return res.status(err.status || 500).json({
        success: false,
        error: err.message,
      });
    }
  });

  app.get('/api/ctrader-watchlist-quotes', ...adminOnly, ctraderDataRateLimiter, asyncRoute(async (req, res) => {
    const symbols = String(req.query.symbols || '')
      .split(',')
      .map((symbol) => symbol.trim())
      .filter(Boolean);
    res.json({ success: true, ...(await service.getWatchlistQuotes(symbols)) });
  }));

  app.get('/api/market-chart/watchlist-quotes', ...adminOnly, ctraderDataRateLimiter, asyncRoute(async (req, res) => {
    const symbols = String(req.query.symbols || '')
      .split(',')
      .map((symbol) => symbol.trim())
      .filter(Boolean);
    res.json({ success: true, ...(await service.getWatchlistQuotes(symbols)) });
  }));

  app.get('/api/ctrader-symbol/:symbolId', ...adminOnly, ctraderDataRateLimiter, asyncRoute(async (req, res) => {
    res.json({ success: true, ...(await service.getSymbolById(req.params.symbolId)) });
  }));

  app.get('/api/ctrader-assets', ...adminOnly, ctraderDataRateLimiter, asyncRoute(async (req, res) => {
    res.json({ success: true, ...(await service.getAssets()) });
  }));

  app.get('/api/ctrader-asset-classes', ...adminOnly, ctraderDataRateLimiter, asyncRoute(async (req, res) => {
    res.json({ success: true, ...(await service.getAssetClasses()) });
  }));

  app.get('/api/ctrader-symbol-categories', ...adminOnly, ctraderDataRateLimiter, asyncRoute(async (req, res) => {
    res.json({ success: true, ...(await service.getSymbolCategories()) });
  }));

  app.get('/api/ctrader-conversion-symbols', ...adminOnly, ctraderDataRateLimiter, asyncRoute(async (req, res) => {
    res.json({
      success: true,
      ...(await service.getConversionSymbols(req.query.firstAssetId, req.query.lastAssetId)),
    });
  }));

  app.get('/api/ctrader-klines', ...adminOnly, ctraderKlineRateLimiter, async (req, res) => {
    try {
      const { symbol, interval, startTime, endTime, limit } = req.query;

      if (!symbol || !interval) {
        return res.status(400).json({
          error: 'Missing parameters',
          required: ['symbol', 'interval'],
        });
      }

      const result = await service.fetchCtraderKlines({
        symbol,
        interval,
        startTime,
        endTime,
        limit,
      });

      return res.json({ success: true, ...result });
    } catch (error) {
      return res.status(error.status || 500).json(error.payload || {
        error: error.message,
      });
    }
  });

  app.get('/api/market-chart/candles', ...adminOnly, ctraderKlineRateLimiter, async (req, res) => {
    try {
      const { symbol, interval, startTime, endTime, limit } = req.query;

      if (!symbol || !interval) {
        return res.status(400).json({
          error: 'Missing parameters',
          required: ['symbol', 'interval'],
        });
      }

      const result = await service.fetchCtraderKlines({
        symbol,
        interval,
        startTime,
        endTime,
        limit,
      });

      return res.json({ success: true, ...result });
    } catch (error) {
      return res.status(error.status || 500).json(error.payload || {
        error: error.message,
      });
    }
  });

  app.get('/api/ctrader-ticks', ...adminOnly, ctraderKlineRateLimiter, asyncRoute(async (req, res) => {
    const { symbol, fromTimestamp, toTimestamp, type, limit } = req.query;
    if (!symbol) {
      return res.status(400).json({ success: false, error: 'Missing symbol' });
    }
    res.json({
      success: true,
      ...(await service.fetchCtraderTicks({ symbol, fromTimestamp, toTimestamp, type, limit })),
    });
  }));

  app.post('/api/ctrader-live-ticks/subscribe', ...adminOnly, asyncRoute(async (req, res) => {
    res.json({ success: true, ...(await service.subscribeLiveTicks(req.body?.symbol)) });
  }));

  app.post('/api/ctrader-live-ticks/unsubscribe', ...adminOnly, asyncRoute(async (req, res) => {
    res.json({ success: true, ...(await service.unsubscribeLiveTicks(req.body?.symbol)) });
  }));

  app.post('/api/ctrader-live-trendbar/subscribe', ...adminOnly, asyncRoute(async (req, res) => {
    res.json({ success: true, ...(await service.subscribeLiveTrendbar(req.body?.symbol, req.body?.interval)) });
  }));

  app.post('/api/ctrader-live-trendbar/unsubscribe', ...adminOnly, asyncRoute(async (req, res) => {
    res.json({ success: true, ...(await service.unsubscribeLiveTrendbar(req.body?.symbol, req.body?.interval)) });
  }));

  app.post('/api/ctrader-depth/subscribe', ...adminOnly, asyncRoute(async (req, res) => {
    res.json({ success: true, ...(await service.subscribeDepth(req.body?.symbol)) });
  }));

  app.post('/api/ctrader-depth/unsubscribe', ...adminOnly, asyncRoute(async (req, res) => {
    res.json({ success: true, ...(await service.unsubscribeDepth(req.body?.symbol)) });
  }));

  app.get('/api/ctrader-trader', ...adminOnly, ctraderDataRateLimiter, asyncRoute(async (req, res) => {
    res.json({ success: true, ...(await service.getTrader()) });
  }));

  app.get('/api/ctrader-reconcile', ...adminOnly, ctraderDataRateLimiter, asyncRoute(async (req, res) => {
    res.json({ success: true, ...(await service.reconcileAccount()) });
  }));

  app.get('/api/ctrader-orders', ...adminOnly, ctraderDataRateLimiter, asyncRoute(async (req, res) => {
    res.json({ success: true, ...(await service.getOrderList(req.query)) });
  }));

  app.get('/api/ctrader-order/:orderId', ...adminOnly, ctraderDataRateLimiter, asyncRoute(async (req, res) => {
    res.json({ success: true, ...(await service.getOrderDetails(req.params.orderId)) });
  }));

  app.get('/api/ctrader-orders/by-position/:positionId', ...adminOnly, ctraderDataRateLimiter, asyncRoute(async (req, res) => {
    res.json({ success: true, ...(await service.getOrdersByPositionId(req.params.positionId, req.query)) });
  }));

  app.get('/api/ctrader-deals', ...adminOnly, ctraderDataRateLimiter, asyncRoute(async (req, res) => {
    res.json({ success: true, ...(await service.getDeals(req.query)) });
  }));

  app.get('/api/ctrader-deals/by-position/:positionId', ...adminOnly, ctraderDataRateLimiter, asyncRoute(async (req, res) => {
    res.json({ success: true, ...(await service.getDealsByPositionId(req.params.positionId, req.query)) });
  }));

  app.get('/api/ctrader-deal-offsets/:dealId', ...adminOnly, ctraderDataRateLimiter, asyncRoute(async (req, res) => {
    res.json({ success: true, ...(await service.getDealOffsets({ dealId: req.params.dealId })) });
  }));

  app.get('/api/ctrader-cashflow', ...adminOnly, ctraderDataRateLimiter, asyncRoute(async (req, res) => {
    res.json({ success: true, ...(await service.getCashFlowHistory(req.query)) });
  }));

  app.get('/api/ctrader-position-pnl/:positionId', ...adminOnly, ctraderDataRateLimiter, asyncRoute(async (req, res) => {
    res.json({ success: true, ...(await service.getPositionUnrealizedPnL(req.params.positionId)) });
  }));

  app.get('/api/ctrader-expected-margin', ...adminOnly, ctraderDataRateLimiter, asyncRoute(async (req, res) => {
    res.json({ success: true, ...(await service.getExpectedMargin(req.query)) });
  }));

  app.get('/api/ctrader-margin-calls', ...adminOnly, ctraderDataRateLimiter, asyncRoute(async (req, res) => {
    res.json({ success: true, ...(await service.getMarginCallList()) });
  }));

  app.get('/api/ctrader-dynamic-leverage', ...adminOnly, ctraderDataRateLimiter, asyncRoute(async (req, res) => {
    res.json({ success: true, ...(await service.getDynamicLeverage(req.query.symbol)) });
  }));
}

module.exports = {
  registerCtraderRoutes,
};
