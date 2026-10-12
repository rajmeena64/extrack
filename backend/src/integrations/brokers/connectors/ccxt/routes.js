const express = require('express');
const { getClient } = require('./client');
const { normalizeCcxtPosition } = require('./normalizer');
const repo = require('./repository');
const router = express.Router();
router.post('/connect', async (req, res) => {
  const { connectionId, apiKey, secretKey, passphrase, environment = 'real' } = req.body;
  if (!connectionId || !apiKey || !secretKey) return res.status(400).json({ success: false, error: 'Missing credentials' });
  try {
    const conn = await repo.findConnectionByUser(req.userId, connectionId);
    if (!conn) return res.status(404).json({ success: false, error: 'Connection not found' });
    let resolvedEnv = environment;
    let client = getClient(conn.brokerSlug, { apiKey, secretKey, passphrase, environment: resolvedEnv });
    if (client.has['fetchTime']) await client.loadTimeDifference();
    try {
      await client.fetchBalance();
    } catch (err) {
      if (resolvedEnv === 'real' && (typeof client.enableDemoTrading === 'function' || typeof client.setSandboxMode === 'function')) {
        const demoClient = getClient(conn.brokerSlug, { apiKey, secretKey, passphrase, environment: 'demo' });
        if (demoClient.has['fetchTime']) await demoClient.loadTimeDifference();
        await demoClient.fetchBalance();
        resolvedEnv = 'demo';
        client = demoClient;
      } else {
        throw err;
      }
    }
    await repo.saveCredentials(req.userId, connectionId, { apiKey, secretKey, passphrase, environment: resolvedEnv });
    return res.json({ success: true, connectionId, status: 'connected', environment: resolvedEnv });
  } catch (err) {
    const isAuth = err.name === 'AuthenticationError';
    const message = isAuth ? 'Invalid API Key or Secret' : 'Connection failed';
    return res.status(400).json({ success: false, code: isAuth ? 'INVALID_CREDENTIALS' : 'VALIDATION_FAILED', message, error: message });
  }
});
router.post('/sync', async (req, res, next) => {
  const connectionId = req.body.connectionId || req.params.id;
  if (!connectionId) return res.status(400).json({ success: false, error: 'Missing connectionId' });
  try {
    const conn = await repo.findConnectionByUser(req.userId, connectionId);
    if (!conn) return res.status(404).json({ success: false, error: 'Connection not found' });
    const creds = await repo.getCredentials(req.userId, connectionId);
    if (!creds) return res.status(400).json({ success: false, error: 'Credentials not configured' });
    const client = getClient(conn.brokerSlug, creds);
    if (client.has['fetchTime']) await client.loadTimeDifference();
    let trades = [];
    if (typeof client.fetchPositionsHistory === 'function' && client.has['fetchPositionsHistory']) {
      try {
        const rawPositions = await client.fetchPositionsHistory();
        trades = (rawPositions || []).map((p) => normalizeCcxtPosition(p, conn.brokerSlug, connectionId)).filter(Boolean);
      } catch {}
    }
    const synced = await repo.saveTrades(req.userId, connectionId, trades);
    return res.json({ success: true, syncedCount: synced });
  } catch (err) {
    next(err);
  }
});
module.exports = router;
