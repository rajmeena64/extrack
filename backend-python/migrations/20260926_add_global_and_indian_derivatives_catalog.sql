UPDATE trading_catalog.instruments SET contract_size = 100.0, updated_at = NOW() WHERE symbol = 'XAUUSD';
UPDATE trading_catalog.instruments SET contract_size = 5000.0, updated_at = NOW() WHERE symbol = 'XAGUSD';
UPDATE trading_catalog.instruments SET contract_size = 1000.0, updated_at = NOW() WHERE symbol IN ('WTI', 'XTIUSD', 'BRENT', 'XBRUSD');

INSERT INTO trading_catalog.instruments (
    id, symbol, name, display_name, description, category, asset_class, product_type,
    contract_size, quantity_type, pnl_calculation_mode, quote_asset, profit_currency,
    digits, tick_size, supports_pips, search_keywords, is_active, sort_order, market_source,
    source_symbol, source_metadata, is_historical_sync, is_live_feed, is_ram_cached, created_at, updated_at
) VALUES
    (gen_random_uuid(), 'USOIL', 'WTI Crude Oil', 'USOIL', 'WTI Crude Oil CFD', 'cfd', 'energy', 'forex_cfd', 1000.0, 'lot', 'price_difference_contract', 'USD', 'USD', 2, 0.01, true, ARRAY['usoil', 'wti', 'crude', 'oil'], true, 130, 'cfd', 'USOIL', '{"type":"cfd"}'::jsonb, false, false, false, NOW(), NOW()),
    (gen_random_uuid(), 'UKOIL', 'Brent Crude Oil', 'UKOIL', 'Brent Crude Oil CFD', 'cfd', 'energy', 'forex_cfd', 1000.0, 'lot', 'price_difference_contract', 'USD', 'USD', 2, 0.01, true, ARRAY['ukoil', 'brent', 'crude', 'oil'], true, 131, 'cfd', 'UKOIL', '{"type":"cfd"}'::jsonb, false, false, false, NOW(), NOW()),
    (gen_random_uuid(), 'FDAX', 'DAX Futures', 'FDAX', 'DAX Index Futures', 'future', 'index', 'future', 25.0, 'unit', 'price_difference_contract', 'EUR', 'EUR', 1, 0.5, false, ARRAY['fdax', 'dax', 'germany 40', 'eurex'], true, 132, 'eurex', 'FDAX', '{"exchange":"EUREX"}'::jsonb, false, false, false, NOW(), NOW()),
    (gen_random_uuid(), 'FDXM', 'Mini-DAX Futures', 'FDXM', 'Mini-DAX Index Futures', 'future', 'index', 'future', 5.0, 'unit', 'price_difference_contract', 'EUR', 'EUR', 1, 1.0, false, ARRAY['fdxm', 'mini dax', 'eurex'], true, 133, 'eurex', 'FDXM', '{"exchange":"EUREX"}'::jsonb, false, false, false, NOW(), NOW()),
    (gen_random_uuid(), 'FESX', 'EURO STOXX 50 Futures', 'FESX', 'EURO STOXX 50 Index Futures', 'future', 'index', 'future', 10.0, 'unit', 'price_difference_contract', 'EUR', 'EUR', 0, 1.0, false, ARRAY['fesx', 'stoxx', 'stoxx 50', 'eurex'], true, 134, 'eurex', 'FESX', '{"exchange":"EUREX"}'::jsonb, false, false, false, NOW(), NOW()),
    (gen_random_uuid(), 'FGBL', 'Euro-Bund Futures', 'FGBL', 'Euro-Bund 10-Year Bond Futures', 'future', 'bond', 'future', 1000.0, 'unit', 'price_difference_contract', 'EUR', 'EUR', 2, 0.01, false, ARRAY['fgbl', 'euro bund', 'bund', 'eurex'], true, 135, 'eurex', 'FGBL', '{"exchange":"EUREX"}'::jsonb, false, false, false, NOW(), NOW()),
    (gen_random_uuid(), 'NIFTY', 'NIFTY 50', 'NIFTY', 'NSE NIFTY 50 Index Derivative', 'future', 'index', 'future', 75.0, 'unit', 'price_difference_contract', 'INR', 'INR', 2, 0.05, false, ARRAY['nifty', 'nifty50', 'nse'], true, 136, 'nse', 'NIFTY', '{"exchange":"NSE"}'::jsonb, false, false, false, NOW(), NOW()),
    (gen_random_uuid(), 'BANKNIFTY', 'NIFTY Bank', 'BANKNIFTY', 'NSE NIFTY Bank Index Derivative', 'future', 'index', 'future', 30.0, 'unit', 'price_difference_contract', 'INR', 'INR', 2, 0.05, false, ARRAY['banknifty', 'nifty bank', 'nse'], true, 137, 'nse', 'BANKNIFTY', '{"exchange":"NSE"}'::jsonb, false, false, false, NOW(), NOW()),
    (gen_random_uuid(), 'SENSEX', 'BSE SENSEX', 'SENSEX', 'BSE SENSEX Index Derivative', 'future', 'index', 'future', 20.0, 'unit', 'price_difference_contract', 'INR', 'INR', 2, 0.05, false, ARRAY['sensex', 'bse sensex', 'bse'], true, 138, 'bse', 'SENSEX', '{"exchange":"BSE"}'::jsonb, false, false, false, NOW(), NOW())
ON CONFLICT (symbol) DO UPDATE SET
    contract_size = EXCLUDED.contract_size,
    name = EXCLUDED.name,
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    asset_class = EXCLUDED.asset_class,
    product_type = EXCLUDED.product_type,
    digits = EXCLUDED.digits,
    tick_size = EXCLUDED.tick_size,
    updated_at = NOW();
