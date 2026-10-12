SET LOCAL lock_timeout = '5s';

-- Identity-less legacy manual trades belong to an explicit manual source,
-- never to a guessed real broker.
INSERT INTO trading_catalog.brokers (
  name, slug, provider_type, is_active, is_visible, sort_order
)
SELECT 'Manual Entry', 'manual-entry', 'other', TRUE, FALSE, 9999
WHERE NOT EXISTS (
  SELECT 1 FROM trading_catalog.brokers WHERE slug = 'manual-entry'
)
ON CONFLICT DO NOTHING;

INSERT INTO trading_catalog.broker_integrations (
  broker_id, platform_id, trade_method, is_active, is_visible, sort_order
)
SELECT broker.id, NULL, 'manual_entry', TRUE, FALSE, 9999
FROM trading_catalog.brokers broker
WHERE broker.slug = 'manual-entry'
  AND NOT EXISTS (
    SELECT 1 FROM trading_catalog.broker_integrations integration
    WHERE integration.broker_id = broker.id
      AND integration.platform_id IS NULL
      AND integration.trade_method = 'manual_entry'
  )
ON CONFLICT DO NOTHING;

INSERT INTO broker_connections.user_broker_connections (
  user_id, integration_id, external_account_id, account_name,
  status, metadata, connected_at
)
SELECT DISTINCT trade.user_id, integration.id, '__legacy_manual__', 'Manual Entry',
  'connected', '{"legacyMigration":true}'::jsonb, NOW()
FROM trading.trades trade
JOIN trading_catalog.brokers broker ON broker.slug = 'manual-entry'
JOIN trading_catalog.broker_integrations integration
  ON integration.broker_id = broker.id
 AND integration.platform_id IS NULL
 AND integration.trade_method = 'manual_entry'
WHERE trade.source = 'manual'
  AND trade.broker_connection_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM broker_connections.user_broker_connections connection
    WHERE connection.user_id = trade.user_id
      AND connection.integration_id = integration.id
      AND connection.external_account_id = '__legacy_manual__'
  )
ON CONFLICT DO NOTHING;

UPDATE trading.trades trade
SET broker_connection_id = connection.id
FROM broker_connections.user_broker_connections connection
JOIN trading_catalog.broker_integrations integration ON integration.id = connection.integration_id
JOIN trading_catalog.brokers broker ON broker.id = integration.broker_id
WHERE trade.broker_connection_id IS NULL
  AND trade.source = 'manual'
  AND connection.user_id = trade.user_id
  AND connection.external_account_id = '__legacy_manual__'
  AND broker.slug = 'manual-entry';

-- Recreate missing legacy MT5 connections from the owned MT5 account record.
-- Prefer the named broker integration; use the generic MT5 integration only
-- when the legacy broker name cannot be matched.
INSERT INTO broker_connections.user_broker_connections (
  user_id, integration_id, external_account_id, account_name,
  status, metadata, connected_at
)
SELECT account.user_id, selected.integration_id, account.account_id::text,
  account.broker_name, 'connected', '{"legacyMigration":true}'::jsonb, NOW()
FROM mt5.accounts account
CROSS JOIN LATERAL (
  SELECT integration.id AS integration_id
  FROM trading_catalog.broker_integrations integration
  JOIN trading_catalog.brokers broker ON broker.id = integration.broker_id
  JOIN trading_catalog.platforms platform ON platform.id = integration.platform_id
  WHERE integration.trade_method = 'terminal_sync'
    AND platform.slug = 'metatrader-5'
    AND (
      REGEXP_REPLACE(LOWER(account.broker_name), '[^a-z0-9]+', '', 'g')
        LIKE REGEXP_REPLACE(LOWER(broker.slug), '[^a-z0-9]+', '', 'g') || '%'
      OR broker.slug = 'mt5'
    )
  ORDER BY (broker.slug = 'mt5'), integration.sort_order, integration.id
  LIMIT 1
) selected
WHERE NOT EXISTS (
  SELECT 1 FROM broker_connections.user_broker_connections connection
  WHERE connection.user_id = account.user_id
    AND connection.external_account_id = account.account_id::text
)
ON CONFLICT DO NOTHING;

UPDATE trading.trades trade
SET broker_connection_id = connection.id
FROM broker_connections.user_broker_connections connection
WHERE trade.broker_connection_id IS NULL
  AND connection.user_id = trade.user_id
  AND connection.external_account_id = trade.account_id::text;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM trading.trades trade
    LEFT JOIN broker_connections.user_broker_connections connection
      ON connection.id = trade.broker_connection_id
     AND connection.user_id = trade.user_id
    WHERE connection.id IS NULL
  ) THEN
    RAISE EXCEPTION 'trade broker connection migration found missing or cross-user connections';
  END IF;
END $$;

ALTER TABLE trading.trades
  ALTER COLUMN broker_connection_id SET NOT NULL,
  DROP COLUMN IF EXISTS account_id,
  DROP COLUMN IF EXISTS broker_id,
  DROP COLUMN IF EXISTS platform;
