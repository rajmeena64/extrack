const express = require('express');
const router = express.Router();

const authRoutes = require('./auth/auth.routes');
const instrumentRoutes = require('./instruments/instrument.routes');
const tradeRoutes = require('./trades/trade.routes');
const analyticsRoutes = require('./analytics/analytics.routes');
const settingsRoutes = require('./settings/settings.routes');
const brokerRoutes = require('./brokers/broker.routes');
const connectionRoutes = require('./broker-connections/connection.routes');

router.use('/auth', authRoutes);
router.use('/instruments', instrumentRoutes);
router.use('/trades', tradeRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/settings', settingsRoutes);
router.use('/brokers', brokerRoutes);
router.use('/broker-connections', connectionRoutes);
router.use('/', authRoutes);

module.exports = router;
