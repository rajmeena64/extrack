const express = require('express');
const logInternalError = (req, err) => console.error(err);
const publicError = (res, opts) => res.status(opts.status || 500).json({ success: false, error: opts.message ? opts.message : (opts.code ? opts.code : 'ERROR') });
const { validateCredentials } = require('./validation');
const { authenticateAngelOneCredentials } = require('./verification');
const { fetchAngelOneTradeBook } = require('./trades');
const repository = require('./repository');
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const router = express.Router();
router.get('/', async (req, res) => {
  try {
    const connection = await repository.findConnectionByUser(req.userId, req.query.connectionId);
    return res.json({
      success: true,
      connected: connection?.status === 'connected',
      brokerSlug: 'angel-one',
    });
  } catch (error) {
    logInternalError(req, error, 'broker_connections.angel_one_status_failed');
    return publicError(res, { status: 503, code: 'SERVICE_UNAVAILABLE', req });
  }
});
router.post('/connect', async (req, res) => {
  const parsed = validateCredentials(req.body);
  if (parsed.error) return publicError(res, { status: 400, code: 'VALIDATION_FAILED', req });
  try {
    const connection = await repository.findConnectionByUser(req.userId, parsed.value.connectionId);
    if (!connection) return publicError(res, { status: 404, code: 'NOT_FOUND', req });
    const session = await authenticateAngelOneCredentials(parsed.value);
    await repository.saveVerifiedConnection(req.userId, parsed.value.connectionId, session, parsed.value);
    return res.json({
      success: true,
      connectionId: parsed.value.connectionId,
      status: 'connected',
      clientCode: session.clientCode,
      name: session.name,
    });
  } catch (error) {
    logInternalError(req, error, 'broker_connections.angel_one_connect_failed');
    return publicError(res, {
      status: 400,
      code: 'INVALID_CREDENTIALS',
      message: error.message || 'Angel One credentials (API Key, Client Code, PIN or TOTP) are invalid.',
      req,
    });
  }
});
router.post('/sync', async (req, res) => {
  const { connectionId } = req.body || {};
  if (!UUID_PATTERN.test(String(connectionId || ''))) {
    return publicError(res, { status: 400, code: 'VALIDATION_FAILED', req });
  }
  try {
    const credentials = await repository.getCredentials(req.userId, connectionId);
    if (!credentials) return publicError(res, { status: 400, code: 'INVALID_CREDENTIALS', req });
    const data = await fetchAngelOneTradeBook(credentials);
    const result = await repository.saveAngelOneTrades(req.userId, connectionId, data.fills);
    const newCount = result?.newCount || 0;
    const updatedCount = result?.updatedCount || 0;
    let message = 'Sync complete';
    if (result.fetchedCount === 0) {
      message = 'No trades found';
    } else if (newCount === 0) {
      message = updatedCount > 0
        ? `No new trades found (${updatedCount} trade${updatedCount === 1 ? '' : 's'} up to date)`
        : 'No new trades found';
    } else {
      message = `${newCount} new trade${newCount === 1 ? '' : 's'} saved${updatedCount > 0 ? ` (${updatedCount} up to date)` : ''}`;
    }
    return res.json({
      success: true,
      fetchedCount: result.fetchedCount,
      newTradesCount: newCount,
      updatedTradesCount: updatedCount,
      savedCount: result.savedCount,
      message,
      balance: data.balance,
      currency: data.currency,
    });
  } catch (error) {
    logInternalError(req, error, 'broker_connections.angel_one_sync_failed');
    if (error.code === 'INVALID_CREDENTIALS') {
      return publicError(res, { status: 400, code: 'INVALID_CREDENTIALS', req });
    }
    return publicError(res, { status: 503, code: 'SERVICE_UNAVAILABLE', req });
  }
});
async function poolQuery(sql, params) {
  const pool = require('../../../../infra/db/postgres');
  return pool.query(sql, params);
}
module.exports = router;
