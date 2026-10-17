CREATE SCHEMA IF NOT EXISTS chart;

CREATE TABLE IF NOT EXISTS chart.layouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES app_auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL DEFAULT 'Default',
    symbol VARCHAR(50),
    resolution VARCHAR(20),
    content JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chart_layouts_user_id ON chart.layouts(user_id);

CREATE TABLE IF NOT EXISTS chart.drawings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES app_auth.users(id) ON DELETE CASCADE,
    symbol VARCHAR(50) NOT NULL,
    state JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_chart_drawings_user_symbol UNIQUE (user_id, symbol)
);
CREATE INDEX IF NOT EXISTS idx_chart_drawings_user_id ON chart.drawings(user_id);

CREATE TABLE IF NOT EXISTS chart.settings (
    user_id INTEGER PRIMARY KEY REFERENCES app_auth.users(id) ON DELETE CASCADE,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chart.templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES app_auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    content JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chart_templates_user_id ON chart.templates(user_id);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'app' AND table_name = 'user_chart_drawings') THEN
        INSERT INTO chart.drawings (user_id, symbol, state, created_at, updated_at)
        SELECT user_id, symbol, state, created_at, updated_at
        FROM app.user_chart_drawings
        ON CONFLICT (user_id, symbol) DO UPDATE
        SET state = EXCLUDED.state, updated_at = EXCLUDED.updated_at;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'app' AND table_name = 'user_settings' AND column_name = 'settings') THEN
        INSERT INTO chart.settings (user_id, settings, updated_at)
        SELECT user_id, settings->'chart_settings', updated_at
        FROM app.user_settings
        WHERE settings ? 'chart_settings' AND settings->'chart_settings' IS NOT NULL
        ON CONFLICT (user_id) DO UPDATE
        SET settings = EXCLUDED.settings, updated_at = EXCLUDED.updated_at;

        UPDATE app.user_settings
        SET settings = settings - 'chart_settings'
        WHERE settings ? 'chart_settings';
    END IF;
END $$;
