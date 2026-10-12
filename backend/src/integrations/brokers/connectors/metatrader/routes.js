const express = require('express');
const { validateCredentials } = require('./validation');
const { executeMt5Sync } = require('./service');
const { normalizeMetaTraderTrade } = require('./parser');
const brokerRepository = require('../../../../domains/brokers/broker.repository');

const router = express.Router();

function formatTimezone(offsetSeconds) {
  const total = Number(offsetSeconds) || 0;
  const sign = total >= 0 ? '+' : '-';
  const abs = Math.abs(total);
  const h = String(Math.floor(abs / 3600)).padStart(2, '0');
  const m = String(Math.floor((abs % 3600) / 60)).padStart(2, '0');
  return { timezone: `UTC${sign}${h}:${m}`, timezoneLabel: Number(m) > 0 ? `GMT${sign}${Math.floor(abs / 3600)}:${m}` : `GMT${sign}${Math.floor(abs / 3600)}`, gmtOffset: total };
}

router.get('/', async (req, res, next) => {
  try {
    const connection = await brokerRepository.findUserConnectionById(req.query.connectionId, req.userId);
    if (!connection) return res.status(404).json({ success: false, error: 'Connection not found' });
    return res.json({
      success: true,
      connected: connection.status === 'connected',
      brokerSlug: connection.brokerSlug || 'metatrader',
      accountName: connection.accountName || null,
      balanceSnapshot: connection.balanceSnapshot || null,
      timezone: connection.metadata?.timezone || null,
      timezoneLabel: connection.metadata?.timezoneLabel || null
    });
  } catch (err) { next(err); }
});

router.post('/connect', async (req, res, next) => {
  const parsed = validateCredentials(req.body);
  if (parsed.error) return res.status(400).json({ success: false, error: parsed.error });
  try {
    const connection = await brokerRepository.findUserConnectionById(parsed.value.connectionId, req.userId);
    if (!connection) return res.status(404).json({ success: false, error: 'Connection not found' });
    const syncResult = await executeMt5Sync(parsed.value);
    await brokerRepository.saveCredentials(parsed.value.connectionId, req.userId, parsed.value, 'password');

    const tz = formatTimezone(syncResult.gmt_offset);
    const balanceSnapshot = {
      balance: syncResult.account.balance,
      equity: syncResult.account.equity,
      leverage: syncResult.account.leverage,
      isDemo: syncResult.account.is_demo,
      server: syncResult.account.server,
      company: syncResult.account.company
    };
    await brokerRepository.updateConnectionSyncStatus(parsed.value.connectionId, {
      status: 'connected',
      lastSyncStatus: 'success',
      balanceSnapshot,
      accountCurrency: syncResult.account.currency,
      externalAccountId: String(syncResult.account.login || ''),
      metadata: tz
    });

    const normalized = (syncResult.trades || []).map((t) => normalizeMetaTraderTrade(t, req.userId, parsed.value.connectionId, syncResult.account.currency)).filter(Boolean);
    const saveStats = await brokerRepository.batchUpsertTrades(req.userId, parsed.value.connectionId, normalized);

    return res.json({
      success: true,
      connectionId: parsed.value.connectionId,
      status: 'connected',
      account: syncResult.account,
      timezone: tz.timezone,
      timezoneLabel: tz.timezoneLabel,
      savedCount: saveStats.total,
      newCount: saveStats.inserted,
      updatedCount: saveStats.updated
    });
  } catch (err) { next(err); }
});

router.post('/sync', async (req, res, next) => {
  const { connectionId, fromTimestamp } = req.body || {};
  if (!connectionId) return res.status(400).json({ success: false, error: 'connectionId is required' });
  try {
    const credentials = await brokerRepository.getCredentials(connectionId, req.userId, 'password');
    if (!credentials) return res.status(400).json({ success: false, error: 'Credentials not found' });

    const syncResult = await executeMt5Sync({
      ...credentials,
      fromTimestamp: fromTimestamp ? Math.floor(Number(fromTimestamp) / 1000) : 0
    });

    const balanceSnapshot = {
      balance: syncResult.account.balance,
      equity: syncResult.account.equity,
      leverage: syncResult.account.leverage,
      isDemo: syncResult.account.is_demo,
      server: syncResult.account.server,
      company: syncResult.account.company
    };
    await brokerRepository.updateConnectionSyncStatus(connectionId, {
      status: 'connected',
      lastSyncStatus: 'success',
      balanceSnapshot,
      accountCurrency: syncResult.account.currency,
      externalAccountId: String(syncResult.account.login || '')
    });

    const normalized = (syncResult.trades || []).map((t) => normalizeMetaTraderTrade(t, req.userId, connectionId, syncResult.account.currency)).filter(Boolean);
    const saveStats = await brokerRepository.batchUpsertTrades(req.userId, connectionId, normalized);

    return res.json({
      success: true,
      message: 'Sync complete',
      fetchedCount: syncResult.trades?.length || 0,
      newTradesCount: saveStats.inserted,
      updatedTradesCount: saveStats.updated,
      savedCount: saveStats.total,
      account: syncResult.account
    });
  } catch (err) { next(err); }
});

module.exports = router;
