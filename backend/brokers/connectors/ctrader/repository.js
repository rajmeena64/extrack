const pool = require('../../../infra/db/supabase');
const connections = require('../../connections/connectionRepository');
const { mapConnectionTrades } = require('../../../domains/trading/trade.normalization');
const { upsertTradeExecutions } = require('../../../domains/trading/trade.repository');

async function listConnectedCredentials() {
  const result = await pool.query(`
    SELECT connection.id AS "connectionId", connection.user_id AS "userId",
      connection.account_name AS "accountName", connection.integration_id AS "integrationId",
      connection.metadata, credential.encrypted_payload AS "encryptedPayload",
      credential.expires_at AS "expiresAt", broker.id AS "brokerId"
    FROM broker_connections.user_broker_connections connection
    JOIN trading_catalog.broker_integrations integration ON integration.id = connection.integration_id
    JOIN trading_catalog.brokers broker ON broker.id = integration.broker_id
    JOIN trading_catalog.platforms platform ON platform.id = integration.platform_id
    JOIN broker_connections.credentials credential ON credential.connection_id = connection.id
      AND credential.credential_type = 'oauth_tokens'
    WHERE connection.status = 'connected' AND platform.slug = 'ctrader'
      AND integration.trade_method = 'oauth_sync'
  `);
  return result.rows;
}

async function findByUser(userId) {
  const result = await pool.query(`
    SELECT connection.id
    FROM broker_connections.user_broker_connections connection
    JOIN trading_catalog.broker_integrations integration ON integration.id = connection.integration_id
    JOIN trading_catalog.platforms platform ON platform.id = integration.platform_id
    WHERE connection.user_id = $1 AND platform.slug = 'ctrader'
      AND integration.trade_method = 'oauth_sync'
    LIMIT 1
  `, [userId]);
  return result.rows[0] ? connections.findById(userId, result.rows[0].id) : null;
}

async function findById(userId, connectionId) {
  const connection = await connections.findById(userId, connectionId);
  return connection?.platformSlug === 'ctrader' && connection.tradeMethod === 'oauth_sync' ? connection : null;
}

async function saveState(userId, connectionId, stateHash, expiresAt, returnOrigin) {
  await pool.query(`
    INSERT INTO broker_connections.oauth_states (user_id, provider, connection_id, state_hash, expires_at, return_origin)
    VALUES ($1, 'ctrader', $2, $3, $4, $5)
    ON CONFLICT (user_id, provider) DO UPDATE SET
      connection_id = EXCLUDED.connection_id, state_hash = EXCLUDED.state_hash,
      expires_at = EXCLUDED.expires_at, return_origin = EXCLUDED.return_origin, created_at = NOW()
  `, [userId, connectionId, stateHash, expiresAt, returnOrigin]);
}

async function consumeState(userId, stateHash) {
  const result = await pool.query(`
    DELETE FROM broker_connections.oauth_states
    WHERE user_id = $1 AND provider = 'ctrader' AND state_hash = $2 AND expires_at > NOW()
    RETURNING connection_id AS "connectionId", return_origin AS "returnOrigin"
  `, [userId, stateHash]);
  return result.rows[0] || null;
}

function accountMetadata(accounts) {
  return {
    provider: 'ctrader',
    scope: 'accounts',
    authorizedAccountIds: accounts.map((account) => account.id),
    authorizedAccounts: accounts,
  };
}

