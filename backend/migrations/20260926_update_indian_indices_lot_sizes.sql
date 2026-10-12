INSERT INTO trading_catalog.instruments (
    id, symbol, name, display_name, description, category, asset_class, product_type,
    contract_size, quantity_type, pnl_calculation_mode, quote_asset, profit_currency,
    digits, tick_size, supports_pips, search_keywords, is_active, sort_order, market_source,
    source_symbol, source_metadata, is_historical_sync, is_live_feed, is_ram_cached, created_at, updated_at
) VALUES
    (gen_random_uuid(), 'NIFTY', 'Nifty 50', 'NIFTY', 'NSE NIFTY 50 Index Derivative', 'future', 'index', 'future', 65.0, 'unit', 'price_difference_contract', 'INR', 'INR', 2, 0.05, false, ARRAY['nifty', 'nifty50', 'nse'], true, 136, 'nse', 'NIFTY', '{"exchange":"NSE"}'::jsonb, false, false, false, NOW(), NOW()),
    (gen_random_uuid(), 'BANKNIFTY', 'Nifty Bank', 'BANKNIFTY', 'NSE NIFTY Bank Index Derivative', 'future', 'index', 'future', 30.0, 'unit', 'price_difference_contract', 'INR', 'INR', 2, 0.05, false, ARRAY['banknifty', 'nifty bank', 'nse'], true, 137, 'nse', 'BANKNIFTY', '{"exchange":"NSE"}'::jsonb, false, false, false, NOW(), NOW()),
    (gen_random_uuid(), 'FINNIFTY', 'Nifty Financial Services', 'FINNIFTY', 'NSE FINNIFTY Index Derivative', 'future', 'index', 'future', 60.0, 'unit', 'price_difference_contract', 'INR', 'INR', 2, 0.05, false, ARRAY['finnifty', 'nifty fin', 'nse'], true, 138, 'nse', 'FINNIFTY', '{"exchange":"NSE"}'::jsonb, false, false, false, NOW(), NOW()),
    (gen_random_uuid(), 'MIDCPNIFTY', 'Nifty Midcap Select', 'MIDCPNIFTY', 'NSE MIDCPNIFTY Index Derivative', 'future', 'index', 'future', 120.0, 'unit', 'price_difference_contract', 'INR', 'INR', 2, 0.05, false, ARRAY['midcpnifty', 'nifty midcap', 'nse'], true, 139, 'nse', 'MIDCPNIFTY', '{"exchange":"NSE"}'::jsonb, false, false, false, NOW(), NOW()),
    (gen_random_uuid(), 'NIFTYNXT50', 'Nifty Next 50', 'NIFTYNXT50', 'NSE NIFTY Next 50 Index Derivative', 'future', 'index', 'future', 25.0, 'unit', 'price_difference_contract', 'INR', 'INR', 2, 0.05, false, ARRAY['niftynxt50', 'nifty next 50', 'nse'], true, 140, 'nse', 'NIFTYNXT50', '{"exchange":"NSE"}'::jsonb, false, false, false, NOW(), NOW()),
    (gen_random_uuid(), 'SENSEX', 'BSE Sensex', 'SENSEX', 'BSE SENSEX Index Derivative', 'future', 'index', 'future', 20.0, 'unit', 'price_difference_contract', 'INR', 'INR', 2, 0.05, false, ARRAY['sensex', 'bse sensex', 'bse'], true, 141, 'bse', 'SENSEX', '{"exchange":"BSE"}'::jsonb, false, false, false, NOW(), NOW()),
    (gen_random_uuid(), 'BANKEX', 'BSE Bankex', 'BANKEX', 'BSE BANKEX Index Derivative', 'future', 'index', 'future', 30.0, 'unit', 'price_difference_contract', 'INR', 'INR', 2, 0.05, false, ARRAY['bankex', 'bse bankex', 'bse'], true, 142, 'bse', 'BANKEX', '{"exchange":"BSE"}'::jsonb, false, false, false, NOW(), NOW()),
    (gen_random_uuid(), 'SENSEX50', 'BSE Sensex 50', 'SENSEX50', 'BSE SENSEX 50 Index Derivative', 'future', 'index', 'future', 75.0, 'unit', 'price_difference_contract', 'INR', 'INR', 2, 0.05, false, ARRAY['sensex50', 'bse sensex 50', 'bse'], true, 143, 'bse', 'SENSEX50', '{"exchange":"BSE"}'::jsonb, false, false, false, NOW(), NOW())
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
