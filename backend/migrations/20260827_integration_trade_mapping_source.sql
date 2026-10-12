ALTER TABLE trading_catalog.broker_integrations
  ADD COLUMN IF NOT EXISTS trade_mapping JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD CONSTRAINT broker_integrations_trade_mapping_object_check
  CHECK (jsonb_typeof(trade_mapping) = 'object');

UPDATE trading_catalog.broker_integrations integration
SET trade_mapping = COALESCE((
      SELECT platform.normalization_config
      FROM trading_catalog.platforms platform WHERE platform.id = integration.platform_id
    ), '{}'::jsonb)
  || JSONB_BUILD_OBJECT(
    'fieldMapping',
    COALESCE((SELECT platform.normalization_config -> 'fieldMapping'
      FROM trading_catalog.platforms platform WHERE platform.id = integration.platform_id), '{}'::jsonb)
      || COALESCE((SELECT broker.import_field_mapping
        FROM trading_catalog.brokers broker WHERE broker.id = integration.broker_id), '{}'::jsonb)
  ),
  updated_at = NOW();

UPDATE trading_catalog.broker_integrations
SET trade_mapping = '{
  "fieldMapping": {
    "unique_id":["unique_id","uniqueId"], "product_type":["product_type","productType"],
    "symbol":"symbol", "side":["side","trade_type","type"], "status":"status",
    "category":"category", "quantity":"quantity", "quantity_unit":"quantity_unit",
    "entry_price":["entry_price","price"], "exit_price":"exit_price",
    "entry_timestamp":"entry_timestamp", "exit_timestamp":"exit_timestamp",
    "net_pnl":["net_pnl","pnl"], "pnl_currency":"pnl_currency",
    "charges":"charges", "strategy":"strategy", "notes":"notes"
  },
  "requiredFields":["symbol","side","quantity","entry_price","entry_timestamp"]
}'::jsonb,
updated_at = NOW()
WHERE trade_method = 'manual_entry';

UPDATE trading_catalog.broker_integrations
SET trade_mapping = JSONB_BUILD_OBJECT(
  'fieldMapping', '{
    "unique_id":["unique_id","trade_id","deal_id","execution_id"],
    "product_type":["product_type","instrument_type","market_type"],
    "symbol":["symbol","tradingsymbol","instrument","pair"],
    "side":["side","type","trade_type","action","buy_sell","transaction_type"],
    "quantity":["quantity","lots","qty","volume","size","position_size","original_position_size"],
    "entry_price":["entry_price","opening_price","price","entryprice","open_price","openprice"],
    "exit_price":["exit_price","closing_price","exitprice","close_price","closeprice"],
    "net_pnl":["net_pnl","profit","pnl","net_profit","gross_pnl","realized_pnl","closed_pnl"],
    "entry_timestamp":["entry_timestamp","entry_time","opening_time_utc","opening_time","open_time"],
    "exit_timestamp":["exit_timestamp","exit_time","closing_time_utc","closing_time","close_time","timestamp","datetime"],
    "strategy":"strategy", "notes":"notes"
  }'::jsonb || COALESCE(trade_mapping -> 'fieldMapping', '{}'::jsonb),
  'requiredFields', '["symbol","side","quantity","entry_price","entry_timestamp"]'::jsonb
), updated_at = NOW()
WHERE trade_method IN ('csv_upload','excel_upload');

UPDATE trading_catalog.broker_integrations integration
SET trade_mapping = '{
  "defaults":{"status":"closed","quantity_unit":"lot"},
  "fieldMapping":{
    "unique_id":"unique_id","product_type":["product_type","productType"],
    "symbol":"symbol","side":"type","category":["symbol_category","category","asset_class"],
    "quantity":"volume","entry_price":"entry_price","exit_price":"exit_price",
    "net_pnl":"profit","pnl_currency":"account_currency",
    "entry_timestamp":"entry_timestamp","exit_timestamp":"exit_timestamp",
    "percent_change":"percent_change"
  },
  "requiredFields":["unique_id","symbol","side","quantity","entry_price","exit_price","entry_timestamp","exit_timestamp"]
}'::jsonb, updated_at = NOW()
FROM trading_catalog.platforms platform
WHERE integration.platform_id = platform.id
  AND platform.slug = 'metatrader-5'
  AND integration.trade_method = 'terminal_sync';

COMMENT ON COLUMN trading_catalog.broker_integrations.trade_mapping IS
  'Single runtime source for mapping this integration raw trades to canonical trade fields.';
