UPDATE trading_catalog.broker_integrations
SET trade_mapping = jsonb_set(
  jsonb_set(
    trade_mapping,
    '{fieldMapping,entry_price}',
    '"closePositionDetail.entryPrice"'::jsonb
  ),
  '{transforms,entry_price}',
  '"number"'::jsonb
)
FROM trading_catalog.brokers broker
WHERE broker.id = broker_integrations.broker_id
  AND broker.slug = 'ctrader'
  AND trade_mapping IS NOT NULL
  AND trade_mapping <> '{}'::jsonb;