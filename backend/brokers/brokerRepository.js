const pool = require('../infra/db/supabase');

const POPULAR_BROKER_SLUGS = [
  'mt4',
  'mt5',
  'ctrader',
  'binance',
  'robinhood',
  'coinbase',
  'angel-one',
  'alpha-capital-group',
];

const SELECT = `
  id, name, slug, provider_type AS "providerType", logo_path AS "logoPath",
  COALESCE(supported_instruments, '{}') AS "supportedInstruments",
  COALESCE(supported_trade_methods, '{}') AS "supportedTradeMethods",
  COALESCE(import_field_mapping, '{}'::jsonb) AS "importFieldMapping",
  COALESCE(search_keywords, '{}') AS "searchKeywords",
  is_active AS "isActive", is_visible AS "isVisible", sort_order AS "sortOrder",
  created_at AS "createdAt", updated_at AS "updatedAt"`;

async function list({ activeOnly = true, visibleOnly = true, search, limit, popularOnly = false } = {}) {
  const filters = [activeOnly ? 'is_active = TRUE' : null, visibleOnly ? 'is_visible = TRUE' : null].filter(Boolean);
  const values = [];
  let orderClause = 'sort_order, name';
  if (popularOnly) {
    values.push(POPULAR_BROKER_SLUGS);
    filters.push(`slug = ANY($${values.length}::text[])`);
    orderClause = `ARRAY_POSITION($${values.length}::text[], slug)`;
  }
  if (search) {
    values.push(`%${search}%`);
    filters.push(`(name ILIKE $${values.length} OR slug ILIKE $${values.length} OR EXISTS (SELECT 1 FROM UNNEST(search_keywords) keyword WHERE keyword ILIKE $${values.length}))`);
  }
  let limitClause = '';
  if (Number.isInteger(limit) && limit > 0) {
    values.push(limit);
    limitClause = `LIMIT $${values.length}`;
  }
  const result = await pool.query(`
    SELECT ${SELECT}
    FROM trading_catalog.brokers
    ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''}
    ORDER BY ${orderClause}
    ${limitClause}
  `, values);
  return result.rows;
}

async function findById(id, { activeOnly = true } = {}) {
  const result = await pool.query(`
    SELECT ${SELECT}
    FROM trading_catalog.brokers
    WHERE id = $1 ${activeOnly ? 'AND is_active = TRUE' : ''}
    LIMIT 1
  `, [id]);
  return result.rows[0] || null;
}

async function listIntegrationsByBrokerId(brokerId) {
  const result = await pool.query(`
    SELECT
      integration.id,
      integration.trade_method AS "tradeMethod",
      COALESCE(platform.normalization_config -> 'fieldMapping', '{}'::jsonb)
        || COALESCE(broker.import_field_mapping, '{}'::jsonb)
        AS "importFieldMapping",
      COALESCE(platform.normalization_config, '{}'::jsonb) - 'fieldMapping'
        AS "normalizationConfiguration",
      integration.sort_order AS "sortOrder",
      platform.id AS "platformId",
      platform.name AS "platformName",
      platform.slug AS "platformSlug",
      platform.logo_path AS "platformLogoPath",
      (integration.is_active AND COALESCE(platform.is_active, TRUE)) AS "isActive"
    FROM trading_catalog.broker_integrations integration
    JOIN trading_catalog.brokers broker ON broker.id = integration.broker_id
    LEFT JOIN trading_catalog.platforms platform ON platform.id = integration.platform_id
    WHERE integration.broker_id = $1
      AND integration.is_visible = TRUE
      AND broker.is_active = TRUE
      AND broker.is_visible = TRUE
      AND (platform.id IS NULL OR platform.is_visible = TRUE)
    ORDER BY integration.sort_order, platform.sort_order, integration.trade_method
  `, [brokerId]);
  return result.rows;
}

module.exports = { findById, list, listIntegrationsByBrokerId, POPULAR_BROKER_SLUGS };
