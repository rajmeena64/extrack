UPDATE trading_catalog.broker_integrations
SET trade_mapping = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(
        trade_mapping,
        '{fieldMapping,side}',
        '"tradeSide"'::jsonb
      ),
      '{fieldMapping,product_type}',
        '"productType"'::jsonb
    ),
    '{transforms,side}',
    '"inverse_side"'::jsonb
  ),
  '{transforms,product_type}',
  '"string"'::jsonb
)
FROM trading_catalog.brokers broker
WHERE broker.id = broker_integrations.broker_id
  AND broker.slug = 'ctrader'
  AND trade_mapping IS NOT NULL
  AND trade_mapping <> '{}'::jsonb;