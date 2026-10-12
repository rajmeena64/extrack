CREATE TABLE IF NOT EXISTS broker_connections.oauth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES app_auth.users(id) ON DELETE CASCADE,
  provider VARCHAR(40) NOT NULL,
  state_hash CHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT broker_oauth_states_user_provider_unique UNIQUE (user_id, provider)
);

CREATE INDEX IF NOT EXISTS broker_oauth_states_expiry_idx
  ON broker_connections.oauth_states(expires_at);

COMMENT ON TABLE broker_connections.oauth_states IS
  'Short-lived, one-time OAuth state hashes tied to the initiating Entrack user.';

INSERT INTO trading_catalog.brokers (name, slug, provider_type, logo_path, sort_order)
VALUES ('cTrader', 'ctrader', 'platform', '/assets/provider-logo/logos/ctrader-official.svg', 0)
ON CONFLICT DO NOTHING;

INSERT INTO trading_catalog.platforms (name, slug, logo_path, sort_order)
VALUES ('cTrader', 'ctrader', '/assets/provider-logo/logos/ctrader-official.svg', 0)
ON CONFLICT DO NOTHING;

INSERT INTO trading_catalog.broker_integrations (
  broker_id, platform_id, trade_method, is_active, is_visible, sort_order
)
SELECT broker.id, platform.id, 'oauth_sync', TRUE, TRUE, 0
FROM trading_catalog.brokers broker
JOIN trading_catalog.platforms platform ON platform.slug = 'ctrader'
WHERE broker.slug = 'ctrader'
  AND NOT EXISTS (
    SELECT 1 FROM trading_catalog.broker_integrations existing
    WHERE existing.broker_id = broker.id AND existing.trade_method = 'oauth_sync'
  )
ON CONFLICT DO NOTHING;
