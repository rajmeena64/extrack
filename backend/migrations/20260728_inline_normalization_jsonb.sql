ALTER TABLE trading_catalog.platforms
  ADD COLUMN IF NOT EXISTS normalization_config JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE trading_catalog.platforms DROP CONSTRAINT IF EXISTS platforms_normalization_config_object_check;
ALTER TABLE trading_catalog.platforms
  ADD CONSTRAINT platforms_normalization_config_object_check
  CHECK (jsonb_typeof(normalization_config) = 'object');

COMMENT ON COLUMN trading_catalog.platforms.normalization_config IS
  'Shared normalization rules keyed by trade method, for example csv_upload or terminal_sync.';

DROP TABLE IF EXISTS trading_catalog.platform_normalizations;

ALTER TABLE trading_catalog.broker_integrations
  DROP COLUMN IF EXISTS import_field_mapping;

COMMENT ON COLUMN trading_catalog.brokers.import_field_mapping IS
  'Direct broker-specific normalization field mapping.';
