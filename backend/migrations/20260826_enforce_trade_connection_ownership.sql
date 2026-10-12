CREATE UNIQUE INDEX IF NOT EXISTS user_broker_connections_user_id_id_unique
  ON broker_connections.user_broker_connections(user_id, id);

ALTER TABLE trading.trades
  ADD CONSTRAINT trades_user_broker_connection_owner_fk
  FOREIGN KEY (user_id, broker_connection_id)
  REFERENCES broker_connections.user_broker_connections(user_id, id)
  ON DELETE CASCADE;