async function saveConnection(userId, connectionId, accounts, encryptedPayload, expiresAt) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const connectionResult = await client.query(`
      UPDATE broker_connections.user_broker_connections connection
      SET external_account_id = $3, status = 'connected', metadata = $4::jsonb,
          connected_at = NOW(), last_error = NULL, updated_at = NOW()
      FROM trading_catalog.broker_integrations integration
      JOIN trading_catalog.platforms platform ON platform.id = integration.platform_id
      WHERE connection.user_id = $1 AND connection.id = $2
        AND integration.id = connection.integration_id
        AND platform.slug = 'ctrader' AND integration.trade_method = 'oauth_sync'
      RETURNING connection.id
    `, [userId, connectionId, accounts[0].id, JSON.stringify(accountMetadata(accounts))]);
    if (!connectionResult.rowCount) throw new Error('cTrader connection is not available');

    await client.query(`
      INSERT INTO broker_connections.credentials
        (connection_id, credential_type, encrypted_payload, encryption_algorithm, key_version, expires_at, last_rotated_at)
      VALUES ($1, 'oauth_tokens', $2, 'aes-256-gcm', 'v1', $3, NOW())
      ON CONFLICT (connection_id, credential_type) DO UPDATE SET
        encrypted_payload = EXCLUDED.encrypted_payload,
        encryption_algorithm = EXCLUDED.encryption_algorithm,
        key_version = EXCLUDED.key_version,
        expires_at = EXCLUDED.expires_at,
        last_rotated_at = NOW(), updated_at = NOW()
    `, [connectionId, encryptedPayload, expiresAt]);
    await client.query('COMMIT');
    return connections.findById(userId, connectionId);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => null);
    throw error;
  } finally {
    client.release();
  }
}

async function getCredential(userId, connectionId) {
  const result = await pool.query(`
    SELECT credential.encrypted_payload AS "encryptedPayload", credential.expires_at AS "expiresAt"
    FROM broker_connections.credentials credential
    JOIN broker_connections.user_broker_connections connection ON connection.id = credential.connection_id
    JOIN trading_catalog.broker_integrations integration ON integration.id = connection.integration_id
    JOIN trading_catalog.platforms platform ON platform.id = integration.platform_id
    WHERE connection.user_id = $1 AND connection.id = $2
      AND platform.slug = 'ctrader' AND integration.trade_method = 'oauth_sync'
      AND credential.credential_type = 'oauth_tokens'
    LIMIT 1
  `, [userId, connectionId]);
  return result.rows[0] || null;
}

async function setSyncStatus(userId, connectionId, status, error = null) {
  await pool.query(`
    UPDATE broker_connections.user_broker_connections
    SET last_sync_status = $3::varchar,
        last_synced_at = CASE WHEN $3::varchar = 'success' THEN NOW() ELSE last_synced_at END,
        last_error = $4, updated_at = NOW()
    WHERE user_id = $1 AND id = $2
  `, [userId, connectionId, status, error]);
}

async function saveAccountBalance(userId, connectionId, accountId, balance, currency) {
  return connections.saveBalanceSnapshot(userId, connectionId, accountId, balance, currency);
}

