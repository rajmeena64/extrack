-- Update Angel One trade mapping in trading_catalog.broker_integrations
-- Includes exact header aliases from Angel One trade reports and SmartAPI fills

UPDATE trading_catalog.broker_integrations
SET trade_mapping = jsonb_build_object(
  'defaults', jsonb_build_object(
    'status', 'closed',
    'pnl_currency', 'INR'
  ),
  'fieldMapping', jsonb_build_object(
    'unique_id', jsonb_build_array('trade id', 'order id', 'fillid', 'orderid', 'tradeid', 'unique_id'),
    'symbol', jsonb_build_array('scrip/contract', 'scrip', 'contract', 'tradingsymbol', 'symbolname', 'symbol', 'pair'),
    'side', jsonb_build_array('buy/sell', 'side', 'transactiontype', 'type', 'action'),
    'entry_price', jsonb_build_array('buy price', 'buyprice', 'entry_price', 'open_price', 'openprice', 'opening_price', 'price', 'fillprice'),
    'exit_price', jsonb_build_array('sell price', 'sellprice', 'exit_price', 'close_price', 'closeprice', 'closing_price', 'execution_price'),
    'quantity', jsonb_build_array('quantity', 'qty', 'fillsize', 'lots', 'volume'),
    'charges', jsonb_build_array('brokerage', 'gst', 'stt', 'sebi tax', 'exchange turnover charges', 'stamp duty', 'other charges', 'ipft charges', 'charges', 'fee'),
    'product_type', jsonb_build_array('segment', 'product_type', 'producttype', 'category'),
    'entry_timestamp', jsonb_build_array('date', 'trade_date', 'entry_timestamp', 'entry_date', 'date_utc'),
    'exit_timestamp', jsonb_build_array('date', 'trade_date', 'exit_timestamp', 'exit_date')
  ),
  'requiredHeaders', jsonb_build_array('symbol', 'scrip/contract', 'scrip')
)
FROM trading_catalog.brokers broker
WHERE broker.id = broker_integrations.broker_id
  AND broker.slug = 'angel-one';
