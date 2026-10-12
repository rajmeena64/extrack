const pool = require('../../infra/db/supabase');

const SELECT = `
  connection.id,
  connection.external_account_id AS "externalAccountId",
  connection.account_name AS "accountName",
  connection.account_currency AS "accountCurrency",
  connection.balance_snapshot AS "balanceSnapshot",
  connection.balance_updated_at AS "balanceUpdatedAt",
  connection.status,
  connection.metadata,
  connection.last_synced_at AS "lastSyncedAt",
  connection.last_sync_status AS "lastSyncStatus",
  connection.last_error AS "lastError",
  connection.connected_at AS "connectedAt",
  connection.created_at AS "createdAt",
  connection.updated_at AS "updatedAt",
  integration.id AS "integrationId",
  integration.trade_method AS "tradeMethod",
  COALESCE(integration.configuration, '{}'::jsonb) AS "integrationConfiguration",
  COALESCE((
    SELECT ARRAY_AGG(DISTINCT instrument.asset_class ORDER BY instrument.asset_class)
    FROM trading_catalog.instruments instrument
    WHERE instrument.market_source = broker.slug AND instrument.is_active = TRUE
  ), broker.supported_instruments, '{}') AS "supportedInstrumentTypes",
  ARRAY(
    SELECT DISTINCT available.trade_method
    FROM trading_catalog.broker_integrations available
    WHERE available.broker_id = broker.id
      AND available.is_active = TRUE AND available.is_visible = TRUE
    ORDER BY available.trade_method
  ) AS "supportedTradeMethods",
  COALESCE((
    SELECT JSONB_AGG(JSONB_BUILD_OBJECT(
      'id', available.id,
      'tradeMethod', available.trade_method,
      'platformId', available_platform.id,
      'platformName', COALESCE(available_platform.name, broker.name),
      'platformSlug', COALESCE(available_platform.slug, broker.slug),
      'platformLogoPath', COALESCE(available_platform.logo_path, broker.logo_path),
      'isActive', (available.is_active AND COALESCE(available_platform.is_active, TRUE))
    ) ORDER BY available.sort_order, available.trade_method)
    FROM trading_catalog.broker_integrations available
    LEFT JOIN trading_catalog.platforms available_platform ON available_platform.id = available.platform_id
    WHERE available.broker_id = broker.id
      AND available.is_visible = TRUE
      AND (available_platform.id IS NULL OR available_platform.is_visible = TRUE)
  ), '[]'::jsonb) AS "supportedIntegrations",
  broker.id AS "brokerId",
  broker.name AS "brokerName",
  broker.slug AS "brokerSlug",
  broker.search_keywords AS "brokerSearchKeywords",
  broker.logo_path AS "brokerLogoPath",
  platform.id AS "platformId",
  platform.name AS "platformName",
  platform.slug AS "platformSlug",
  platform.logo_path AS "platformLogoPath"`;

const FROM = `
  FROM broker_connections.user_broker_connections connection
  JOIN trading_catalog.broker_integrations integration ON integration.id = connection.integration_id
  JOIN trading_catalog.brokers broker ON broker.id = integration.broker_id
  LEFT JOIN trading_catalog.platforms platform ON platform.id = integration.platform_id`;

async function listByUser(userId) {
  const result = await pool.query(`
    SELECT ${SELECT}
    ${FROM}
    WHERE connection.user_id = $1
      AND connection.deleted_at IS NULL
    ORDER BY connection.created_at DESC
  `, [userId]);
  return result.rows;
}

async function findById(userId, id) {
  const result = await pool.query(`
    SELECT ${SELECT}
    ${FROM}
    WHERE connection.user_id = $1 AND connection.id = $2
      AND connection.deleted_at IS NULL
    LIMIT 1
  `, [userId, id]);
  return result.rows[0] || null;
}

async function getMappingForConnection(userId, id, tradeMethod = 'file_upload') {
  const result = await pool.query(`
    SELECT target.trade_mapping AS normalization, broker.slug AS "brokerSlug", broker.name AS "brokerName"
    FROM broker_connections.user_broker_connections connection
    JOIN trading_catalog.broker_integrations integration ON integration.id = connection.integration_id
    JOIN trading_catalog.brokers broker ON broker.id = integration.broker_id
    JOIN trading_catalog.broker_integrations target ON target.broker_id = broker.id
      AND (target.trade_method = $3 OR ($3 = 'file_upload' AND target.trade_method = 'csv_upload'))
    WHERE connection.user_id = $1 AND connection.id = $2
      AND integration.is_active = TRUE AND target.is_active = TRUE AND broker.is_active = TRUE
    LIMIT 1
  `, [userId, id, tradeMethod]);
  return result.rows[0] || null;
}

async function create(userId, input) {
  const result = await pool.query(`
    INSERT INTO broker_connections.user_broker_connections (
      user_id, integration_id, external_account_id, account_name, status, metadata
    )
    SELECT $1, integration.id, $3, $4,
      'pending',
      $5::jsonb
    FROM trading_catalog.broker_integrations integration
    JOIN trading_catalog.brokers broker ON broker.id = integration.broker_id
    LEFT JOIN trading_catalog.platforms platform ON platform.id = integration.platform_id
    WHERE integration.id = $2
      AND integration.is_active = TRUE AND integration.is_visible = TRUE
      AND broker.is_active = TRUE AND broker.is_visible = TRUE
      AND (platform.id IS NULL OR (platform.is_active = TRUE AND platform.is_visible = TRUE))
    RETURNING id
  `, [userId, input.integrationId, input.externalAccountId, input.accountName, JSON.stringify(input.metadata)]);
  return result.rows[0] ? findById(userId, result.rows[0].id) : null;
}

