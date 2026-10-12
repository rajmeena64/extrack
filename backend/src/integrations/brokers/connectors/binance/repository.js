const pool = require('../../../../infra/db/postgres');
const { mapConnectionTrades } = require('../../../../domains/trading/trade.normalization');
const upsertTradeExecutions = async () => ({ inserted: 0, updated: 0 });
async function listConnectedCredentials(database = pool) {
  const result = await database.query(`
    SELECT connection.id AS "connectionId", connection.user_id AS "userId", connection.account_name AS "accountName", connection.metadata,
      credential.encrypted_payload AS "encryptedPayload"
    FROM broker_connections.user_broker_connections connection
    JOIN trading_catalog.broker_integrations integration ON integration.id = connection.integration_id
    JOIN trading_catalog.brokers broker ON broker.id = integration.broker_id
    JOIN broker_connections.credentials credential ON credential.connection_id = connection.id
      AND credential.credential_type = 'api_credentials'
    WHERE connection.status = 'connected' AND broker.slug = 'binance'
      AND integration.trade_method = 'api_sync'
      AND connection.deleted_at IS NULL
  `);
  return result.rows;
}
async function findByUser(userId, database = pool) {
  const result = await database.query(`
    SELECT connection.status, connection.metadata
    FROM broker_connections.user_broker_connections connection
    JOIN trading_catalog.broker_integrations integration ON integration.id = connection.integration_id
    JOIN trading_catalog.brokers broker ON broker.id = integration.broker_id
    WHERE connection.user_id = $1 AND broker.slug = 'binance'
      AND integration.trade_method = 'api_sync'
      AND connection.deleted_at IS NULL
    LIMIT 1
  `, [userId]);
  return result.rows[0] || null;
}
async function getCredential(userId, database = pool) {
  const result = await database.query(`
    SELECT credential.encrypted_payload AS "encryptedPayload"
    FROM broker_connections.credentials credential
    JOIN broker_connections.user_broker_connections connection ON connection.id = credential.connection_id
    JOIN trading_catalog.broker_integrations integration ON integration.id = connection.integration_id
    JOIN trading_catalog.brokers broker ON broker.id = integration.broker_id
    WHERE connection.user_id = $1 AND connection.status = 'connected'
      AND broker.slug = 'binance' AND integration.trade_method = 'api_sync'
      AND credential.credential_type = 'api_credentials'
    LIMIT 1
  `, [userId]);
  return result.rows[0] || null;
}
async function getCredentialByConnection(userId, connectionId, database = pool) {
  const result = await database.query(`
    SELECT credential.encrypted_payload AS "encryptedPayload",
      COALESCE(connection.metadata ->> 'environment', 'real') AS environment
    FROM broker_connections.credentials credential
    JOIN broker_connections.user_broker_connections connection ON connection.id = credential.connection_id
    JOIN trading_catalog.broker_integrations integration ON integration.id = connection.integration_id
    JOIN trading_catalog.brokers broker ON broker.id = integration.broker_id
    WHERE connection.user_id = $1 AND connection.id = $2
      AND broker.slug = 'binance' AND integration.trade_method = 'api_sync'
      AND credential.credential_type = 'api_credentials'
    LIMIT 1
  `, [userId, connectionId]);
  return result.rows[0] || null;
}
async function setAccountFingerprint(userId, connectionId, accountFingerprint, database = pool) {
  const result = await database.query(`
    UPDATE broker_connections.user_broker_connections connection
    SET external_account_id = $3, updated_at = NOW()
    FROM trading_catalog.broker_integrations integration, trading_catalog.brokers broker
    WHERE connection.user_id = $1 AND connection.id = $2
      AND connection.integration_id = integration.id AND integration.broker_id = broker.id
      AND broker.slug = 'binance' AND integration.trade_method = 'api_sync'
    RETURNING connection.id
  `, [userId, connectionId, accountFingerprint]);
  return result.rows[0] || null;
}
async function findTradeExport(userId, connectionId, market, startTime, endTime, database = pool) {
  const result = await database.query(`
    SELECT connection.id AS "connectionId", connection.metadata -> 'binanceTradeExports' -> $3 AS export
    FROM broker_connections.user_broker_connections connection
    JOIN trading_catalog.broker_integrations integration ON integration.id = connection.integration_id
    JOIN trading_catalog.brokers broker ON broker.id = integration.broker_id
    WHERE connection.user_id = $1 AND connection.id = $2
      AND broker.slug = 'binance' AND integration.trade_method = 'api_sync'
    LIMIT 1
  `, [userId, connectionId, `${market}:${startTime}:${endTime}`]);
  const row = result.rows[0];
  return row?.export ? { ...row.export, connectionId: row.connectionId } : null;
}
async function saveTradeExport(userId, connectionId, market, startTime, endTime, downloadId, database = pool) {
  const state = { market, startTime, endTime, downloadId, status: 'processing' };
  const result = await database.query(`
    UPDATE broker_connections.user_broker_connections connection
    SET metadata = JSONB_SET(
      COALESCE(connection.metadata, '{}'::jsonb),
      '{binanceTradeExports}',
      COALESCE(connection.metadata -> 'binanceTradeExports', '{}'::jsonb) || JSONB_BUILD_OBJECT($3::text, $2::jsonb),
      TRUE
    ), updated_at = NOW()
    FROM trading_catalog.broker_integrations integration, trading_catalog.brokers broker
    WHERE connection.user_id = $1 AND connection.id = $4 AND connection.status = 'connected'
      AND connection.integration_id = integration.id AND integration.broker_id = broker.id
      AND broker.slug = 'binance' AND integration.trade_method = 'api_sync'
    RETURNING connection.id AS "connectionId", $2::jsonb AS export
  `, [userId, JSON.stringify(state), `${market}:${startTime}:${endTime}`, connectionId]);
  if (!result.rows[0]) throw Object.assign(new Error('Connect Binance before requesting history'), { code: 'BINANCE_CONNECTION_REQUIRED' });
  return { ...result.rows[0].export, connectionId: result.rows[0].connectionId };
}
async function updateTradeExport(userId, connectionId, market, startTime, endTime, changes, database = pool) {
  const key = `${market}:${startTime}:${endTime}`;
  const patch = typeof changes === 'string' ? { status: changes } : changes;
  const result = await database.query(`
    UPDATE broker_connections.user_broker_connections connection
    SET metadata = JSONB_SET(
      connection.metadata,
      ARRAY['binanceTradeExports', $2::text],
      (connection.metadata -> 'binanceTradeExports' -> $2) || $3::jsonb,
      FALSE
    ), updated_at = NOW()
    FROM trading_catalog.broker_integrations integration, trading_catalog.brokers broker
    WHERE connection.user_id = $1 AND connection.id = $4 AND connection.integration_id = integration.id
      AND integration.broker_id = broker.id AND broker.slug = 'binance'
      AND integration.trade_method = 'api_sync'
      AND connection.metadata -> 'binanceTradeExports' -> $2 IS NOT NULL
    RETURNING connection.id
  `, [userId, key, JSON.stringify(patch), connectionId]);
  if (!result.rowCount) throw Object.assign(new Error('Binance history export was not found'), { code: 'VALIDATION_FAILED' });
}
function prepareTrade(trade, market, connection) {
  if (!trade?.isRoundTrip) return null;
  return {
    ...trade,
    uniqueId: connection.environment === 'demo' ? `binance:demo:${connection.id}:${trade.uniqueId}` : trade.uniqueId,
    quantityUnit: market === 'coinmFutures' ? 'contract' : 'asset',
    productType: market === 'spot' ? 'spot' : /_[0-9]{6}$/.test(String(trade.symbol || '')) ? 'future' : 'perpetual',
    pnlAvailable: true,
    category: market === 'spot' ? 'crypto' : 'perpetual',
    commissionAsset: trade.commissionAsset || null,
    providerTradeId: String(trade.id),
    providerOrderId: String(trade.orderId),
  };
}
async function saveTrades(userId, connectionId, market, trades, database = pool, mapper = mapConnectionTrades) {
  if (!trades.length) return 0;
  const connectionResult = await database.query(`
    SELECT connection.id, integration.id AS "integrationId",
      COALESCE(connection.metadata ->> 'environment', 'real') AS environment
    FROM broker_connections.user_broker_connections connection
    JOIN trading_catalog.broker_integrations integration ON integration.id = connection.integration_id
    JOIN trading_catalog.brokers broker ON broker.id = integration.broker_id
    WHERE connection.user_id = $1 AND connection.id = $2 AND connection.status = 'connected'
      AND broker.slug = 'binance' AND integration.trade_method = 'api_sync'
    LIMIT 1
  `, [userId, connectionId]);
  const connection = connectionResult.rows[0];
  if (!connection) throw Object.assign(new Error('Connect Binance before saving trades'), { code: 'BINANCE_CONNECTION_REQUIRED' });
  const prepared = trades.map((trade) => prepareTrade(trade, market, connection)).filter(Boolean);
  const executionsByUniqueId = new Map(prepared.map((trade) => [trade.uniqueId, trade.executions || []]));
  const normalized = (await mapper(userId, connection.id, prepared, database) || []).filter(Boolean);
  const uniqueIds = normalized.map((t) => t.unique_id).filter(Boolean);
  const existingRes = await database.query(
    'SELECT unique_id FROM trading.trades WHERE user_id = $1 AND unique_id = ANY($2::text[])',
    [userId, uniqueIds]
  );
  const existingSet = new Set(existingRes.rows.map((r) => r.unique_id));
  const newCount = normalized.filter((t) => t.unique_id && !existingSet.has(t.unique_id)).length;
  const updatedCount = normalized.length - newCount;
  const ownsClient = typeof database.connect === 'function';
  const client = ownsClient ? await database.connect() : database;
  try {
    if (ownsClient) await client.query('BEGIN');
    const result = await client.query(`
    INSERT INTO trading.trades (
      user_id, broker_connection_id, source, instrument_id, product_type, symbol,
      side, status, category, quantity, quantity_unit,
      entry_price, exit_price, total_charges, gross_pnl, net_pnl, pnl_currency, currency, pnl_source,
      entry_timestamp, exit_timestamp, unique_id, percent_change, stop_loss, take_profit, charges, custom_fields
    )
    SELECT $1, $2::uuid, 'sync', instrument.id, trade.product_type, trade.symbol,
      trade.side, trade.status,
      COALESCE(NULLIF(instrument.asset_class, ''), NULLIF(instrument.category, ''), trade.category, 'other'),
      trade.quantity, trade.quantity_unit, trade.entry_price, trade.exit_price,
      trade.total_charges, trade.gross_pnl, trade.net_pnl,
      COALESCE(NULLIF(trade.pnl_currency, ''), instrument.profit_currency, 'USDT'),
      COALESCE(NULLIF(trade.pnl_currency, ''), instrument.profit_currency, 'USDT'),
      CASE WHEN trade.pnl_available THEN 'broker' ELSE NULL END,
      TO_TIMESTAMP(trade.entry_timestamp / 1000.0), TO_TIMESTAMP(trade.exit_timestamp / 1000.0),
      trade.unique_id, trade.percent_change, trade.stop_loss, trade.take_profit, trade.charges,
      JSONB_BUILD_OBJECT(
        'provider', 'binance', 'environment', $5::text, 'market', $3::text, 'pnlAvailable', trade.pnl_available,
        'commissionAsset', trade.commission_asset, 'providerTradeId', trade.provider_trade_id,
        'providerOrderId', trade.provider_order_id, 'positionSide', trade.position_side,
        'entryTimestampUnixMs', trade.entry_timestamp,
        'exitTimestampUnixMs', trade.exit_timestamp
      )
    FROM JSONB_TO_RECORDSET($4::jsonb) AS trade(
      unique_id text, product_type text, symbol text, side text,
      status text, category text, quantity numeric,
      quantity_unit text, entry_price numeric, exit_price numeric, total_charges numeric,
      gross_pnl numeric, net_pnl numeric,
      pnl_available boolean, pnl_currency text, entry_timestamp bigint, exit_timestamp bigint, charges jsonb,
      percent_change numeric, stop_loss numeric, take_profit numeric, position_side text,
      commission_asset text, provider_trade_id text, provider_order_id text
    )
    LEFT JOIN LATERAL (
      SELECT id, category, asset_class, profit_currency
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
      pnl_source = EXCLUDED.pnl_source,
      entry_timestamp = EXCLUDED.entry_timestamp, exit_timestamp = EXCLUDED.exit_timestamp,
      instrument_id = EXCLUDED.instrument_id, category = EXCLUDED.category,
      percent_change = COALESCE(EXCLUDED.percent_change, trading.trades.percent_change),
      stop_loss = COALESCE(EXCLUDED.stop_loss, trading.trades.stop_loss),
      take_profit = COALESCE(EXCLUDED.take_profit, trading.trades.take_profit),
      charges = EXCLUDED.charges
    RETURNING id, unique_id
  `, [userId, connection.id, market, JSON.stringify(normalized), connection.environment]);
    const savedRows = result.rows || [];
    for (const savedTrade of savedRows) {
      await upsertTradeExecutions(client, savedTrade.id, executionsByUniqueId.get(savedTrade.unique_id) || []);
    }
    if (ownsClient) await client.query('COMMIT');
    return { newCount, updatedCount, savedCount: result.rowCount };
  } catch (error) {
    if (ownsClient) await client.query('ROLLBACK').catch(() => null);
    throw error;
  } finally {
    if (ownsClient) client.release();
  }
}
async function setSyncStatus(userId, connectionId, status, error = null, database = pool) {
  await database.query(`
    UPDATE broker_connections.user_broker_connections connection
    SET last_sync_status = $3::varchar, last_synced_at = CASE WHEN $3::varchar = 'success' THEN NOW() ELSE last_synced_at END,
        last_error = $4, updated_at = NOW()
    FROM trading_catalog.broker_integrations integration, trading_catalog.brokers broker
    WHERE connection.user_id = $1 AND connection.id = $2 AND connection.integration_id = integration.id
      AND integration.broker_id = broker.id AND broker.slug = 'binance'
      AND integration.trade_method = 'api_sync'
  `, [userId, connectionId, status, error]);
}
async function saveVerifiedConnection(userId, selectedConnectionId, metadata, encryptedPayload, accountFingerprint, database = pool) {
  const client = await database.connect();
  try {
    await client.query('BEGIN');
    const integrationResult = await client.query(`
      SELECT integration.id
      FROM trading_catalog.broker_integrations integration
      JOIN trading_catalog.brokers broker ON broker.id = integration.broker_id
      WHERE broker.slug = 'binance' AND integration.trade_method = 'api_sync'
        AND broker.is_active = TRUE AND integration.is_active = TRUE
      LIMIT 1
    `);
    const integrationId = integrationResult.rows[0]?.id;
    if (!integrationId) throw new Error('Binance API integration is not available');
    const connectionResult = await client.query(`
      UPDATE broker_connections.user_broker_connections connection
      SET integration_id = $2, account_name = COALESCE(NULLIF(BTRIM(connection.account_name), ''), 'Binance'),
          external_account_id = $3, status = 'connected', deleted_at = NULL,
          metadata = (COALESCE(connection.metadata, '{}'::jsonb) - 'binanceRetention') || $4::jsonb,
          connected_at = NOW(), last_error = NULL, updated_at = NOW()
      WHERE connection.id = (
        SELECT existing.id
        FROM broker_connections.user_broker_connections existing
        JOIN trading_catalog.broker_integrations existing_integration ON existing_integration.id = existing.integration_id
        JOIN trading_catalog.brokers existing_broker ON existing_broker.id = existing_integration.broker_id
        WHERE existing.user_id = $1 AND existing_broker.slug = 'binance'
          AND (
            existing.external_account_id = $3
            OR (existing.id = $5 AND existing.external_account_id IS NULL AND existing.status = 'pending')
          )
        ORDER BY (existing.external_account_id = $3) DESC NULLS LAST,
          (existing.deleted_at IS NOT NULL) DESC,
          existing.created_at
        LIMIT 1
      )
      RETURNING connection.id
    `, [userId, integrationId, accountFingerprint, JSON.stringify(metadata), selectedConnectionId]);
    if (!connectionResult.rowCount) {
      const error = new Error('Save a Binance account before connecting');
      error.code = 'BINANCE_CONNECTION_REQUIRED';
      throw error;
    }
    const connectionId = connectionResult.rows[0].id;
    await client.query(`
      DELETE FROM broker_connections.user_broker_connections pending
      USING trading_catalog.broker_integrations pending_integration, trading_catalog.brokers pending_broker
      WHERE pending.user_id = $1 AND pending.id = $3 AND pending.id <> $2
        AND pending.integration_id = pending_integration.id
        AND pending_integration.broker_id = pending_broker.id
        AND pending_broker.slug = 'binance'
        AND pending.external_account_id IS NULL AND pending.status = 'pending'
    `, [userId, connectionId, selectedConnectionId]);
    const credentialResult = await client.query(`
      INSERT INTO broker_connections.credentials
        (connection_id, credential_type, encrypted_payload, encryption_algorithm, key_version, last_rotated_at)
      SELECT connection.id, 'api_credentials', $3, 'aes-256-gcm', 'v1', NOW()
      FROM broker_connections.user_broker_connections connection
      WHERE connection.user_id = $1 AND connection.id = $2
      ON CONFLICT (connection_id, credential_type) DO UPDATE SET
        encrypted_payload = EXCLUDED.encrypted_payload,
        encryption_algorithm = EXCLUDED.encryption_algorithm,
        key_version = EXCLUDED.key_version,
        last_rotated_at = NOW(), updated_at = NOW()
      RETURNING id
    `, [userId, connectionId, encryptedPayload]);
    if (!credentialResult.rowCount) throw new Error('Binance connection ownership check failed');
    await client.query('COMMIT');
    return connectionId;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => null);
    throw error;
  } finally {
    client.release();
  }
}
module.exports = {
  findByUser, findTradeExport, getCredential, getCredentialByConnection, prepareTrade, saveTradeExport, saveTrades,
  listConnectedCredentials, saveVerifiedConnection, setAccountFingerprint, setSyncStatus, updateTradeExport,
};
