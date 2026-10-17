UPDATE trading_catalog.brokers
SET import_field_mapping = COALESCE(import_field_mapping, '{}'::jsonb) || '{
  "percent_change": "percentChange",
  "stop_loss": "stopLoss",
  "take_profit": "takeProfit",
  "position_side": "positionSide"
}'::jsonb,
updated_at = NOW()
WHERE slug = 'binance';
