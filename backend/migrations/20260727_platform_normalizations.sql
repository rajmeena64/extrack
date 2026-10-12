CREATE TABLE IF NOT EXISTS trading_catalog.platform_normalizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_id UUID NOT NULL REFERENCES trading_catalog.platforms(id) ON DELETE CASCADE,
  trade_method VARCHAR(60) NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  field_mapping JSONB NOT NULL DEFAULT '{}'::jsonb,
  configuration JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT platform_normalizations_method_check CHECK (
    trade_method IN (
      'manual_entry', 'csv_upload', 'excel_upload', 'html_statement_upload',
      'pdf_statement_upload', 'api_sync', 'oauth_sync', 'terminal_sync',
      'email_import', 'webhook_sync', 'copy_paste'
    )
  ),
  CONSTRAINT platform_normalizations_mapping_object_check CHECK (jsonb_typeof(field_mapping) = 'object'),
  CONSTRAINT platform_normalizations_configuration_object_check CHECK (jsonb_typeof(configuration) = 'object'),
  CONSTRAINT platform_normalizations_platform_method_unique UNIQUE (platform_id, trade_method)
);

COMMENT ON TABLE trading_catalog.platform_normalizations IS
  'Shared normalization rules for a platform and import method. Broker integration JSONB contains only broker-specific overrides.';

-- Remove the previously seeded Exness-specific copies. The sync script now stores these once at platform level.
UPDATE trading_catalog.broker_integrations
SET import_field_mapping = '{}'::jsonb,
    configuration = '{}'::jsonb,
    updated_at = NOW()
WHERE configuration->>'brokerSlug' IS NOT NULL;

