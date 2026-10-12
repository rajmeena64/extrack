UPDATE trading_catalog.broker_integrations
SET trade_mapping = jsonb_build_object(
  'requiredHeaders', jsonb_build_array('ticket', 'symbol', 'type', 'lots', 'opening_price'),
  'fieldMapping', jsonb_build_object(
    'unique_id', jsonb_build_array('ticket', 'order', 'position_id'),
    'entry_timestamp', jsonb_build_array('opening_time_utc', 'open_time', 'opening_time'),
    'exit_timestamp', jsonb_build_array('closing_time_utc', 'close_time', 'closing_time'),
    'side', jsonb_build_array('type', 'action', 'side'),
    'quantity', jsonb_build_array('lots', 'original_position_size', 'volume', 'size'),
    'symbol', jsonb_build_array('symbol', 'item'),
    'entry_price', jsonb_build_array('opening_price', 'open_price', 'price'),
    'exit_price', jsonb_build_array('closing_price', 'close_price'),
    'stop_loss', jsonb_build_array('stop_loss', 'sl', 's_l'),
    'take_profit', jsonb_build_array('take_profit', 'tp', 't_p'),
    'net_pnl', jsonb_build_array('profit', 'pnl', 'net_profit'),
    'close_reason', jsonb_build_array('close_reason')
  ),
  'chargeFields', jsonb_build_object(
    'commission', true,
    'swap', true
  ),
  'defaults', jsonb_build_object(
    'status', 'closed',
    'pnl_currency', 'USD',
    'product_type', 'forex'
  )
),
updated_at = NOW()
FROM trading_catalog.brokers broker
WHERE broker.id = broker_integrations.broker_id
  AND broker.slug = 'exness'
  AND broker_integrations.trade_method = 'csv_upload';
