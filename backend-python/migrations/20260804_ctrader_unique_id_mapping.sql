UPDATE trading_catalog.platforms
SET normalization_config = JSONB_SET(
  JSONB_SET(normalization_config, '{fieldMapping,unique_id}', '"dealId"'),
  '{transforms,unique_id}',
  '{"type":"template","template":"ctrader:{accountId}:{value}"}'::jsonb
), updated_at = NOW()
WHERE slug = 'ctrader';
