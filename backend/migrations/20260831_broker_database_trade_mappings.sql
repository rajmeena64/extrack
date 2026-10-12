-- Store declarative broker trade mapping rules in database (trading_catalog.broker_integrations.trade_mapping)

UPDATE trading_catalog.broker_integrations integration
SET trade_mapping = '{
  "requiredHeaders": ["symbol"],
  "fieldMapping": {
    "symbol": ["symbol", "tradingsymbol", "scrip", "pair"],
    "side": ["side", "transactiontype", "type", "action"],
    "quantity": ["quantity", "qty", "fillsize", "lots", "volume"],
    "entry_price": ["entry_price", "open_price", "openprice", "opening_price", "price", "fillprice"],
    "exit_price": ["exit_price", "close_price", "closeprice", "closing_price", "execution_price"],
    "net_pnl": ["net_pnl", "pnl", "profit", "realized_profit"],
    "entry_timestamp": ["entry_timestamp", "entry_date", "trade_date", "date_utc"],
    "exit_timestamp": ["exit_timestamp", "exit_date"],
    "charges": ["charges", "brokerage", "fee"],
    "product_type": ["product_type", "segment", "producttype", "category"]
  },
  "defaults": {
    "status": "closed",
    "pnl_currency": "INR"
  }
}'::jsonb, updated_at = NOW()
FROM trading_catalog.brokers broker
WHERE broker.id = integration.broker_id
  AND broker.slug = 'angel-one'
  AND integration.trade_method = 'csv_upload';
