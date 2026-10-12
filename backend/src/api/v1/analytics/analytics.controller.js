const analyticsService = require('../../../domains/analytics/analytics.service');

const analyticsController = {
  async getDashboard(req, res, next) {
    try {
      const data = await analyticsService.getDashboardAnalytics(req.userId, {
        tradeMode: req.query.trade_mode,
        from: req.query.from,
        to: req.query.to,
        currency: req.query.currency
      });
      res.json({ success: true, ...data });
    } catch (err) { next(err); }
  }
};

module.exports = analyticsController;
