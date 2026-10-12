ALTER TABLE trading.trades
  ADD COLUMN IF NOT EXISTS broker_connection_id UUID
  REFERENCES broker_connections.user_broker_connections(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS trades_broker_connection_idx
  ON trading.trades(broker_connection_id);

UPDATE trading.trades trade
SET broker_connection_id = connection.id
FROM broker_connections.user_broker_connections connection
WHERE trade.broker_connection_id IS NULL
  AND trade.user_id = connection.user_id
  AND trade.account_id::text = connection.external_account_id
  AND trade.platform = 'ctrader';

WITH single_connection AS (
  SELECT connection.user_id, broker.id::text AS broker_id, MIN(connection.id::text)::uuid AS connection_id
  FROM broker_connections.user_broker_connections connection
  JOIN trading_catalog.broker_integrations integration ON integration.id = connection.integration_id
  JOIN trading_catalog.brokers broker ON broker.id = integration.broker_id
  GROUP BY connection.user_id, broker.id
  HAVING COUNT(*) = 1
)
UPDATE trading.trades trade
SET broker_connection_id = single_connection.connection_id
FROM single_connection
WHERE trade.broker_connection_id IS NULL
  AND trade.user_id = single_connection.user_id
  AND trade.broker_id = single_connection.broker_id;