async function saveTrades(userId, connection, accountId, trades) {
  if (!trades.length) return 0;
  const normalized = (await mapConnectionTrades(userId, connection.id, trades, pool) || []).filter(Boolean);
  const executionsByUniqueId = new Map(trades.map((trade) => [
    `ctrader:${trade.accountId}:${trade.dealId}`,
    (trade.executions || []).map((execution) => ({
      ...execution,
      feeCurrency: trade.accountCurrency || null,
      brokerExecutionId: execution.brokerExecutionId ? `ctrader:${accountId}:${execution.brokerExecutionId}` : null,
    })),
  ]));
  const uniqueIds = normalized.map((t) => t.unique_id).filter(Boolean);
  const existingRes = await pool.query(
    'SELECT unique_id FROM trading.trades WHERE user_id = $1 AND unique_id = ANY($2::text[])',
    [userId, uniqueIds]
  );
  const existingSet = new Set(existingRes.rows.map((r) => r.unique_id));
  const newCount = normalized.filter((t) => t.unique_id && !existingSet.has(t.unique_id)).length;
  const updatedCount = normalized.length - newCount;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(`
    INSERT INTO trading.trades (
      user_id, broker_connection_id, source, instrument_id, product_type,
      symbol, side, status, category,
      quantity, quantity_unit, entry_price, exit_price, total_charges, gross_pnl, net_pnl,
      pnl_currency, currency, pnl_source, entry_timestamp, exit_timestamp, unique_id, percent_change, stop_loss, take_profit,
      charges, custom_fields
    )
    SELECT $1, $3::uuid, 'sync', instrument.id, trade.product_type,
      trade.symbol, trade.side, trade.status,
      COALESCE(NULLIF(instrument.asset_class, ''), NULLIF(instrument.category, ''), NULLIF(BTRIM(trade.category), ''), 'other'),
      trade.quantity, trade.quantity_unit, trade.entry_price, trade.exit_price,
      COALESCE(trade.total_charges, 0), trade.gross_pnl, trade.net_pnl, trade.pnl_currency, COALESCE(trade.pnl_currency, 'USD'), 'broker',
      TO_TIMESTAMP(trade.entry_timestamp / 1000.0), TO_TIMESTAMP(trade.exit_timestamp / 1000.0),
      trade.unique_id, trade.percent_change, trade.stop_loss, trade.take_profit,
      COALESCE(trade.charges, TO_JSONB(COALESCE(trade.total_charges, 0)), '0'::jsonb),
      JSONB_BUILD_OBJECT(
        'provider', 'ctrader',
        'environment', trade.account_environment,
        'providerCategory', trade.category,
        'entryTimestampUnixMs', trade.entry_timestamp,
        'exitTimestampUnixMs', trade.exit_timestamp,
        'chargeCurrency', trade.pnl_currency
      )
    FROM JSONB_TO_RECORDSET($2::jsonb) AS trade(
      unique_id text, product_type text, symbol text, side text,
      status text, quantity numeric,
      quantity_unit text, entry_price numeric, exit_price numeric, total_charges numeric,
      gross_pnl numeric, net_pnl numeric, pnl_currency text, entry_timestamp bigint, exit_timestamp bigint,
      percent_change numeric, stop_loss numeric, take_profit numeric, category text,
      charges jsonb, account_environment text
    )
    LEFT JOIN LATERAL (
      SELECT id, category, asset_class
      FROM trading_catalog.instruments
      WHERE is_active = TRUE AND (
        UPPER(REGEXP_REPLACE(symbol, '[^A-Z0-9]', '', 'g')) = UPPER(REGEXP_REPLACE(trade.symbol, '[^A-Z0-9]', '', 'g'))
        OR UPPER(REGEXP_REPLACE(source_symbol, '[^A-Z0-9]', '', 'g')) = UPPER(REGEXP_REPLACE(trade.symbol, '[^A-Z0-9]', '', 'g'))
      )
      ORDER BY sort_order, id
      LIMIT 1
    ) instrument ON TRUE
    ON CONFLICT (user_id, unique_id) WHERE unique_id IS NOT NULL DO UPDATE SET
      product_type = EXCLUDED.product_type, side = EXCLUDED.side,
      status = EXCLUDED.status, quantity = EXCLUDED.quantity,
      entry_price = EXCLUDED.entry_price, exit_price = EXCLUDED.exit_price,
      total_charges = EXCLUDED.total_charges,
      gross_pnl = EXCLUDED.gross_pnl, net_pnl = EXCLUDED.net_pnl,
      pnl_currency = COALESCE(EXCLUDED.pnl_currency, trading.trades.pnl_currency),
      currency = COALESCE(EXCLUDED.currency, trading.trades.currency),
      entry_timestamp = EXCLUDED.entry_timestamp,
      exit_timestamp = EXCLUDED.exit_timestamp, instrument_id = EXCLUDED.instrument_id,
      category = EXCLUDED.category, percent_change = EXCLUDED.percent_change,
      stop_loss = COALESCE(EXCLUDED.stop_loss, trading.trades.stop_loss),
      take_profit = COALESCE(EXCLUDED.take_profit, trading.trades.take_profit),
      charges = COALESCE(EXCLUDED.charges, trading.trades.charges, '0'::jsonb),
      custom_fields = trading.trades.custom_fields || EXCLUDED.custom_fields, updated_at = NOW()
    RETURNING id, unique_id
  `, [userId, JSON.stringify(normalized), connection.id]);
    const savedRows = result.rows || [];
    for (const savedTrade of savedRows) {
      await upsertTradeExecutions(client, savedTrade.id, executionsByUniqueId.get(savedTrade.unique_id) || []);
    }
    await client.query('COMMIT');
    return { newCount, updatedCount, savedCount: result.rowCount };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => null);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  consumeState,
  findById,
  findByUser,
  getCredential,
  listConnectedCredentials,
  saveConnection,
  saveAccountBalance,
  saveState,
  saveTrades,
  setSyncStatus,
};
