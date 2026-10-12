const pool = require('../../../infra/db/supabase');
const {
  encryptUserBrokerCredential,
  decryptUserBrokerCredential,
} = require('../../../shared/utils/credentialEncryption');
const { normalizeAngelOneFill, parseAngelOneCsvRow } = require('./parser');

function normalizeAngelOneTrade(fill, userId, connectionId, mappingConfig = null) {
  return normalizeAngelOneFill(fill, userId, connectionId, mappingConfig);
}

async function findConnectionByUser(userId, connectionId) {
  const result = await pool.query(`
    SELECT connection.id, connection.user_id AS "userId", connection.status, connection.metadata,
           broker.slug AS "brokerSlug", broker.name AS "brokerName"
    FROM broker_connections.user_broker_connections connection
    JOIN trading_catalog.broker_integrations integration ON integration.id = connection.integration_id
    JOIN trading_catalog.brokers broker ON broker.id = integration.broker_id
    WHERE connection.user_id = $1 AND connection.id = $2
      AND connection.status != 'deleted' AND broker.slug = 'angel-one'
    LIMIT 1
  `, [userId, connectionId]);

  return result.rows[0] || null;
}

async function getCredentials(userId, connectionId) {
  const connection = await findConnectionByUser(userId, connectionId);
  if (!connection) return null;

  const result = await pool.query(`
    SELECT encrypted_payload AS "encryptedPayload"
    FROM broker_connections.credentials
    WHERE connection_id = $1 AND credential_type = 'api_credentials'
    LIMIT 1
  `, [connectionId]);

  if (!result.rows.length || !result.rows[0].encryptedPayload) return null;

  const decrypted = decryptUserBrokerCredential(result.rows[0].encryptedPayload, `angel-one:user:${userId}`);
  return JSON.parse(decrypted);
}

async function saveCredentials(userId, connectionId, credentials) {
  const encryptedPayload = encryptUserBrokerCredential(JSON.stringify(credentials), `angel-one:user:${userId}`);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      INSERT INTO broker_connections.credentials (
        connection_id, credential_type, encrypted_payload, encryption_algorithm, key_version, last_rotated_at
      ) VALUES ($1, 'api_credentials', $2, 'aes-256-gcm', 'v1', NOW())
      ON CONFLICT (connection_id, credential_type) DO UPDATE SET
        encrypted_payload = EXCLUDED.encrypted_payload,
        last_rotated_at = NOW(),
        updated_at = NOW()
    `, [connectionId, encryptedPayload]);

    await client.query(`
      UPDATE broker_connections.user_broker_connections
      SET status = 'connected', updated_at = NOW()
      WHERE id = $1 AND user_id = $2
    `, [connectionId, userId]);

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function saveVerifiedConnection(userId, connectionName, credentials) {
  const integrationResult = await pool.query(`
    SELECT integration.id
    FROM trading_catalog.broker_integrations integration
    JOIN trading_catalog.brokers broker ON broker.id = integration.broker_id
    WHERE broker.slug = 'angel-one' AND integration.trade_method = 'api_sync'
    LIMIT 1
  `);

  const integrationId = integrationResult.rows[0]?.id;
  if (!integrationId) throw new Error('Angel One API integration is not available');

  const connectionResult = await pool.query(`
    INSERT INTO broker_connections.user_broker_connections (
      user_id, integration_id, account_name, status, last_sync_status
    ) VALUES ($1, $2, COALESCE(NULLIF(BTRIM($3::text), ''), 'Angel One'), 'connected', 'pending')
    ON CONFLICT (user_id, integration_id, account_name) DO UPDATE SET
      status = 'connected',
      account_name = COALESCE(NULLIF(BTRIM($3::text), ''), account_name, 'Angel One'),
      updated_at = NOW()
    RETURNING id
  `, [userId, integrationId, connectionName || 'Angel One']);

  const connectionId = connectionResult.rows[0]?.id;
  if (!connectionId) throw new Error('Angel One connection not found or unauthorized');

  await saveCredentials(userId, connectionId, credentials);
  return connectionId;
}

async function saveAngelOneTrades(userId, connectionId, rawFills) {
  const mappingResult = await pool.query(`
    SELECT integration.trade_mapping AS "tradeMapping"
    FROM broker_connections.user_broker_connections connection
    JOIN trading_catalog.broker_integrations integration ON integration.id = connection.integration_id
    WHERE connection.user_id = $1 AND connection.id = $2
    LIMIT 1
  `, [userId, connectionId]);
  const mappingConfig = mappingResult.rows[0]?.tradeMapping || null;

  const normalizedTrades = (rawFills || [])
    .map((fill) => normalizeAngelOneFill(fill, userId, connectionId, mappingConfig))
    .filter(Boolean);

  const uniqueIds = normalizedTrades.map((t) => t.unique_id).filter(Boolean);
  const existingRes = await pool.query(
    'SELECT unique_id FROM trading.trades WHERE user_id = $1 AND unique_id = ANY($2::text[])',
    [userId, uniqueIds]
  );
  const existingSet = new Set(existingRes.rows.map((r) => r.unique_id));
  const newCount = normalizedTrades.filter((t) => t.unique_id && !existingSet.has(t.unique_id)).length;
  const updatedCount = normalizedTrades.length - newCount;
  let savedCount = 0;

  for (const trade of normalizedTrades) {
    const res = await pool.query(`
      INSERT INTO trading.trades (
        user_id, broker_connection_id, unique_id, symbol, side,
        entry_price, exit_price, quantity, entry_timestamp, exit_timestamp,
        gross_pnl, net_pnl, pnl_currency, currency, charges, total_charges, product_type, category, status, source
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, COALESCE($13, 'INR'), $14::jsonb, $15, $16, $17, $18, $19)
      ON CONFLICT (user_id, unique_id) DO UPDATE SET
        entry_price = EXCLUDED.entry_price,
        exit_price = EXCLUDED.exit_price,
        quantity = EXCLUDED.quantity,
        currency = COALESCE(EXCLUDED.currency, trading.trades.currency),
        charges = EXCLUDED.charges,
        total_charges = EXCLUDED.total_charges,
        gross_pnl = EXCLUDED.gross_pnl,
        net_pnl = EXCLUDED.net_pnl,
        updated_at = NOW()
      RETURNING id
    `, [
      trade.user_id, trade.broker_connection_id, trade.unique_id, trade.symbol, trade.side,
      trade.entry_price, trade.exit_price, trade.quantity, trade.entry_timestamp, trade.exit_timestamp,
      trade.gross_pnl, trade.net_pnl, trade.pnl_currency, JSON.stringify(trade.charges || {}), trade.total_charges || 0,
      trade.product_type, trade.category, trade.status, trade.source || 'sync'
    ]);
    if (res.rows.length) savedCount += 1;
  }

  await pool.query(`
    UPDATE broker_connections.user_broker_connections
    SET last_synced_at = NOW(), last_sync_status = 'success', updated_at = NOW()
    WHERE user_id = $1 AND id = $2
  `, [userId, connectionId]);

  return { fetchedCount: rawFills.length, newCount, updatedCount, savedCount };
}

module.exports = {
  findConnectionByUser,
  getCredentials,
  normalizeAngelOneTrade,
  parseAngelOneCsvRow,
  saveAngelOneTrades,
  saveCredentials,
  saveVerifiedConnection,
};
