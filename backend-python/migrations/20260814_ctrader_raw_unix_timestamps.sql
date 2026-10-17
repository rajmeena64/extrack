UPDATE trading.trades
SET custom_fields = COALESCE(custom_fields, '{}'::jsonb) || JSONB_BUILD_OBJECT(
  'entryTimestampUnixMs', FLOOR(EXTRACT(EPOCH FROM entry_timestamp) * 1000)::bigint,
  'exitTimestampUnixMs', FLOOR(EXTRACT(EPOCH FROM exit_timestamp) * 1000)::bigint
)
WHERE LOWER(COALESCE(platform, '')) = 'ctrader'
   OR custom_fields ->> 'provider' = 'ctrader';
