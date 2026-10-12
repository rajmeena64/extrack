-- Update Angel One trade mapping in trading_catalog.broker_integrations
-- Includes Trading Insights header aliases (Entry Date, Entry Time, Exit Date, Exit Time, Entry Price, Exit Price, PnL)

UPDATE trading_catalog.broker_integrations
SET trade_mapping = jsonb_build_object(
  'defaults', jsonb_build_object(
    'status', 'closed',
    'pnl_currency', 'INR'
  ),
  'fieldMapping', jsonb_build_object(
    'unique_id', jsonb_build_array('trade id', 'order id', 'fillid', 'orderid', 'tradeid', 'unique_id', 'entry order id', 'exit order id'),
    'symbol', jsonb_build_array('scrip/contract', 'scrip', 'contract', 'tradingsymbol', 'symbolname', 'symbol', 'pair'),
    'side', jsonb_build_array('buy / sell', 'buy/sell', 'side', 'transactiontype', 'action'),
    'entry_price', jsonb_build_array('buy price', 'buyprice', 'entry_price', 'entry price', 'open_price', 'openprice', 'opening_price', 'price', 'fillprice'),
    'exit_price', jsonb_build_array('sell price', 'sellprice', 'exit_price', 'exit price', 'close_price', 'closeprice', 'closing_price', 'execution_price'),
    'quantity', jsonb_build_array('quantity', 'qty', 'fillsize', 'lots', 'volume', 'entry quantity', 'exit quantity'),
    'net_pnl', jsonb_build_array('net_pnl', 'pnl', 'profit', 'realized_profit', 'profit_loss'),
    'charges', jsonb_build_array('brokerage', 'gst', 'stt', 'sebi tax', 'exchange turnover charges', 'stamp duty', 'other charges', 'ipft charges', 'charges', 'fee'),
    'product_type', jsonb_build_array('trade type', 'trade_type', 'segment', 'product_type', 'producttype', 'category'),
    'entry_timestamp', jsonb_build_array('entry date', 'entry_date', 'date', 'trade_date', 'entry_timestamp', 'entry_date_utc'),
    'entry_time', jsonb_build_array('entry time', 'entry_time', 'time'),
    'exit_timestamp', jsonb_build_array('exit date', 'exit_date', 'exit_timestamp'),
    'exit_time', jsonb_build_array('exit time', 'exit_time'),
    'isin', jsonb_build_array('isin', 'isin_code')
  ),
  'requiredHeaders', jsonb_build_array('symbol', 'scrip/contract', 'scrip')
)
FROM trading_catalog.brokers broker
WHERE broker.id = broker_integrations.broker_id
  AND broker.slug = 'angel-one';
