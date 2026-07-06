require('dotenv').config();

const pool = require('../src/infra/db/database');
const { getFeedKeyStatus, loadOrRotateKey } = require('../src/security/feed-key.service');

(async () => {
  try {
    await pool.query(
      'UPDATE system.service_secrets SET expires_at = $1 WHERE id = $2',
      [new Date(Date.now() - 1000), 'ctrader-feed-api']
    );
    await loadOrRotateKey({ force: true });
    const status = getFeedKeyStatus();
    console.log('Feed API key rotated. Secret was not printed.', {
      expiresAt: status.expiresAt,
      previousValidUntil: status.previousValidUntil,
    });
  } finally {
    await pool.end();
  }
})().catch((error) => {
  console.error('Feed API key rotation failed:', error.message);
  process.exit(1);
});

