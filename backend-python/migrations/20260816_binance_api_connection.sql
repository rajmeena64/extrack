INSERT INTO trading_catalog.brokers (
  name, slug, provider_type, logo_path, supported_trade_methods, search_keywords
)
SELECT
  'Binance', 'binance', 'exchange', '/assets/provider-logo/logos/binance.svg', ARRAY['api_sync'], ARRAY['crypto', 'spot', 'futures']
WHERE NOT EXISTS (
  SELECT 1 FROM trading_catalog.brokers WHERE slug = 'binance' OR LOWER(name) = 'binance'
)
ON CONFLICT DO NOTHING;

UPDATE trading_catalog.brokers broker
SET slug = 'binance', updated_at = NOW()
WHERE LOWER(broker.name) = 'binance'
  AND broker.slug <> 'binance'
  AND NOT EXISTS (
    SELECT 1 FROM trading_catalog.brokers existing WHERE existing.slug = 'binance'
  );

UPDATE trading_catalog.brokers
SET provider_type = 'exchange',
    logo_path = '/assets/provider-logo/logos/binance.svg',
    supported_trade_methods = ARRAY(
      SELECT DISTINCT method
      FROM UNNEST(COALESCE(supported_trade_methods, '{}') || ARRAY['api_sync']) method
    ),
    updated_at = NOW()
WHERE slug = 'binance';

INSERT INTO trading_catalog.broker_integrations (
  broker_id, platform_id, trade_method, is_active, is_visible
)
SELECT id, NULL, 'api_sync', TRUE, TRUE
FROM trading_catalog.brokers
WHERE slug = 'binance'
ON CONFLICT DO NOTHING;

UPDATE trading_catalog.broker_integrations integration
SET is_active = TRUE, is_visible = TRUE, updated_at = NOW()
FROM trading_catalog.brokers broker
WHERE broker.id = integration.broker_id
  AND broker.slug = 'binance'
  AND integration.platform_id IS NULL
  AND integration.trade_method = 'api_sync';
