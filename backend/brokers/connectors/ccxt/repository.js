const pool = require('../../../infra/db/supabase');
const { encryptUserBrokerCredential, decryptUserBrokerCredential } = require('../../../shared/utils/credentialEncryption');
const { findBySymbol } = require('../../../instruments/instrumentRegistry');
const { isSupported } = require('./client');

async function findConnectionByUser(userId, connectionId) {
  const res = await pool.query(`
    SELECT c.id, c.user_id AS "userId", c.status, c.metadata, b.slug AS "brokerSlug", b.name AS "brokerName"
    FROM broker_connections.user_broker_connections c
    JOIN trading_catalog.broker_integrations i ON i.id = c.integration_id
    JOIN trading_catalog.brokers b ON b.id = i.broker_id
    WHERE c.user_id = $1 AND c.id = $2 AND c.deleted_at IS NULL
    LIMIT 1
  `, [userId, connectionId]);
  return res.rows[0] || null;
}

async function getCredentials(userId, connectionId) {
  const res = await pool.query(
    "SELECT encrypted_payload FROM broker_connections.credentials WHERE connection_id = $1 AND credential_type = 'api_credentials' LIMIT 1",
    [connectionId]
  );
  if (!res.rows[0]?.encrypted_payload) return null;
  return JSON.parse(decryptUserBrokerCredential(res.rows[0].encrypted_payload, `ccxt:user:${userId}`));
}

async function saveCredentials(userId, connectionId, creds) {
  const enc = encryptUserBrokerCredential(JSON.stringify(creds), `ccxt:user:${userId}`);
  await pool.query(`
    INSERT INTO broker_connections.credentials (connection_id, credential_type, encrypted_payload, encryption_algorithm, key_version, last_rotated_at)
    VALUES ($1, 'api_credentials', $2, 'aes-256-gcm', 'v1', NOW())
    ON CONFLICT (connection_id, credential_type) DO UPDATE SET encrypted_payload = EXCLUDED.encrypted_payload, updated_at = NOW()
  `, [connectionId, enc]);
  const env = creds.environment || 'real';
  await pool.query("UPDATE broker_connections.user_broker_connections SET status = 'connected', metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{environment}', to_jsonb($3::text)), updated_at = NOW() WHERE id = $1 AND user_id = $2", [connectionId, userId, env]);
}

async function saveTrades(userId, connectionId, trades) {
  if (trades.length > 0) {
    await pool.query("DELETE FROM trading.trades WHERE user_id = $1 AND broker_connection_id = $2 AND source = 'sync'", [userId, connectionId]);
  }
  let count = 0;
  for (const t of trades) {
    const inst = await findBySymbol(t.symbol);
    await pool.query(`
      INSERT INTO trading.trades (
        user_id, broker_connection_id, unique_id, instrument_id, symbol, side, entry_price, exit_price,
        quantity, entry_timestamp, exit_timestamp, gross_pnl, net_pnl, pnl_currency, currency,
        charges, total_charges, product_type, category, status, source
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16::jsonb, $17, $18, $19, $20, $21)
      ON CONFLICT (user_id, unique_id) DO UPDATE SET
        instrument_id = EXCLUDED.instrument_id, symbol = EXCLUDED.symbol,
        entry_price = EXCLUDED.entry_price, exit_price = EXCLUDED.exit_price, quantity = EXCLUDED.quantity,
        total_charges = EXCLUDED.total_charges, net_pnl = EXCLUDED.net_pnl, updated_at = NOW()
    `, [
      userId, connectionId, t.unique_id, inst ? inst.id : null, t.symbol, t.side, t.entry_price, t.exit_price,
      t.quantity, t.entry_timestamp, t.exit_timestamp, t.gross_pnl, t.net_pnl, t.pnl_currency, t.currency,
      t.charges, t.total_charges, t.product_type, t.category, t.status, t.source
    ]);
    count++;
  }
  await pool.query("UPDATE broker_connections.user_broker_connections SET last_synced_at = NOW(), last_sync_status = 'success' WHERE id = $1 AND user_id = $2", [connectionId, userId]);
  return count;
}

async function listConnectedAccounts() {
  const res = await pool.query(`
    SELECT c.id AS "connectionId", c.user_id AS "userId", c.account_name AS "accountName",
      b.slug AS "brokerSlug", b.name AS "brokerName",
      cr.encrypted_payload AS "encryptedPayload"
    FROM broker_connections.user_broker_connections c
    JOIN trading_catalog.broker_integrations i ON i.id = c.integration_id
    JOIN trading_catalog.brokers b ON b.id = i.broker_id
    JOIN broker_connections.credentials cr ON cr.connection_id = c.id
      AND cr.credential_type = 'api_credentials'
    WHERE c.status = 'connected' AND c.deleted_at IS NULL
  `);
  return res.rows.filter((row) => isSupported(row.brokerSlug));
}

module.exports = { findConnectionByUser, getCredentials, saveCredentials, saveTrades, listConnectedAccounts };
