UPDATE trading_catalog.brokers
SET import_field_mapping = COALESCE(import_field_mapping, '{}'::jsonb) || '{
  "pnl_currency": "pnlCurrency"
}'::jsonb,
updated_at = NOW()
WHERE slug = 'binance';
