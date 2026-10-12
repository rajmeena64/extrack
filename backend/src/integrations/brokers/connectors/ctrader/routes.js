const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const pool = require('../../../../infra/db/postgres');
const logInternalError = (req, err) => console.error(err);
const publicError = (res, opts) => res.status(opts.status || 500).json({ success: false, error: opts.message ? opts.message : (opts.code ? opts.code : 'ERROR') });
const { encryptAesGcm, decryptAesGcm } = require('../../../../core/utils/security');
const encryptUserBrokerCredential = (v, c) => encryptAesGcm(v, process.env.USER_BROKER_CREDENTIALS_KEY, c, 'enc:v1:');
const decryptUserBrokerCredential = (v, c) => decryptAesGcm(v, process.env.USER_BROKER_CREDENTIALS_KEY, c, 'enc:v1:');
const { hashToken } = require('../../../../core/utils/security');
const createRateLimiter = () => (req, res, next) => next();
const isAllowedOrigin = () => true; const normalizeOrigin = (o) => o;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const { filterAccountsForBroker, getAuthorizedAccounts } = require('./accountVerification');
const { fetchClosedTrades } = require('./dealSync');
const repository = require('./repository');
const router = express.Router();
const AUTH_URL = 'https://id.ctrader.com/my/settings/openapi/grantingaccess/';
const TOKEN_URL = 'https://openapi.ctrader.com/apps/token';
const syncRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req) => `${req.userId}:${req.params.id || req.body?.connectionId}`,
  message: 'Too many sync requests. Please try again shortly.',
});
function getConfig() {
  const clientId = String(process.env.CTRADER_OAUTH_CLIENT_ID || '').trim();
  const clientSecret = String(process.env.CTRADER_OAUTH_CLIENT_SECRET || '').trim();
  const callbackUrl = String(process.env.CTRADER_OAUTH_CALLBACK_URL || '').trim();
  const frontendUrl = String(process.env.FRONTEND_URL || 'http://localhost:5173').trim();
  if (!clientId || !clientSecret || !callbackUrl) throw new Error('cTrader OAuth is not configured');
  for (const configuredUrl of [callbackUrl, frontendUrl]) {
    if (process.env.NODE_ENV === 'production' && new URL(configuredUrl).protocol !== 'https:') {
      throw new Error('cTrader OAuth URLs must use HTTPS in production');
    }
  }
  return { callbackUrl, clientId, clientSecret, frontendUrl };
}
function redirect(res, status, returnOrigin) {
  const fallbackOrigin = String(process.env.FRONTEND_URL || 'http://localhost:5173').trim();
  const url = new URL('/add-trade', isAllowedOrigin(returnOrigin) ? normalizeOrigin(returnOrigin) : fallbackOrigin);
  url.searchParams.set('oauth', status);
  url.searchParams.set('ctrader', status);
  return res.redirect(url.toString());
}
async function requestTokens(parameters, method = 'get') {
  const { data = {} } = await axios({
    method,
    url: TOKEN_URL,
    params: parameters,
    timeout: 15000,
    headers: { Accept: 'application/json' },
  });
  const accessToken = data.accessToken;
  const refreshToken = data.refreshToken;
  const expiresIn = Number(data.expiresIn ?? 2628000);
  if (
    data.errorCode
    || typeof accessToken !== 'string'
    || !accessToken
    || accessToken.length > 8192
    || (refreshToken != null && (typeof refreshToken !== 'string' || refreshToken.length > 8192))
    || !Number.isFinite(expiresIn)
    || expiresIn <= 0
  ) throw new Error('cTrader token request failed');
  return { accessToken, refreshToken, expiresIn };
}
function encryptTokens(userId, tokens, expiresAt) {
  return encryptUserBrokerCredential(JSON.stringify({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: expiresAt.toISOString(),
  }), `ctrader:user:${userId}`);
}
function metadataFor(accounts) {
  return JSON.stringify({
    provider: 'ctrader',
    scope: 'accounts',
    authorizedAccountIds: accounts.map((account) => account.id),
    authorizedAccounts: accounts,
  });
}
async function refreshConnection(userId, connectionId) {
  let client;
  try {
    const selectedConnection = await repository.findById(userId, connectionId);
    if (!selectedConnection) {
      const error = new Error('cTrader connection not found');
      error.status = 404;
      throw error;
    }
    client = await pool.connect();
    await client.query('BEGIN');
    const result = await client.query(`
      SELECT credential.encrypted_payload
      FROM broker_connections.credentials credential
      JOIN broker_connections.user_broker_connections connection ON connection.id = credential.connection_id
      JOIN trading_catalog.broker_integrations integration ON integration.id = connection.integration_id
      JOIN trading_catalog.platforms platform ON platform.id = integration.platform_id
      WHERE connection.user_id = $1 AND connection.id = $2
        AND platform.slug = 'ctrader' AND integration.trade_method = 'oauth_sync'
        AND credential.credential_type = 'oauth_tokens'
      FOR UPDATE OF credential
    `, [userId, connectionId]);
    const encryptedPayload = result.rows[0]?.encrypted_payload;
    if (!encryptedPayload) {
      const error = new Error('cTrader connection not found');
      error.status = 404;
      throw error;
    }
    const stored = JSON.parse(decryptUserBrokerCredential(encryptedPayload, `ctrader:user:${userId}`));
    if (!stored.refreshToken) throw new Error('cTrader refresh token is missing');
    const { clientId, clientSecret } = getConfig();
    const tokens = await requestTokens({
      grant_type: 'refresh_token',
      refresh_token: stored.refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }, 'post');
    tokens.refreshToken = tokens.refreshToken || stored.refreshToken;
    const accounts = filterAccountsForBroker(
      await getAuthorizedAccounts({ accessToken: tokens.accessToken, clientId, clientSecret }),
      selectedConnection
    );
    if (!accounts.length) throw new Error('cTrader did not return an account for the selected broker');
    const expiresAt = new Date(Date.now() + Math.max(60, tokens.expiresIn) * 1000);
    await client.query(`
      UPDATE broker_connections.credentials
      SET encrypted_payload = $2, expires_at = $3, last_rotated_at = NOW(), updated_at = NOW()
      WHERE connection_id = $1 AND credential_type = 'oauth_tokens'
    `, [connectionId, encryptTokens(userId, tokens, expiresAt), expiresAt]);
    await client.query(`
      UPDATE broker_connections.user_broker_connections
      SET status = 'connected', external_account_id = $3, metadata = $4::jsonb,
          last_error = NULL, updated_at = NOW()
      WHERE user_id = $1 AND id = $2
    `, [userId, connectionId, accounts[0].id, metadataFor(accounts)]);
    await client.query('COMMIT');
    return { accessToken: tokens.accessToken, accounts, expiresAt };
  } catch (error) {
    await client?.query('ROLLBACK').catch(() => null);
    throw error;
  } finally {
    client?.release();
  }
}
router.get('/', async (req, res) => {
  try {
    const connection = await repository.findByUser(req.userId);
    return res.json({ success: true, connected: connection?.status === 'connected', connection });
  } catch (error) {
    logInternalError(req, error, 'broker_connections.ctrader_status_failed');
    return publicError(res, { status: 503, code: 'SERVICE_UNAVAILABLE', req });
  }
});
const handleConnect = async (req, res) => {
  try {
    const connectionId = String(req.body?.connectionId || req.query?.connectionId || '');
    if (!UUID_PATTERN.test(connectionId) || !(await repository.findById(req.userId, connectionId))) {
      return res.status(404).json({ success: false, error: 'Saved cTrader account not found' });
    }
    const { callbackUrl, clientId, frontendUrl } = getConfig();
    const requestOrigin = normalizeOrigin(req.headers.origin);
    const returnOrigin = isAllowedOrigin(requestOrigin) ? requestOrigin : frontendUrl;
    const state = crypto.randomBytes(32).toString('base64url');
    await repository.saveState(req.userId, connectionId, hashToken(state), new Date(Date.now() + 5 * 60 * 1000), returnOrigin);
    const authorizationUrl = new URL(AUTH_URL);
    authorizationUrl.searchParams.set('client_id', clientId);
    authorizationUrl.searchParams.set('redirect_uri', callbackUrl);
    authorizationUrl.searchParams.set('scope', 'accounts');
    authorizationUrl.searchParams.set('product', 'web');
    authorizationUrl.searchParams.set('state', state);
    return res.json({ success: true, authorizationUrl: authorizationUrl.toString() });
  } catch (error) {
    logInternalError(req, error, 'broker_connections.ctrader_start_failed');
    return publicError(res, { status: 503, code: 'SERVICE_UNAVAILABLE', req });
  }
};
router.get('/start', handleConnect);
router.post('/connect', handleConnect);
router.get('/callback', async (req, res) => {
  let returnOrigin;
  try {
    const state = typeof req.query.state === 'string' && req.query.state.length <= 256 ? req.query.state : '';
    const oauthState = state ? await repository.consumeState(req.userId, hashToken(state)) : null;
    if (!oauthState) return redirect(res, 'invalid');
    const { connectionId } = oauthState;
    returnOrigin = oauthState.returnOrigin;
    if (req.query.error) return redirect(res, 'cancelled', returnOrigin);
    const code = typeof req.query.code === 'string' && req.query.code.length <= 2048 ? req.query.code : '';
    if (!code) return redirect(res, 'invalid', returnOrigin);
    const { callbackUrl, clientId, clientSecret } = getConfig();
    const tokens = await requestTokens({
      grant_type: 'authorization_code',
      code,
      redirect_uri: callbackUrl,
      client_id: clientId,
      client_secret: clientSecret,
    });
    if (!tokens.refreshToken) throw new Error('cTrader token response did not include a refresh token');
    const selectedConnection = await repository.findById(req.userId, connectionId);
    const accounts = filterAccountsForBroker(
      await getAuthorizedAccounts({ accessToken: tokens.accessToken, clientId, clientSecret }),
      selectedConnection
    );
    if (!accounts.length) throw new Error('cTrader did not return an account for the selected broker');
    const expiresAt = new Date(Date.now() + Math.max(60, tokens.expiresIn) * 1000);
    await repository.saveConnection(req.userId, connectionId, accounts, encryptTokens(req.userId, tokens, expiresAt), expiresAt);
    require('./liveSync').reload().catch(() => {});
    return redirect(res, 'connected', returnOrigin);
  } catch (error) {
    logInternalError(req, error, 'broker_connections.ctrader_callback_failed');
    try { return redirect(res, 'error', returnOrigin); } catch { return publicError(res, { status: 503, code: 'SERVICE_UNAVAILABLE', req }); }
  }
});
router.post('/:id/refresh', async (req, res) => {
  if (!UUID_PATTERN.test(req.params.id)) return res.status(400).json({ success: false, error: 'Invalid connection id' });
  try {
    const refreshed = await refreshConnection(req.userId, req.params.id);
    require('./liveSync').reload().catch(() => {});
    return res.json({ success: true, connected: true, accountCount: refreshed.accounts.length, expiresAt: refreshed.expiresAt });
  } catch (error) {
    logInternalError(req, error, 'broker_connections.ctrader_refresh_failed');
    if (error.status === 404) return res.status(404).json({ success: false, error: 'Connection not found' });
    return publicError(res, { status: 503, code: 'SERVICE_UNAVAILABLE', req });
  }
});
const handleSync = async (req, res) => {
  const connectionId = String(req.params.id || req.body?.connectionId || '');
  if (!UUID_PATTERN.test(connectionId)) return res.status(400).json({ success: false, error: 'Invalid connection id' });
  const accountId = String(req.body?.accountId || '');
  const fromTimestamp = Number(req.body?.fromTimestamp);
  const rawTo = Number(req.body?.toTimestamp);
  const toTimestamp = Number.isSafeInteger(rawTo) ? Math.min(rawTo, Date.now()) : Date.now();
  if (!/^\d+$/.test(accountId) || !Number.isSafeInteger(fromTimestamp) || fromTimestamp < 0 || toTimestamp < fromTimestamp) {
    return res.status(400).json({ success: false, error: 'Invalid account or date range' });
  }
  try {
    let connection = await repository.findById(req.userId, connectionId);
    if (!connection) return res.status(404).json({ success: false, error: 'cTrader connection not found' });
    let accounts = Array.isArray(connection.metadata?.authorizedAccounts) ? connection.metadata.authorizedAccounts : [];
    let credential = await repository.getCredential(req.userId, connectionId);
    if (!credential) return res.status(409).json({ success: false, error: 'Connect cTrader before syncing' });
    let stored = JSON.parse(decryptUserBrokerCredential(credential.encryptedPayload, `ctrader:user:${req.userId}`));
    const expiresAt = new Date(stored.expiresAt || credential.expiresAt).getTime();
    if (!accounts.some((account) => String(account.id) === accountId)
      || !Number.isFinite(expiresAt) || expiresAt <= Date.now() + 60000) {
      const refreshed = await refreshConnection(req.userId, connectionId);
      accounts = refreshed.accounts;
      stored = { ...stored, accessToken: refreshed.accessToken };
      connection = await repository.findById(req.userId, connectionId);
    }
    const account = accounts.find((candidate) => String(candidate.id) === accountId);
    if (!account) return res.status(403).json({ success: false, error: 'cTrader account is not authorized' });
    await repository.setSyncStatus(req.userId, connectionId, 'running');
    const { clientId, clientSecret } = getConfig();
    const trades = await fetchClosedTrades({
      accessToken: stored.accessToken,
      account,
      clientId,
      clientSecret,
      fromTimestamp,
      toTimestamp,
    });
    const syncResult = await repository.saveTrades(req.userId, connection, accountId, trades);
    await repository.setSyncStatus(req.userId, connectionId, 'success');
    const newCount = syncResult?.newCount ?? (typeof syncResult === 'number' ? syncResult : 0);
    const updatedCount = syncResult?.updatedCount ?? 0;
    const savedCount = syncResult?.savedCount ?? (typeof syncResult === 'number' ? syncResult : 0);
    let message = 'Sync complete';
    if (trades.length === 0) {
      message = 'No trades found for selected date range';
    } else if (newCount === 0) {
      message = updatedCount > 0
        ? `No new trades found (${updatedCount} trade${updatedCount === 1 ? '' : 's'} up to date)`
        : 'No new trades found';
    } else {
      message = `${newCount} new trade${newCount === 1 ? '' : 's'} saved${updatedCount > 0 ? ` (${updatedCount} up to date)` : ''}`;
    }
    return res.json({
      success: true,
      fetchedCount: trades.length,
      newTradesCount: newCount,
      updatedTradesCount: updatedCount,
      savedCount,
      message,
    });
  } catch (error) {
    await repository.setSyncStatus(req.userId, connectionId, 'failed', 'Trade history sync failed').catch(() => null);
    logInternalError(req, error, 'broker_connections.ctrader_sync_failed');
    return publicError(res, { status: 503, code: 'SERVICE_UNAVAILABLE', req });
  }
};
router.post('/:id/sync', syncRateLimiter, handleSync);
router.post('/sync', syncRateLimiter, handleSync);
module.exports = router;
module.exports.getConfig = getConfig;
module.exports.refreshConnection = refreshConnection;
