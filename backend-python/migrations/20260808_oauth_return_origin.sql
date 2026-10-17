ALTER TABLE broker_connections.oauth_states
  ADD COLUMN IF NOT EXISTS return_origin TEXT;

COMMENT ON COLUMN broker_connections.oauth_states.return_origin IS
  'Allowlisted frontend origin that initiated the one-time OAuth flow.';
