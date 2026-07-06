require('dotenv').config();

const pool = require('../src/infra/db/database');

(async () => {
  try {
    const result = await pool.query(
      `SELECT current_secret, previous_secret, rotated_at, expires_at, previous_valid_until
       FROM system.service_secrets
       WHERE id = $1`,
      ['ctrader-feed-api']
    );
    const row = result.rows[0];
    if (!row) throw new Error('Feed API key row does not exist');

    const safeStatus = {
      currentEncrypted: String(row.current_secret).startsWith('enc:'),
      previousEncrypted: !row.previous_secret || String(row.previous_secret).startsWith('enc:'),
      keysDiffer: !row.previous_secret || row.current_secret !== row.previous_secret,
      rotatedAt: row.rotated_at,
      expiresAt: row.expires_at,
      previousValidUntil: row.previous_valid_until,
    };
    console.log(safeStatus);

    if (!safeStatus.currentEncrypted || !safeStatus.previousEncrypted || !safeStatus.keysDiffer) {
      process.exitCode = 1;
    }
  } finally {
    await pool.end();
  }
})().catch((error) => {
  console.error('Feed API key check failed:', error.message);
  process.exit(1);
});

