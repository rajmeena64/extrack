CREATE SCHEMA IF NOT EXISTS trading_catalog;
CREATE SCHEMA IF NOT EXISTS broker_connections;

COMMENT ON SCHEMA trading_catalog IS
  'Shared broker, platform, integration, and instrument catalog data.';
COMMENT ON SCHEMA broker_connections IS
  'User-owned broker connections and their encrypted credential records.';

ALTER TABLE IF EXISTS trading.instruments SET SCHEMA trading_catalog;
ALTER TABLE IF EXISTS trading.brokers SET SCHEMA trading_catalog;
ALTER TABLE IF EXISTS trading.platforms SET SCHEMA trading_catalog;
ALTER TABLE IF EXISTS trading.broker_integrations SET SCHEMA trading_catalog;
ALTER TABLE IF EXISTS trading.user_broker_connections SET SCHEMA broker_connections;

CREATE TABLE IF NOT EXISTS broker_connections.credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES broker_connections.user_broker_connections(id) ON DELETE CASCADE,
  credential_type VARCHAR(40) NOT NULL,
  encrypted_payload TEXT NOT NULL,
  encryption_algorithm VARCHAR(40) NOT NULL DEFAULT 'aes-256-gcm',
  key_version VARCHAR(60) NOT NULL DEFAULT 'v1',
  expires_at TIMESTAMPTZ,
  last_rotated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT broker_connection_credentials_type_check CHECK (
    credential_type IN ('password', 'api_credentials', 'oauth_tokens', 'session_token', 'other')
  ),
  CONSTRAINT broker_connection_credentials_payload_check CHECK (BTRIM(encrypted_payload) <> ''),
  CONSTRAINT broker_connection_credentials_connection_type_unique UNIQUE (connection_id, credential_type)
);

CREATE INDEX IF NOT EXISTS broker_connection_credentials_expiry_idx
  ON broker_connections.credentials(expires_at)
  WHERE expires_at IS NOT NULL;

COMMENT ON TABLE broker_connections.credentials IS
  'Connector credentials encrypted by the application before storage. Never store plaintext secrets in this table.';
COMMENT ON COLUMN broker_connections.credentials.encrypted_payload IS
  'Authenticated encrypted envelope; plaintext passwords, API secrets, and tokens are prohibited.';

