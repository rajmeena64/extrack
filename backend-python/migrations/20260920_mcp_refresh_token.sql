ALTER TABLE app_auth.user_mcp_connections 
ADD COLUMN IF NOT EXISTS refresh_token_hash TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS refresh_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS user_mcp_connections_refresh_token_hash_idx 
ON app_auth.user_mcp_connections(refresh_token_hash) 
WHERE is_active = true;
