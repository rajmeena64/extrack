CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE trading.brokers
  ADD COLUMN IF NOT EXISTS provider_type VARCHAR(30) NOT NULL DEFAULT 'broker',
  ADD COLUMN IF NOT EXISTS slug VARCHAR(180),
  ADD COLUMN IF NOT EXISTS is_visible BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE trading.brokers DROP CONSTRAINT IF EXISTS brokers_provider_type_check;
ALTER TABLE trading.brokers
  ADD CONSTRAINT brokers_provider_type_check
  CHECK (provider_type IN ('broker', 'prop_firm', 'exchange', 'platform', 'data_provider', 'other'));

WITH generated AS (
  SELECT
    id,
    LEFT(COALESCE(NULLIF(TRIM(BOTH '-' FROM REGEXP_REPLACE(LOWER(name), '[^a-z0-9]+', '-', 'g')), ''), 'provider'), 165) AS base_slug,
    ROW_NUMBER() OVER (
      PARTITION BY COALESCE(NULLIF(TRIM(BOTH '-' FROM REGEXP_REPLACE(LOWER(name), '[^a-z0-9]+', '-', 'g')), ''), 'provider')
      ORDER BY created_at, id
    ) AS duplicate_number
  FROM trading.brokers
  WHERE slug IS NULL OR BTRIM(slug) = ''
)
UPDATE trading.brokers broker
SET slug = generated.base_slug || CASE WHEN generated.duplicate_number = 1 THEN '' ELSE '-' || generated.duplicate_number::text END
FROM generated
WHERE broker.id = generated.id;

CREATE UNIQUE INDEX IF NOT EXISTS brokers_slug_unique_idx
  ON trading.brokers(slug) WHERE slug IS NOT NULL;

CREATE TABLE IF NOT EXISTS trading.platforms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(140) NOT NULL,
  logo_path TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT platforms_name_unique UNIQUE (name),
  CONSTRAINT platforms_slug_unique UNIQUE (slug)
);

CREATE TABLE IF NOT EXISTS trading.broker_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id UUID NOT NULL REFERENCES trading.brokers(id) ON DELETE CASCADE,
  platform_id UUID REFERENCES trading.platforms(id) ON DELETE CASCADE,
  trade_method VARCHAR(60) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  import_field_mapping JSONB NOT NULL DEFAULT '{}'::jsonb,
  configuration JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT broker_integrations_method_check CHECK (
    trade_method IN (
      'manual_entry', 'csv_upload', 'excel_upload', 'html_statement_upload',
      'pdf_statement_upload', 'api_sync', 'oauth_sync', 'terminal_sync',
      'email_import', 'webhook_sync', 'copy_paste'
    )
  ),
  CONSTRAINT broker_integrations_mapping_object_check CHECK (jsonb_typeof(import_field_mapping) = 'object'),
  CONSTRAINT broker_integrations_configuration_object_check CHECK (jsonb_typeof(configuration) = 'object')
);

CREATE UNIQUE INDEX IF NOT EXISTS broker_integrations_platform_method_unique
  ON trading.broker_integrations(broker_id, platform_id, trade_method)
  WHERE platform_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS broker_integrations_without_platform_unique
  ON trading.broker_integrations(broker_id, trade_method)
  WHERE platform_id IS NULL;
CREATE INDEX IF NOT EXISTS broker_integrations_broker_id_idx
  ON trading.broker_integrations(broker_id);
CREATE INDEX IF NOT EXISTS broker_integrations_platform_id_idx
  ON trading.broker_integrations(platform_id);

-- Normalize only explicitly recognized platform names from existing provider arrays.
WITH normalized_platforms AS (
  SELECT DISTINCT CASE
    WHEN REGEXP_REPLACE(LOWER(BTRIM(raw_platform)), '[^a-z0-9]+', '', 'g') IN ('mt4', 'metatrader4') THEN 'MetaTrader 4'
    WHEN REGEXP_REPLACE(LOWER(BTRIM(raw_platform)), '[^a-z0-9]+', '', 'g') IN ('mt5', 'metatrader5') THEN 'MetaTrader 5'
    WHEN REGEXP_REPLACE(LOWER(BTRIM(raw_platform)), '[^a-z0-9]+', '', 'g') = 'ctrader' THEN 'cTrader'
    WHEN REGEXP_REPLACE(LOWER(BTRIM(raw_platform)), '[^a-z0-9]+', '', 'g') = 'ninjatrader' THEN 'NinjaTrader'
    WHEN REGEXP_REPLACE(LOWER(BTRIM(raw_platform)), '[^a-z0-9]+', '', 'g') = 'tradelocker' THEN 'TradeLocker'
    WHEN REGEXP_REPLACE(LOWER(BTRIM(raw_platform)), '[^a-z0-9]+', '', 'g') = 'dxtrade' THEN 'DXtrade'
    WHEN REGEXP_REPLACE(LOWER(BTRIM(raw_platform)), '[^a-z0-9]+', '', 'g') = 'projectx' THEN 'ProjectX'
    ELSE NULL
  END AS name
  FROM trading.brokers, UNNEST(COALESCE(supported_platforms, '{}')) AS raw_platform
), platform_rows AS (
  SELECT name, LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g')) AS slug
  FROM normalized_platforms WHERE name IS NOT NULL
)
INSERT INTO trading.platforms(name, slug)
SELECT name, slug FROM platform_rows
ON CONFLICT DO NOTHING;

