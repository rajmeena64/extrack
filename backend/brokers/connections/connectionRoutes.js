const express = require('express');
const { authCheck } = require('../../domains/auth/controller');
const { logInternalError, publicError } = require('../../core/errors/safeErrors');
const repository = require('./connectionRepository');
const registry = require('../connectors/registry');
const {
  UUID_PATTERN,
  validateCreateConnection,
  validateIntegrationSelection,
  validateUpdateConnection,
} = require('./connectionValidation');

const router = express.Router();
router.use(authCheck);
registry.mountAllRoutes(router);

router.get('/', async (req, res) => {
  try {
    const connections = await repository.listByUser(req.userId);
    const liveBalances = registry.getAllLiveBalances(req.userId);
    const balancesByAccount = new Map();
    for (const connection of connections) {
      for (const [accountId, snapshot] of Object.entries(connection.balanceSnapshot || {})) {
        balancesByAccount.set(`${connection.id}:${accountId}`, {
          connectionId: connection.id, accountId, ...snapshot,
          market: ['spot', 'usdmFutures'].includes(accountId) ? accountId : undefined,
        });
      }
    }
    for (const balance of liveBalances) balancesByAccount.set(`${balance.connectionId}:${balance.accountId}`, balance);
    const balances = Array.from(balancesByAccount.values());
    return res.json({ success: true, connections, balances });
  } catch (error) {
    logInternalError(req, error, 'broker_connections.list_failed');
    return publicError(res, { status: 503, code: 'SERVICE_UNAVAILABLE', req });
  }
});

router.get('/:id', async (req, res) => {
  if (!UUID_PATTERN.test(req.params.id)) return res.status(400).json({ success: false, error: 'Invalid connection id' });
  try {
    const connection = await repository.findById(req.userId, req.params.id);
    if (!connection) return res.status(404).json({ success: false, error: 'Connection not found' });
    return res.json({ success: true, connection });
  } catch (error) {
    logInternalError(req, error, 'broker_connections.get_failed');
    return publicError(res, { status: 503, code: 'SERVICE_UNAVAILABLE', req });
  }
});

router.get('/:id/mapping', async (req, res) => {
  if (!UUID_PATTERN.test(req.params.id)) return res.status(400).json({ success: false, error: 'Invalid connection id' });
  try {
    const tradeMethod = req.query.tradeMethod || 'file_upload';
    const mappingData = await repository.getMappingForConnection(req.userId, req.params.id, tradeMethod);
    if (!mappingData) return res.status(404).json({ success: false, error: 'Mapping not found for connection' });
    return res.json({ success: true, mapping: mappingData.normalization, brokerSlug: mappingData.brokerSlug, brokerName: mappingData.brokerName });
  } catch (error) {
    logInternalError(req, error, 'broker_connections.get_mapping_failed');
    return publicError(res, { status: 503, code: 'SERVICE_UNAVAILABLE', req });
  }
});

router.post('/', async (req, res) => {
  const parsed = validateCreateConnection(req.body);
  if (parsed.error) return res.status(400).json({ success: false, error: parsed.error });
  try {
    const connection = await repository.create(req.userId, parsed.value);
    if (!connection) return res.status(400).json({ success: false, error: 'Integration is not available' });
    return res.status(201).json({ success: true, connection });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ success: false, error: 'This broker account has already been added' });
    logInternalError(req, error, 'broker_connections.create_failed');
    return publicError(res, { status: 503, code: 'SERVICE_UNAVAILABLE', req });
  }
});

router.patch('/:id', async (req, res) => {
  if (!UUID_PATTERN.test(req.params.id)) return res.status(400).json({ success: false, error: 'Invalid connection id' });
  const parsed = validateUpdateConnection(req.body);
  if (parsed.error) return res.status(400).json({ success: false, error: parsed.error });
  try {
    const connection = await repository.update(req.userId, req.params.id, parsed.value);
    if (!connection) return res.status(404).json({ success: false, error: 'Connection not found' });
    return res.json({ success: true, connection });
  } catch (error) {
    logInternalError(req, error, 'broker_connections.update_failed');
    return publicError(res, { status: 503, code: 'SERVICE_UNAVAILABLE', req });
  }
});

router.post('/:id/integration', async (req, res) => {
  if (!UUID_PATTERN.test(req.params.id)) return res.status(400).json({ success: false, error: 'Invalid connection id' });
  const parsed = validateIntegrationSelection(req.body);
  if (parsed.error) return res.status(400).json({ success: false, error: parsed.error });
  try {
    const connection = await repository.selectIntegration(req.userId, req.params.id, parsed.value.integrationId);
    if (!connection) return res.status(400).json({ success: false, error: 'Platform is not available for this account' });
    return res.json({ success: true, connection });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ success: false, error: 'This platform account has already been added' });
    logInternalError(req, error, 'broker_connections.integration_select_failed');
    return publicError(res, { status: 503, code: 'SERVICE_UNAVAILABLE', req });
  }
});

router.post('/:id/connect', async (req, res) => {
  if (!UUID_PATTERN.test(req.params.id)) return res.status(400).json({ success: false, error: 'Invalid connection id' });
  try {
    const connection = await repository.findById(req.userId, req.params.id);
    if (!connection) return res.status(404).json({ success: false, error: 'Connection not found' });
    return registry.dispatchConnect(req, res, connection);
  } catch (error) {
    logInternalError(req, error, 'broker_connections.connect_failed');
    return publicError(res, { status: 503, code: 'SERVICE_UNAVAILABLE', req });
  }
});

router.post('/:id/sync', async (req, res) => {
  if (!UUID_PATTERN.test(req.params.id)) return res.status(400).json({ success: false, error: 'Invalid connection id' });
  try {
    const connection = await repository.findById(req.userId, req.params.id);
    if (!connection) return res.status(404).json({ success: false, error: 'Connection not found' });
    return registry.dispatchSync(req, res, connection);
  } catch (error) {
    logInternalError(req, error, 'broker_connections.sync_failed');
    return publicError(res, { status: 503, code: 'SERVICE_UNAVAILABLE', req });
  }
});

router.delete('/:id', async (req, res) => {
  if (!UUID_PATTERN.test(req.params.id)) return res.status(400).json({ success: false, error: 'Invalid connection id' });
  try {
    const connection = await repository.findById(req.userId, req.params.id);
    if (!connection) return res.status(404).json({ success: false, error: 'Connection not found' });
    await registry.executeBeforeDelete(req.userId, connection);
    const removed = await repository.remove(req.userId, req.params.id);
    if (!removed) return res.status(404).json({ success: false, error: 'Connection not found' });
    registry.reloadAllLiveSync().catch(() => {});
    return res.json({ success: true, id: removed.id });
  } catch (error) {
    logInternalError(req, error, 'broker_connections.delete_failed');
    return publicError(res, { status: 503, code: 'SERVICE_UNAVAILABLE', req });
  }
});

module.exports = router;
