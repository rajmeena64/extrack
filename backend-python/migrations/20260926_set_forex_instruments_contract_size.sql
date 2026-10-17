UPDATE trading_catalog.instruments
SET contract_size = 100000.0,
    updated_at = NOW()
WHERE (asset_class = 'forex' OR category = 'forex')
  AND contract_size IS NULL;
