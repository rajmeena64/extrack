const express = require('express');
const { logInternalError, publicError } = require('../../../core/errors/safeErrors');
const { validateCredentials } = require('./validation');
const { executeMt5Sync } = require('./service');
const repository = require('./repository');
const { UUID_PATTERN } = require('../../connections/connectionValidation');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const connection = await repository.findConnectionByUser(req.userId, req.query.connectionId);
    return res.json({
      success: true,
      connected: connection?.status === 'connected',
      brokerSlug: connection?.brokerSlug || 'metatrader',
      accountName: connection?.accountName || null,
      balanceSnapshot: connection?.metadata?.balanceSnapshot || null,
      timezone: connection?.metadata?.timezone || null,
      timezoneLabel: connection?.metadata?.timezoneLabel || null,
    });
  } catch (error) {
    logInternalError(req, error, 'broker_connections.metatrader_status_failed');
    return publicError(res, { status: 503, code: 'SERVICE_UNAVAILABLE', req });
  }
});

router.post('/connect', async (req, res) => {
  const parsed = validateCredentials(req.body);
  if (parsed.error) return publicError(res, { status: 400, code: 'VALIDATION_FAILED', req });

  try {
    const connection = await repository.findConnectionByUser(req.userId, parsed.value.connectionId);
    if (!connection) return publicError(res, { status: 404, code: 'NOT_FOUND', req });

    const syncResult = await executeMt5Sync(parsed.value);

    await repository.saveCredentials(req.userId, parsed.value.connectionId, parsed.value);
    await repository.updateConnectionAfterSync(req.userId, parsed.value.connectionId, syncResult.account, syncResult.gmt_offset);
    const saveStats = await repository.saveMetaTraderTrades(
      req.userId,
      parsed.value.connectionId,
      syncResult.trades,
      syncResult.account.currency
    );

    const tzInfo = repository.formatTimezoneOffset(syncResult.gmt_offset);

    return res.json({
      success: true,
      connectionId: parsed.value.connectionId,
      status: 'connected',
      account: syncResult.account,
      timezone: tzInfo.timezone,
      timezoneLabel: tzInfo.timezoneLabel,
      savedCount: saveStats.savedCount,
      newCount: saveStats.newCount,
      updatedCount: saveStats.updatedCount,
    });
  } catch (error) {
    logInternalError(req, error, 'broker_connections.metatrader_connect_failed');
    if (error.code === 'AUTHENTICATION_FAILED') {
      return publicError(res, {
        status: 400,
        code: 'INVALID_CREDENTIALS',
        message: 'MetaTrader authentication failed. Check your Login ID, Password, and Server name.',
        req,
      });
    }
    return publicError(res, {
      status: 503,
      code: error.code || 'SERVICE_UNAVAILABLE',
      message: error.message || 'MetaTrader connection service is temporarily unavailable',
      req,
    });
  }
});

router.post('/sync', async (req, res) => {
  const { connectionId, fromTimestamp } = req.body || {};
  if (!UUID_PATTERN.test(String(connectionId || ''))) {
    return publicError(res, { status: 400, code: 'VALIDATION_FAILED', req });
  }

  try {
    const credentials = await repository.getCredentials(req.userId, connectionId);
    if (!credentials) return publicError(res, { status: 400, code: 'INVALID_CREDENTIALS', req });

    const syncResult = await executeMt5Sync({
      ...credentials,
      fromTimestamp: fromTimestamp ? Math.floor(Number(fromTimestamp) / 1000) : 0,
    });

    await repository.updateConnectionAfterSync(req.userId, connectionId, syncResult.account, syncResult.gmt_offset);
    const saveStats = await repository.saveMetaTraderTrades(
      req.userId,
      connectionId,
      syncResult.trades,
      syncResult.account.currency
    );

    let message = 'Sync complete';
    if (saveStats.fetchedCount === 0) {
      message = 'No trades found';
    } else if (saveStats.newCount === 0) {
      message = saveStats.updatedCount > 0
        ? `No new trades (${saveStats.updatedCount} trades up to date)`
        : 'No new trades found';
    } else {
      message = `${saveStats.newCount} new trade${saveStats.newCount === 1 ? '' : 's'} saved`;
    }

    return res.json({
      success: true,
      message,
      fetchedCount: saveStats.fetchedCount,
      newTradesCount: saveStats.newCount,
      updatedTradesCount: saveStats.updatedCount,
      savedCount: saveStats.savedCount,
      account: syncResult.account,
    });
  } catch (error) {
    logInternalError(req, error, 'broker_connections.metatrader_sync_failed');
    if (error.code === 'AUTHENTICATION_FAILED') {
      return publicError(res, { status: 400, code: 'INVALID_CREDENTIALS', req });
    }
    return publicError(res, { status: 503, code: 'SERVICE_UNAVAILABLE', req });
  }
});

module.exports = router;
