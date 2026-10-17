UPDATE trading_catalog.brokers
SET import_field_mapping = COALESCE(import_field_mapping, '{}'::jsonb) || '{
  "unique_id": "uniqueId",
  "platform": "platform",
  "symbol": "symbol",
  "trade_type": "tradeType",
  "category": "category",
  "quantity": "qty",
  "quantity_unit": "quantityUnit",
  "price": "price",
  "exit_price": "price",
  "gross_pnl": "realizedPnl",
  "net_pnl": "realizedPnl",
  "pnl_available": "pnlAvailable",
  "entry_timestamp": "time",
  "exit_timestamp": "time",
  "charges": "charges",
  "commission_asset": "commissionAsset",
  "provider_trade_id": "providerTradeId",
  "provider_order_id": "providerOrderId"
}'::jsonb,
updated_at = NOW()
WHERE slug = 'binance';
