const postgres = require('../../infra/db/postgres');
const { encryptAesGcm, decryptAesGcm } = require('../../core/utils/security');

const BROKER_SELECT = `id, name, slug, provider_type AS "providerType", logo_path AS "logoPath", is_active AS "isActive", sort_order AS "sortOrder"`;

const CONNECTION_SELECT = `
  connection.id, connection.user_id AS "userId", connection.integration_id AS "integrationId",
  connection.external_account_id AS "externalAccountId", connection.account_name AS "accountName",
  connection.account_currency AS "accountCurrency", connection.balance_snapshot AS "balanceSnapshot",
  connection.status, connection.metadata, connection.last_synced_at AS "lastSyncedAt",
  connection.last_sync_status AS "lastSyncStatus", connection.last_error AS "lastError",
  connection.created_at AS "createdAt", connection.updated_at AS "updatedAt",
  broker.id AS "brokerId", broker.name AS "brokerName", broker.slug AS "brokerSlug",
  broker.logo_path AS "brokerLogoPath", integration.trade_method AS "tradeMethod"`;

const CONNECTION_FROM = `
  FROM broker_connections.user_broker_connections connection
  JOIN trading_catalog.broker_integrations integration ON integration.id = connection.integration_id
  JOIN trading_catalog.brokers broker ON broker.id = integration.broker_id`;