-- Platform-independent manual entry is unambiguous.
INSERT INTO trading.broker_integrations(broker_id, platform_id, trade_method)
SELECT broker.id, NULL, 'manual_entry'
FROM trading.brokers broker
WHERE EXISTS (
  SELECT 1 FROM UNNEST(COALESCE(broker.supported_trade_methods, '{}')) method
  WHERE REGEXP_REPLACE(LOWER(BTRIM(method)), '[^a-z0-9]+', '', 'g') = 'manual'
)
ON CONFLICT DO NOTHING;

-- Other methods are migrated only when exactly one recognized platform makes the relationship unambiguous.
WITH broker_platform AS (
  SELECT broker.id AS broker_id, platform.id AS platform_id
  FROM trading.brokers broker
  CROSS JOIN LATERAL (
    SELECT CASE
      WHEN REGEXP_REPLACE(LOWER(BTRIM(raw_platform)), '[^a-z0-9]+', '', 'g') IN ('mt4', 'metatrader4') THEN 'MetaTrader 4'
      WHEN REGEXP_REPLACE(LOWER(BTRIM(raw_platform)), '[^a-z0-9]+', '', 'g') IN ('mt5', 'metatrader5') THEN 'MetaTrader 5'
      WHEN REGEXP_REPLACE(LOWER(BTRIM(raw_platform)), '[^a-z0-9]+', '', 'g') = 'ctrader' THEN 'cTrader'
      WHEN REGEXP_REPLACE(LOWER(BTRIM(raw_platform)), '[^a-z0-9]+', '', 'g') = 'ninjatrader' THEN 'NinjaTrader'
      WHEN REGEXP_REPLACE(LOWER(BTRIM(raw_platform)), '[^a-z0-9]+', '', 'g') = 'tradelocker' THEN 'TradeLocker'
      WHEN REGEXP_REPLACE(LOWER(BTRIM(raw_platform)), '[^a-z0-9]+', '', 'g') = 'dxtrade' THEN 'DXtrade'
      WHEN REGEXP_REPLACE(LOWER(BTRIM(raw_platform)), '[^a-z0-9]+', '', 'g') = 'projectx' THEN 'ProjectX'
      ELSE NULL
    END AS platform_name
    FROM UNNEST(COALESCE(broker.supported_platforms, '{}')) raw_platform
  ) normalized
  JOIN trading.platforms platform ON platform.name = normalized.platform_name
  WHERE (SELECT COUNT(*) FROM UNNEST(COALESCE(broker.supported_platforms, '{}'))) = 1
), normalized_methods AS (
  SELECT broker.id AS broker_id, CASE
    WHEN REGEXP_REPLACE(LOWER(BTRIM(raw_method)), '[^a-z0-9]+', '', 'g') = 'csv' THEN 'csv_upload'
    WHEN REGEXP_REPLACE(LOWER(BTRIM(raw_method)), '[^a-z0-9]+', '', 'g') IN ('excel', 'xlsx') THEN 'excel_upload'
    WHEN REGEXP_REPLACE(LOWER(BTRIM(raw_method)), '[^a-z0-9]+', '', 'g') = 'api' THEN 'api_sync'
    WHEN REGEXP_REPLACE(LOWER(BTRIM(raw_method)), '[^a-z0-9]+', '', 'g') = 'oauth' THEN 'oauth_sync'
    WHEN REGEXP_REPLACE(LOWER(BTRIM(raw_method)), '[^a-z0-9]+', '', 'g') = 'terminal' THEN 'terminal_sync'
    WHEN REGEXP_REPLACE(LOWER(BTRIM(raw_method)), '[^a-z0-9]+', '', 'g') = 'email' THEN 'email_import'
    ELSE NULL
  END AS trade_method
  FROM trading.brokers broker, UNNEST(COALESCE(broker.supported_trade_methods, '{}')) raw_method
), identifiable_mapping AS (
  SELECT broker.id AS broker_id,
    CASE WHEN CARDINALITY(COALESCE(broker.supported_trade_methods, '{}')) = 1
      AND jsonb_typeof(broker.import_field_mapping) = 'object'
      THEN broker.import_field_mapping ELSE '{}'::jsonb END AS mapping
  FROM trading.brokers broker
)
INSERT INTO trading.broker_integrations(broker_id, platform_id, trade_method, import_field_mapping)
SELECT methods.broker_id, broker_platform.platform_id, methods.trade_method, identifiable_mapping.mapping
FROM normalized_methods methods
JOIN broker_platform ON broker_platform.broker_id = methods.broker_id
JOIN identifiable_mapping ON identifiable_mapping.broker_id = methods.broker_id
WHERE methods.trade_method IS NOT NULL
ON CONFLICT DO NOTHING;

COMMENT ON COLUMN trading.brokers.supported_platforms IS
  'DEPRECATED: migrated to trading.platforms and trading.broker_integrations; retained temporarily for existing code compatibility.';
COMMENT ON COLUMN trading.brokers.supported_trade_methods IS
  'DEPRECATED: migrated to trading.broker_integrations; retained temporarily for existing code compatibility.';
COMMENT ON COLUMN trading.brokers.import_field_mapping IS
  'DEPRECATED: mappings now belong to trading.broker_integrations; retained temporarily for existing code compatibility.';
