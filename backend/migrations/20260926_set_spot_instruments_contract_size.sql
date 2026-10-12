UPDATE trading_catalog.instruments
SET contract_size = 1, updated_at = NOW()
WHERE category = 'spot' OR product_type = 'spot';
