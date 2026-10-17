WITH target_brokers(slug) AS (
  VALUES
    ('oanda'),
    ('fxcm'),
    ('capital-com'),
    ('saxo-bank'),
    ('interactive-brokers'),
    ('tradestation'),
    ('tastytrade'),
    ('tradier'),
    ('questrade'),
    ('alpaca'),
    ('e-trade'),
    ('charles-schwab'),
    ('zerodha'),
    ('dhan'),
    ('upstox'),
    ('angel-one'),
    ('icici-securities')
)
UPDATE trading_catalog.brokers broker
SET supported_trade_methods = ARRAY(
      SELECT DISTINCT method
      FROM UNNEST(COALESCE(broker.supported_trade_methods, '{}') || ARRAY['api_sync']) method
    ),
    updated_at = NOW()
FROM target_brokers target
WHERE broker.slug = target.slug;

WITH target_brokers(slug) AS (
  VALUES
    ('oanda'),
    ('fxcm'),
    ('capital-com'),
    ('saxo-bank'),
    ('interactive-brokers'),
    ('tradestation'),
    ('tastytrade'),
    ('tradier'),
    ('questrade'),
    ('alpaca'),
    ('e-trade'),
    ('charles-schwab'),
    ('zerodha'),
    ('dhan'),
    ('upstox'),
    ('angel-one'),
    ('icici-securities')
)
INSERT INTO trading_catalog.broker_integrations (
  broker_id,
  platform_id,
  trade_method,
  is_active,
  is_visible
)
SELECT broker.id, NULL, 'api_sync', TRUE, TRUE
FROM trading_catalog.brokers broker
JOIN target_brokers target ON target.slug = broker.slug
ON CONFLICT DO NOTHING;

