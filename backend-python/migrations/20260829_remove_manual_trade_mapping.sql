UPDATE trading_catalog.broker_integrations
SET trade_mapping = '{}'::jsonb,
    updated_at = NOW()
WHERE trade_method = 'manual_entry'
  AND trade_mapping <> '{}'::jsonb;