const brokerRepository = {
  async listBrokers({ search, limit = 50 } = {}) {
    const params = [];
    let where = 'WHERE is_active = TRUE';
    if (search) {
      params.push(`%${search}%`);
      where += ` AND (name ILIKE $${params.length} OR slug ILIKE $${params.length})`;
    }
    params.push(limit);
    const res = await postgres.query(`SELECT ${BROKER_SELECT} FROM trading_catalog.brokers ${where} ORDER BY sort_order, name LIMIT $${params.length}`, params);
    return res.rows;
  },

  async findBrokerById(id) {
    const res = await postgres.query(`SELECT ${BROKER_SELECT} FROM trading_catalog.brokers WHERE id = $1 AND is_active = TRUE LIMIT 1`, [id]);
    return res.rows[0] || null;
  },

  async listBrokerIntegrations(brokerId) {
    const res = await postgres.query(`
      SELECT integration.id, integration.trade_method AS "tradeMethod", integration.sort_order AS "sortOrder",
             integration.trade_mapping AS "tradeMapping", platform.id AS "platformId", platform.name AS "platformName",
             platform.slug AS "platformSlug"
      FROM trading_catalog.broker_integrations integration
      LEFT JOIN trading_catalog.platforms platform ON platform.id = integration.platform_id
      WHERE integration.broker_id = $1 AND integration.is_active = TRUE AND integration.is_visible = TRUE
      ORDER BY integration.sort_order`, [brokerId]);
    return res.rows;
  },

  async listUserConnections(userId) {
    const res = await postgres.query(`SELECT ${CONNECTION_SELECT} ${CONNECTION_FROM} WHERE connection.user_id = $1 AND connection.deleted_at IS NULL ORDER BY connection.created_at DESC`, [userId]);
    return res.rows;
  },

  async findUserConnectionById(connectionId, userId) {
    const res = await postgres.query(`SELECT ${CONNECTION_SELECT} ${CONNECTION_FROM} WHERE connection.id = $1 AND connection.user_id = $2 AND connection.deleted_at IS NULL LIMIT 1`, [connectionId, userId]);
    return res.rows[0] || null;
  },

  async createUserConnection(userId, { integrationId, accountName, externalAccountId = null, metadata = {} }) {
    const res = await postgres.query(`
      INSERT INTO broker_connections.user_broker_connections (user_id, integration_id, account_name, external_account_id, metadata, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5::jsonb, 'pending', NOW(), NOW())
      RETURNING id`, [userId, integrationId, accountName, externalAccountId, JSON.stringify(metadata)]);
    return res.rows[0] ? this.findUserConnectionById(res.rows[0].id, userId) : null;
  },

  async updateUserConnection(userId, connectionId, { accountName, metadata }) {
    const sets = ['updated_at = NOW()'];
    const params = [userId, connectionId];
    if (accountName !== undefined) {
      params.push(accountName);
      sets.push(`account_name = $${params.length}`);
    }
    if (metadata !== undefined) {
      params.push(JSON.stringify(metadata));
      sets.push(`metadata = $${params.length}::jsonb`);
    }
    await postgres.query(`UPDATE broker_connections.user_broker_connections SET ${sets.join(', ')} WHERE user_id = $1 AND id = $2 AND deleted_at IS NULL`, params);
    return this.findUserConnectionById(connectionId, userId);
  },

  async deleteUserConnection(userId, connectionId) {
    const res = await postgres.query(`UPDATE broker_connections.user_broker_connections SET deleted_at = NOW(), status = 'disconnected', updated_at = NOW() WHERE user_id = $1 AND id = $2 RETURNING id`, [userId, connectionId]);
    return res.rows[0] || null;
  },

  async saveCredentials(connectionId, userId, credentials, credentialType = 'api_credentials') {
    const secret = process.env.USER_BROKER_CREDENTIALS_KEY;
    if (!secret) throw new Error('USER_BROKER_CREDENTIALS_KEY not configured');
    const encrypted = encryptAesGcm(JSON.stringify(credentials), secret, `user:${userId}`);
    await postgres.query(`
      INSERT INTO broker_connections.credentials (connection_id, credential_type, encrypted_payload, encryption_algorithm, key_version, updated_at)
      VALUES ($1, $2, $3, 'aes-256-gcm', 'v1', NOW())
      ON CONFLICT (connection_id, credential_type) DO UPDATE SET
        encrypted_payload = EXCLUDED.encrypted_payload,
        updated_at = NOW()`, [connectionId, credentialType, encrypted]);
  },

  async getCredentials(connectionId, userId, credentialType = 'api_credentials') {
    const secret = process.env.USER_BROKER_CREDENTIALS_KEY;
    if (!secret) throw new Error('USER_BROKER_CREDENTIALS_KEY not configured');
    const res = await postgres.query(`SELECT encrypted_payload FROM broker_connections.credentials WHERE connection_id = $1 AND credential_type = $2 LIMIT 1`, [connectionId, credentialType]);
    if (!res.rows[0]?.encrypted_payload) return null;
    const decrypted = decryptAesGcm(res.rows[0].encrypted_payload, secret, `user:${userId}`);
    return JSON.parse(decrypted);
  },

  async updateConnectionSyncStatus(connectionId, { status = 'connected', lastSyncStatus = 'success', lastError = null, balanceSnapshot = null, accountCurrency = null, externalAccountId = null, metadata = null }) {
    const sets = ['last_synced_at = NOW()', 'updated_at = NOW()'];
    const params = [connectionId];
    if (status) { params.push(status); sets.push(`status = $${params.length}`); }
    if (lastSyncStatus) { params.push(lastSyncStatus); sets.push(`last_sync_status = $${params.length}`); }
    if (lastError !== undefined) { params.push(lastError); sets.push(`last_error = $${params.length}`); }
    if (balanceSnapshot) { params.push(JSON.stringify(balanceSnapshot)); sets.push(`balance_snapshot = $${params.length}::jsonb`); }
    if (accountCurrency) { params.push(accountCurrency); sets.push(`account_currency = $${params.length}`); }
    if (externalAccountId) { params.push(externalAccountId); sets.push(`external_account_id = $${params.length}`); }
    if (metadata) { params.push(JSON.stringify(metadata)); sets.push(`metadata = COALESCE(metadata, '{}'::jsonb) || $${params.length}::jsonb`); }
    await postgres.query(`UPDATE broker_connections.user_broker_connections SET ${sets.join(', ')} WHERE id = $1`, params);
  },

  async batchUpsertTrades(userId, connectionId, normalizedTrades) {
    if (!Array.isArray(normalizedTrades) || normalizedTrades.length === 0) return { inserted: 0, updated: 0 };
    const uniqueIds = normalizedTrades.map((t) => t.unique_id).filter(Boolean);
    const existing = await postgres.query(`SELECT unique_id FROM trading.trades WHERE user_id = $1 AND unique_id = ANY($2::text[])`, [userId, uniqueIds]);
    const existingSet = new Set(existing.rows.map((r) => r.unique_id));
    let inserted = 0;
    let updated = 0;

    for (const trade of normalizedTrades) {
      await postgres.query(`
        INSERT INTO trading.trades (
          user_id, broker_connection_id, unique_id, symbol, side,
          entry_price, exit_price, quantity, quantity_unit, entry_timestamp, exit_timestamp,
          gross_pnl, net_pnl, pnl_currency, currency, total_charges, charges,
          stop_loss, take_profit, close_reason, product_type, category, status, source
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
        ON CONFLICT (user_id, unique_id) DO UPDATE SET
          entry_price = EXCLUDED.entry_price,
          exit_price = EXCLUDED.exit_price,
          quantity = EXCLUDED.quantity,
          gross_pnl = EXCLUDED.gross_pnl,
          net_pnl = EXCLUDED.net_pnl,
          total_charges = EXCLUDED.total_charges,
          stop_loss = EXCLUDED.stop_loss,
          take_profit = EXCLUDED.take_profit,
          close_reason = EXCLUDED.close_reason,
          status = EXCLUDED.status,
          updated_at = NOW()`, [
        userId, connectionId, trade.unique_id, trade.symbol, trade.side,
        trade.entry_price, trade.exit_price, trade.quantity, trade.quantity_unit || 'unit',
        trade.entry_timestamp, trade.exit_timestamp,
        trade.gross_pnl, trade.net_pnl, trade.pnl_currency, trade.currency,
        trade.total_charges || 0, trade.charges || {},
        trade.stop_loss, trade.take_profit, trade.close_reason,
        trade.product_type, trade.category, trade.status || 'closed', trade.source || 'sync'
      ]);
      if (existingSet.has(trade.unique_id)) updated++;
      else inserted++;
    }
    return { inserted, updated, total: normalizedTrades.length };
  }
};

module.exports = brokerRepository;

