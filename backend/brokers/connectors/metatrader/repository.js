const pool = require('../../../infra/db/supabase');
const {
  encryptUserBrokerCredential,
  decryptUserBrokerCredential,
} = require('../../../shared/utils/credentialEncryption');
const { normalizeMetaTraderTrade } = require('./parser');

async function findConnectionByUser(userId, connectionId) {
  const result = await pool.query(`
    SELECT connection.id, connection.user_id AS "userId", connection.status, connection.metadata,
           connection.account_name AS "accountName", connection.account_currency AS "accountCurrency",
           broker.slug AS "brokerSlug", broker.name AS "brokerName", integration.trade_method AS "tradeMethod"
    FROM broker_connections.user_broker_connections connection
    JOIN trading_catalog.broker_integrations integration ON integration.id = connection.integration_id
    JOIN trading_catalog.brokers broker ON broker.id = integration.broker_id
    WHERE connection.user_id = $1 AND connection.id = $2
      AND connection.status != 'deleted'
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
    WHERE connection_id = $1 AND credential_type = 'password'
    LIMIT 1
  `, [connectionId]);

  if (!result.rows.length || !result.rows[0].encryptedPayload) return null;

  const decrypted = decryptUserBrokerCredential(result.rows[0].encryptedPayload, `metatrader:user:${userId}`);
  const creds = JSON.parse(decrypted);
  if (connection.metadata && Number.isInteger(connection.metadata.gmtOffset)) {
    creds.gmtOffset = connection.metadata.gmtOffset;
  }
  return creds;
}

async function saveCredentials(userId, connectionId, credentials) {
  const encryptedPayload = encryptUserBrokerCredential(JSON.stringify(credentials), `metatrader:user:${userId}`);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      INSERT INTO broker_connections.credentials (
        connection_id, credential_type, encrypted_payload, encryption_algorithm, key_version, last_rotated_at
      ) VALUES ($1, 'password', $2, 'aes-256-gcm', 'v1', NOW())
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

function formatTimezoneOffset(offsetSeconds) {
  const totalSec = Number(offsetSeconds) || 0;
  const sign = totalSec >= 0 ? '+' : '-';
  const absSec = Math.abs(totalSec);
  const hours = Math.floor(absSec / 3600);
  const minutes = Math.floor((absSec % 3600) / 60);
  const paddedHours = String(hours).padStart(2, '0');
  const paddedMinutes = String(minutes).padStart(2, '0');
  return {
    timezone: `UTC${sign}${paddedHours}:${paddedMinutes}`,
    timezoneLabel: minutes > 0 ? `GMT${sign}${hours}:${paddedMinutes}` : `GMT${sign}${hours}`,
    gmtOffset: totalSec,
  };
}

async function updateConnectionAfterSync(userId, connectionId, accountInfo, gmtOffset) {
  const balanceSnapshot = {
    balance: accountInfo.balance,
    equity: accountInfo.equity,
    leverage: accountInfo.leverage,
    isDemo: accountInfo.is_demo,
    server: accountInfo.server,
    company: accountInfo.company,
  };

  const tzInfo = formatTimezoneOffset(gmtOffset);

  await pool.query(`
    UPDATE broker_connections.user_broker_connections
    SET status = 'connected',
        account_name = COALESCE(NULLIF($3::text, ''), account_name),
        account_currency = COALESCE(NULLIF($4::text, ''), account_currency),
        external_account_id = COALESCE(NULLIF($5::text, ''), external_account_id),
        balance_snapshot = $6::jsonb,
        metadata = COALESCE(metadata, '{}'::jsonb) || $7::jsonb,
        last_synced_at = NOW(),
        last_sync_status = 'success',
        updated_at = NOW()
    WHERE id = $1 AND user_id = $2
  `, [
    connectionId,
    userId,
    accountInfo.server ? `${accountInfo.server} (${accountInfo.login})` : null,
    accountInfo.currency,
    String(accountInfo.login || ''),
    JSON.stringify(balanceSnapshot),
    JSON.stringify(tzInfo),
  ]);
}

async function saveMetaTraderTrades(userId, connectionId, rawTrades, accountCurrency) {
  const normalizedTrades = (rawTrades || [])
    .map((trade) => normalizeMetaTraderTrade(trade, userId, connectionId, accountCurrency))
    .filter(Boolean);

  if (!normalizedTrades.length) {
    await pool.query(`
      UPDATE broker_connections.user_broker_connections
      SET last_synced_at = NOW(), last_sync_status = 'success', updated_at = NOW()
      WHERE user_id = $1 AND id = $2
    `, [userId, connectionId]);
    return { fetchedCount: 0, newCount: 0, updatedCount: 0, savedCount: 0 };
  }

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
        entry_price, exit_price, quantity, quantity_unit, entry_timestamp, exit_timestamp,
        gross_pnl, net_pnl, pnl_currency, currency, total_charges, charges,
        stop_loss, take_profit, close_reason, product_type, category, status, source
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10, $11,
        $12, $13, $14, $15, $16, $17,
        $18, $19, $20, $21, $22, $23, $24
      )
      ON CONFLICT (user_id, unique_id) DO UPDATE SET
        entry_price = EXCLUDED.entry_price,
        exit_price = EXCLUDED.exit_price,
        quantity = EXCLUDED.quantity,
        net_pnl = EXCLUDED.net_pnl,
        gross_pnl = EXCLUDED.gross_pnl,
        total_charges = EXCLUDED.total_charges,
        stop_loss = EXCLUDED.stop_loss,
        take_profit = EXCLUDED.take_profit,
        close_reason = EXCLUDED.close_reason,
        updated_at = NOW()
      RETURNING id
    `, [
      trade.user_id, trade.broker_connection_id, trade.unique_id, trade.symbol, trade.side,
      trade.entry_price, trade.exit_price, trade.quantity, trade.quantity_unit, trade.entry_timestamp, trade.exit_timestamp,
      trade.gross_pnl, trade.net_pnl, trade.pnl_currency, trade.currency, trade.total_charges, trade.charges,
      trade.stop_loss, trade.take_profit, trade.close_reason, trade.product_type, trade.category, trade.status, trade.source
    ]);
    if (res.rows.length) savedCount += 1;
  }

  await pool.query(`
    UPDATE broker_connections.user_broker_connections
    SET last_synced_at = NOW(), last_sync_status = 'success', updated_at = NOW()
    WHERE user_id = $1 AND id = $2
  `, [userId, connectionId]);

  return { fetchedCount: rawTrades.length, newCount, updatedCount, savedCount };
}

module.exports = {
  findConnectionByUser,
  getCredentials,
  saveCredentials,
  updateConnectionAfterSync,
  saveMetaTraderTrades,
  formatTimezoneOffset,
};
