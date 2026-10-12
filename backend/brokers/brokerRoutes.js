const express = require('express');
const { authCheck } = require('../domains/auth/controller');
const { getBroker, listBrokerIntegrations, listBrokers } = require('./brokerService');
const { logInternalError, publicError } = require('../core/errors/safeErrors');

const router = express.Router();
router.use(authCheck);

router.get('/', async (req, res) => {
  try {
    const search = String(req.query.search || '').trim().slice(0, 100) || undefined;
    const popularOnly = req.query.popular === 'true';
    if (req.query.popular !== undefined && !['true', 'false'].includes(req.query.popular)) {
      return res.status(400).json({ success: false, error: 'popular must be true or false' });
    }
    const requestedLimit = req.query.limit === undefined ? 20 : Number(req.query.limit);
    if (!Number.isInteger(requestedLimit) || requestedLimit < 1 || requestedLimit > 100) {
      return res.status(400).json({ success: false, error: 'limit must be an integer from 1 to 100' });
    }
    return res.json({ success: true, brokers: await listBrokers({ search, limit: requestedLimit, popularOnly }) });
  } catch (error) {
    logInternalError(req, error, 'brokers.list_failed');
    return publicError(res, { status: 503, code: 'BROKER_REGISTRY_UNAVAILABLE', req });
  }
});

router.get('/:id/integrations', async (req, res) => {
  try {
    const broker = await getBroker(req.params.id);
    if (!broker) return res.status(404).json({ success: false, error: 'Broker not found' });
    return res.json({
      success: true,
      broker: { id: broker.id, name: broker.name, slug: broker.slug },
      integrations: await listBrokerIntegrations(req.params.id),
    });
  } catch (error) {
    if (error.code === '22P02') return res.status(400).json({ success: false, error: 'Invalid broker id' });
    logInternalError(req, error, 'brokers.integrations_failed');
    return publicError(res, { status: 503, code: 'BROKER_REGISTRY_UNAVAILABLE', req });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const broker = await getBroker(req.params.id);
    if (!broker) return res.status(404).json({ success: false, error: 'Broker not found' });
    return res.json({ success: true, broker });
  } catch (error) {
    if (error.code === '22P02') return res.status(400).json({ success: false, error: 'Invalid broker id' });
    logInternalError(req, error, 'brokers.get_failed');
    return publicError(res, { status: 503, code: 'BROKER_REGISTRY_UNAVAILABLE', req });
  }
});

module.exports = router;
