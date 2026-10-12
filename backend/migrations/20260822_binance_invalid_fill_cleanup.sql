DELETE FROM trading.trades
WHERE custom_fields ->> 'provider' = 'binance'
  AND unique_id LIKE 'binance:%'
  AND unique_id NOT LIKE 'binance:%:roundtrip:%';

UPDATE broker_connections.user_broker_connections connection
SET metadata = COALESCE(connection.metadata, '{}'::jsonb) - 'binanceTradeExports',
    last_synced_at = NULL,
    last_sync_status = NULL,
    last_error = NULL,
    updated_at = NOW()
FROM trading_catalog.broker_integrations integration,
     trading_catalog.brokers broker
WHERE connection.integration_id = integration.id
  AND integration.broker_id = broker.id
  AND broker.slug = 'binance'
  AND integration.trade_method = 'api_sync';
