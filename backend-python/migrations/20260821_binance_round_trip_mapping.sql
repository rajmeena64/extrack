UPDATE trading_catalog.brokers
SET import_field_mapping = (COALESCE(import_field_mapping, '{}'::jsonb) - ARRAY[
  'quantity', 'price', 'exit_price', 'gross_pnl', 'net_pnl',
  'entry_timestamp', 'exit_timestamp', 'trade_type', 'unique_id'
]) || '{
  "unique_id": "uniqueId",
  "trade_type": "tradeType",
  "quantity": "quantity",
  "price": "entryPrice",
  "exit_price": "exitPrice",
  "gross_pnl": "grossPnl",
  "net_pnl": "netPnl",
  "entry_timestamp": "entryTime",
  "exit_timestamp": "exitTime"
}'::jsonb,
updated_at = NOW()
WHERE slug = 'binance';
