UPDATE trading_catalog.broker_integrations
SET trade_mapping = '{"requiredHeaders":["__broker_csv_mapping_not_configured__"]}'::jsonb,
    updated_at = NOW()
WHERE trade_method = 'csv_upload';

INSERT INTO trading_catalog.broker_integrations (
  broker_id, platform_id, trade_method, is_active, is_visible, trade_mapping
)
SELECT broker.id, NULL, 'csv_upload', TRUE, TRUE, '{
  "requiredHeaders":["date_utc","pair","side","price","executed"],
  "fieldMapping":{
    "unique_id":["trade_id","order_id"],
    "symbol":"pair","side":"side","quantity":"executed",
    "entry_price":"price","exit_price":"price",
    "entry_timestamp":"date_utc","exit_timestamp":"date_utc",
    "net_pnl":["realized_profit","pnl"],"charges":"fee"
  },
  "defaults":{"product_type":"spot","quantity_unit":"asset","status":"closed"},
  "requiredFields":["symbol","side","quantity","entry_price","entry_timestamp"]
}'::jsonb
FROM trading_catalog.brokers broker
WHERE broker.slug = 'binance'
ON CONFLICT DO NOTHING;

UPDATE trading_catalog.broker_integrations integration
SET trade_mapping = '{
  "requiredHeaders":["date_utc","pair","side","price","executed"],
  "fieldMapping":{
    "unique_id":["trade_id","order_id"],
    "symbol":"pair","side":"side","quantity":"executed",
    "entry_price":"price","exit_price":"price",
    "entry_timestamp":"date_utc","exit_timestamp":"date_utc",
    "net_pnl":["realized_profit","pnl"],"charges":"fee"
  },
  "defaults":{"product_type":"spot","quantity_unit":"asset","status":"closed"},
  "requiredFields":["symbol","side","quantity","entry_price","entry_timestamp"]
}'::jsonb, updated_at = NOW()
FROM trading_catalog.brokers broker
WHERE broker.id = integration.broker_id
  AND broker.slug = 'binance'
  AND integration.trade_method = 'csv_upload';
