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

function registerCtraderRoutes(app, service) {
  app.get('/api/start-ctrader', authCheck, requireCtraderAdmin, async (req, res) => {
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
        message: 'cTrader started',
        accountId: ctraderConfig.accountId,
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/ctrader-status', authCheck, requireCtraderAdmin, (req, res) => {
    res.json({
      success: true,
      connected: connectionState.ws && connectionState.ws.readyState === connectionState.ws.OPEN,
      accountId: ctraderConfig.accountId,
      symbolCount: ctraderConfig.symbols.size,
      currentSymbolId: ctraderConfig.currentSymbolId,
      tokenRefreshBlockedUntil: tokenState.refreshBlockedUntil || null,
      lastTokenRefreshError: tokenState.lastRefreshError || null,
    });
  });

  app.get('/api/ctrader-symbols', authCheck, requireCtraderAdmin, async (req, res) => {
    try {
      await service.ensureCtraderReady();

      return res.json({
        success: true,
        symbols: Array.from(ctraderConfig.symbols.values()),
        currentSymbolId: ctraderConfig.currentSymbolId,
      });
    } catch (err) {
      return res.status(err.status || 500).json({
        success: false,
        error: err.message,
      });
    }
  });

  app.get('/api/ctrader-klines', authCheck, ctraderKlineRateLimiter, async (req, res) => {
    try {
      const { symbol, interval, startTime, endTime, limit } = req.query;

      if (!symbol || !interval) {
        return res.status(400).json({
          error: 'Missing parameters',
          required: ['symbol', 'interval'],
        });
      }

      const klines = await service.fetchCtraderKlines({
        symbol,
        interval,
        startTime,
        endTime,
        limit,
      });

      return res.json(klines);
    } catch (error) {
      return res.status(error.status || 500).json(error.payload || {
        error: error.message,
      });
    }
  });
}

module.exports = {
  registerCtraderRoutes,
};
