const express = require('express');
const router = express.Router();
const { authCheck } = require('../auth/controller');
const { getDashboardAnalytics } = require('./analytics.service');

router.get('/analytics/dashboard', authCheck, async (req, res) => {
  try {
    const data = await getDashboardAnalytics(req.userId, {
      tradeMode: req.query.trade_mode,
      from: req.query.from,
      to: req.query.to,
      currency: req.query.currency,
    });
    return res.json({ success: true, ...data });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to fetch dashboard analytics' });
  }
});

module.exports = router;
