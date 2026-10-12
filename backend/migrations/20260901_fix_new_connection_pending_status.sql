-- Migration to fix default connection status: connections without saved credentials or completed sync start as pending
UPDATE broker_connections.user_broker_connections connection
SET status = 'pending', updated_at = NOW()
WHERE connection.status = 'connected'
  AND connection.last_synced_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM broker_connections.credentials credential
    WHERE credential.connection_id = connection.id
  );
