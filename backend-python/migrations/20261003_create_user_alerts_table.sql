CREATE TABLE IF NOT EXISTS app.user_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT NOT NULL REFERENCES app_auth.users(id) ON DELETE CASCADE,
    symbol VARCHAR(50) NOT NULL,
    target_price NUMERIC(20, 8) NOT NULL,
    condition VARCHAR(30) NOT NULL DEFAULT 'ABOVE',
    timeframe VARCHAR(10) DEFAULT '1m',
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    note TEXT DEFAULT '',
    triggered_at TIMESTAMPTZ,
    triggered_price NUMERIC(20, 8),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_alerts_symbol_active ON app.user_alerts(symbol, status);
CREATE INDEX IF NOT EXISTS idx_user_alerts_user_id ON app.user_alerts(user_id);