async function update(userId, id, input) {
  const sets = [];
  const values = [userId, id];
  if (Object.prototype.hasOwnProperty.call(input, 'accountName')) {
    values.push(input.accountName);
    sets.push(`account_name = $${values.length}`);
  }
  if (Object.prototype.hasOwnProperty.call(input, 'metadata')) {
    values.push(JSON.stringify(input.metadata));
    sets.push(`metadata = $${values.length}::jsonb`);
  }
  const result = await pool.query(`
    WITH changed AS (
      UPDATE broker_connections.user_broker_connections
      SET ${sets.join(', ')}, updated_at = NOW()
      WHERE user_id = $1 AND id = $2
        AND deleted_at IS NULL
      RETURNING id
    )
    SELECT ${SELECT}
    ${FROM}
    JOIN changed ON changed.id = connection.id
  `, values);
  return result.rows[0] || null;
}

async function selectIntegration(userId, id, integrationId, database = pool) {
  await database.query(`DELETE FROM broker_connections.credentials WHERE connection_id = $1`, [id]);
  const result = await database.query(`
    UPDATE broker_connections.user_broker_connections connection
    SET integration_id = selected.id,
        external_account_id = NULL,
        status = 'pending',
        metadata = '{}'::jsonb,
        sync_cursor = NULL,
        last_synced_at = NULL,
        last_sync_status = NULL,
        last_error = NULL,
        connected_at = NULL,
        updated_at = NOW()
    FROM trading_catalog.broker_integrations current_integration,
         trading_catalog.broker_integrations selected
    LEFT JOIN trading_catalog.platforms platform ON platform.id = selected.platform_id
    WHERE connection.user_id = $1 AND connection.id = $2
      AND current_integration.id = connection.integration_id
      AND selected.id = $3
      AND selected.broker_id = current_integration.broker_id
      AND selected.is_active = TRUE AND selected.is_visible = TRUE
      AND (platform.id IS NULL OR (platform.is_active = TRUE AND platform.is_visible = TRUE))
    RETURNING connection.id
  `, [userId, id, integrationId]);
  return result.rows[0] ? findById(userId, result.rows[0].id) : null;
}

async function remove(userId, id, database = pool) {
  const client = await database.connect();
  try {
    await client.query('BEGIN');
    const owned = await client.query(`
      SELECT connection.id, broker.slug AS "brokerSlug"
      FROM broker_connections.user_broker_connections connection
      JOIN trading_catalog.broker_integrations integration ON integration.id = connection.integration_id
      JOIN trading_catalog.brokers broker ON broker.id = integration.broker_id
      WHERE connection.user_id = $1 AND connection.id = $2
        AND connection.deleted_at IS NULL
      FOR UPDATE
    `, [userId, id]);
    const connection = owned.rows[0];
    if (!connection) {
      await client.query('COMMIT');
      return null;
    }

    if (connection.brokerSlug === 'binance') {
      await client.query(`
        UPDATE broker_connections.user_broker_connections
        SET status = 'disconnected',
            deleted_at = NOW(),
            metadata = JSONB_BUILD_OBJECT(
              'binanceTradeExports', COALESCE(metadata -> 'binanceTradeExports', '{}'::jsonb)
            ),
            balance_snapshot = '{}'::jsonb, balance_updated_at = NULL, account_currency = NULL,
            sync_cursor = NULL, last_synced_at = NULL, last_sync_status = NULL, last_error = NULL,
            updated_at = NOW()
        WHERE user_id = $1 AND id = $2
      `, [userId, id]);
      await client.query(`
        DELETE FROM broker_connections.credentials credential
        USING broker_connections.user_broker_connections connection
        WHERE credential.connection_id = connection.id
          AND connection.user_id = $1 AND connection.id = $2
      `, [userId, id]);
      await client.query(`
        DELETE FROM trading.trades
        WHERE user_id = $1 AND broker_connection_id = $2
      `, [userId, id]);
      await client.query('COMMIT');
      return { id, retained: true };
    }

    const result = await client.query(`
      DELETE FROM broker_connections.user_broker_connections
      WHERE user_id = $1 AND id = $2
      RETURNING id
    `, [userId, id]);
    await client.query('COMMIT');
    return result.rows[0] || null;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => null);
    throw error;
  } finally {
    client.release();
  }
}

async function saveBalanceSnapshot(userId, connectionId, accountId, balance, currency, database = pool) {
  const normalizedBalance = Number(balance);
  const normalizedAccountId = String(accountId || '').trim();
  const normalizedCurrency = String(currency || '').trim().toUpperCase();
  if (!normalizedAccountId || normalizedAccountId.length > 180 || !Number.isFinite(normalizedBalance)
    || !/^[A-Z0-9._-]{1,16}$/.test(normalizedCurrency)) return false;
  const result = await database.query(`
    UPDATE broker_connections.user_broker_connections
    SET balance_snapshot = JSONB_SET(
          COALESCE(balance_snapshot, '{}'::jsonb),
          ARRAY[$3::text],
          JSONB_BUILD_OBJECT('balance', $4::numeric, 'currency', $5::text, 'updatedAt', NOW()),
          TRUE
        ),
        balance_updated_at = NOW(),
        account_currency = CASE WHEN external_account_id = $3 THEN $5 ELSE account_currency END,
        updated_at = NOW()
    WHERE user_id = $1 AND id = $2
    RETURNING id
  `, [userId, connectionId, normalizedAccountId, normalizedBalance, normalizedCurrency]);
  return result.rowCount === 1;
}

module.exports = { create, findById, getMappingForConnection, listByUser, remove, saveBalanceSnapshot, selectIntegration, update };
