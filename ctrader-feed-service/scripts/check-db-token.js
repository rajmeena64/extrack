require('dotenv').config();

const pool = require('../src/infra/db/database');
const { TABLES } = require('../src/config/tables');
const { loadCtraderTokensFromStore } = require('../src/ctrader/token.service');
const { ctraderConfig, tokenState } = require('../src/ctrader/state');

(async () => {
  try {
    console.log('table =', TABLES.adminIntegrations);
    const result = await pool.query(
      `SELECT id, provider, account_id, is_demo, expires_at,
              LENGTH(COALESCE(access_token, '')) AS access_len,
              LENGTH(COALESCE(refresh_token, '')) AS refresh_len,
              updated_at
       FROM ${TABLES.adminIntegrations}
       WHERE id = $1`,
      ['ctrader']
    );
    console.log('db row =', result.rows[0] || null);

    await loadCtraderTokensFromStore({ force: true });
    console.log('loaded config =', {
      accountId: ctraderConfig.accountId,
      isDemo: ctraderConfig.isDemo,
      hasAccessToken: Boolean(ctraderConfig.accessToken),
      hasRefreshToken: Boolean(ctraderConfig.refreshToken),
      accessLen: (ctraderConfig.accessToken || '').length,
      refreshLen: (ctraderConfig.refreshToken || '').length,
      expiresAt: ctraderConfig.expiresAt,
      expiresAtIso: ctraderConfig.expiresAt ? new Date(Number(ctraderConfig.expiresAt)).toISOString() : null,
      lastTokenRefreshError: tokenState.lastRefreshError || null,
    });
  } catch (error) {
    console.error('check-db-token failed:', error.message);
  } finally {
    await pool.end();
  }
})();
