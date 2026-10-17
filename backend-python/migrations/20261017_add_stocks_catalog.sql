ALTER TABLE trading_catalog.instruments DROP CONSTRAINT IF EXISTS instruments_asset_class_check;
ALTER TABLE trading_catalog.instruments ADD CONSTRAINT instruments_asset_class_check 
  CHECK (asset_class = ANY (ARRAY['forex', 'metal', 'index', 'energy', 'agriculture', 'bond', 'crypto', 'stock', 'equity', 'other']));

INSERT INTO trading_catalog.instruments (
  id, symbol, name, display_name, description,
  category, asset_class, sub_category, product_type,
  base_asset, quote_asset, profit_currency, quantity_type,
  contract_size, contract_unit, digits, tick_size,
  pnl_calculation_mode, supports_pips, icon,
  search_keywords, is_active, sort_order,
  market_source, source_symbol, source_metadata,
  is_historical_sync, is_live_feed, is_ram_cached, created_at, updated_at
) VALUES
(
  gen_random_uuid(), 'RELIANCE', 'Reliance Industries Limited', 'RELIANCE', 'Reliance Industries Limited - Energy Minerals / Oil Refining/Marketing',
  'stock', 'stock', 'Energy Minerals', 'stock_etf',
  'RELIANCE', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_reliance.svg',
  ARRAY['reliance', 'reliance', 'energy minerals', 'stock', 'equity', 'nse']::text[], true, 1000,
  'nse', 'NSE:RELIANCE', '{"country":"IN","exchange":"NSE","sector":"Energy Minerals","industry":"Oil Refining/Marketing","logoid":"reliance-industrial-infrastructure"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'BHARTIARTL', 'Bharti Airtel Limited', 'BHARTIARTL', 'Bharti Airtel Limited - Communications / Wireless Telecommunications',
  'stock', 'stock', 'Communications', 'stock_etf',
  'BHARTIARTL', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_bhartiartl.svg',
  ARRAY['bhartiartl', 'bharti', 'communications', 'stock', 'equity', 'nse']::text[], true, 1001,
  'nse', 'NSE:BHARTIARTL', '{"country":"IN","exchange":"NSE","sector":"Communications","industry":"Wireless Telecommunications","logoid":"airtel"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'HDFCBANK', 'HDFC Bank Limited', 'HDFCBANK', 'HDFC Bank Limited - Finance / Major Banks',
  'stock', 'stock', 'Finance', 'stock_etf',
  'HDFCBANK', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_hdfcbank.svg',
  ARRAY['hdfcbank', 'hdfc', 'finance', 'stock', 'equity', 'nse']::text[], true, 1002,
  'nse', 'NSE:HDFCBANK', '{"country":"IN","exchange":"NSE","sector":"Finance","industry":"Major Banks","logoid":"hdfc-bank"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'ICICIBANK', 'ICICI Bank Limited', 'ICICIBANK', 'ICICI Bank Limited - Finance / Regional Banks',
  'stock', 'stock', 'Finance', 'stock_etf',
  'ICICIBANK', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_icicibank.svg',
  ARRAY['icicibank', 'icici', 'finance', 'stock', 'equity', 'nse']::text[], true, 1003,
  'nse', 'NSE:ICICIBANK', '{"country":"IN","exchange":"NSE","sector":"Finance","industry":"Regional Banks","logoid":"icici-bank"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'SBIN', 'State Bank of India', 'SBIN', 'State Bank of India - Finance / Regional Banks',
  'stock', 'stock', 'Finance', 'stock_etf',
  'SBIN', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_sbin.svg',
  ARRAY['sbin', 'state', 'finance', 'stock', 'equity', 'nse']::text[], true, 1004,
  'nse', 'NSE:SBIN', '{"country":"IN","exchange":"NSE","sector":"Finance","industry":"Regional Banks","logoid":"state-bank"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'TCS', 'Tata Consultancy Services Limited', 'TCS', 'Tata Consultancy Services Limited - Technology Services / Information Technology Services',
  'stock', 'stock', 'Technology Services', 'stock_etf',
  'TCS', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_tcs.svg',
  ARRAY['tcs', 'tata', 'technology services', 'stock', 'equity', 'nse']::text[], true, 1005,
  'nse', 'NSE:TCS', '{"country":"IN","exchange":"NSE","sector":"Technology Services","industry":"Information Technology Services","logoid":"tata"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'BAJFINANCE', 'Bajaj Finance Limited', 'BAJFINANCE', 'Bajaj Finance Limited - Finance / Finance/Rental/Leasing',
  'stock', 'stock', 'Finance', 'stock_etf',
  'BAJFINANCE', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_bajfinance.svg',
  ARRAY['bajfinance', 'bajaj', 'finance', 'stock', 'equity', 'nse']::text[], true, 1006,
  'nse', 'NSE:BAJFINANCE', '{"country":"IN","exchange":"NSE","sector":"Finance","industry":"Finance/Rental/Leasing","logoid":"bajaj-finance"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'LT', 'Larsen & Toubro Limited', 'LT', 'Larsen & Toubro Limited - Industrial Services / Engineering & Construction',
  'stock', 'stock', 'Industrial Services', 'stock_etf',
  'LT', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_lt.svg',
  ARRAY['lt', 'larsen', 'industrial services', 'stock', 'equity', 'nse']::text[], true, 1007,
  'nse', 'NSE:LT', '{"country":"IN","exchange":"NSE","sector":"Industrial Services","industry":"Engineering & Construction","logoid":"larsen-and-toubro"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'LICI', 'Life Insurance Corp. of India', 'LICI', 'Life Insurance Corp. of India - Finance / Life/Health Insurance',
  'stock', 'stock', 'Finance', 'stock_etf',
  'LICI', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_lici.svg',
  ARRAY['lici', 'life', 'finance', 'stock', 'equity', 'nse']::text[], true, 1008,
  'nse', 'NSE:LICI', '{"country":"IN","exchange":"NSE","sector":"Finance","industry":"Life/Health Insurance","logoid":"life-insurance-corporation-of-india"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'INFY', 'Infosys Limited', 'INFY', 'Infosys Limited - Technology Services / Information Technology Services',
  'stock', 'stock', 'Technology Services', 'stock_etf',
  'INFY', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_infy.svg',
  ARRAY['infy', 'infosys', 'technology services', 'stock', 'equity', 'nse']::text[], true, 1009,
  'nse', 'NSE:INFY', '{"country":"IN","exchange":"NSE","sector":"Technology Services","industry":"Information Technology Services","logoid":"infosys"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'KOTAKBANK', 'Kotak Mahindra Bank Limited', 'KOTAKBANK', 'Kotak Mahindra Bank Limited - Finance / Major Banks',
  'stock', 'stock', 'Finance', 'stock_etf',
  'KOTAKBANK', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_kotakbank.svg',
  ARRAY['kotakbank', 'kotak', 'finance', 'stock', 'equity', 'nse']::text[], true, 1010,
  'nse', 'NSE:KOTAKBANK', '{"country":"IN","exchange":"NSE","sector":"Finance","industry":"Major Banks","logoid":"kotak-mahindra-ast"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'HINDUNILVR', 'Hindustan Unilever Limited', 'HINDUNILVR', 'Hindustan Unilever Limited - Consumer Non-Durables / Household/Personal Care',
  'stock', 'stock', 'Consumer Non-Durables', 'stock_etf',
  'HINDUNILVR', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_hindunilvr.svg',
  ARRAY['hindunilvr', 'hindustan', 'consumer non-durables', 'stock', 'equity', 'nse']::text[], true, 1011,
  'nse', 'NSE:HINDUNILVR', '{"country":"IN","exchange":"NSE","sector":"Consumer Non-Durables","industry":"Household/Personal Care","logoid":"unilever"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'SUNPHARMA', 'Sun Pharmaceutical Industries Limited', 'SUNPHARMA', 'Sun Pharmaceutical Industries Limited - Health Technology / Pharmaceuticals: Major',
  'stock', 'stock', 'Health Technology', 'stock_etf',
  'SUNPHARMA', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_sunpharma.svg',
  ARRAY['sunpharma', 'sun', 'health technology', 'stock', 'equity', 'nse']::text[], true, 1012,
  'nse', 'NSE:SUNPHARMA', '{"country":"IN","exchange":"NSE","sector":"Health Technology","industry":"Pharmaceuticals: Major","logoid":"sun-pharmaceutical"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'ADANIPORTS', 'Adani Ports & Special Economic Zone Ltd', 'ADANIPORTS', 'Adani Ports & Special Economic Zone Ltd - Transportation / Other Transportation',
  'stock', 'stock', 'Transportation', 'stock_etf',
  'ADANIPORTS', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_adaniports.svg',
  ARRAY['adaniports', 'adani', 'transportation', 'stock', 'equity', 'nse']::text[], true, 1013,
  'nse', 'NSE:ADANIPORTS', '{"country":"IN","exchange":"NSE","sector":"Transportation","industry":"Other Transportation","logoid":"adani"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'AXISBANK', 'Axis Bank Limited', 'AXISBANK', 'Axis Bank Limited - Finance / Major Banks',
  'stock', 'stock', 'Finance', 'stock_etf',
  'AXISBANK', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_axisbank.svg',
  ARRAY['axisbank', 'axis', 'finance', 'stock', 'equity', 'nse']::text[], true, 1014,
  'nse', 'NSE:AXISBANK', '{"country":"IN","exchange":"NSE","sector":"Finance","industry":"Major Banks","logoid":"axis-bank"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'TITAN', 'Titan Company Limited', 'TITAN', 'Titan Company Limited - Consumer Durables / Other Consumer Specialties',
  'stock', 'stock', 'Consumer Durables', 'stock_etf',
  'TITAN', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_titan.svg',
  ARRAY['titan', 'titan', 'consumer durables', 'stock', 'equity', 'nse']::text[], true, 1015,
  'nse', 'NSE:TITAN', '{"country":"IN","exchange":"NSE","sector":"Consumer Durables","industry":"Other Consumer Specialties","logoid":"titan-company"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'ADANIPOWER', 'Adani Power Limited', 'ADANIPOWER', 'Adani Power Limited - Utilities / Electric Utilities',
  'stock', 'stock', 'Utilities', 'stock_etf',
  'ADANIPOWER', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_adanipower.svg',
  ARRAY['adanipower', 'adani', 'utilities', 'stock', 'equity', 'nse']::text[], true, 1016,
  'nse', 'NSE:ADANIPOWER', '{"country":"IN","exchange":"NSE","sector":"Utilities","industry":"Electric Utilities","logoid":"adani"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'HCLTECH', 'HCL Technologies Limited', 'HCLTECH', 'HCL Technologies Limited - Technology Services / Information Technology Services',
  'stock', 'stock', 'Technology Services', 'stock_etf',
  'HCLTECH', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_hcltech.svg',
  ARRAY['hcltech', 'hcl', 'technology services', 'stock', 'equity', 'nse']::text[], true, 1017,
  'nse', 'NSE:HCLTECH', '{"country":"IN","exchange":"NSE","sector":"Technology Services","industry":"Information Technology Services","logoid":"hcl-technologies"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'ADANIENT', 'Adani Enterprises Limited', 'ADANIENT', 'Adani Enterprises Limited - Distribution Services / Wholesale Distributors',
  'stock', 'stock', 'Distribution Services', 'stock_etf',
  'ADANIENT', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_adanient.svg',
  ARRAY['adanient', 'adani', 'distribution services', 'stock', 'equity', 'nse']::text[], true, 1018,
  'nse', 'NSE:ADANIENT', '{"country":"IN","exchange":"NSE","sector":"Distribution Services","industry":"Wholesale Distributors","logoid":"adani"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'MARUTI', 'Maruti Suzuki India Limited', 'MARUTI', 'Maruti Suzuki India Limited - Consumer Durables / Motor Vehicles',
  'stock', 'stock', 'Consumer Durables', 'stock_etf',
  'MARUTI', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_maruti.svg',
  ARRAY['maruti', 'maruti', 'consumer durables', 'stock', 'equity', 'nse']::text[], true, 1019,
  'nse', 'NSE:MARUTI', '{"country":"IN","exchange":"NSE","sector":"Consumer Durables","industry":"Motor Vehicles","logoid":"maruti-suzuki-india"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'M&M', 'Mahindra & Mahindra Ltd.', 'M&M', 'Mahindra & Mahindra Ltd. - Consumer Durables / Motor Vehicles',
  'stock', 'stock', 'Consumer Durables', 'stock_etf',
  'M&M', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_m_m.svg',
  ARRAY['mm', 'mahindra', 'consumer durables', 'stock', 'equity', 'nse']::text[], true, 1020,
  'nse', 'NSE:M&M', '{"country":"IN","exchange":"NSE","sector":"Consumer Durables","industry":"Motor Vehicles","logoid":"mahindra"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'ITC', 'ITC Limited', 'ITC', 'ITC Limited - Consumer Non-Durables / Tobacco',
  'stock', 'stock', 'Consumer Non-Durables', 'stock_etf',
  'ITC', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_itc.svg',
  ARRAY['itc', 'itc', 'consumer non-durables', 'stock', 'equity', 'nse']::text[], true, 1021,
  'nse', 'NSE:ITC', '{"country":"IN","exchange":"NSE","sector":"Consumer Non-Durables","industry":"Tobacco","logoid":"itc"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'HAL', 'Hindustan Aeronautics Limited', 'HAL', 'Hindustan Aeronautics Limited - Electronic Technology / Aerospace & Defense',
  'stock', 'stock', 'Electronic Technology', 'stock_etf',
  'HAL', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_hal.svg',
  ARRAY['hal', 'hindustan', 'electronic technology', 'stock', 'equity', 'nse']::text[], true, 1022,
  'nse', 'NSE:HAL', '{"country":"IN","exchange":"NSE","sector":"Electronic Technology","industry":"Aerospace & Defense","logoid":"hindustan-aeronautics-limited"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'ULTRACEMCO', 'UltraTech Cement Limited', 'ULTRACEMCO', 'UltraTech Cement Limited - Non-Energy Minerals / Construction Materials',
  'stock', 'stock', 'Non-Energy Minerals', 'stock_etf',
  'ULTRACEMCO', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_ultracemco.svg',
  ARRAY['ultracemco', 'ultratech', 'non-energy minerals', 'stock', 'equity', 'nse']::text[], true, 1023,
  'nse', 'NSE:ULTRACEMCO', '{"country":"IN","exchange":"NSE","sector":"Non-Energy Minerals","industry":"Construction Materials","logoid":"ultratech-cement"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'ETERNAL', 'Eternal Limited', 'ETERNAL', 'Eternal Limited - Transportation / Air Freight/Couriers',
  'stock', 'stock', 'Transportation', 'stock_etf',
  'ETERNAL', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_eternal.svg',
  ARRAY['eternal', 'eternal', 'transportation', 'stock', 'equity', 'nse']::text[], true, 1024,
  'nse', 'NSE:ETERNAL', '{"country":"IN","exchange":"NSE","sector":"Transportation","industry":"Air Freight/Couriers","logoid":"zomato"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'NTPC', 'NTPC Limited', 'NTPC', 'NTPC Limited - Utilities / Electric Utilities',
  'stock', 'stock', 'Utilities', 'stock_etf',
  'NTPC', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_ntpc.svg',
  ARRAY['ntpc', 'ntpc', 'utilities', 'stock', 'equity', 'nse']::text[], true, 1025,
  'nse', 'NSE:NTPC', '{"country":"IN","exchange":"NSE","sector":"Utilities","industry":"Electric Utilities","logoid":"ntpc"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'JSWSTEEL', 'JSW Steel Limited', 'JSWSTEEL', 'JSW Steel Limited - Non-Energy Minerals / Steel',
  'stock', 'stock', 'Non-Energy Minerals', 'stock_etf',
  'JSWSTEEL', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_jswsteel.svg',
  ARRAY['jswsteel', 'jsw', 'non-energy minerals', 'stock', 'equity', 'nse']::text[], true, 1026,
  'nse', 'NSE:JSWSTEEL', '{"country":"IN","exchange":"NSE","sector":"Non-Energy Minerals","industry":"Steel","logoid":"jsw"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'BAJAJ_AUTO', 'Bajaj Auto Limited', 'BAJAJ_AUTO', 'Bajaj Auto Limited - Consumer Durables / Motor Vehicles',
  'stock', 'stock', 'Consumer Durables', 'stock_etf',
  'BAJAJ_AUTO', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_bajaj_auto.svg',
  ARRAY['bajaj_auto', 'bajaj', 'consumer durables', 'stock', 'equity', 'nse']::text[], true, 1027,
  'nse', 'NSE:BAJAJ_AUTO', '{"country":"IN","exchange":"NSE","sector":"Consumer Durables","industry":"Motor Vehicles","logoid":"bajaj-auto"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'ONGC', 'Oil & Natural Gas Corp. Ltd.', 'ONGC', 'Oil & Natural Gas Corp. Ltd. - Energy Minerals / Integrated Oil',
  'stock', 'stock', 'Energy Minerals', 'stock_etf',
  'ONGC', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_ongc.svg',
  ARRAY['ongc', 'oil', 'energy minerals', 'stock', 'equity', 'nse']::text[], true, 1028,
  'nse', 'NSE:ONGC', '{"country":"IN","exchange":"NSE","sector":"Energy Minerals","industry":"Integrated Oil","logoid":"oil-and-natural-gas"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'BEL', 'Bharat Electronics Limited', 'BEL', 'Bharat Electronics Limited - Electronic Technology / Aerospace & Defense',
  'stock', 'stock', 'Electronic Technology', 'stock_etf',
  'BEL', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_bel.svg',
  ARRAY['bel', 'bharat', 'electronic technology', 'stock', 'equity', 'nse']::text[], true, 1029,
  'nse', 'NSE:BEL', '{"country":"IN","exchange":"NSE","sector":"Electronic Technology","industry":"Aerospace & Defense","logoid":"bharat-electronics"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'BAJAJFINSV', 'Bajaj Finserv Limited', 'BAJAJFINSV', 'Bajaj Finserv Limited - Finance / Life/Health Insurance',
  'stock', 'stock', 'Finance', 'stock_etf',
  'BAJAJFINSV', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_bajajfinsv.svg',
  ARRAY['bajajfinsv', 'bajaj', 'finance', 'stock', 'equity', 'nse']::text[], true, 1030,
  'nse', 'NSE:BAJAJFINSV', '{"country":"IN","exchange":"NSE","sector":"Finance","industry":"Life/Health Insurance","logoid":"bajaj-finserv-mutual-fund"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'COALINDIA', 'Coal India Ltd.', 'COALINDIA', 'Coal India Ltd. - Energy Minerals / Coal',
  'stock', 'stock', 'Energy Minerals', 'stock_etf',
  'COALINDIA', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_coalindia.svg',
  ARRAY['coalindia', 'coal', 'energy minerals', 'stock', 'equity', 'nse']::text[], true, 1031,
  'nse', 'NSE:COALINDIA', '{"country":"IN","exchange":"NSE","sector":"Energy Minerals","industry":"Coal","logoid":"coal-india"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'NESTLEIND', 'Nestle India Ltd.', 'NESTLEIND', 'Nestle India Ltd. - Consumer Non-Durables / Food: Major Diversified',
  'stock', 'stock', 'Consumer Non-Durables', 'stock_etf',
  'NESTLEIND', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_nestleind.svg',
  ARRAY['nestleind', 'nestle', 'consumer non-durables', 'stock', 'equity', 'nse']::text[], true, 1032,
  'nse', 'NSE:NESTLEIND', '{"country":"IN","exchange":"NSE","sector":"Consumer Non-Durables","industry":"Food: Major Diversified","logoid":"nestle"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'DIVISLAB', 'Divi''s Laboratories Limited', 'DIVISLAB', 'Divi''s Laboratories Limited - Health Technology / Pharmaceuticals: Major',
  'stock', 'stock', 'Health Technology', 'stock_etf',
  'DIVISLAB', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_divislab.svg',
  ARRAY['divislab', 'divis', 'health technology', 'stock', 'equity', 'nse']::text[], true, 1033,
  'nse', 'NSE:DIVISLAB', '{"country":"IN","exchange":"NSE","sector":"Health Technology","industry":"Pharmaceuticals: Major","logoid":"divis"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'POWERGRID', 'Power Grid Corporation of India Limited', 'POWERGRID', 'Power Grid Corporation of India Limited - Utilities / Electric Utilities',
  'stock', 'stock', 'Utilities', 'stock_etf',
  'POWERGRID', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_powergrid.svg',
  ARRAY['powergrid', 'power', 'utilities', 'stock', 'equity', 'nse']::text[], true, 1034,
  'nse', 'NSE:POWERGRID', '{"country":"IN","exchange":"NSE","sector":"Utilities","industry":"Electric Utilities","logoid":"power-grid"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'ASIANPAINT', 'Asian Paints Ltd.', 'ASIANPAINT', 'Asian Paints Ltd. - Process Industries / Industrial Specialties',
  'stock', 'stock', 'Process Industries', 'stock_etf',
  'ASIANPAINT', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_asianpaint.svg',
  ARRAY['asianpaint', 'asian', 'process industries', 'stock', 'equity', 'nse']::text[], true, 1035,
  'nse', 'NSE:ASIANPAINT', '{"country":"IN","exchange":"NSE","sector":"Process Industries","industry":"Industrial Specialties","logoid":"asian-paints"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'HINDZINC', 'Hindustan Zinc Limited', 'HINDZINC', 'Hindustan Zinc Limited - Non-Energy Minerals / Other Metals/Minerals',
  'stock', 'stock', 'Non-Energy Minerals', 'stock_etf',
  'HINDZINC', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_hindzinc.svg',
  ARRAY['hindzinc', 'hindustan', 'non-energy minerals', 'stock', 'equity', 'nse']::text[], true, 1036,
  'nse', 'NSE:HINDZINC', '{"country":"IN","exchange":"NSE","sector":"Non-Energy Minerals","industry":"Other Metals/Minerals","logoid":"hindustan-zinc"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'SHRIRAMFIN', 'Shriram Finance Limited', 'SHRIRAMFIN', 'Shriram Finance Limited - Finance / Finance/Rental/Leasing',
  'stock', 'stock', 'Finance', 'stock_etf',
  'SHRIRAMFIN', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_shriramfin.svg',
  ARRAY['shriramfin', 'shriram', 'finance', 'stock', 'equity', 'nse']::text[], true, 1037,
  'nse', 'NSE:SHRIRAMFIN', '{"country":"IN","exchange":"NSE","sector":"Finance","industry":"Finance/Rental/Leasing","logoid":"shriram"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'TATASTEEL', 'Tata Steel Limited', 'TATASTEEL', 'Tata Steel Limited - Non-Energy Minerals / Steel',
  'stock', 'stock', 'Non-Energy Minerals', 'stock_etf',
  'TATASTEEL', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_tatasteel.svg',
  ARRAY['tatasteel', 'tata', 'non-energy minerals', 'stock', 'equity', 'nse']::text[], true, 1038,
  'nse', 'NSE:TATASTEEL', '{"country":"IN","exchange":"NSE","sector":"Non-Energy Minerals","industry":"Steel","logoid":"tata"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'DMART', 'Avenue Supermarts Ltd.', 'DMART', 'Avenue Supermarts Ltd. - Retail Trade / Food Retail',
  'stock', 'stock', 'Retail Trade', 'stock_etf',
  'DMART', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_dmart.svg',
  ARRAY['dmart', 'avenue', 'retail trade', 'stock', 'equity', 'nse']::text[], true, 1039,
  'nse', 'NSE:DMART', '{"country":"IN","exchange":"NSE","sector":"Retail Trade","industry":"Food Retail","logoid":"avenue-supermarts"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'ADANIGREEN', 'Adani Green Energy Limited', 'ADANIGREEN', 'Adani Green Energy Limited - Utilities / Alternative Power Generation',
  'stock', 'stock', 'Utilities', 'stock_etf',
  'ADANIGREEN', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_adanigreen.svg',
  ARRAY['adanigreen', 'adani', 'utilities', 'stock', 'equity', 'nse']::text[], true, 1040,
  'nse', 'NSE:ADANIGREEN', '{"country":"IN","exchange":"NSE","sector":"Utilities","industry":"Alternative Power Generation","logoid":"adani"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'HINDALCO', 'Hindalco Industries Limited', 'HINDALCO', 'Hindalco Industries Limited - Non-Energy Minerals / Other Metals/Minerals',
  'stock', 'stock', 'Non-Energy Minerals', 'stock_etf',
  'HINDALCO', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_hindalco.svg',
  ARRAY['hindalco', 'hindalco', 'non-energy minerals', 'stock', 'equity', 'nse']::text[], true, 1041,
  'nse', 'NSE:HINDALCO', '{"country":"IN","exchange":"NSE","sector":"Non-Energy Minerals","industry":"Other Metals/Minerals","logoid":"hindalco"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'EICHERMOT', 'Eicher Motors Limited', 'EICHERMOT', 'Eicher Motors Limited - Consumer Durables / Motor Vehicles',
  'stock', 'stock', 'Consumer Durables', 'stock_etf',
  'EICHERMOT', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_eichermot.svg',
  ARRAY['eichermot', 'eicher', 'consumer durables', 'stock', 'equity', 'nse']::text[], true, 1042,
  'nse', 'NSE:EICHERMOT', '{"country":"IN","exchange":"NSE","sector":"Consumer Durables","industry":"Motor Vehicles","logoid":"eicher-motors"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'GRASIM', 'Grasim Industries Ltd.', 'GRASIM', 'Grasim Industries Ltd. - Non-Energy Minerals / Construction Materials',
  'stock', 'stock', 'Non-Energy Minerals', 'stock_etf',
  'GRASIM', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_grasim.svg',
  ARRAY['grasim', 'grasim', 'non-energy minerals', 'stock', 'equity', 'nse']::text[], true, 1043,
  'nse', 'NSE:GRASIM', '{"country":"IN","exchange":"NSE","sector":"Non-Energy Minerals","industry":"Construction Materials","logoid":"grasim"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'TVSMOTOR', 'TVS Motor Company Limited', 'TVSMOTOR', 'TVS Motor Company Limited - Consumer Durables / Motor Vehicles',
  'stock', 'stock', 'Consumer Durables', 'stock_etf',
  'TVSMOTOR', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_tvsmotor.svg',
  ARRAY['tvsmotor', 'tvs', 'consumer durables', 'stock', 'equity', 'nse']::text[], true, 1044,
  'nse', 'NSE:TVSMOTOR', '{"country":"IN","exchange":"NSE","sector":"Consumer Durables","industry":"Motor Vehicles","logoid":"tvs"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'INDIGO', 'InterGlobe Aviation Ltd', 'INDIGO', 'InterGlobe Aviation Ltd - Transportation / Airlines',
  'stock', 'stock', 'Transportation', 'stock_etf',
  'INDIGO', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_indigo.svg',
  ARRAY['indigo', 'interglobe', 'transportation', 'stock', 'equity', 'nse']::text[], true, 1045,
  'nse', 'NSE:INDIGO', '{"country":"IN","exchange":"NSE","sector":"Transportation","industry":"Airlines","logoid":"interglobe-aviatio"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'IOC', 'Indian Oil Corp. Ltd.', 'IOC', 'Indian Oil Corp. Ltd. - Energy Minerals / Integrated Oil',
  'stock', 'stock', 'Energy Minerals', 'stock_etf',
  'IOC', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_ioc.svg',
  ARRAY['ioc', 'indian', 'energy minerals', 'stock', 'equity', 'nse']::text[], true, 1046,
  'nse', 'NSE:IOC', '{"country":"IN","exchange":"NSE","sector":"Energy Minerals","industry":"Integrated Oil","logoid":"indian-oil"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'SOLARINDS', 'Solar Industries India Limited', 'SOLARINDS', 'Solar Industries India Limited - Process Industries / Industrial Specialties',
  'stock', 'stock', 'Process Industries', 'stock_etf',
  'SOLARINDS', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_solarinds.svg',
  ARRAY['solarinds', 'solar', 'process industries', 'stock', 'equity', 'nse']::text[], true, 1047,
  'nse', 'NSE:SOLARINDS', '{"country":"IN","exchange":"NSE","sector":"Process Industries","industry":"Industrial Specialties","logoid":"solar-industries"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'TORNTPHARM', 'Torrent Pharmaceuticals Ltd', 'TORNTPHARM', 'Torrent Pharmaceuticals Ltd - Health Technology / Pharmaceuticals: Major',
  'stock', 'stock', 'Health Technology', 'stock_etf',
  'TORNTPHARM', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_torntpharm.svg',
  ARRAY['torntpharm', 'torrent', 'health technology', 'stock', 'equity', 'nse']::text[], true, 1048,
  'nse', 'NSE:TORNTPHARM', '{"country":"IN","exchange":"NSE","sector":"Health Technology","industry":"Pharmaceuticals: Major","logoid":"torrent-pharmaceuticals"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'WIPRO', 'Wipro Limited', 'WIPRO', 'Wipro Limited - Technology Services / Information Technology Services',
  'stock', 'stock', 'Technology Services', 'stock_etf',
  'WIPRO', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_wipro.svg',
  ARRAY['wipro', 'wipro', 'technology services', 'stock', 'equity', 'nse']::text[], true, 1049,
  'nse', 'NSE:WIPRO', '{"country":"IN","exchange":"NSE","sector":"Technology Services","industry":"Information Technology Services","logoid":"wipro"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'MOTHERSON', 'Samvardhana Motherson International Limited', 'MOTHERSON', 'Samvardhana Motherson International Limited - Producer Manufacturing / Auto Parts: OEM',
  'stock', 'stock', 'Producer Manufacturing', 'stock_etf',
  'MOTHERSON', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_motherson.svg',
  ARRAY['motherson', 'samvardhana', 'producer manufacturing', 'stock', 'equity', 'nse']::text[], true, 1050,
  'nse', 'NSE:MOTHERSON', '{"country":"IN","exchange":"NSE","sector":"Producer Manufacturing","industry":"Auto Parts: OEM","logoid":"motherson"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'SBILIFE', 'SBI Life Insurance Co. Ltd.', 'SBILIFE', 'SBI Life Insurance Co. Ltd. - Finance / Life/Health Insurance',
  'stock', 'stock', 'Finance', 'stock_etf',
  'SBILIFE', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_sbilife.svg',
  ARRAY['sbilife', 'sbi', 'finance', 'stock', 'equity', 'nse']::text[], true, 1051,
  'nse', 'NSE:SBILIFE', '{"country":"IN","exchange":"NSE","sector":"Finance","industry":"Life/Health Insurance","logoid":"sbi-life-insurance"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'DLF', 'DLF Limited', 'DLF', 'DLF Limited - Finance / Real Estate Development',
  'stock', 'stock', 'Finance', 'stock_etf',
  'DLF', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_dlf.svg',
  ARRAY['dlf', 'dlf', 'finance', 'stock', 'equity', 'nse']::text[], true, 1052,
  'nse', 'NSE:DLF', '{"country":"IN","exchange":"NSE","sector":"Finance","industry":"Real Estate Development","logoid":"dlf"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'ADANIENSOL', 'Adani Energy Solutions Ltd', 'ADANIENSOL', 'Adani Energy Solutions Ltd - Utilities / Electric Utilities',
  'stock', 'stock', 'Utilities', 'stock_etf',
  'ADANIENSOL', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_adaniensol.svg',
  ARRAY['adaniensol', 'adani', 'utilities', 'stock', 'equity', 'nse']::text[], true, 1053,
  'nse', 'NSE:ADANIENSOL', '{"country":"IN","exchange":"NSE","sector":"Utilities","industry":"Electric Utilities","logoid":"adani-transmiss-in"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'TECHM', 'Tech Mahindra Limited', 'TECHM', 'Tech Mahindra Limited - Technology Services / Information Technology Services',
  'stock', 'stock', 'Technology Services', 'stock_etf',
  'TECHM', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_techm.svg',
  ARRAY['techm', 'tech', 'technology services', 'stock', 'equity', 'nse']::text[], true, 1054,
  'nse', 'NSE:TECHM', '{"country":"IN","exchange":"NSE","sector":"Technology Services","industry":"Information Technology Services","logoid":"mahindra-tech"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'HYUNDAI', 'Hyundai Motor India Limited', 'HYUNDAI', 'Hyundai Motor India Limited - Consumer Durables / Motor Vehicles',
  'stock', 'stock', 'Consumer Durables', 'stock_etf',
  'HYUNDAI', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_hyundai.svg',
  ARRAY['hyundai', 'hyundai', 'consumer durables', 'stock', 'equity', 'nse']::text[], true, 1055,
  'nse', 'NSE:HYUNDAI', '{"country":"IN","exchange":"NSE","sector":"Consumer Durables","industry":"Motor Vehicles","logoid":"hyundai"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'TRENT', 'Trent Limited', 'TRENT', 'Trent Limited - Retail Trade / Apparel/Footwear Retail',
  'stock', 'stock', 'Retail Trade', 'stock_etf',
  'TRENT', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_trent.svg',
  ARRAY['trent', 'trent', 'retail trade', 'stock', 'equity', 'nse']::text[], true, 1056,
  'nse', 'NSE:TRENT', '{"country":"IN","exchange":"NSE","sector":"Retail Trade","industry":"Apparel/Footwear Retail","logoid":"trent"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'TMCV', 'Tata Motors Limited', 'TMCV', 'Tata Motors Limited - Consumer Durables / Motor Vehicles',
  'stock', 'stock', 'Consumer Durables', 'stock_etf',
  'TMCV', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_tmcv.svg',
  ARRAY['tmcv', 'tata', 'consumer durables', 'stock', 'equity', 'nse']::text[], true, 1057,
  'nse', 'NSE:TMCV', '{"country":"IN","exchange":"NSE","sector":"Consumer Durables","industry":"Motor Vehicles","logoid":"tata"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'PIDILITIND', 'Pidilite Industries Limited', 'PIDILITIND', 'Pidilite Industries Limited - Process Industries / Industrial Specialties',
  'stock', 'stock', 'Process Industries', 'stock_etf',
  'PIDILITIND', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_pidilitind.svg',
  ARRAY['pidilitind', 'pidilite', 'process industries', 'stock', 'equity', 'nse']::text[], true, 1058,
  'nse', 'NSE:PIDILITIND', '{"country":"IN","exchange":"NSE","sector":"Process Industries","industry":"Industrial Specialties","logoid":"pidilite"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'BHEL', 'Bharat Heavy Electricals Limited', 'BHEL', 'Bharat Heavy Electricals Limited - Producer Manufacturing / Electrical Products',
  'stock', 'stock', 'Producer Manufacturing', 'stock_etf',
  'BHEL', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_bhel.svg',
  ARRAY['bhel', 'bharat', 'producer manufacturing', 'stock', 'equity', 'nse']::text[], true, 1059,
  'nse', 'NSE:BHEL', '{"country":"IN","exchange":"NSE","sector":"Producer Manufacturing","industry":"Electrical Products","logoid":"bharat-heavy-electricals"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'VBL', 'Varun Beverages Ltd.', 'VBL', 'Varun Beverages Ltd. - Consumer Non-Durables / Beverages: Non-Alcoholic',
  'stock', 'stock', 'Consumer Non-Durables', 'stock_etf',
  'VBL', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_vbl.svg',
  ARRAY['vbl', 'varun', 'consumer non-durables', 'stock', 'equity', 'nse']::text[], true, 1060,
  'nse', 'NSE:VBL', '{"country":"IN","exchange":"NSE","sector":"Consumer Non-Durables","industry":"Beverages: Non-Alcoholic","logoid":"varun-beverages-ltd"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'ABB', 'ABB India Limited', 'ABB', 'ABB India Limited - Producer Manufacturing / Electrical Products',
  'stock', 'stock', 'Producer Manufacturing', 'stock_etf',
  'ABB', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_abb.svg',
  ARRAY['abb', 'abb', 'producer manufacturing', 'stock', 'equity', 'nse']::text[], true, 1061,
  'nse', 'NSE:ABB', '{"country":"IN","exchange":"NSE","sector":"Producer Manufacturing","industry":"Electrical Products","logoid":"abb"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'JIOFIN', 'Jio Financial Services Limited', 'JIOFIN', 'Jio Financial Services Limited - Finance / Financial Conglomerates',
  'stock', 'stock', 'Finance', 'stock_etf',
  'JIOFIN', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_jiofin.svg',
  ARRAY['jiofin', 'jio', 'finance', 'stock', 'equity', 'nse']::text[], true, 1062,
  'nse', 'NSE:JIOFIN', '{"country":"IN","exchange":"NSE","sector":"Finance","industry":"Financial Conglomerates","logoid":"jio-fin-services-ltd"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'VAML', 'Vedanta Aluminium Metal Limited', 'VAML', 'Vedanta Aluminium Metal Limited - Non-Energy Minerals / Aluminum',
  'stock', 'stock', 'Non-Energy Minerals', 'stock_etf',
  'VAML', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_vaml.svg',
  ARRAY['vaml', 'vedanta', 'non-energy minerals', 'stock', 'equity', 'nse']::text[], true, 1063,
  'nse', 'NSE:VAML', '{"country":"IN","exchange":"NSE","sector":"Non-Energy Minerals","industry":"Aluminum","logoid":""}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'ICICIAMC', 'ICICI Prudential Asset Management Company Ltd.', 'ICICIAMC', 'ICICI Prudential Asset Management Company Ltd. - Finance / Investment Managers',
  'stock', 'stock', 'Finance', 'stock_etf',
  'ICICIAMC', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_iciciamc.svg',
  ARRAY['iciciamc', 'icici', 'finance', 'stock', 'equity', 'nse']::text[], true, 1064,
  'nse', 'NSE:ICICIAMC', '{"country":"IN","exchange":"NSE","sector":"Finance","industry":"Investment Managers","logoid":"icici-prudential-life-insurance"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'BSE', 'BSE Ltd.', 'BSE', 'BSE Ltd. - Finance / Investment Banks/Brokers',
  'stock', 'stock', 'Finance', 'stock_etf',
  'BSE', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_bse.svg',
  ARRAY['bse', 'bse', 'finance', 'stock', 'equity', 'nse']::text[], true, 1065,
  'nse', 'NSE:BSE', '{"country":"IN","exchange":"NSE","sector":"Finance","industry":"Investment Banks/Brokers","logoid":"bse"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'IDEA', 'Vodafone Idea Ltd', 'IDEA', 'Vodafone Idea Ltd - Communications / Wireless Telecommunications',
  'stock', 'stock', 'Communications', 'stock_etf',
  'IDEA', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_idea.svg',
  ARRAY['idea', 'vodafone', 'communications', 'stock', 'equity', 'nse']::text[], true, 1066,
  'nse', 'NSE:IDEA', '{"country":"IN","exchange":"NSE","sector":"Communications","industry":"Wireless Telecommunications","logoid":"vodafone-idea"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'TATACAP', 'Tata Capital Ltd.', 'TATACAP', 'Tata Capital Ltd. - Finance / Finance/Rental/Leasing',
  'stock', 'stock', 'Finance', 'stock_etf',
  'TATACAP', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_tatacap.svg',
  ARRAY['tatacap', 'tata', 'finance', 'stock', 'equity', 'nse']::text[], true, 1067,
  'nse', 'NSE:TATACAP', '{"country":"IN","exchange":"NSE","sector":"Finance","industry":"Finance/Rental/Leasing","logoid":"tata"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'CHOLAFIN', 'Cholamandalam Investment and Finance Co. Ltd.', 'CHOLAFIN', 'Cholamandalam Investment and Finance Co. Ltd. - Finance / Finance/Rental/Leasing',
  'stock', 'stock', 'Finance', 'stock_etf',
  'CHOLAFIN', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_cholafin.svg',
  ARRAY['cholafin', 'cholamandalam', 'finance', 'stock', 'equity', 'nse']::text[], true, 1068,
  'nse', 'NSE:CHOLAFIN', '{"country":"IN","exchange":"NSE","sector":"Finance","industry":"Finance/Rental/Leasing","logoid":"cholamandalam"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'PNB', 'Punjab National Bank', 'PNB', 'Punjab National Bank - Finance / Major Banks',
  'stock', 'stock', 'Finance', 'stock_etf',
  'PNB', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_pnb.svg',
  ARRAY['pnb', 'punjab', 'finance', 'stock', 'equity', 'nse']::text[], true, 1069,
  'nse', 'NSE:PNB', '{"country":"IN","exchange":"NSE","sector":"Finance","industry":"Major Banks","logoid":"punjab-natl-bank"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'BOSCHLTD', 'Bosch Limited', 'BOSCHLTD', 'Bosch Limited - Producer Manufacturing / Auto Parts: OEM',
  'stock', 'stock', 'Producer Manufacturing', 'stock_etf',
  'BOSCHLTD', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_boschltd.svg',
  ARRAY['boschltd', 'bosch', 'producer manufacturing', 'stock', 'equity', 'nse']::text[], true, 1070,
  'nse', 'NSE:BOSCHLTD', '{"country":"IN","exchange":"NSE","sector":"Producer Manufacturing","industry":"Auto Parts: OEM","logoid":"bosch"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'UNIONBANK', 'Union Bank of India Limited', 'UNIONBANK', 'Union Bank of India Limited - Finance / Major Banks',
  'stock', 'stock', 'Finance', 'stock_etf',
  'UNIONBANK', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_unionbank.svg',
  ARRAY['unionbank', 'union', 'finance', 'stock', 'equity', 'nse']::text[], true, 1071,
  'nse', 'NSE:UNIONBANK', '{"country":"IN","exchange":"NSE","sector":"Finance","industry":"Major Banks","logoid":"union-bank-of-india"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'SIEMENS', 'Siemens Limited', 'SIEMENS', 'Siemens Limited - Producer Manufacturing / Electrical Products',
  'stock', 'stock', 'Producer Manufacturing', 'stock_etf',
  'SIEMENS', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_siemens.svg',
  ARRAY['siemens', 'siemens', 'producer manufacturing', 'stock', 'equity', 'nse']::text[], true, 1072,
  'nse', 'NSE:SIEMENS', '{"country":"IN","exchange":"NSE","sector":"Producer Manufacturing","industry":"Electrical Products","logoid":"siemens"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'CGPOWER', 'CG Power & Industrial Solutions Ltd', 'CGPOWER', 'CG Power & Industrial Solutions Ltd - Producer Manufacturing / Electrical Products',
  'stock', 'stock', 'Producer Manufacturing', 'stock_etf',
  'CGPOWER', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_cgpower.svg',
  ARRAY['cgpower', 'cg', 'producer manufacturing', 'stock', 'equity', 'nse']::text[], true, 1073,
  'nse', 'NSE:CGPOWER', '{"country":"IN","exchange":"NSE","sector":"Producer Manufacturing","industry":"Electrical Products","logoid":"cg-power-and-industrial-solutions"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'CUMMINSIND', 'Cummins India Limited', 'CUMMINSIND', 'Cummins India Limited - Producer Manufacturing / Auto Parts: OEM',
  'stock', 'stock', 'Producer Manufacturing', 'stock_etf',
  'CUMMINSIND', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_cumminsind.svg',
  ARRAY['cumminsind', 'cummins', 'producer manufacturing', 'stock', 'equity', 'nse']::text[], true, 1074,
  'nse', 'NSE:CUMMINSIND', '{"country":"IN","exchange":"NSE","sector":"Producer Manufacturing","industry":"Auto Parts: OEM","logoid":"cummins"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'POWERINDIA', 'Hitachi Energy India Limited', 'POWERINDIA', 'Hitachi Energy India Limited - Electronic Technology / Electronic Equipment/Instruments',
  'stock', 'stock', 'Electronic Technology', 'stock_etf',
  'POWERINDIA', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_powerindia.svg',
  ARRAY['powerindia', 'hitachi', 'electronic technology', 'stock', 'equity', 'nse']::text[], true, 1075,
  'nse', 'NSE:POWERINDIA', '{"country":"IN","exchange":"NSE","sector":"Electronic Technology","industry":"Electronic Equipment/Instruments","logoid":"abb-power-products"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'BPCL', 'Bharat Petroleum Corporation Limited', 'BPCL', 'Bharat Petroleum Corporation Limited - Energy Minerals / Oil Refining/Marketing',
  'stock', 'stock', 'Energy Minerals', 'stock_etf',
  'BPCL', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_bpcl.svg',
  ARRAY['bpcl', 'bharat', 'energy minerals', 'stock', 'equity', 'nse']::text[], true, 1076,
  'nse', 'NSE:BPCL', '{"country":"IN","exchange":"NSE","sector":"Energy Minerals","industry":"Oil Refining/Marketing","logoid":"bharat-petroleum"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'LTM', 'LTM Limited', 'LTM', 'LTM Limited - Technology Services / Data Processing Services',
  'stock', 'stock', 'Technology Services', 'stock_etf',
  'LTM', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_ltm.svg',
  ARRAY['ltm', 'ltm', 'technology services', 'stock', 'equity', 'nse']::text[], true, 1077,
  'nse', 'NSE:LTM', '{"country":"IN","exchange":"NSE","sector":"Technology Services","industry":"Data Processing Services","logoid":"larsen-and-toubro"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'BAJAJHLDNG', 'Bajaj Holdings & Investment Limited.', 'BAJAJHLDNG', 'Bajaj Holdings & Investment Limited. - Finance / Financial Conglomerates',
  'stock', 'stock', 'Finance', 'stock_etf',
  'BAJAJHLDNG', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_bajajhldng.svg',
  ARRAY['bajajhldng', 'bajaj', 'finance', 'stock', 'equity', 'nse']::text[], true, 1078,
  'nse', 'NSE:BAJAJHLDNG', '{"country":"IN","exchange":"NSE","sector":"Finance","industry":"Financial Conglomerates","logoid":"bajaj-holdings-and-investment-lt"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'GROWW', 'Billionbrains Garage Ventures Limited', 'GROWW', 'Billionbrains Garage Ventures Limited - Miscellaneous / Investment Trusts/Mutual Funds',
  'stock', 'stock', 'Miscellaneous', 'stock_etf',
  'GROWW', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_groww.svg',
  ARRAY['groww', 'billionbrains', 'miscellaneous', 'stock', 'equity', 'nse']::text[], true, 1079,
  'nse', 'NSE:GROWW', '{"country":"IN","exchange":"NSE","sector":"Miscellaneous","industry":"Investment Trusts/Mutual Funds","logoid":"growwamc-growwdefnc"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'POLYCAB', 'Polycab India Ltd.', 'POLYCAB', 'Polycab India Ltd. - Producer Manufacturing / Electrical Products',
  'stock', 'stock', 'Producer Manufacturing', 'stock_etf',
  'POLYCAB', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_polycab.svg',
  ARRAY['polycab', 'polycab', 'producer manufacturing', 'stock', 'equity', 'nse']::text[], true, 1080,
  'nse', 'NSE:POLYCAB', '{"country":"IN","exchange":"NSE","sector":"Producer Manufacturing","industry":"Electrical Products","logoid":"polycab"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'HDFCLIFE', 'HDFC Life Insurance Co. Ltd.', 'HDFCLIFE', 'HDFC Life Insurance Co. Ltd. - Finance / Life/Health Insurance',
  'stock', 'stock', 'Finance', 'stock_etf',
  'HDFCLIFE', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_hdfclife.svg',
  ARRAY['hdfclife', 'hdfc', 'finance', 'stock', 'equity', 'nse']::text[], true, 1081,
  'nse', 'NSE:HDFCLIFE', '{"country":"IN","exchange":"NSE","sector":"Finance","industry":"Life/Health Insurance","logoid":"hdfc-life"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'BANKBARODA', 'Bank of Baroda', 'BANKBARODA', 'Bank of Baroda - Finance / Major Banks',
  'stock', 'stock', 'Finance', 'stock_etf',
  'BANKBARODA', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_bankbaroda.svg',
  ARRAY['bankbaroda', 'bank', 'finance', 'stock', 'equity', 'nse']::text[], true, 1082,
  'nse', 'NSE:BANKBARODA', '{"country":"IN","exchange":"NSE","sector":"Finance","industry":"Major Banks","logoid":"bank-of-baroda"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'BRITANNIA', 'Britannia Industries Ltd', 'BRITANNIA', 'Britannia Industries Ltd - Consumer Non-Durables / Food: Specialty/Candy',
  'stock', 'stock', 'Consumer Non-Durables', 'stock_etf',
  'BRITANNIA', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_britannia.svg',
  ARRAY['britannia', 'britannia', 'consumer non-durables', 'stock', 'equity', 'nse']::text[], true, 1083,
  'nse', 'NSE:BRITANNIA', '{"country":"IN","exchange":"NSE","sector":"Consumer Non-Durables","industry":"Food: Specialty/Candy","logoid":"britannia"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'LGEINDIA', 'LG Electronics India Limited', 'LGEINDIA', 'LG Electronics India Limited - Consumer Durables / Electronics/Appliances',
  'stock', 'stock', 'Consumer Durables', 'stock_etf',
  'LGEINDIA', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_lgeindia.svg',
  ARRAY['lgeindia', 'lg', 'consumer durables', 'stock', 'equity', 'nse']::text[], true, 1084,
  'nse', 'NSE:LGEINDIA', '{"country":"IN","exchange":"NSE","sector":"Consumer Durables","industry":"Electronics/Appliances","logoid":"lg-display"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'APOLLOHOSP', 'Apollo Hospitals Enterprise Limited', 'APOLLOHOSP', 'Apollo Hospitals Enterprise Limited - Health Services / Hospital/Nursing Management',
  'stock', 'stock', 'Health Services', 'stock_etf',
  'APOLLOHOSP', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_apollohosp.svg',
  ARRAY['apollohosp', 'apollo', 'health services', 'stock', 'equity', 'nse']::text[], true, 1085,
  'nse', 'NSE:APOLLOHOSP', '{"country":"IN","exchange":"NSE","sector":"Health Services","industry":"Hospital/Nursing Management","logoid":"apollo-hospitals"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'ZYDUSLIFE', 'Zydus Lifesciences Limited', 'ZYDUSLIFE', 'Zydus Lifesciences Limited - Health Technology / Pharmaceuticals: Major',
  'stock', 'stock', 'Health Technology', 'stock_etf',
  'ZYDUSLIFE', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_zyduslife.svg',
  ARRAY['zyduslife', 'zydus', 'health technology', 'stock', 'equity', 'nse']::text[], true, 1086,
  'nse', 'NSE:ZYDUSLIFE', '{"country":"IN","exchange":"NSE","sector":"Health Technology","industry":"Pharmaceuticals: Major","logoid":"cadila-healthcare"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'PFC', 'Power Finance Corporation Limited', 'PFC', 'Power Finance Corporation Limited - Finance / Finance/Rental/Leasing',
  'stock', 'stock', 'Finance', 'stock_etf',
  'PFC', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_pfc.svg',
  ARRAY['pfc', 'power', 'finance', 'stock', 'equity', 'nse']::text[], true, 1087,
  'nse', 'NSE:PFC', '{"country":"IN","exchange":"NSE","sector":"Finance","industry":"Finance/Rental/Leasing","logoid":"power-finance"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'INDIANB', 'Indian Bank', 'INDIANB', 'Indian Bank - Finance / Major Banks',
  'stock', 'stock', 'Finance', 'stock_etf',
  'INDIANB', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_indianb.svg',
  ARRAY['indianb', 'indian', 'finance', 'stock', 'equity', 'nse']::text[], true, 1088,
  'nse', 'NSE:INDIANB', '{"country":"IN","exchange":"NSE","sector":"Finance","industry":"Major Banks","logoid":"indian-bank"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'LENSKART', 'Lenskart Solutions Limited', 'LENSKART', 'Lenskart Solutions Limited - Health Technology / Medical Specialties',
  'stock', 'stock', 'Health Technology', 'stock_etf',
  'LENSKART', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_lenskart.svg',
  ARRAY['lenskart', 'lenskart', 'health technology', 'stock', 'equity', 'nse']::text[], true, 1089,
  'nse', 'NSE:LENSKART', '{"country":"IN","exchange":"NSE","sector":"Health Technology","industry":"Medical Specialties","logoid":"lenskart-solutions-limited"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'TATAPOWER', 'Tata Power Company Limited', 'TATAPOWER', 'Tata Power Company Limited - Utilities / Electric Utilities',
  'stock', 'stock', 'Utilities', 'stock_etf',
  'TATAPOWER', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_tatapower.svg',
  ARRAY['tatapower', 'tata', 'utilities', 'stock', 'equity', 'nse']::text[], true, 1090,
  'nse', 'NSE:TATAPOWER', '{"country":"IN","exchange":"NSE","sector":"Utilities","industry":"Electric Utilities","logoid":"tata"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'GAIL', 'GAIL (India) Limited', 'GAIL', 'GAIL (India) Limited - Utilities / Gas Distributors',
  'stock', 'stock', 'Utilities', 'stock_etf',
  'GAIL', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_gail.svg',
  ARRAY['gail', 'gail', 'utilities', 'stock', 'equity', 'nse']::text[], true, 1091,
  'nse', 'NSE:GAIL', '{"country":"IN","exchange":"NSE","sector":"Utilities","industry":"Gas Distributors","logoid":"gail"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'PAYTM', 'One 97 Communications Ltd.', 'PAYTM', 'One 97 Communications Ltd. - Finance / Finance/Rental/Leasing',
  'stock', 'stock', 'Finance', 'stock_etf',
  'PAYTM', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_paytm.svg',
  ARRAY['paytm', 'one', 'finance', 'stock', 'equity', 'nse']::text[], true, 1092,
  'nse', 'NSE:PAYTM', '{"country":"IN","exchange":"NSE","sector":"Finance","industry":"Finance/Rental/Leasing","logoid":"one-97-communications"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'LAURUSLABS', 'Laurus Labs Ltd.', 'LAURUSLABS', 'Laurus Labs Ltd. - Health Technology / Pharmaceuticals: Major',
  'stock', 'stock', 'Health Technology', 'stock_etf',
  'LAURUSLABS', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_lauruslabs.svg',
  ARRAY['lauruslabs', 'laurus', 'health technology', 'stock', 'equity', 'nse']::text[], true, 1093,
  'nse', 'NSE:LAURUSLABS', '{"country":"IN","exchange":"NSE","sector":"Health Technology","industry":"Pharmaceuticals: Major","logoid":"laurus-labs"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'CIPLA', 'Cipla Ltd', 'CIPLA', 'Cipla Ltd - Health Technology / Pharmaceuticals: Other',
  'stock', 'stock', 'Health Technology', 'stock_etf',
  'CIPLA', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_cipla.svg',
  ARRAY['cipla', 'cipla', 'health technology', 'stock', 'equity', 'nse']::text[], true, 1094,
  'nse', 'NSE:CIPLA', '{"country":"IN","exchange":"NSE","sector":"Health Technology","industry":"Pharmaceuticals: Other","logoid":"cipla"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'CANBK', 'Canara Bank', 'CANBK', 'Canara Bank - Finance / Major Banks',
  'stock', 'stock', 'Finance', 'stock_etf',
  'CANBK', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_canbk.svg',
  ARRAY['canbk', 'canara', 'finance', 'stock', 'equity', 'nse']::text[], true, 1095,
  'nse', 'NSE:CANBK', '{"country":"IN","exchange":"NSE","sector":"Finance","industry":"Major Banks","logoid":"canara-bank"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'LODHA', 'Lodha Developers Ltd.', 'LODHA', 'Lodha Developers Ltd. - Finance / Real Estate Development',
  'stock', 'stock', 'Finance', 'stock_etf',
  'LODHA', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_lodha.svg',
  ARRAY['lodha', 'lodha', 'finance', 'stock', 'equity', 'nse']::text[], true, 1096,
  'nse', 'NSE:LODHA', '{"country":"IN","exchange":"NSE","sector":"Finance","industry":"Real Estate Development","logoid":"macrotech-developers"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'TMPV', 'Tata Motors Passenger Vehicles Ltd', 'TMPV', 'Tata Motors Passenger Vehicles Ltd - Consumer Durables / Motor Vehicles',
  'stock', 'stock', 'Consumer Durables', 'stock_etf',
  'TMPV', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_tmpv.svg',
  ARRAY['tmpv', 'tata', 'consumer durables', 'stock', 'equity', 'nse']::text[], true, 1097,
  'nse', 'NSE:TMPV', '{"country":"IN","exchange":"NSE","sector":"Consumer Durables","industry":"Motor Vehicles","logoid":"tata"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'SBIFUNDS', 'SBI Funds Management Limited', 'SBIFUNDS', 'SBI Funds Management Limited - Finance / Investment Managers',
  'stock', 'stock', 'Finance', 'stock_etf',
  'SBIFUNDS', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_sbifunds.svg',
  ARRAY['sbifunds', 'sbi', 'finance', 'stock', 'equity', 'nse']::text[], true, 1098,
  'nse', 'NSE:SBIFUNDS', '{"country":"IN","exchange":"NSE","sector":"Finance","industry":"Investment Managers","logoid":""}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'ENRIN', 'Siemens Energy India Limited', 'ENRIN', 'Siemens Energy India Limited - Producer Manufacturing / Electrical Products',
  'stock', 'stock', 'Producer Manufacturing', 'stock_etf',
  'ENRIN', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_enrin.svg',
  ARRAY['enrin', 'siemens', 'producer manufacturing', 'stock', 'equity', 'nse']::text[], true, 1099,
  'nse', 'NSE:ENRIN', '{"country":"IN","exchange":"NSE","sector":"Producer Manufacturing","industry":"Electrical Products","logoid":"siemens-energy"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'INDHOTEL', 'Indian Hotels Co. Ltd.', 'INDHOTEL', 'Indian Hotels Co. Ltd. - Consumer Services / Hotels/Resorts/Cruise lines',
  'stock', 'stock', 'Consumer Services', 'stock_etf',
  'INDHOTEL', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_indhotel.svg',
  ARRAY['indhotel', 'indian', 'consumer services', 'stock', 'equity', 'nse']::text[], true, 1100,
  'nse', 'NSE:INDHOTEL', '{"country":"IN","exchange":"NSE","sector":"Consumer Services","industry":"Hotels/Resorts/Cruise lines","logoid":"indian-hotels"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'JINDALSTEL', 'Jindal Steel Limited', 'JINDALSTEL', 'Jindal Steel Limited - Non-Energy Minerals / Steel',
  'stock', 'stock', 'Non-Energy Minerals', 'stock_etf',
  'JINDALSTEL', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_jindalstel.svg',
  ARRAY['jindalstel', 'jindal', 'non-energy minerals', 'stock', 'equity', 'nse']::text[], true, 1101,
  'nse', 'NSE:JINDALSTEL', '{"country":"IN","exchange":"NSE","sector":"Non-Energy Minerals","industry":"Steel","logoid":"jindal"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'ABCAPITAL', 'Aditya Birla Capital Ltd.', 'ABCAPITAL', 'Aditya Birla Capital Ltd. - Finance / Multi-Line Insurance',
  'stock', 'stock', 'Finance', 'stock_etf',
  'ABCAPITAL', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_abcapital.svg',
  ARRAY['abcapital', 'aditya', 'finance', 'stock', 'equity', 'nse']::text[], true, 1102,
  'nse', 'NSE:ABCAPITAL', '{"country":"IN","exchange":"NSE","sector":"Finance","industry":"Multi-Line Insurance","logoid":"aditya-birla-capital"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'MUTHOOTFIN', 'Muthoot Finance Ltd', 'MUTHOOTFIN', 'Muthoot Finance Ltd - Finance / Finance/Rental/Leasing',
  'stock', 'stock', 'Finance', 'stock_etf',
  'MUTHOOTFIN', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_muthootfin.svg',
  ARRAY['muthootfin', 'muthoot', 'finance', 'stock', 'equity', 'nse']::text[], true, 1103,
  'nse', 'NSE:MUTHOOTFIN', '{"country":"IN","exchange":"NSE","sector":"Finance","industry":"Finance/Rental/Leasing","logoid":"muthoot-finance"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'HEROMOTOCO', 'Hero Motocorp Limited', 'HEROMOTOCO', 'Hero Motocorp Limited - Consumer Durables / Motor Vehicles',
  'stock', 'stock', 'Consumer Durables', 'stock_etf',
  'HEROMOTOCO', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_heromotoco.svg',
  ARRAY['heromotoco', 'hero', 'consumer durables', 'stock', 'equity', 'nse']::text[], true, 1104,
  'nse', 'NSE:HEROMOTOCO', '{"country":"IN","exchange":"NSE","sector":"Consumer Durables","industry":"Motor Vehicles","logoid":"hero-motocorp"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'MEESHO', 'Meesho Limited', 'MEESHO', 'Meesho Limited - Retail Trade / Apparel/Footwear Retail',
  'stock', 'stock', 'Retail Trade', 'stock_etf',
  'MEESHO', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_meesho.svg',
  ARRAY['meesho', 'meesho', 'retail trade', 'stock', 'equity', 'nse']::text[], true, 1105,
  'nse', 'NSE:MEESHO', '{"country":"IN","exchange":"NSE","sector":"Retail Trade","industry":"Apparel/Footwear Retail","logoid":"meesho-ltd"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'HDFCAMC', 'HDFC Asset Management Co. Ltd.', 'HDFCAMC', 'HDFC Asset Management Co. Ltd. - Finance / Investment Managers',
  'stock', 'stock', 'Finance', 'stock_etf',
  'HDFCAMC', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_hdfcamc.svg',
  ARRAY['hdfcamc', 'hdfc', 'finance', 'stock', 'equity', 'nse']::text[], true, 1106,
  'nse', 'NSE:HDFCAMC', '{"country":"IN","exchange":"NSE","sector":"Finance","industry":"Investment Managers","logoid":"hdfc"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'IRFC', 'Indian Railway Finance Corp. Ltd.', 'IRFC', 'Indian Railway Finance Corp. Ltd. - Finance / Finance/Rental/Leasing',
  'stock', 'stock', 'Finance', 'stock_etf',
  'IRFC', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_irfc.svg',
  ARRAY['irfc', 'indian', 'finance', 'stock', 'equity', 'nse']::text[], true, 1107,
  'nse', 'NSE:IRFC', '{"country":"IN","exchange":"NSE","sector":"Finance","industry":"Finance/Rental/Leasing","logoid":"indian-railway-finance-corporation"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'LLOYDSME', 'Lloyds Metals & Energy Ltd.', 'LLOYDSME', 'Lloyds Metals & Energy Ltd. - Non-Energy Minerals / Steel',
  'stock', 'stock', 'Non-Energy Minerals', 'stock_etf',
  'LLOYDSME', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_lloydsme.svg',
  ARRAY['lloydsme', 'lloyds', 'non-energy minerals', 'stock', 'equity', 'nse']::text[], true, 1108,
  'nse', 'NSE:LLOYDSME', '{"country":"IN","exchange":"NSE","sector":"Non-Energy Minerals","industry":"Steel","logoid":"lloyds-metals-and-energy-ltd"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'MARICO', 'Marico Limited', 'MARICO', 'Marico Limited - Consumer Non-Durables / Household/Personal Care',
  'stock', 'stock', 'Consumer Non-Durables', 'stock_etf',
  'MARICO', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_marico.svg',
  ARRAY['marico', 'marico', 'consumer non-durables', 'stock', 'equity', 'nse']::text[], true, 1109,
  'nse', 'NSE:MARICO', '{"country":"IN","exchange":"NSE","sector":"Consumer Non-Durables","industry":"Household/Personal Care","logoid":"marico"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'DRREDDY', 'Dr. Reddy''s Laboratories Ltd.', 'DRREDDY', 'Dr. Reddy''s Laboratories Ltd. - Health Technology / Pharmaceuticals: Major',
  'stock', 'stock', 'Health Technology', 'stock_etf',
  'DRREDDY', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_drreddy.svg',
  ARRAY['drreddy', 'dr', 'health technology', 'stock', 'equity', 'nse']::text[], true, 1110,
  'nse', 'NSE:DRREDDY', '{"country":"IN","exchange":"NSE","sector":"Health Technology","industry":"Pharmaceuticals: Major","logoid":"dr-reddys"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'GVT&D', 'GE Vernova T&D India Limited', 'GVT&D', 'GE Vernova T&D India Limited - Producer Manufacturing / Electrical Products',
  'stock', 'stock', 'Producer Manufacturing', 'stock_etf',
  'GVT&D', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_gvt_d.svg',
  ARRAY['gvtd', 'ge', 'producer manufacturing', 'stock', 'equity', 'nse']::text[], true, 1111,
  'nse', 'NSE:GVT&D', '{"country":"IN","exchange":"NSE","sector":"Producer Manufacturing","industry":"Electrical Products","logoid":"ge-t-and-d-india-ltd"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'UNITDSPR', 'United Spirits Limited', 'UNITDSPR', 'United Spirits Limited - Consumer Non-Durables / Beverages: Alcoholic',
  'stock', 'stock', 'Consumer Non-Durables', 'stock_etf',
  'UNITDSPR', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_unitdspr.svg',
  ARRAY['unitdspr', 'united', 'consumer non-durables', 'stock', 'equity', 'nse']::text[], true, 1112,
  'nse', 'NSE:UNITDSPR', '{"country":"IN","exchange":"NSE","sector":"Consumer Non-Durables","industry":"Beverages: Alcoholic","logoid":"united-spirits"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'INDUSTOWER', 'Indus Towers Limited', 'INDUSTOWER', 'Indus Towers Limited - Finance / Real Estate Development',
  'stock', 'stock', 'Finance', 'stock_etf',
  'INDUSTOWER', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_industower.svg',
  ARRAY['industower', 'indus', 'finance', 'stock', 'equity', 'nse']::text[], true, 1113,
  'nse', 'NSE:INDUSTOWER', '{"country":"IN","exchange":"NSE","sector":"Finance","industry":"Real Estate Development","logoid":"bharti-infratel"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'TATACONSUM', 'Tata Consumer Products Limited', 'TATACONSUM', 'Tata Consumer Products Limited - Consumer Non-Durables / Food: Specialty/Candy',
  'stock', 'stock', 'Consumer Non-Durables', 'stock_etf',
  'TATACONSUM', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_tataconsum.svg',
  ARRAY['tataconsum', 'tata', 'consumer non-durables', 'stock', 'equity', 'nse']::text[], true, 1114,
  'nse', 'NSE:TATACONSUM', '{"country":"IN","exchange":"NSE","sector":"Consumer Non-Durables","industry":"Food: Specialty/Candy","logoid":"tata"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'MANKIND', 'Mankind Pharma Ltd.', 'MANKIND', 'Mankind Pharma Ltd. - Health Technology / Pharmaceuticals: Major',
  'stock', 'stock', 'Health Technology', 'stock_etf',
  'MANKIND', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_mankind.svg',
  ARRAY['mankind', 'mankind', 'health technology', 'stock', 'equity', 'nse']::text[], true, 1115,
  'nse', 'NSE:MANKIND', '{"country":"IN","exchange":"NSE","sector":"Health Technology","industry":"Pharmaceuticals: Major","logoid":"mankind-pharma-limited"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'NYKAA', 'FSN E-Commerce Ventures Ltd.', 'NYKAA', 'FSN E-Commerce Ventures Ltd. - Retail Trade / Internet Retail',
  'stock', 'stock', 'Retail Trade', 'stock_etf',
  'NYKAA', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_nykaa.svg',
  ARRAY['nykaa', 'fsn', 'retail trade', 'stock', 'equity', 'nse']::text[], true, 1116,
  'nse', 'NSE:NYKAA', '{"country":"IN","exchange":"NSE","sector":"Retail Trade","industry":"Internet Retail","logoid":"fsn-e-commerce-ventures"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'GMRAIRPORT', 'GMR Airports Ltd', 'GMRAIRPORT', 'GMR Airports Ltd - Transportation / Other Transportation',
  'stock', 'stock', 'Transportation', 'stock_etf',
  'GMRAIRPORT', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_gmrairport.svg',
  ARRAY['gmrairport', 'gmr', 'transportation', 'stock', 'equity', 'nse']::text[], true, 1117,
  'nse', 'NSE:GMRAIRPORT', '{"country":"IN","exchange":"NSE","sector":"Transportation","industry":"Other Transportation","logoid":"gmr"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'AUROPHARMA', 'Aurobindo Pharma Ltd', 'AUROPHARMA', 'Aurobindo Pharma Ltd - Health Technology / Pharmaceuticals: Other',
  'stock', 'stock', 'Health Technology', 'stock_etf',
  'AUROPHARMA', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_auropharma.svg',
  ARRAY['auropharma', 'aurobindo', 'health technology', 'stock', 'equity', 'nse']::text[], true, 1118,
  'nse', 'NSE:AUROPHARMA', '{"country":"IN","exchange":"NSE","sector":"Health Technology","industry":"Pharmaceuticals: Other","logoid":"aurobindo"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'VEDL', 'Vedanta Limited', 'VEDL', 'Vedanta Limited - Non-Energy Minerals / Aluminum',
  'stock', 'stock', 'Non-Energy Minerals', 'stock_etf',
  'VEDL', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_vedl.svg',
  ARRAY['vedl', 'vedanta', 'non-energy minerals', 'stock', 'equity', 'nse']::text[], true, 1119,
  'nse', 'NSE:VEDL', '{"country":"IN","exchange":"NSE","sector":"Non-Energy Minerals","industry":"Aluminum","logoid":"vedanta"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'PERSISTENT', 'Persistent Systems Limited', 'PERSISTENT', 'Persistent Systems Limited - Technology Services / Information Technology Services',
  'stock', 'stock', 'Technology Services', 'stock_etf',
  'PERSISTENT', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_persistent.svg',
  ARRAY['persistent', 'persistent', 'technology services', 'stock', 'equity', 'nse']::text[], true, 1120,
  'nse', 'NSE:PERSISTENT', '{"country":"IN","exchange":"NSE","sector":"Technology Services","industry":"Information Technology Services","logoid":"persistent-systems-ltd"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'BHARATFORG', 'Bharat Forge Ltd', 'BHARATFORG', 'Bharat Forge Ltd - Producer Manufacturing / Metal Fabrication',
  'stock', 'stock', 'Producer Manufacturing', 'stock_etf',
  'BHARATFORG', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_bharatforg.svg',
  ARRAY['bharatforg', 'bharat', 'producer manufacturing', 'stock', 'equity', 'nse']::text[], true, 1121,
  'nse', 'NSE:BHARATFORG', '{"country":"IN","exchange":"NSE","sector":"Producer Manufacturing","industry":"Metal Fabrication","logoid":"bharat-forge"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'IDBI', 'IDBI Bank Limited', 'IDBI', 'IDBI Bank Limited - Finance / Major Banks',
  'stock', 'stock', 'Finance', 'stock_etf',
  'IDBI', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_idbi.svg',
  ARRAY['idbi', 'idbi', 'finance', 'stock', 'equity', 'nse']::text[], true, 1122,
  'nse', 'NSE:IDBI', '{"country":"IN","exchange":"NSE","sector":"Finance","industry":"Major Banks","logoid":"idbi-bank"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'LUPIN', 'Lupin Limited', 'LUPIN', 'Lupin Limited - Health Technology / Pharmaceuticals: Other',
  'stock', 'stock', 'Health Technology', 'stock_etf',
  'LUPIN', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_lupin.svg',
  ARRAY['lupin', 'lupin', 'health technology', 'stock', 'equity', 'nse']::text[], true, 1123,
  'nse', 'NSE:LUPIN', '{"country":"IN","exchange":"NSE","sector":"Health Technology","industry":"Pharmaceuticals: Other","logoid":"lupin"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'OFSS', 'Oracle Financial Services Software Limited', 'OFSS', 'Oracle Financial Services Software Limited - Technology Services / Packaged Software',
  'stock', 'stock', 'Technology Services', 'stock_etf',
  'OFSS', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_ofss.svg',
  ARRAY['ofss', 'oracle', 'technology services', 'stock', 'equity', 'nse']::text[], true, 1124,
  'nse', 'NSE:OFSS', '{"country":"IN","exchange":"NSE","sector":"Technology Services","industry":"Packaged Software","logoid":"oracle"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'GODREJCP', 'Godrej Consumer Products Limited', 'GODREJCP', 'Godrej Consumer Products Limited - Consumer Non-Durables / Household/Personal Care',
  'stock', 'stock', 'Consumer Non-Durables', 'stock_etf',
  'GODREJCP', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_godrejcp.svg',
  ARRAY['godrejcp', 'godrej', 'consumer non-durables', 'stock', 'equity', 'nse']::text[], true, 1125,
  'nse', 'NSE:GODREJCP', '{"country":"IN","exchange":"NSE","sector":"Consumer Non-Durables","industry":"Household/Personal Care","logoid":"godrej"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'JSWENERGY', 'JSW Energy Limited', 'JSWENERGY', 'JSW Energy Limited - Utilities / Electric Utilities',
  'stock', 'stock', 'Utilities', 'stock_etf',
  'JSWENERGY', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_jswenergy.svg',
  ARRAY['jswenergy', 'jsw', 'utilities', 'stock', 'equity', 'nse']::text[], true, 1126,
  'nse', 'NSE:JSWENERGY', '{"country":"IN","exchange":"NSE","sector":"Utilities","industry":"Electric Utilities","logoid":"jsw-energy"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'ASHOKLEY', 'Ashok Leyland Limited', 'ASHOKLEY', 'Ashok Leyland Limited - Producer Manufacturing / Trucks/Construction/Farm Machinery',
  'stock', 'stock', 'Producer Manufacturing', 'stock_etf',
  'ASHOKLEY', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_ashokley.svg',
  ARRAY['ashokley', 'ashok', 'producer manufacturing', 'stock', 'equity', 'nse']::text[], true, 1127,
  'nse', 'NSE:ASHOKLEY', '{"country":"IN","exchange":"NSE","sector":"Producer Manufacturing","industry":"Trucks/Construction/Farm Machinery","logoid":"ashok-leyland"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'AMBUJACEM', 'Ambuja Cements Limited', 'AMBUJACEM', 'Ambuja Cements Limited - Non-Energy Minerals / Construction Materials',
  'stock', 'stock', 'Non-Energy Minerals', 'stock_etf',
  'AMBUJACEM', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_ambujacem.svg',
  ARRAY['ambujacem', 'ambuja', 'non-energy minerals', 'stock', 'equity', 'nse']::text[], true, 1128,
  'nse', 'NSE:AMBUJACEM', '{"country":"IN","exchange":"NSE","sector":"Non-Energy Minerals","industry":"Construction Materials","logoid":"ambuja-cements"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'COFORGE', 'Coforge Limited', 'COFORGE', 'Coforge Limited - Technology Services / Information Technology Services',
  'stock', 'stock', 'Technology Services', 'stock_etf',
  'COFORGE', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_coforge.svg',
  ARRAY['coforge', 'coforge', 'technology services', 'stock', 'equity', 'nse']::text[], true, 1129,
  'nse', 'NSE:COFORGE', '{"country":"IN","exchange":"NSE","sector":"Technology Services","industry":"Information Technology Services","logoid":"coforge-limited"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'MAZDOCK', 'Mazagon Dock Shipbuilders Ltd.', 'MAZDOCK', 'Mazagon Dock Shipbuilders Ltd. - Producer Manufacturing / Trucks/Construction/Farm Machinery',
  'stock', 'stock', 'Producer Manufacturing', 'stock_etf',
  'MAZDOCK', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_mazdock.svg',
  ARRAY['mazdock', 'mazagon', 'producer manufacturing', 'stock', 'equity', 'nse']::text[], true, 1130,
  'nse', 'NSE:MAZDOCK', '{"country":"IN","exchange":"NSE","sector":"Producer Manufacturing","industry":"Trucks/Construction/Farm Machinery","logoid":"mazagon-dock-shipbuilders-limi"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'ICICIGI', 'ICICI Lombard General Insurance Co. Ltd.', 'ICICIGI', 'ICICI Lombard General Insurance Co. Ltd. - Finance / Specialty Insurance',
  'stock', 'stock', 'Finance', 'stock_etf',
  'ICICIGI', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_icicigi.svg',
  ARRAY['icicigi', 'icici', 'finance', 'stock', 'equity', 'nse']::text[], true, 1131,
  'nse', 'NSE:ICICIGI', '{"country":"IN","exchange":"NSE","sector":"Finance","industry":"Specialty Insurance","logoid":"icici-lombard-gen"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'MANIPALHOS', 'Manipal Health Enterprises Limited', 'MANIPALHOS', 'Manipal Health Enterprises Limited - Health Services / Hospital/Nursing Management',
  'stock', 'stock', 'Health Services', 'stock_etf',
  'MANIPALHOS', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_manipalhos.svg',
  ARRAY['manipalhos', 'manipal', 'health services', 'stock', 'equity', 'nse']::text[], true, 1132,
  'nse', 'NSE:MANIPALHOS', '{"country":"IN","exchange":"NSE","sector":"Health Services","industry":"Hospital/Nursing Management","logoid":""}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'MAXHEALTH', 'Max Healthcare Institute Ltd', 'MAXHEALTH', 'Max Healthcare Institute Ltd - Health Services / Hospital/Nursing Management',
  'stock', 'stock', 'Health Services', 'stock_etf',
  'MAXHEALTH', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_maxhealth.svg',
  ARRAY['maxhealth', 'max', 'health services', 'stock', 'equity', 'nse']::text[], true, 1133,
  'nse', 'NSE:MAXHEALTH', '{"country":"IN","exchange":"NSE","sector":"Health Services","industry":"Hospital/Nursing Management","logoid":"max-healthcare"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'BHARTIHEXA', 'Bharti Hexacom Limited', 'BHARTIHEXA', 'Bharti Hexacom Limited - Communications / Wireless Telecommunications',
  'stock', 'stock', 'Communications', 'stock_etf',
  'BHARTIHEXA', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_bhartihexa.svg',
  ARRAY['bhartihexa', 'bharti', 'communications', 'stock', 'equity', 'nse']::text[], true, 1134,
  'nse', 'NSE:BHARTIHEXA', '{"country":"IN","exchange":"NSE","sector":"Communications","industry":"Wireless Telecommunications","logoid":"bharti-hexacom-limited"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'FEDERALBNK', 'Federal Bank Ltd. (India)', 'FEDERALBNK', 'Federal Bank Ltd. (India) - Finance / Major Banks',
  'stock', 'stock', 'Finance', 'stock_etf',
  'FEDERALBNK', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_federalbnk.svg',
  ARRAY['federalbnk', 'federal', 'finance', 'stock', 'equity', 'nse']::text[], true, 1135,
  'nse', 'NSE:FEDERALBNK', '{"country":"IN","exchange":"NSE","sector":"Finance","industry":"Major Banks","logoid":"fed-bank"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'MCX', 'Multi Commodity Exchange of India Limited', 'MCX', 'Multi Commodity Exchange of India Limited - Finance / Investment Banks/Brokers',
  'stock', 'stock', 'Finance', 'stock_etf',
  'MCX', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_mcx.svg',
  ARRAY['mcx', 'multi', 'finance', 'stock', 'equity', 'nse']::text[], true, 1136,
  'nse', 'NSE:MCX', '{"country":"IN","exchange":"NSE","sector":"Finance","industry":"Investment Banks/Brokers","logoid":"multi-commodity-exchange-of-india-limited"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'RECLTD', 'REC Limited', 'RECLTD', 'REC Limited - Finance / Finance/Rental/Leasing',
  'stock', 'stock', 'Finance', 'stock_etf',
  'RECLTD', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_recltd.svg',
  ARRAY['recltd', 'rec', 'finance', 'stock', 'equity', 'nse']::text[], true, 1137,
  'nse', 'NSE:RECLTD', '{"country":"IN","exchange":"NSE","sector":"Finance","industry":"Finance/Rental/Leasing","logoid":"rec"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'SHREECEM', 'Shree Cement Limited', 'SHREECEM', 'Shree Cement Limited - Non-Energy Minerals / Construction Materials',
  'stock', 'stock', 'Non-Energy Minerals', 'stock_etf',
  'SHREECEM', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_shreecem.svg',
  ARRAY['shreecem', 'shree', 'non-energy minerals', 'stock', 'equity', 'nse']::text[], true, 1138,
  'nse', 'NSE:SHREECEM', '{"country":"IN","exchange":"NSE","sector":"Non-Energy Minerals","industry":"Construction Materials","logoid":"shree-cement"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'NAUKRI', 'Info Edge India Ltd.', 'NAUKRI', 'Info Edge India Ltd. - Technology Services / Internet Software/Services',
  'stock', 'stock', 'Technology Services', 'stock_etf',
  'NAUKRI', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_naukri.svg',
  ARRAY['naukri', 'info', 'technology services', 'stock', 'equity', 'nse']::text[], true, 1139,
  'nse', 'NSE:NAUKRI', '{"country":"IN","exchange":"NSE","sector":"Technology Services","industry":"Internet Software/Services","logoid":"info-edge"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'JSWINFRA', 'JSW Infrastructure Limited', 'JSWINFRA', 'JSW Infrastructure Limited - Industrial Services / Engineering & Construction',
  'stock', 'stock', 'Industrial Services', 'stock_etf',
  'JSWINFRA', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_jswinfra.svg',
  ARRAY['jswinfra', 'jsw', 'industrial services', 'stock', 'equity', 'nse']::text[], true, 1140,
  'nse', 'NSE:JSWINFRA', '{"country":"IN","exchange":"NSE","sector":"Industrial Services","industry":"Engineering & Construction","logoid":"jsw"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'DIXON', 'Dixon Technologies (India) Ltd.', 'DIXON', 'Dixon Technologies (India) Ltd. - Electronic Technology / Electronic Production Equipment',
  'stock', 'stock', 'Electronic Technology', 'stock_etf',
  'DIXON', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_dixon.svg',
  ARRAY['dixon', 'dixon', 'electronic technology', 'stock', 'equity', 'nse']::text[], true, 1141,
  'nse', 'NSE:DIXON', '{"country":"IN","exchange":"NSE","sector":"Electronic Technology","industry":"Electronic Production Equipment","logoid":"dixon-technologie"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'NTPCGREEN', 'NTPC Green Energy Limited', 'NTPCGREEN', 'NTPC Green Energy Limited - Utilities / Alternative Power Generation',
  'stock', 'stock', 'Utilities', 'stock_etf',
  'NTPCGREEN', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_ntpcgreen.svg',
  ARRAY['ntpcgreen', 'ntpc', 'utilities', 'stock', 'equity', 'nse']::text[], true, 1142,
  'nse', 'NSE:NTPCGREEN', '{"country":"IN","exchange":"NSE","sector":"Utilities","industry":"Alternative Power Generation","logoid":"ntpc-green-energy-limited"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'AUBANK', 'AU Small Finance Bank Limited', 'AUBANK', 'AU Small Finance Bank Limited - Finance / Regional Banks',
  'stock', 'stock', 'Finance', 'stock_etf',
  'AUBANK', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_aubank.svg',
  ARRAY['aubank', 'au', 'finance', 'stock', 'equity', 'nse']::text[], true, 1143,
  'nse', 'NSE:AUBANK', '{"country":"IN","exchange":"NSE","sector":"Finance","industry":"Regional Banks","logoid":"au-small-finance-b"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'HINDPETRO', 'Hindustan Petroleum Corporation Limited', 'HINDPETRO', 'Hindustan Petroleum Corporation Limited - Energy Minerals / Oil Refining/Marketing',
  'stock', 'stock', 'Energy Minerals', 'stock_etf',
  'HINDPETRO', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_hindpetro.svg',
  ARRAY['hindpetro', 'hindustan', 'energy minerals', 'stock', 'equity', 'nse']::text[], true, 1144,
  'nse', 'NSE:HINDPETRO', '{"country":"IN","exchange":"NSE","sector":"Energy Minerals","industry":"Oil Refining/Marketing","logoid":"hindustan-petroleum"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'SRF', 'Srf Limited', 'SRF', 'Srf Limited - Process Industries / Industrial Specialties',
  'stock', 'stock', 'Process Industries', 'stock_etf',
  'SRF', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_srf.svg',
  ARRAY['srf', 'srf', 'process industries', 'stock', 'equity', 'nse']::text[], true, 1145,
  'nse', 'NSE:SRF', '{"country":"IN","exchange":"NSE","sector":"Process Industries","industry":"Industrial Specialties","logoid":"srf"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'NHPC', 'NHPC Limited', 'NHPC', 'NHPC Limited - Utilities / Electric Utilities',
  'stock', 'stock', 'Utilities', 'stock_etf',
  'NHPC', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_nhpc.svg',
  ARRAY['nhpc', 'nhpc', 'utilities', 'stock', 'equity', 'nse']::text[], true, 1146,
  'nse', 'NSE:NHPC', '{"country":"IN","exchange":"NSE","sector":"Utilities","industry":"Electric Utilities","logoid":"nhpc"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'OIL', 'Oil India Limited', 'OIL', 'Oil India Limited - Energy Minerals / Integrated Oil',
  'stock', 'stock', 'Energy Minerals', 'stock_etf',
  'OIL', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_oil.svg',
  ARRAY['oil', 'oil', 'energy minerals', 'stock', 'equity', 'nse']::text[], true, 1147,
  'nse', 'NSE:OIL', '{"country":"IN","exchange":"NSE","sector":"Energy Minerals","industry":"Integrated Oil","logoid":"oil-india"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'WAAREEENER', 'WAAREE Energies Limited', 'WAAREEENER', 'WAAREE Energies Limited - Electronic Technology / Semiconductors',
  'stock', 'stock', 'Electronic Technology', 'stock_etf',
  'WAAREEENER', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_waareeener.svg',
  ARRAY['waareeener', 'waaree', 'electronic technology', 'stock', 'equity', 'nse']::text[], true, 1148,
  'nse', 'NSE:WAAREEENER', '{"country":"IN","exchange":"NSE","sector":"Electronic Technology","industry":"Semiconductors","logoid":"waaree-energies-limited"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'APARINDS', 'APAR Industries Limited', 'APARINDS', 'APAR Industries Limited - Electronic Technology / Electronic Equipment/Instruments',
  'stock', 'stock', 'Electronic Technology', 'stock_etf',
  'APARINDS', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_aparinds.svg',
  ARRAY['aparinds', 'apar', 'electronic technology', 'stock', 'equity', 'nse']::text[], true, 1149,
  'nse', 'NSE:APARINDS', '{"country":"IN","exchange":"NSE","sector":"Electronic Technology","industry":"Electronic Equipment/Instruments","logoid":"apar-industries"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'HAVELLS', 'Havells India Limited', 'HAVELLS', 'Havells India Limited - Producer Manufacturing / Electrical Products',
  'stock', 'stock', 'Producer Manufacturing', 'stock_etf',
  'HAVELLS', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_havells.svg',
  ARRAY['havells', 'havells', 'producer manufacturing', 'stock', 'equity', 'nse']::text[], true, 1150,
  'nse', 'NSE:HAVELLS', '{"country":"IN","exchange":"NSE","sector":"Producer Manufacturing","industry":"Electrical Products","logoid":"havells"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'SAIL', 'Steel Authority of India Limited', 'SAIL', 'Steel Authority of India Limited - Non-Energy Minerals / Steel',
  'stock', 'stock', 'Non-Energy Minerals', 'stock_etf',
  'SAIL', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_sail.svg',
  ARRAY['sail', 'steel', 'non-energy minerals', 'stock', 'equity', 'nse']::text[], true, 1151,
  'nse', 'NSE:SAIL', '{"country":"IN","exchange":"NSE","sector":"Non-Energy Minerals","industry":"Steel","logoid":"steel-authority-of-india"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'BAJAJHFL', 'Bajaj Housing Finance Ltd.', 'BAJAJHFL', 'Bajaj Housing Finance Ltd. - Finance / Finance/Rental/Leasing',
  'stock', 'stock', 'Finance', 'stock_etf',
  'BAJAJHFL', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_bajajhfl.svg',
  ARRAY['bajajhfl', 'bajaj', 'finance', 'stock', 'equity', 'nse']::text[], true, 1152,
  'nse', 'NSE:BAJAJHFL', '{"country":"IN","exchange":"NSE","sector":"Finance","industry":"Finance/Rental/Leasing","logoid":"bajaj-finance"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'NAM_INDIA', 'Nippon Life India Asset Management Ltd.', 'NAM_INDIA', 'Nippon Life India Asset Management Ltd. - Finance / Investment Managers',
  'stock', 'stock', 'Finance', 'stock_etf',
  'NAM_INDIA', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_nam_india.svg',
  ARRAY['nam_india', 'nippon', 'finance', 'stock', 'equity', 'nse']::text[], true, 1153,
  'nse', 'NSE:NAM_INDIA', '{"country":"IN","exchange":"NSE","sector":"Finance","industry":"Investment Managers","logoid":"nippon-life-india-asset"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'INDUSINDBK', 'IndusInd Bank Ltd.', 'INDUSINDBK', 'IndusInd Bank Ltd. - Finance / Major Banks',
  'stock', 'stock', 'Finance', 'stock_etf',
  'INDUSINDBK', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_indusindbk.svg',
  ARRAY['indusindbk', 'indusind', 'finance', 'stock', 'equity', 'nse']::text[], true, 1154,
  'nse', 'NSE:INDUSINDBK', '{"country":"IN","exchange":"NSE","sector":"Finance","industry":"Major Banks","logoid":"indusind-bank"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'PHOENIXLTD', 'Phoenix Mills Ltd.', 'PHOENIXLTD', 'Phoenix Mills Ltd. - Finance / Real Estate Development',
  'stock', 'stock', 'Finance', 'stock_etf',
  'PHOENIXLTD', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_phoenixltd.svg',
  ARRAY['phoenixltd', 'phoenix', 'finance', 'stock', 'equity', 'nse']::text[], true, 1155,
  'nse', 'NSE:PHOENIXLTD', '{"country":"IN","exchange":"NSE","sector":"Finance","industry":"Real Estate Development","logoid":"phoenix-mills"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'DABUR', 'Dabur India Limited', 'DABUR', 'Dabur India Limited - Consumer Non-Durables / Household/Personal Care',
  'stock', 'stock', 'Consumer Non-Durables', 'stock_etf',
  'DABUR', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_dabur.svg',
  ARRAY['dabur', 'dabur', 'consumer non-durables', 'stock', 'equity', 'nse']::text[], true, 1156,
  'nse', 'NSE:DABUR', '{"country":"IN","exchange":"NSE","sector":"Consumer Non-Durables","industry":"Household/Personal Care","logoid":"dabur"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'IDFCFIRSTB', 'IDFC First Bank Ltd.', 'IDFCFIRSTB', 'IDFC First Bank Ltd. - Finance / Regional Banks',
  'stock', 'stock', 'Finance', 'stock_etf',
  'IDFCFIRSTB', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_idfcfirstb.svg',
  ARRAY['idfcfirstb', 'idfc', 'finance', 'stock', 'equity', 'nse']::text[], true, 1157,
  'nse', 'NSE:IDFCFIRSTB', '{"country":"IN","exchange":"NSE","sector":"Finance","industry":"Regional Banks","logoid":"idfc-first-bank"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'LTF', 'L&T Finance Ltd', 'LTF', 'L&T Finance Ltd - Finance / Finance/Rental/Leasing',
  'stock', 'stock', 'Finance', 'stock_etf',
  'LTF', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_ltf.svg',
  ARRAY['ltf', 'lt', 'finance', 'stock', 'equity', 'nse']::text[], true, 1158,
  'nse', 'NSE:LTF', '{"country":"IN","exchange":"NSE","sector":"Finance","industry":"Finance/Rental/Leasing","logoid":"l-and-t-finance"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'WELCORP', 'Welspun Corp Limited', 'WELCORP', 'Welspun Corp Limited - Producer Manufacturing / Industrial Machinery',
  'stock', 'stock', 'Producer Manufacturing', 'stock_etf',
  'WELCORP', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_welcorp.svg',
  ARRAY['welcorp', 'welspun', 'producer manufacturing', 'stock', 'equity', 'nse']::text[], true, 1159,
  'nse', 'NSE:WELCORP', '{"country":"IN","exchange":"NSE","sector":"Producer Manufacturing","industry":"Industrial Machinery","logoid":"welspun"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'ICICIPRULI', 'ICICI Prudential Life Insurance Co. Ltd.', 'ICICIPRULI', 'ICICI Prudential Life Insurance Co. Ltd. - Finance / Life/Health Insurance',
  'stock', 'stock', 'Finance', 'stock_etf',
  'ICICIPRULI', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_icicipruli.svg',
  ARRAY['icicipruli', 'icici', 'finance', 'stock', 'equity', 'nse']::text[], true, 1160,
  'nse', 'NSE:ICICIPRULI', '{"country":"IN","exchange":"NSE","sector":"Finance","industry":"Life/Health Insurance","logoid":"icici-prudential-life-insurance"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'UNOMINDA', 'UNO Minda Limited', 'UNOMINDA', 'UNO Minda Limited - Producer Manufacturing / Auto Parts: OEM',
  'stock', 'stock', 'Producer Manufacturing', 'stock_etf',
  'UNOMINDA', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_unominda.svg',
  ARRAY['unominda', 'uno', 'producer manufacturing', 'stock', 'equity', 'nse']::text[], true, 1161,
  'nse', 'NSE:UNOMINDA', '{"country":"IN","exchange":"NSE","sector":"Producer Manufacturing","industry":"Auto Parts: OEM","logoid":"minda-industries"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'PRESTIGE', 'Prestige Estates Projects Limited', 'PRESTIGE', 'Prestige Estates Projects Limited - Finance / Real Estate Development',
  'stock', 'stock', 'Finance', 'stock_etf',
  'PRESTIGE', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_prestige.svg',
  ARRAY['prestige', 'prestige', 'finance', 'stock', 'equity', 'nse']::text[], true, 1162,
  'nse', 'NSE:PRESTIGE', '{"country":"IN","exchange":"NSE","sector":"Finance","industry":"Real Estate Development","logoid":"prestige-estates-projects"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'MOTILALOFS', 'Motilal Oswal Financial Services Limited', 'MOTILALOFS', 'Motilal Oswal Financial Services Limited - Finance / Investment Managers',
  'stock', 'stock', 'Finance', 'stock_etf',
  'MOTILALOFS', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_motilalofs.svg',
  ARRAY['motilalofs', 'motilal', 'finance', 'stock', 'equity', 'nse']::text[], true, 1163,
  'nse', 'NSE:MOTILALOFS', '{"country":"IN","exchange":"NSE","sector":"Finance","industry":"Investment Managers","logoid":"motilal"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'GLENMARK', 'Glenmark Pharmaceuticals Limited', 'GLENMARK', 'Glenmark Pharmaceuticals Limited - Health Technology / Pharmaceuticals: Major',
  'stock', 'stock', 'Health Technology', 'stock_etf',
  'GLENMARK', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_glenmark.svg',
  ARRAY['glenmark', 'glenmark', 'health technology', 'stock', 'equity', 'nse']::text[], true, 1164,
  'nse', 'NSE:GLENMARK', '{"country":"IN","exchange":"NSE","sector":"Health Technology","industry":"Pharmaceuticals: Major","logoid":"glenmark"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'ATGL', 'Adani Total Gas Ltd.', 'ATGL', 'Adani Total Gas Ltd. - Utilities / Gas Distributors',
  'stock', 'stock', 'Utilities', 'stock_etf',
  'ATGL', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_atgl.svg',
  ARRAY['atgl', 'adani', 'utilities', 'stock', 'equity', 'nse']::text[], true, 1165,
  'nse', 'NSE:ATGL', '{"country":"IN","exchange":"NSE","sector":"Utilities","industry":"Gas Distributors","logoid":"adani"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'SWIGGY', 'Swiggy Limited', 'SWIGGY', 'Swiggy Limited - Transportation / Air Freight/Couriers',
  'stock', 'stock', 'Transportation', 'stock_etf',
  'SWIGGY', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_swiggy.svg',
  ARRAY['swiggy', 'swiggy', 'transportation', 'stock', 'equity', 'nse']::text[], true, 1166,
  'nse', 'NSE:SWIGGY', '{"country":"IN","exchange":"NSE","sector":"Transportation","industry":"Air Freight/Couriers","logoid":"swiggy-ltd"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'TORNTPOWER', 'Torrent Power Limited', 'TORNTPOWER', 'Torrent Power Limited - Utilities / Electric Utilities',
  'stock', 'stock', 'Utilities', 'stock_etf',
  'TORNTPOWER', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_torntpower.svg',
  ARRAY['torntpower', 'torrent', 'utilities', 'stock', 'equity', 'nse']::text[], true, 1167,
  'nse', 'NSE:TORNTPOWER', '{"country":"IN","exchange":"NSE","sector":"Utilities","industry":"Electric Utilities","logoid":"torrent-power"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'NMDC', 'NMDC Limited', 'NMDC', 'NMDC Limited - Non-Energy Minerals / Other Metals/Minerals',
  'stock', 'stock', 'Non-Energy Minerals', 'stock_etf',
  'NMDC', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_nmdc.svg',
  ARRAY['nmdc', 'nmdc', 'non-energy minerals', 'stock', 'equity', 'nse']::text[], true, 1168,
  'nse', 'NSE:NMDC', '{"country":"IN","exchange":"NSE","sector":"Non-Energy Minerals","industry":"Other Metals/Minerals","logoid":"nmdc"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'PIRAMALFIN', 'Piramal Finance Limited', 'PIRAMALFIN', 'Piramal Finance Limited - Finance / Finance/Rental/Leasing',
  'stock', 'stock', 'Finance', 'stock_etf',
  'PIRAMALFIN', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_piramalfin.svg',
  ARRAY['piramalfin', 'piramal', 'finance', 'stock', 'equity', 'nse']::text[], true, 1169,
  'nse', 'NSE:PIRAMALFIN', '{"country":"IN","exchange":"NSE","sector":"Finance","industry":"Finance/Rental/Leasing","logoid":"piramal"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'OBEROIRLTY', 'Oberoi Realty Limited', 'OBEROIRLTY', 'Oberoi Realty Limited - Finance / Real Estate Development',
  'stock', 'stock', 'Finance', 'stock_etf',
  'OBEROIRLTY', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_oberoirlty.svg',
  ARRAY['oberoirlty', 'oberoi', 'finance', 'stock', 'equity', 'nse']::text[], true, 1170,
  'nse', 'NSE:OBEROIRLTY', '{"country":"IN","exchange":"NSE","sector":"Finance","industry":"Real Estate Development","logoid":"oberoi-realty"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'MAHABANK', 'Bank of Maharashtra', 'MAHABANK', 'Bank of Maharashtra - Finance / Major Banks',
  'stock', 'stock', 'Finance', 'stock_etf',
  'MAHABANK', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_mahabank.svg',
  ARRAY['mahabank', 'bank', 'finance', 'stock', 'equity', 'nse']::text[], true, 1171,
  'nse', 'NSE:MAHABANK', '{"country":"IN","exchange":"NSE","sector":"Finance","industry":"Major Banks","logoid":"bank-of-maharashtra"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'ALKEM', 'Alkem Laboratories Ltd.', 'ALKEM', 'Alkem Laboratories Ltd. - Health Technology / Pharmaceuticals: Major',
  'stock', 'stock', 'Health Technology', 'stock_etf',
  'ALKEM', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_alkem.svg',
  ARRAY['alkem', 'alkem', 'health technology', 'stock', 'equity', 'nse']::text[], true, 1172,
  'nse', 'NSE:ALKEM', '{"country":"IN","exchange":"NSE","sector":"Health Technology","industry":"Pharmaceuticals: Major","logoid":"alkem"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'JSL', 'Jindal Stainless Limited', 'JSL', 'Jindal Stainless Limited - Non-Energy Minerals / Steel',
  'stock', 'stock', 'Non-Energy Minerals', 'stock_etf',
  'JSL', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_jsl.svg',
  ARRAY['jsl', 'jindal', 'non-energy minerals', 'stock', 'equity', 'nse']::text[], true, 1173,
  'nse', 'NSE:JSL', '{"country":"IN","exchange":"NSE","sector":"Non-Energy Minerals","industry":"Steel","logoid":"jindal-stainless"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'BANKINDIA', 'Bank of India', 'BANKINDIA', 'Bank of India - Finance / Major Banks',
  'stock', 'stock', 'Finance', 'stock_etf',
  'BANKINDIA', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_bankindia.svg',
  ARRAY['bankindia', 'bank', 'finance', 'stock', 'equity', 'nse']::text[], true, 1174,
  'nse', 'NSE:BANKINDIA', '{"country":"IN","exchange":"NSE","sector":"Finance","industry":"Major Banks","logoid":"bank-of-india"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'ASTERDM', 'Aster DM Quality Care Limited', 'ASTERDM', 'Aster DM Quality Care Limited - Health Services / Hospital/Nursing Management',
  'stock', 'stock', 'Health Services', 'stock_etf',
  'ASTERDM', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_asterdm.svg',
  ARRAY['asterdm', 'aster', 'health services', 'stock', 'equity', 'nse']::text[], true, 1175,
  'nse', 'NSE:ASTERDM', '{"country":"IN","exchange":"NSE","sector":"Health Services","industry":"Hospital/Nursing Management","logoid":"aster-dm-healthcare"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'APLAPOLLO', 'APL Apollo Tubes Limited', 'APLAPOLLO', 'APL Apollo Tubes Limited - Non-Energy Minerals / Steel',
  'stock', 'stock', 'Non-Energy Minerals', 'stock_etf',
  'APLAPOLLO', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_aplapollo.svg',
  ARRAY['aplapollo', 'apl', 'non-energy minerals', 'stock', 'equity', 'nse']::text[], true, 1176,
  'nse', 'NSE:APLAPOLLO', '{"country":"IN","exchange":"NSE","sector":"Non-Energy Minerals","industry":"Steel","logoid":"apl-apollo-tubes"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'IOB', 'Indian Overseas Bank', 'IOB', 'Indian Overseas Bank - Finance / Major Banks',
  'stock', 'stock', 'Finance', 'stock_etf',
  'IOB', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_iob.svg',
  ARRAY['iob', 'indian', 'finance', 'stock', 'equity', 'nse']::text[], true, 1177,
  'nse', 'NSE:IOB', '{"country":"IN","exchange":"NSE","sector":"Finance","industry":"Major Banks","logoid":"indian-overseas-bank"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'RADICO', 'Radico Khaitan Limited', 'RADICO', 'Radico Khaitan Limited - Consumer Non-Durables / Beverages: Alcoholic',
  'stock', 'stock', 'Consumer Non-Durables', 'stock_etf',
  'RADICO', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_radico.svg',
  ARRAY['radico', 'radico', 'consumer non-durables', 'stock', 'equity', 'nse']::text[], true, 1178,
  'nse', 'NSE:RADICO', '{"country":"IN","exchange":"NSE","sector":"Consumer Non-Durables","industry":"Beverages: Alcoholic","logoid":"radico-khaitan"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'NATIONALUM', 'National Aluminium Co. Ltd.', 'NATIONALUM', 'National Aluminium Co. Ltd. - Non-Energy Minerals / Aluminum',
  'stock', 'stock', 'Non-Energy Minerals', 'stock_etf',
  'NATIONALUM', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_nationalum.svg',
  ARRAY['nationalum', 'national', 'non-energy minerals', 'stock', 'equity', 'nse']::text[], true, 1179,
  'nse', 'NSE:NATIONALUM', '{"country":"IN","exchange":"NSE","sector":"Non-Energy Minerals","industry":"Aluminum","logoid":"national-aluminum"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'ATHERENERG', 'Ather Energy Limited', 'ATHERENERG', 'Ather Energy Limited - Consumer Durables / Motor Vehicles',
  'stock', 'stock', 'Consumer Durables', 'stock_etf',
  'ATHERENERG', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_atherenerg.svg',
  ARRAY['atherenerg', 'ather', 'consumer durables', 'stock', 'equity', 'nse']::text[], true, 1180,
  'nse', 'NSE:ATHERENERG', '{"country":"IN","exchange":"NSE","sector":"Consumer Durables","industry":"Motor Vehicles","logoid":"ather-energy-limited"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'RBLBANK', 'RBL Bank Ltd.', 'RBLBANK', 'RBL Bank Ltd. - Finance / Major Banks',
  'stock', 'stock', 'Finance', 'stock_etf',
  'RBLBANK', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_rblbank.svg',
  ARRAY['rblbank', 'rbl', 'finance', 'stock', 'equity', 'nse']::text[], true, 1181,
  'nse', 'NSE:RBLBANK', '{"country":"IN","exchange":"NSE","sector":"Finance","industry":"Major Banks","logoid":"rbl-bank"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'INDOMIM', 'INDO-MIM Limited', 'INDOMIM', 'INDO-MIM Limited - Producer Manufacturing / Industrial Machinery',
  'stock', 'stock', 'Producer Manufacturing', 'stock_etf',
  'INDOMIM', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_indomim.svg',
  ARRAY['indomim', 'indo-mim', 'producer manufacturing', 'stock', 'equity', 'nse']::text[], true, 1182,
  'nse', 'NSE:INDOMIM', '{"country":"IN","exchange":"NSE","sector":"Producer Manufacturing","industry":"Industrial Machinery","logoid":""}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'KALYANKJIL', 'Kalyan Jewellers India Ltd.', 'KALYANKJIL', 'Kalyan Jewellers India Ltd. - Retail Trade / Specialty Stores',
  'stock', 'stock', 'Retail Trade', 'stock_etf',
  'KALYANKJIL', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_kalyankjil.svg',
  ARRAY['kalyankjil', 'kalyan', 'retail trade', 'stock', 'equity', 'nse']::text[], true, 1183,
  'nse', 'NSE:KALYANKJIL', '{"country":"IN","exchange":"NSE","sector":"Retail Trade","industry":"Specialty Stores","logoid":"kalyan-jewellers-ind-ltd"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'BIOCON', 'Biocon Limited', 'BIOCON', 'Biocon Limited - Health Technology / Pharmaceuticals: Major',
  'stock', 'stock', 'Health Technology', 'stock_etf',
  'BIOCON', 'INR', 'INR', 'unit',
  1, 'share', 2, 0.05,
  'price_difference_contract', false, '/assets/stocks/stk_in_biocon.svg',
  ARRAY['biocon', 'biocon', 'health technology', 'stock', 'equity', 'nse']::text[], true, 1184,
  'nse', 'NSE:BIOCON', '{"country":"IN","exchange":"NSE","sector":"Health Technology","industry":"Pharmaceuticals: Major","logoid":"biocon"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'NVDA', 'NVIDIA Corporation', 'NVDA', 'NVIDIA Corporation - Electronic Technology / Semiconductors',
  'stock', 'stock', 'Electronic Technology', 'stock_etf',
  'NVDA', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_nvda.svg',
  ARRAY['nvda', 'nvidia', 'electronic technology', 'stock', 'equity', 'nasdaq']::text[], true, 1185,
  'nasdaq', 'NASDAQ:NVDA', '{"country":"US","exchange":"NASDAQ","sector":"Electronic Technology","industry":"Semiconductors","logoid":"nvidia"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'AAPL', 'Apple Inc.', 'AAPL', 'Apple Inc. - Electronic Technology / Telecommunications Equipment',
  'stock', 'stock', 'Electronic Technology', 'stock_etf',
  'AAPL', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_aapl.svg',
  ARRAY['aapl', 'apple', 'electronic technology', 'stock', 'equity', 'nasdaq']::text[], true, 1186,
  'nasdaq', 'NASDAQ:AAPL', '{"country":"US","exchange":"NASDAQ","sector":"Electronic Technology","industry":"Telecommunications Equipment","logoid":"apple"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'GOOG', 'Alphabet Inc.', 'GOOG', 'Alphabet Inc. - Technology Services / Internet Software/Services',
  'stock', 'stock', 'Technology Services', 'stock_etf',
  'GOOG', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_goog.svg',
  ARRAY['goog', 'alphabet', 'technology services', 'stock', 'equity', 'nasdaq']::text[], true, 1187,
  'nasdaq', 'NASDAQ:GOOG', '{"country":"US","exchange":"NASDAQ","sector":"Technology Services","industry":"Internet Software/Services","logoid":"alphabet"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'GOOGL', 'Alphabet Inc.', 'GOOGL', 'Alphabet Inc. - Technology Services / Internet Software/Services',
  'stock', 'stock', 'Technology Services', 'stock_etf',
  'GOOGL', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_googl.svg',
  ARRAY['googl', 'alphabet', 'technology services', 'stock', 'equity', 'nasdaq']::text[], true, 1188,
  'nasdaq', 'NASDAQ:GOOGL', '{"country":"US","exchange":"NASDAQ","sector":"Technology Services","industry":"Internet Software/Services","logoid":"alphabet"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'MSFT', 'Microsoft Corporation', 'MSFT', 'Microsoft Corporation - Technology Services / Packaged Software',
  'stock', 'stock', 'Technology Services', 'stock_etf',
  'MSFT', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_msft.svg',
  ARRAY['msft', 'microsoft', 'technology services', 'stock', 'equity', 'nasdaq']::text[], true, 1189,
  'nasdaq', 'NASDAQ:MSFT', '{"country":"US","exchange":"NASDAQ","sector":"Technology Services","industry":"Packaged Software","logoid":"microsoft"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'AMZN', 'Amazon.com, Inc.', 'AMZN', 'Amazon.com, Inc. - Retail Trade / Internet Retail',
  'stock', 'stock', 'Retail Trade', 'stock_etf',
  'AMZN', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_amzn.svg',
  ARRAY['amzn', 'amazoncom', 'retail trade', 'stock', 'equity', 'nasdaq']::text[], true, 1190,
  'nasdaq', 'NASDAQ:AMZN', '{"country":"US","exchange":"NASDAQ","sector":"Retail Trade","industry":"Internet Retail","logoid":"amazon"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'SPCX', 'Space Exploration Technologies Corp', 'SPCX', 'Space Exploration Technologies Corp - Communications / Specialty Telecommunications',
  'stock', 'stock', 'Communications', 'stock_etf',
  'SPCX', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_spcx.svg',
  ARRAY['spcx', 'space', 'communications', 'stock', 'equity', 'nasdaq']::text[], true, 1191,
  'nasdaq', 'NASDAQ:SPCX', '{"country":"US","exchange":"NASDAQ","sector":"Communications","industry":"Specialty Telecommunications","logoid":"spacex"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'META', 'Meta Platforms, Inc.', 'META', 'Meta Platforms, Inc. - Technology Services / Internet Software/Services',
  'stock', 'stock', 'Technology Services', 'stock_etf',
  'META', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_meta.svg',
  ARRAY['meta', 'meta', 'technology services', 'stock', 'equity', 'nasdaq']::text[], true, 1192,
  'nasdaq', 'NASDAQ:META', '{"country":"US","exchange":"NASDAQ","sector":"Technology Services","industry":"Internet Software/Services","logoid":"meta-platforms"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'AVGO', 'Broadcom Inc.', 'AVGO', 'Broadcom Inc. - Electronic Technology / Semiconductors',
  'stock', 'stock', 'Electronic Technology', 'stock_etf',
  'AVGO', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_avgo.svg',
  ARRAY['avgo', 'broadcom', 'electronic technology', 'stock', 'equity', 'nasdaq']::text[], true, 1193,
  'nasdaq', 'NASDAQ:AVGO', '{"country":"US","exchange":"NASDAQ","sector":"Electronic Technology","industry":"Semiconductors","logoid":"broadcom"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'TSLA', 'Tesla, Inc.', 'TSLA', 'Tesla, Inc. - Consumer Durables / Motor Vehicles',
  'stock', 'stock', 'Consumer Durables', 'stock_etf',
  'TSLA', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_tsla.svg',
  ARRAY['tsla', 'tesla', 'consumer durables', 'stock', 'equity', 'nasdaq']::text[], true, 1194,
  'nasdaq', 'NASDAQ:TSLA', '{"country":"US","exchange":"NASDAQ","sector":"Consumer Durables","industry":"Motor Vehicles","logoid":"tesla"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'LLY', 'Eli Lilly and Company', 'LLY', 'Eli Lilly and Company - Health Technology / Pharmaceuticals: Major',
  'stock', 'stock', 'Health Technology', 'stock_etf',
  'LLY', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_lly.svg',
  ARRAY['lly', 'eli', 'health technology', 'stock', 'equity', 'nyse']::text[], true, 1195,
  'nyse', 'NYSE:LLY', '{"country":"US","exchange":"NYSE","sector":"Health Technology","industry":"Pharmaceuticals: Major","logoid":"eli-lilly"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'BRK.B', 'Berkshire Hathaway Inc. New', 'BRK.B', 'Berkshire Hathaway Inc. New - Finance / Property/Casualty Insurance',
  'stock', 'stock', 'Finance', 'stock_etf',
  'BRK.B', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_brk_b.svg',
  ARRAY['brkb', 'berkshire', 'finance', 'stock', 'equity', 'nyse']::text[], true, 1196,
  'nyse', 'NYSE:BRK.B', '{"country":"US","exchange":"NYSE","sector":"Finance","industry":"Property/Casualty Insurance","logoid":"berkshire-hathaway"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'BRK.A', 'Berkshire Hathaway Inc.', 'BRK.A', 'Berkshire Hathaway Inc. - Finance / Property/Casualty Insurance',
  'stock', 'stock', 'Finance', 'stock_etf',
  'BRK.A', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_brk_a.svg',
  ARRAY['brka', 'berkshire', 'finance', 'stock', 'equity', 'nyse']::text[], true, 1197,
  'nyse', 'NYSE:BRK.A', '{"country":"US","exchange":"NYSE","sector":"Finance","industry":"Property/Casualty Insurance","logoid":"berkshire-hathaway"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'MU', 'Micron Technology, Inc.', 'MU', 'Micron Technology, Inc. - Electronic Technology / Semiconductors',
  'stock', 'stock', 'Electronic Technology', 'stock_etf',
  'MU', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_mu.svg',
  ARRAY['mu', 'micron', 'electronic technology', 'stock', 'equity', 'nasdaq']::text[], true, 1198,
  'nasdaq', 'NASDAQ:MU', '{"country":"US","exchange":"NASDAQ","sector":"Electronic Technology","industry":"Semiconductors","logoid":"micron-technology"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'WMT', 'Walmart Inc.', 'WMT', 'Walmart Inc. - Retail Trade / Specialty Stores',
  'stock', 'stock', 'Retail Trade', 'stock_etf',
  'WMT', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_wmt.svg',
  ARRAY['wmt', 'walmart', 'retail trade', 'stock', 'equity', 'nasdaq']::text[], true, 1199,
  'nasdaq', 'NASDAQ:WMT', '{"country":"US","exchange":"NASDAQ","sector":"Retail Trade","industry":"Specialty Stores","logoid":"walmart"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'JPM', 'JP Morgan Chase & Co.', 'JPM', 'JP Morgan Chase & Co. - Finance / Major Banks',
  'stock', 'stock', 'Finance', 'stock_etf',
  'JPM', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_jpm.svg',
  ARRAY['jpm', 'jp', 'finance', 'stock', 'equity', 'nyse']::text[], true, 1200,
  'nyse', 'NYSE:JPM', '{"country":"US","exchange":"NYSE","sector":"Finance","industry":"Major Banks","logoid":"jpmorgan-chase"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'AMD', 'Advanced Micro Devices, Inc.', 'AMD', 'Advanced Micro Devices, Inc. - Electronic Technology / Semiconductors',
  'stock', 'stock', 'Electronic Technology', 'stock_etf',
  'AMD', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_amd.svg',
  ARRAY['amd', 'advanced', 'electronic technology', 'stock', 'equity', 'nasdaq']::text[], true, 1201,
  'nasdaq', 'NASDAQ:AMD', '{"country":"US","exchange":"NASDAQ","sector":"Electronic Technology","industry":"Semiconductors","logoid":"advanced-micro-devices"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'V', 'Visa Inc.', 'V', 'Visa Inc. - Finance / Finance/Rental/Leasing',
  'stock', 'stock', 'Finance', 'stock_etf',
  'V', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_v.svg',
  ARRAY['v', 'visa', 'finance', 'stock', 'equity', 'nyse']::text[], true, 1202,
  'nyse', 'NYSE:V', '{"country":"US","exchange":"NYSE","sector":"Finance","industry":"Finance/Rental/Leasing","logoid":"visa"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'XOM', 'ExxonMobil Holdings Corporation', 'XOM', 'ExxonMobil Holdings Corporation - Energy Minerals / Integrated Oil',
  'stock', 'stock', 'Energy Minerals', 'stock_etf',
  'XOM', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_xom.svg',
  ARRAY['xom', 'exxonmobil', 'energy minerals', 'stock', 'equity', 'nyse']::text[], true, 1203,
  'nyse', 'NYSE:XOM', '{"country":"US","exchange":"NYSE","sector":"Energy Minerals","industry":"Integrated Oil","logoid":"exxon"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'JNJ', 'Johnson & Johnson', 'JNJ', 'Johnson & Johnson - Health Technology / Pharmaceuticals: Major',
  'stock', 'stock', 'Health Technology', 'stock_etf',
  'JNJ', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_jnj.svg',
  ARRAY['jnj', 'johnson', 'health technology', 'stock', 'equity', 'nyse']::text[], true, 1204,
  'nyse', 'NYSE:JNJ', '{"country":"US","exchange":"NYSE","sector":"Health Technology","industry":"Pharmaceuticals: Major","logoid":"johnson-and-johnson"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'MA', 'Mastercard Incorporated', 'MA', 'Mastercard Incorporated - Finance / Finance/Rental/Leasing',
  'stock', 'stock', 'Finance', 'stock_etf',
  'MA', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_ma.svg',
  ARRAY['ma', 'mastercard', 'finance', 'stock', 'equity', 'nyse']::text[], true, 1205,
  'nyse', 'NYSE:MA', '{"country":"US","exchange":"NYSE","sector":"Finance","industry":"Finance/Rental/Leasing","logoid":"mastercard"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'ABBV', 'AbbVie Inc.', 'ABBV', 'AbbVie Inc. - Health Technology / Pharmaceuticals: Major',
  'stock', 'stock', 'Health Technology', 'stock_etf',
  'ABBV', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_abbv.svg',
  ARRAY['abbv', 'abbvie', 'health technology', 'stock', 'equity', 'nyse']::text[], true, 1206,
  'nyse', 'NYSE:ABBV', '{"country":"US","exchange":"NYSE","sector":"Health Technology","industry":"Pharmaceuticals: Major","logoid":"abbvie"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'INTC', 'Intel Corporation', 'INTC', 'Intel Corporation - Electronic Technology / Semiconductors',
  'stock', 'stock', 'Electronic Technology', 'stock_etf',
  'INTC', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_intc.svg',
  ARRAY['intc', 'intel', 'electronic technology', 'stock', 'equity', 'nasdaq']::text[], true, 1207,
  'nasdaq', 'NASDAQ:INTC', '{"country":"US","exchange":"NASDAQ","sector":"Electronic Technology","industry":"Semiconductors","logoid":"intel"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'PLTR', 'Palantir Technologies Inc.', 'PLTR', 'Palantir Technologies Inc. - Technology Services / Packaged Software',
  'stock', 'stock', 'Technology Services', 'stock_etf',
  'PLTR', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_pltr.svg',
  ARRAY['pltr', 'palantir', 'technology services', 'stock', 'equity', 'nasdaq']::text[], true, 1208,
  'nasdaq', 'NASDAQ:PLTR', '{"country":"US","exchange":"NASDAQ","sector":"Technology Services","industry":"Packaged Software","logoid":"palantir"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'CVX', 'Chevron Corporation', 'CVX', 'Chevron Corporation - Energy Minerals / Integrated Oil',
  'stock', 'stock', 'Energy Minerals', 'stock_etf',
  'CVX', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_cvx.svg',
  ARRAY['cvx', 'chevron', 'energy minerals', 'stock', 'equity', 'nyse']::text[], true, 1209,
  'nyse', 'NYSE:CVX', '{"country":"US","exchange":"NYSE","sector":"Energy Minerals","industry":"Integrated Oil","logoid":"chevron"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'COST', 'Costco Wholesale Corporation', 'COST', 'Costco Wholesale Corporation - Retail Trade / Specialty Stores',
  'stock', 'stock', 'Retail Trade', 'stock_etf',
  'COST', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_cost.svg',
  ARRAY['cost', 'costco', 'retail trade', 'stock', 'equity', 'nasdaq']::text[], true, 1210,
  'nasdaq', 'NASDAQ:COST', '{"country":"US","exchange":"NASDAQ","sector":"Retail Trade","industry":"Specialty Stores","logoid":"costco-wholesale"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'CSCO', 'Cisco Systems, Inc.', 'CSCO', 'Cisco Systems, Inc. - Electronic Technology / Telecommunications Equipment',
  'stock', 'stock', 'Electronic Technology', 'stock_etf',
  'CSCO', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_csco.svg',
  ARRAY['csco', 'cisco', 'electronic technology', 'stock', 'equity', 'nasdaq']::text[], true, 1211,
  'nasdaq', 'NASDAQ:CSCO', '{"country":"US","exchange":"NASDAQ","sector":"Electronic Technology","industry":"Telecommunications Equipment","logoid":"cisco"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'KO', 'Coca-Cola Company (The)', 'KO', 'Coca-Cola Company (The) - Consumer Non-Durables / Beverages: Non-Alcoholic',
  'stock', 'stock', 'Consumer Non-Durables', 'stock_etf',
  'KO', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_ko.svg',
  ARRAY['ko', 'coca-cola', 'consumer non-durables', 'stock', 'equity', 'nyse']::text[], true, 1212,
  'nyse', 'NYSE:KO', '{"country":"US","exchange":"NYSE","sector":"Consumer Non-Durables","industry":"Beverages: Non-Alcoholic","logoid":"coca-cola"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'ORCL', 'Oracle Corporation', 'ORCL', 'Oracle Corporation - Technology Services / Packaged Software',
  'stock', 'stock', 'Technology Services', 'stock_etf',
  'ORCL', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_orcl.svg',
  ARRAY['orcl', 'oracle', 'technology services', 'stock', 'equity', 'nyse']::text[], true, 1213,
  'nyse', 'NYSE:ORCL', '{"country":"US","exchange":"NYSE","sector":"Technology Services","industry":"Packaged Software","logoid":"oracle"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'PG', 'Procter & Gamble Company (The)', 'PG', 'Procter & Gamble Company (The) - Consumer Non-Durables / Household/Personal Care',
  'stock', 'stock', 'Consumer Non-Durables', 'stock_etf',
  'PG', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_pg.svg',
  ARRAY['pg', 'procter', 'consumer non-durables', 'stock', 'equity', 'nyse']::text[], true, 1214,
  'nyse', 'NYSE:PG', '{"country":"US","exchange":"NYSE","sector":"Consumer Non-Durables","industry":"Household/Personal Care","logoid":"procter-and-gamble"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'UNH', 'UnitedHealth Group Incorporated', 'UNH', 'UnitedHealth Group Incorporated - Health Services / Managed Health Care',
  'stock', 'stock', 'Health Services', 'stock_etf',
  'UNH', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_unh.svg',
  ARRAY['unh', 'unitedhealth', 'health services', 'stock', 'equity', 'nyse']::text[], true, 1215,
  'nyse', 'NYSE:UNH', '{"country":"US","exchange":"NYSE","sector":"Health Services","industry":"Managed Health Care","logoid":"unitedhealth"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'MRK', 'Merck & Company, Inc.', 'MRK', 'Merck & Company, Inc. - Health Technology / Pharmaceuticals: Major',
  'stock', 'stock', 'Health Technology', 'stock_etf',
  'MRK', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_mrk.svg',
  ARRAY['mrk', 'merck', 'health technology', 'stock', 'equity', 'nyse']::text[], true, 1216,
  'nyse', 'NYSE:MRK', '{"country":"US","exchange":"NYSE","sector":"Health Technology","industry":"Pharmaceuticals: Major","logoid":"merck-and-co"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'BAC', 'Bank of America Corporation', 'BAC', 'Bank of America Corporation - Finance / Major Banks',
  'stock', 'stock', 'Finance', 'stock_etf',
  'BAC', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_bac.svg',
  ARRAY['bac', 'bank', 'finance', 'stock', 'equity', 'nyse']::text[], true, 1217,
  'nyse', 'NYSE:BAC', '{"country":"US","exchange":"NYSE","sector":"Finance","industry":"Major Banks","logoid":"bank-of-america"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'CAT', 'Caterpillar, Inc.', 'CAT', 'Caterpillar, Inc. - Producer Manufacturing / Trucks/Construction/Farm Machinery',
  'stock', 'stock', 'Producer Manufacturing', 'stock_etf',
  'CAT', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_cat.svg',
  ARRAY['cat', 'caterpillar', 'producer manufacturing', 'stock', 'equity', 'nyse']::text[], true, 1218,
  'nyse', 'NYSE:CAT', '{"country":"US","exchange":"NYSE","sector":"Producer Manufacturing","industry":"Trucks/Construction/Farm Machinery","logoid":"caterpillar"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'LRCX', 'Lam Research Corporation', 'LRCX', 'Lam Research Corporation - Producer Manufacturing / Industrial Machinery',
  'stock', 'stock', 'Producer Manufacturing', 'stock_etf',
  'LRCX', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_lrcx.svg',
  ARRAY['lrcx', 'lam', 'producer manufacturing', 'stock', 'equity', 'nasdaq']::text[], true, 1219,
  'nasdaq', 'NASDAQ:LRCX', '{"country":"US","exchange":"NASDAQ","sector":"Producer Manufacturing","industry":"Industrial Machinery","logoid":"lam-research"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'GE', 'GE Aerospace', 'GE', 'GE Aerospace - Electronic Technology / Aerospace & Defense',
  'stock', 'stock', 'Electronic Technology', 'stock_etf',
  'GE', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_ge.svg',
  ARRAY['ge', 'ge', 'electronic technology', 'stock', 'equity', 'nyse']::text[], true, 1220,
  'nyse', 'NYSE:GE', '{"country":"US","exchange":"NYSE","sector":"Electronic Technology","industry":"Aerospace & Defense","logoid":"ge-aerospace"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'AMAT', 'Applied Materials, Inc.', 'AMAT', 'Applied Materials, Inc. - Producer Manufacturing / Industrial Machinery',
  'stock', 'stock', 'Producer Manufacturing', 'stock_etf',
  'AMAT', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_amat.svg',
  ARRAY['amat', 'applied', 'producer manufacturing', 'stock', 'equity', 'nasdaq']::text[], true, 1221,
  'nasdaq', 'NASDAQ:AMAT', '{"country":"US","exchange":"NASDAQ","sector":"Producer Manufacturing","industry":"Industrial Machinery","logoid":"applied-materials"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'PM', 'Philip Morris International Inc', 'PM', 'Philip Morris International Inc - Consumer Non-Durables / Tobacco',
  'stock', 'stock', 'Consumer Non-Durables', 'stock_etf',
  'PM', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_pm.svg',
  ARRAY['pm', 'philip', 'consumer non-durables', 'stock', 'equity', 'nyse']::text[], true, 1222,
  'nyse', 'NYSE:PM', '{"country":"US","exchange":"NYSE","sector":"Consumer Non-Durables","industry":"Tobacco","logoid":"philip-morris"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'HD', 'Home Depot, Inc. (The)', 'HD', 'Home Depot, Inc. (The) - Retail Trade / Home Improvement Chains',
  'stock', 'stock', 'Retail Trade', 'stock_etf',
  'HD', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_hd.svg',
  ARRAY['hd', 'home', 'retail trade', 'stock', 'equity', 'nyse']::text[], true, 1223,
  'nyse', 'NYSE:HD', '{"country":"US","exchange":"NYSE","sector":"Retail Trade","industry":"Home Improvement Chains","logoid":"home-depot"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'NFLX', 'Netflix, Inc.', 'NFLX', 'Netflix, Inc. - Technology Services / Internet Software/Services',
  'stock', 'stock', 'Technology Services', 'stock_etf',
  'NFLX', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_nflx.svg',
  ARRAY['nflx', 'netflix', 'technology services', 'stock', 'equity', 'nasdaq']::text[], true, 1224,
  'nasdaq', 'NASDAQ:NFLX', '{"country":"US","exchange":"NASDAQ","sector":"Technology Services","industry":"Internet Software/Services","logoid":"netflix"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'DELL', 'Dell Technologies Inc.', 'DELL', 'Dell Technologies Inc. - Electronic Technology / Computer Processing Hardware',
  'stock', 'stock', 'Electronic Technology', 'stock_etf',
  'DELL', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_dell.svg',
  ARRAY['dell', 'dell', 'electronic technology', 'stock', 'equity', 'nyse']::text[], true, 1225,
  'nyse', 'NYSE:DELL', '{"country":"US","exchange":"NYSE","sector":"Electronic Technology","industry":"Computer Processing Hardware","logoid":"dell"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'MS', 'Morgan Stanley', 'MS', 'Morgan Stanley - Finance / Investment Managers',
  'stock', 'stock', 'Finance', 'stock_etf',
  'MS', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_ms.svg',
  ARRAY['ms', 'morgan', 'finance', 'stock', 'equity', 'nyse']::text[], true, 1226,
  'nyse', 'NYSE:MS', '{"country":"US","exchange":"NYSE","sector":"Finance","industry":"Investment Managers","logoid":"morgan-stanley"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'PANW', 'Palo Alto Networks, Inc.', 'PANW', 'Palo Alto Networks, Inc. - Technology Services / Packaged Software',
  'stock', 'stock', 'Technology Services', 'stock_etf',
  'PANW', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_panw.svg',
  ARRAY['panw', 'palo', 'technology services', 'stock', 'equity', 'nasdaq']::text[], true, 1227,
  'nasdaq', 'NASDAQ:PANW', '{"country":"US","exchange":"NASDAQ","sector":"Technology Services","industry":"Packaged Software","logoid":"palo-alto-networks"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'RY', 'Royal Bank Of Canada', 'RY', 'Royal Bank Of Canada - Finance / Major Banks',
  'stock', 'stock', 'Finance', 'stock_etf',
  'RY', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_ry.svg',
  ARRAY['ry', 'royal', 'finance', 'stock', 'equity', 'nyse']::text[], true, 1228,
  'nyse', 'NYSE:RY', '{"country":"US","exchange":"NYSE","sector":"Finance","industry":"Major Banks","logoid":"royal-bank-of-canada"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'RTX', 'RTX Corporation', 'RTX', 'RTX Corporation - Electronic Technology / Aerospace & Defense',
  'stock', 'stock', 'Electronic Technology', 'stock_etf',
  'RTX', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_rtx.svg',
  ARRAY['rtx', 'rtx', 'electronic technology', 'stock', 'equity', 'nyse']::text[], true, 1229,
  'nyse', 'NYSE:RTX', '{"country":"US","exchange":"NYSE","sector":"Electronic Technology","industry":"Aerospace & Defense","logoid":"raytheon"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'GS', 'Goldman Sachs Group, Inc. (The)', 'GS', 'Goldman Sachs Group, Inc. (The) - Finance / Investment Banks/Brokers',
  'stock', 'stock', 'Finance', 'stock_etf',
  'GS', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_gs.svg',
  ARRAY['gs', 'goldman', 'finance', 'stock', 'equity', 'nyse']::text[], true, 1230,
  'nyse', 'NYSE:GS', '{"country":"US","exchange":"NYSE","sector":"Finance","industry":"Investment Banks/Brokers","logoid":"golden-sachs-etf-trust-goldman"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'AZN', 'AstraZeneca PLC', 'AZN', 'AstraZeneca PLC - Health Technology / Pharmaceuticals: Major',
  'stock', 'stock', 'Health Technology', 'stock_etf',
  'AZN', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_azn.svg',
  ARRAY['azn', 'astrazeneca', 'health technology', 'stock', 'equity', 'nyse']::text[], true, 1231,
  'nyse', 'NYSE:AZN', '{"country":"US","exchange":"NYSE","sector":"Health Technology","industry":"Pharmaceuticals: Major","logoid":"astrazeneca"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'TMO', 'Thermo Fisher Scientific Inc', 'TMO', 'Thermo Fisher Scientific Inc - Health Technology / Medical Specialties',
  'stock', 'stock', 'Health Technology', 'stock_etf',
  'TMO', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_tmo.svg',
  ARRAY['tmo', 'thermo', 'health technology', 'stock', 'equity', 'nyse']::text[], true, 1232,
  'nyse', 'NYSE:TMO', '{"country":"US","exchange":"NYSE","sector":"Health Technology","industry":"Medical Specialties","logoid":"thermo-fisher-scientific"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'TXN', 'Texas Instruments Incorporated', 'TXN', 'Texas Instruments Incorporated - Electronic Technology / Semiconductors',
  'stock', 'stock', 'Electronic Technology', 'stock_etf',
  'TXN', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_txn.svg',
  ARRAY['txn', 'texas', 'electronic technology', 'stock', 'equity', 'nasdaq']::text[], true, 1233,
  'nasdaq', 'NASDAQ:TXN', '{"country":"US","exchange":"NASDAQ","sector":"Electronic Technology","industry":"Semiconductors","logoid":"texas-instruments"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'WFC', 'Wells Fargo & Company', 'WFC', 'Wells Fargo & Company - Finance / Major Banks',
  'stock', 'stock', 'Finance', 'stock_etf',
  'WFC', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_wfc.svg',
  ARRAY['wfc', 'wells', 'finance', 'stock', 'equity', 'nyse']::text[], true, 1234,
  'nyse', 'NYSE:WFC', '{"country":"US","exchange":"NYSE","sector":"Finance","industry":"Major Banks","logoid":"wells-fargo"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'GEV', 'GE Vernova Inc.', 'GEV', 'GE Vernova Inc. - Producer Manufacturing / Electrical Products',
  'stock', 'stock', 'Producer Manufacturing', 'stock_etf',
  'GEV', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_gev.svg',
  ARRAY['gev', 'ge', 'producer manufacturing', 'stock', 'equity', 'nyse']::text[], true, 1235,
  'nyse', 'NYSE:GEV', '{"country":"US","exchange":"NYSE","sector":"Producer Manufacturing","industry":"Electrical Products","logoid":"ge-verona"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'AMGN', 'Amgen Inc.', 'AMGN', 'Amgen Inc. - Health Technology / Biotechnology',
  'stock', 'stock', 'Health Technology', 'stock_etf',
  'AMGN', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_amgn.svg',
  ARRAY['amgn', 'amgen', 'health technology', 'stock', 'equity', 'nasdaq']::text[], true, 1236,
  'nasdaq', 'NASDAQ:AMGN', '{"country":"US","exchange":"NASDAQ","sector":"Health Technology","industry":"Biotechnology","logoid":"amgen"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'CRWD', 'CrowdStrike Holdings, Inc.', 'CRWD', 'CrowdStrike Holdings, Inc. - Technology Services / Packaged Software',
  'stock', 'stock', 'Technology Services', 'stock_etf',
  'CRWD', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_crwd.svg',
  ARRAY['crwd', 'crowdstrike', 'technology services', 'stock', 'equity', 'nasdaq']::text[], true, 1237,
  'nasdaq', 'NASDAQ:CRWD', '{"country":"US","exchange":"NASDAQ","sector":"Technology Services","industry":"Packaged Software","logoid":"crowdstrike"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'LIN', 'Linde plc', 'LIN', 'Linde plc - Process Industries / Chemicals: Specialty',
  'stock', 'stock', 'Process Industries', 'stock_etf',
  'LIN', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_lin.svg',
  ARRAY['lin', 'linde', 'process industries', 'stock', 'equity', 'nasdaq']::text[], true, 1238,
  'nasdaq', 'NASDAQ:LIN', '{"country":"US","exchange":"NASDAQ","sector":"Process Industries","industry":"Chemicals: Specialty","logoid":"linde"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'ANET', 'Arista Networks, Inc.', 'ANET', 'Arista Networks, Inc. - Electronic Technology / Computer Peripherals',
  'stock', 'stock', 'Electronic Technology', 'stock_etf',
  'ANET', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_anet.svg',
  ARRAY['anet', 'arista', 'electronic technology', 'stock', 'equity', 'nyse']::text[], true, 1239,
  'nyse', 'NYSE:ANET', '{"country":"US","exchange":"NYSE","sector":"Electronic Technology","industry":"Computer Peripherals","logoid":"arista-networks"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'IBM', 'International Business Machines Corporation', 'IBM', 'International Business Machines Corporation - Technology Services / Information Technology Services',
  'stock', 'stock', 'Technology Services', 'stock_etf',
  'IBM', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_ibm.svg',
  ARRAY['ibm', 'international', 'technology services', 'stock', 'equity', 'nyse']::text[], true, 1240,
  'nyse', 'NYSE:IBM', '{"country":"US","exchange":"NYSE","sector":"Technology Services","industry":"Information Technology Services","logoid":"international-bus-mach"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'SHOP', 'Shopify Inc.', 'SHOP', 'Shopify Inc. - Commercial Services / Miscellaneous Commercial Services',
  'stock', 'stock', 'Commercial Services', 'stock_etf',
  'SHOP', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_shop.svg',
  ARRAY['shop', 'shopify', 'commercial services', 'stock', 'equity', 'nasdaq']::text[], true, 1241,
  'nasdaq', 'NASDAQ:SHOP', '{"country":"US","exchange":"NASDAQ","sector":"Commercial Services","industry":"Miscellaneous Commercial Services","logoid":"shopify"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'KLAC', 'KLA Corporation', 'KLAC', 'KLA Corporation - Electronic Technology / Semiconductors',
  'stock', 'stock', 'Electronic Technology', 'stock_etf',
  'KLAC', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_klac.svg',
  ARRAY['klac', 'kla', 'electronic technology', 'stock', 'equity', 'nasdaq']::text[], true, 1242,
  'nasdaq', 'NASDAQ:KLAC', '{"country":"US","exchange":"NASDAQ","sector":"Electronic Technology","industry":"Semiconductors","logoid":"kla-tencor"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'AXP', 'American Express Company', 'AXP', 'American Express Company - Finance / Finance/Rental/Leasing',
  'stock', 'stock', 'Finance', 'stock_etf',
  'AXP', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_axp.svg',
  ARRAY['axp', 'american', 'finance', 'stock', 'equity', 'nyse']::text[], true, 1243,
  'nyse', 'NYSE:AXP', '{"country":"US","exchange":"NYSE","sector":"Finance","industry":"Finance/Rental/Leasing","logoid":"american-express"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'C', 'Citigroup, Inc.', 'C', 'Citigroup, Inc. - Finance / Major Banks',
  'stock', 'stock', 'Finance', 'stock_etf',
  'C', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_c.svg',
  ARRAY['c', 'citigroup', 'finance', 'stock', 'equity', 'nyse']::text[], true, 1244,
  'nyse', 'NYSE:C', '{"country":"US","exchange":"NYSE","sector":"Finance","industry":"Major Banks","logoid":"citigroup"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'TTE', 'TotalEnergies SE', 'TTE', 'TotalEnergies SE - Energy Minerals / Integrated Oil',
  'stock', 'stock', 'Energy Minerals', 'stock_etf',
  'TTE', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_tte.svg',
  ARRAY['tte', 'totalenergies', 'energy minerals', 'stock', 'equity', 'nyse']::text[], true, 1245,
  'nyse', 'NYSE:TTE', '{"country":"US","exchange":"NYSE","sector":"Energy Minerals","industry":"Integrated Oil","logoid":"total"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'TD', 'Toronto Dominion Bank (The)', 'TD', 'Toronto Dominion Bank (The) - Finance / Major Banks',
  'stock', 'stock', 'Finance', 'stock_etf',
  'TD', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_td.svg',
  ARRAY['td', 'toronto', 'finance', 'stock', 'equity', 'nyse']::text[], true, 1246,
  'nyse', 'NYSE:TD', '{"country":"US","exchange":"NYSE","sector":"Finance","industry":"Major Banks","logoid":"toronto-dominion-bank"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'MRVL', 'Marvell Technology, Inc.', 'MRVL', 'Marvell Technology, Inc. - Electronic Technology / Semiconductors',
  'stock', 'stock', 'Electronic Technology', 'stock_etf',
  'MRVL', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_mrvl.svg',
  ARRAY['mrvl', 'marvell', 'electronic technology', 'stock', 'equity', 'nasdaq']::text[], true, 1247,
  'nasdaq', 'NASDAQ:MRVL', '{"country":"US","exchange":"NASDAQ","sector":"Electronic Technology","industry":"Semiconductors","logoid":"marvell-tech"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'CRM', 'Salesforce, Inc.', 'CRM', 'Salesforce, Inc. - Technology Services / Packaged Software',
  'stock', 'stock', 'Technology Services', 'stock_etf',
  'CRM', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_crm.svg',
  ARRAY['crm', 'salesforce', 'technology services', 'stock', 'equity', 'nyse']::text[], true, 1248,
  'nyse', 'NYSE:CRM', '{"country":"US","exchange":"NYSE","sector":"Technology Services","industry":"Packaged Software","logoid":"salesforce"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'APH', 'Amphenol Corporation', 'APH', 'Amphenol Corporation - Electronic Technology / Electronic Components',
  'stock', 'stock', 'Electronic Technology', 'stock_etf',
  'APH', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_aph.svg',
  ARRAY['aph', 'amphenol', 'electronic technology', 'stock', 'equity', 'nyse']::text[], true, 1249,
  'nyse', 'NYSE:APH', '{"country":"US","exchange":"NYSE","sector":"Electronic Technology","industry":"Electronic Components","logoid":"amphenol"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'GILD', 'Gilead Sciences, Inc.', 'GILD', 'Gilead Sciences, Inc. - Health Technology / Biotechnology',
  'stock', 'stock', 'Health Technology', 'stock_etf',
  'GILD', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_gild.svg',
  ARRAY['gild', 'gilead', 'health technology', 'stock', 'equity', 'nasdaq']::text[], true, 1250,
  'nasdaq', 'NASDAQ:GILD', '{"country":"US","exchange":"NASDAQ","sector":"Health Technology","industry":"Biotechnology","logoid":"gilead"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'ADI', 'Analog Devices, Inc.', 'ADI', 'Analog Devices, Inc. - Electronic Technology / Semiconductors',
  'stock', 'stock', 'Electronic Technology', 'stock_etf',
  'ADI', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_adi.svg',
  ARRAY['adi', 'analog', 'electronic technology', 'stock', 'equity', 'nasdaq']::text[], true, 1251,
  'nasdaq', 'NASDAQ:ADI', '{"country":"US","exchange":"NASDAQ","sector":"Electronic Technology","industry":"Semiconductors","logoid":"analog-devices"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'DIS', 'Walt Disney Company (The)', 'DIS', 'Walt Disney Company (The) - Consumer Services / Movies/Entertainment',
  'stock', 'stock', 'Consumer Services', 'stock_etf',
  'DIS', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_dis.svg',
  ARRAY['dis', 'walt', 'consumer services', 'stock', 'equity', 'nyse']::text[], true, 1252,
  'nyse', 'NYSE:DIS', '{"country":"US","exchange":"NYSE","sector":"Consumer Services","industry":"Movies/Entertainment","logoid":"walt-disney"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'SNDK', 'Sandisk Corporation', 'SNDK', 'Sandisk Corporation - Electronic Technology / Computer Peripherals',
  'stock', 'stock', 'Electronic Technology', 'stock_etf',
  'SNDK', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_sndk.svg',
  ARRAY['sndk', 'sandisk', 'electronic technology', 'stock', 'equity', 'nasdaq']::text[], true, 1253,
  'nasdaq', 'NASDAQ:SNDK', '{"country":"US","exchange":"NASDAQ","sector":"Electronic Technology","industry":"Computer Peripherals","logoid":"sandisk"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'VZ', 'Verizon Communications Inc.', 'VZ', 'Verizon Communications Inc. - Communications / Wireless Telecommunications',
  'stock', 'stock', 'Communications', 'stock_etf',
  'VZ', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_vz.svg',
  ARRAY['vz', 'verizon', 'communications', 'stock', 'equity', 'nyse']::text[], true, 1254,
  'nyse', 'NYSE:VZ', '{"country":"US","exchange":"NYSE","sector":"Communications","industry":"Wireless Telecommunications","logoid":"verizon"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'BLK', 'BlackRock, Inc.', 'BLK', 'BlackRock, Inc. - Finance / Investment Managers',
  'stock', 'stock', 'Finance', 'stock_etf',
  'BLK', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_blk.svg',
  ARRAY['blk', 'blackrock', 'finance', 'stock', 'equity', 'nyse']::text[], true, 1255,
  'nyse', 'NYSE:BLK', '{"country":"US","exchange":"NYSE","sector":"Finance","industry":"Investment Managers","logoid":"blackrock"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'QCOM', 'QUALCOMM Incorporated', 'QCOM', 'QUALCOMM Incorporated - Electronic Technology / Semiconductors',
  'stock', 'stock', 'Electronic Technology', 'stock_etf',
  'QCOM', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_qcom.svg',
  ARRAY['qcom', 'qualcomm', 'electronic technology', 'stock', 'equity', 'nasdaq']::text[], true, 1256,
  'nasdaq', 'NASDAQ:QCOM', '{"country":"US","exchange":"NASDAQ","sector":"Electronic Technology","industry":"Semiconductors","logoid":"qualcomm"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'ABT', 'Abbott Laboratories', 'ABT', 'Abbott Laboratories - Health Technology / Medical Specialties',
  'stock', 'stock', 'Health Technology', 'stock_etf',
  'ABT', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_abt.svg',
  ARRAY['abt', 'abbott', 'health technology', 'stock', 'equity', 'nyse']::text[], true, 1257,
  'nyse', 'NYSE:ABT', '{"country":"US","exchange":"NYSE","sector":"Health Technology","industry":"Medical Specialties","logoid":"abbott"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'PEP', 'PepsiCo, Inc.', 'PEP', 'PepsiCo, Inc. - Consumer Non-Durables / Food: Specialty/Candy',
  'stock', 'stock', 'Consumer Non-Durables', 'stock_etf',
  'PEP', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_pep.svg',
  ARRAY['pep', 'pepsico', 'consumer non-durables', 'stock', 'equity', 'nasdaq']::text[], true, 1258,
  'nasdaq', 'NASDAQ:PEP', '{"country":"US","exchange":"NASDAQ","sector":"Consumer Non-Durables","industry":"Food: Specialty/Candy","logoid":"pepsico"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'COP', 'ConocoPhillips', 'COP', 'ConocoPhillips - Energy Minerals / Oil & Gas Production',
  'stock', 'stock', 'Energy Minerals', 'stock_etf',
  'COP', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_cop.svg',
  ARRAY['cop', 'conocophillips', 'energy minerals', 'stock', 'equity', 'nyse']::text[], true, 1259,
  'nyse', 'NYSE:COP', '{"country":"US","exchange":"NYSE","sector":"Energy Minerals","industry":"Oil & Gas Production","logoid":"conocophillips"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'DE', 'Deere & Company', 'DE', 'Deere & Company - Producer Manufacturing / Trucks/Construction/Farm Machinery',
  'stock', 'stock', 'Producer Manufacturing', 'stock_etf',
  'DE', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_de.svg',
  ARRAY['de', 'deere', 'producer manufacturing', 'stock', 'equity', 'nyse']::text[], true, 1260,
  'nyse', 'NYSE:DE', '{"country":"US","exchange":"NYSE","sector":"Producer Manufacturing","industry":"Trucks/Construction/Farm Machinery","logoid":"deere"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'MCD', 'McDonald''s Corporation', 'MCD', 'McDonald''s Corporation - Consumer Services / Restaurants',
  'stock', 'stock', 'Consumer Services', 'stock_etf',
  'MCD', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_mcd.svg',
  ARRAY['mcd', 'mcdonalds', 'consumer services', 'stock', 'equity', 'nyse']::text[], true, 1261,
  'nyse', 'NYSE:MCD', '{"country":"US","exchange":"NYSE","sector":"Consumer Services","industry":"Restaurants","logoid":"mcdonalds"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'UNP', 'Union Pacific Corporation', 'UNP', 'Union Pacific Corporation - Transportation / Railroads',
  'stock', 'stock', 'Transportation', 'stock_etf',
  'UNP', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_unp.svg',
  ARRAY['unp', 'union', 'transportation', 'stock', 'equity', 'nyse']::text[], true, 1262,
  'nyse', 'NYSE:UNP', '{"country":"US","exchange":"NYSE","sector":"Transportation","industry":"Railroads","logoid":"union-pacific"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'TMUS', 'T-Mobile US, Inc.', 'TMUS', 'T-Mobile US, Inc. - Communications / Wireless Telecommunications',
  'stock', 'stock', 'Communications', 'stock_etf',
  'TMUS', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_tmus.svg',
  ARRAY['tmus', 't-mobile', 'communications', 'stock', 'equity', 'nasdaq']::text[], true, 1263,
  'nasdaq', 'NASDAQ:TMUS', '{"country":"US","exchange":"NASDAQ","sector":"Communications","industry":"Wireless Telecommunications","logoid":"t-mobile"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'SCCO', 'Southern Copper Corporation', 'SCCO', 'Southern Copper Corporation - Non-Energy Minerals / Other Metals/Minerals',
  'stock', 'stock', 'Non-Energy Minerals', 'stock_etf',
  'SCCO', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_scco.svg',
  ARRAY['scco', 'southern', 'non-energy minerals', 'stock', 'equity', 'nyse']::text[], true, 1264,
  'nyse', 'NYSE:SCCO', '{"country":"US","exchange":"NYSE","sector":"Non-Energy Minerals","industry":"Other Metals/Minerals","logoid":"southern-copper"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'WELL', 'Welltower Inc.', 'WELL', 'Welltower Inc. - Finance / Real Estate Investment Trusts',
  'stock', 'stock', 'Finance', 'stock_etf',
  'WELL', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_well.svg',
  ARRAY['well', 'welltower', 'finance', 'stock', 'equity', 'nyse']::text[], true, 1265,
  'nyse', 'NYSE:WELL', '{"country":"US","exchange":"NYSE","sector":"Finance","industry":"Real Estate Investment Trusts","logoid":"welltower-indrn"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'PFE', 'Pfizer, Inc.', 'PFE', 'Pfizer, Inc. - Health Technology / Pharmaceuticals: Major',
  'stock', 'stock', 'Health Technology', 'stock_etf',
  'PFE', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_pfe.svg',
  ARRAY['pfe', 'pfizer', 'health technology', 'stock', 'equity', 'nyse']::text[], true, 1266,
  'nyse', 'NYSE:PFE', '{"country":"US","exchange":"NYSE","sector":"Health Technology","industry":"Pharmaceuticals: Major","logoid":"pfizer"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'NEE', 'NextEra Energy, Inc.', 'NEE', 'NextEra Energy, Inc. - Utilities / Electric Utilities',
  'stock', 'stock', 'Utilities', 'stock_etf',
  'NEE', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_nee.svg',
  ARRAY['nee', 'nextera', 'utilities', 'stock', 'equity', 'nyse']::text[], true, 1267,
  'nyse', 'NYSE:NEE', '{"country":"US","exchange":"NYSE","sector":"Utilities","industry":"Electric Utilities","logoid":"nextera-energy"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'TJX', 'TJX Companies, Inc. (The)', 'TJX', 'TJX Companies, Inc. (The) - Retail Trade / Apparel/Footwear Retail',
  'stock', 'stock', 'Retail Trade', 'stock_etf',
  'TJX', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_tjx.svg',
  ARRAY['tjx', 'tjx', 'retail trade', 'stock', 'equity', 'nyse']::text[], true, 1268,
  'nyse', 'NYSE:TJX', '{"country":"US","exchange":"NYSE","sector":"Retail Trade","industry":"Apparel/Footwear Retail","logoid":"tjx-cos"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'DHR', 'Danaher Corporation', 'DHR', 'Danaher Corporation - Health Technology / Medical Specialties',
  'stock', 'stock', 'Health Technology', 'stock_etf',
  'DHR', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_dhr.svg',
  ARRAY['dhr', 'danaher', 'health technology', 'stock', 'equity', 'nyse']::text[], true, 1269,
  'nyse', 'NYSE:DHR', '{"country":"US","exchange":"NYSE","sector":"Health Technology","industry":"Medical Specialties","logoid":"danaher"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'T', 'AT&T Inc.', 'T', 'AT&T Inc. - Communications / Wireless Telecommunications',
  'stock', 'stock', 'Communications', 'stock_etf',
  'T', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_t.svg',
  ARRAY['t', 'att', 'communications', 'stock', 'equity', 'nyse']::text[], true, 1270,
  'nyse', 'NYSE:T', '{"country":"US","exchange":"NYSE","sector":"Communications","industry":"Wireless Telecommunications","logoid":"at-and-t"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'SCHW', 'Charles Schwab Corporation (The)', 'SCHW', 'Charles Schwab Corporation (The) - Finance / Investment Banks/Brokers',
  'stock', 'stock', 'Finance', 'stock_etf',
  'SCHW', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_schw.svg',
  ARRAY['schw', 'charles', 'finance', 'stock', 'equity', 'nyse']::text[], true, 1271,
  'nyse', 'NYSE:SCHW', '{"country":"US","exchange":"NYSE","sector":"Finance","industry":"Investment Banks/Brokers","logoid":"schwab"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'ETN', 'Eaton Corporation, PLC', 'ETN', 'Eaton Corporation, PLC - Producer Manufacturing / Electrical Products',
  'stock', 'stock', 'Producer Manufacturing', 'stock_etf',
  'ETN', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_etn.svg',
  ARRAY['etn', 'eaton', 'producer manufacturing', 'stock', 'equity', 'nyse']::text[], true, 1272,
  'nyse', 'NYSE:ETN', '{"country":"US","exchange":"NYSE","sector":"Producer Manufacturing","industry":"Electrical Products","logoid":"eaton"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'ISRG', 'Intuitive Surgical, Inc.', 'ISRG', 'Intuitive Surgical, Inc. - Health Technology / Medical Specialties',
  'stock', 'stock', 'Health Technology', 'stock_etf',
  'ISRG', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_isrg.svg',
  ARRAY['isrg', 'intuitive', 'health technology', 'stock', 'equity', 'nasdaq']::text[], true, 1273,
  'nasdaq', 'NASDAQ:ISRG', '{"country":"US","exchange":"NASDAQ","sector":"Health Technology","industry":"Medical Specialties","logoid":"intuitive-surgical"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'BA', 'Boeing Company (The)', 'BA', 'Boeing Company (The) - Electronic Technology / Aerospace & Defense',
  'stock', 'stock', 'Electronic Technology', 'stock_etf',
  'BA', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_ba.svg',
  ARRAY['ba', 'boeing', 'electronic technology', 'stock', 'equity', 'nyse']::text[], true, 1274,
  'nyse', 'NYSE:BA', '{"country":"US","exchange":"NYSE","sector":"Electronic Technology","industry":"Aerospace & Defense","logoid":"boeing"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'NOW', 'ServiceNow, Inc.', 'NOW', 'ServiceNow, Inc. - Technology Services / Packaged Software',
  'stock', 'stock', 'Technology Services', 'stock_etf',
  'NOW', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_now.svg',
  ARRAY['now', 'servicenow', 'technology services', 'stock', 'equity', 'nyse']::text[], true, 1275,
  'nyse', 'NYSE:NOW', '{"country":"US","exchange":"NYSE","sector":"Technology Services","industry":"Packaged Software","logoid":"servicenow"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'UBS', 'UBS Group AG Registered', 'UBS', 'UBS Group AG Registered - Finance / Investment Managers',
  'stock', 'stock', 'Finance', 'stock_etf',
  'UBS', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_ubs.svg',
  ARRAY['ubs', 'ubs', 'finance', 'stock', 'equity', 'nyse']::text[], true, 1276,
  'nyse', 'NYSE:UBS', '{"country":"US","exchange":"NYSE","sector":"Finance","industry":"Investment Managers","logoid":"ubs-group"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'STX', 'Seagate Technology Holdings PLC', 'STX', 'Seagate Technology Holdings PLC - Electronic Technology / Computer Peripherals',
  'stock', 'stock', 'Electronic Technology', 'stock_etf',
  'STX', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_stx.svg',
  ARRAY['stx', 'seagate', 'electronic technology', 'stock', 'equity', 'nasdaq']::text[], true, 1277,
  'nasdaq', 'NASDAQ:STX', '{"country":"US","exchange":"NASDAQ","sector":"Electronic Technology","industry":"Computer Peripherals","logoid":"seagate"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'UBER', 'Uber Technologies, Inc.', 'UBER', 'Uber Technologies, Inc. - Transportation / Other Transportation',
  'stock', 'stock', 'Transportation', 'stock_etf',
  'UBER', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_uber.svg',
  ARRAY['uber', 'uber', 'transportation', 'stock', 'equity', 'nyse']::text[], true, 1278,
  'nyse', 'NYSE:UBER', '{"country":"US","exchange":"NYSE","sector":"Transportation","industry":"Other Transportation","logoid":"uber"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'IBKR', 'Interactive Brokers Group, Inc.', 'IBKR', 'Interactive Brokers Group, Inc. - Finance / Investment Banks/Brokers',
  'stock', 'stock', 'Finance', 'stock_etf',
  'IBKR', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_ibkr.svg',
  ARRAY['ibkr', 'interactive', 'finance', 'stock', 'equity', 'nasdaq']::text[], true, 1279,
  'nasdaq', 'NASDAQ:IBKR', '{"country":"US","exchange":"NASDAQ","sector":"Finance","industry":"Investment Banks/Brokers","logoid":"interactive-brokers-group"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'ACN', 'Accenture plc', 'ACN', 'Accenture plc - Technology Services / Information Technology Services',
  'stock', 'stock', 'Technology Services', 'stock_etf',
  'ACN', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_acn.svg',
  ARRAY['acn', 'accenture', 'technology services', 'stock', 'equity', 'nyse']::text[], true, 1280,
  'nyse', 'NYSE:ACN', '{"country":"US","exchange":"NYSE","sector":"Technology Services","industry":"Information Technology Services","logoid":"accenture"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'CB', 'Chubb Limited', 'CB', 'Chubb Limited - Finance / Property/Casualty Insurance',
  'stock', 'stock', 'Finance', 'stock_etf',
  'CB', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_cb.svg',
  ARRAY['cb', 'chubb', 'finance', 'stock', 'equity', 'nyse']::text[], true, 1281,
  'nyse', 'NYSE:CB', '{"country":"US","exchange":"NYSE","sector":"Finance","industry":"Property/Casualty Insurance","logoid":"chubb"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'MPC', 'Marathon Petroleum Corporation', 'MPC', 'Marathon Petroleum Corporation - Energy Minerals / Oil Refining/Marketing',
  'stock', 'stock', 'Energy Minerals', 'stock_etf',
  'MPC', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_mpc.svg',
  ARRAY['mpc', 'marathon', 'energy minerals', 'stock', 'equity', 'nyse']::text[], true, 1282,
  'nyse', 'NYSE:MPC', '{"country":"US","exchange":"NYSE","sector":"Energy Minerals","industry":"Oil Refining/Marketing","logoid":"marathon-petroleum"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'BX', 'Blackstone Inc.', 'BX', 'Blackstone Inc. - Finance / Investment Managers',
  'stock', 'stock', 'Finance', 'stock_etf',
  'BX', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_bx.svg',
  ARRAY['bx', 'blackstone', 'finance', 'stock', 'equity', 'nyse']::text[], true, 1283,
  'nyse', 'NYSE:BX', '{"country":"US","exchange":"NYSE","sector":"Finance","industry":"Investment Managers","logoid":"blackstone"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'VLO', 'Valero Energy Corporation', 'VLO', 'Valero Energy Corporation - Energy Minerals / Oil Refining/Marketing',
  'stock', 'stock', 'Energy Minerals', 'stock_etf',
  'VLO', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_vlo.svg',
  ARRAY['vlo', 'valero', 'energy minerals', 'stock', 'equity', 'nyse']::text[], true, 1284,
  'nyse', 'NYSE:VLO', '{"country":"US","exchange":"NYSE","sector":"Energy Minerals","industry":"Oil Refining/Marketing","logoid":"valero-energy"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'LMT', 'Lockheed Martin Corporation', 'LMT', 'Lockheed Martin Corporation - Electronic Technology / Aerospace & Defense',
  'stock', 'stock', 'Electronic Technology', 'stock_etf',
  'LMT', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_lmt.svg',
  ARRAY['lmt', 'lockheed', 'electronic technology', 'stock', 'equity', 'nyse']::text[], true, 1285,
  'nyse', 'NYSE:LMT', '{"country":"US","exchange":"NYSE","sector":"Electronic Technology","industry":"Aerospace & Defense","logoid":"lockheed-martin"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'PGR', 'Progressive Corporation (The)', 'PGR', 'Progressive Corporation (The) - Finance / Multi-Line Insurance',
  'stock', 'stock', 'Finance', 'stock_etf',
  'PGR', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_pgr.svg',
  ARRAY['pgr', 'progressive', 'finance', 'stock', 'equity', 'nyse']::text[], true, 1286,
  'nyse', 'NYSE:PGR', '{"country":"US","exchange":"NYSE","sector":"Finance","industry":"Multi-Line Insurance","logoid":"progressive-ohio"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'VRTX', 'Vertex Pharmaceuticals Incorporated', 'VRTX', 'Vertex Pharmaceuticals Incorporated - Health Technology / Pharmaceuticals: Major',
  'stock', 'stock', 'Health Technology', 'stock_etf',
  'VRTX', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_vrtx.svg',
  ARRAY['vrtx', 'vertex', 'health technology', 'stock', 'equity', 'nasdaq']::text[], true, 1287,
  'nasdaq', 'NASDAQ:VRTX', '{"country":"US","exchange":"NASDAQ","sector":"Health Technology","industry":"Pharmaceuticals: Major","logoid":"vertex-pharmaceutical"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'SPGI', 'S&P Global Inc.', 'SPGI', 'S&P Global Inc. - Commercial Services / Financial Publishing/Services',
  'stock', 'stock', 'Commercial Services', 'stock_etf',
  'SPGI', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_spgi.svg',
  ARRAY['spgi', 'sp', 'commercial services', 'stock', 'equity', 'nyse']::text[], true, 1288,
  'nyse', 'NYSE:SPGI', '{"country":"US","exchange":"NYSE","sector":"Commercial Services","industry":"Financial Publishing/Services","logoid":"s-and-p-global"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'MO', 'Altria Group, Inc.', 'MO', 'Altria Group, Inc. - Consumer Non-Durables / Tobacco',
  'stock', 'stock', 'Consumer Non-Durables', 'stock_etf',
  'MO', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_mo.svg',
  ARRAY['mo', 'altria', 'consumer non-durables', 'stock', 'equity', 'nyse']::text[], true, 1289,
  'nyse', 'NYSE:MO', '{"country":"US","exchange":"NYSE","sector":"Consumer Non-Durables","industry":"Tobacco","logoid":"altria"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'NEM', 'Newmont Corporation', 'NEM', 'Newmont Corporation - Non-Energy Minerals / Precious Metals',
  'stock', 'stock', 'Non-Energy Minerals', 'stock_etf',
  'NEM', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_nem.svg',
  ARRAY['nem', 'newmont', 'non-energy minerals', 'stock', 'equity', 'nyse']::text[], true, 1290,
  'nyse', 'NYSE:NEM', '{"country":"US","exchange":"NYSE","sector":"Non-Energy Minerals","industry":"Precious Metals","logoid":"newmont"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'WDC', 'Western Digital Corporation', 'WDC', 'Western Digital Corporation - Electronic Technology / Computer Peripherals',
  'stock', 'stock', 'Electronic Technology', 'stock_etf',
  'WDC', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_wdc.svg',
  ARRAY['wdc', 'western', 'electronic technology', 'stock', 'equity', 'nasdaq']::text[], true, 1291,
  'nasdaq', 'NASDAQ:WDC', '{"country":"US","exchange":"NASDAQ","sector":"Electronic Technology","industry":"Computer Peripherals","logoid":"webster-financial"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'FTNT', 'Fortinet, Inc.', 'FTNT', 'Fortinet, Inc. - Technology Services / Information Technology Services',
  'stock', 'stock', 'Technology Services', 'stock_etf',
  'FTNT', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_ftnt.svg',
  ARRAY['ftnt', 'fortinet', 'technology services', 'stock', 'equity', 'nasdaq']::text[], true, 1292,
  'nasdaq', 'NASDAQ:FTNT', '{"country":"US","exchange":"NASDAQ","sector":"Technology Services","industry":"Information Technology Services","logoid":"fortinet"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'COF', 'Capital One Financial Corporation', 'COF', 'Capital One Financial Corporation - Finance / Major Banks',
  'stock', 'stock', 'Finance', 'stock_etf',
  'COF', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_cof.svg',
  ARRAY['cof', 'capital', 'finance', 'stock', 'equity', 'nyse']::text[], true, 1293,
  'nyse', 'NYSE:COF', '{"country":"US","exchange":"NYSE","sector":"Finance","industry":"Major Banks","logoid":"capital-one"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'BKNG', 'Booking Holdings Inc. Common Stock', 'BKNG', 'Booking Holdings Inc. Common Stock - Consumer Services / Other Consumer Services',
  'stock', 'stock', 'Consumer Services', 'stock_etf',
  'BKNG', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_bkng.svg',
  ARRAY['bkng', 'booking', 'consumer services', 'stock', 'equity', 'nasdaq']::text[], true, 1294,
  'nasdaq', 'NASDAQ:BKNG', '{"country":"US","exchange":"NASDAQ","sector":"Consumer Services","industry":"Other Consumer Services","logoid":"booking"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'BMY', 'Bristol-Myers Squibb Company', 'BMY', 'Bristol-Myers Squibb Company - Health Technology / Pharmaceuticals: Major',
  'stock', 'stock', 'Health Technology', 'stock_etf',
  'BMY', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_bmy.svg',
  ARRAY['bmy', 'bristol-myers', 'health technology', 'stock', 'equity', 'nyse']::text[], true, 1295,
  'nyse', 'NYSE:BMY', '{"country":"US","exchange":"NYSE","sector":"Health Technology","industry":"Pharmaceuticals: Major","logoid":"bristol-myers-squibb"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'PLD', 'Prologis, Inc.', 'PLD', 'Prologis, Inc. - Finance / Real Estate Investment Trusts',
  'stock', 'stock', 'Finance', 'stock_etf',
  'PLD', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_pld.svg',
  ARRAY['pld', 'prologis', 'finance', 'stock', 'equity', 'nyse']::text[], true, 1296,
  'nyse', 'NYSE:PLD', '{"country":"US","exchange":"NYSE","sector":"Finance","industry":"Real Estate Investment Trusts","logoid":"prologis"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'PH', 'Parker-Hannifin Corporation', 'PH', 'Parker-Hannifin Corporation - Producer Manufacturing / Industrial Machinery',
  'stock', 'stock', 'Producer Manufacturing', 'stock_etf',
  'PH', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_ph.svg',
  ARRAY['ph', 'parker-hannifin', 'producer manufacturing', 'stock', 'equity', 'nyse']::text[], true, 1297,
  'nyse', 'NYSE:PH', '{"country":"US","exchange":"NYSE","sector":"Producer Manufacturing","industry":"Industrial Machinery","logoid":"parker-hannifin"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'MDT', 'Medtronic plc.', 'MDT', 'Medtronic plc. - Health Technology / Medical Specialties',
  'stock', 'stock', 'Health Technology', 'stock_etf',
  'MDT', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_mdt.svg',
  ARRAY['mdt', 'medtronic', 'health technology', 'stock', 'equity', 'nyse']::text[], true, 1298,
  'nyse', 'NYSE:MDT', '{"country":"US","exchange":"NYSE","sector":"Health Technology","industry":"Medical Specialties","logoid":"medtronic"}'::jsonb,
  false, false, false, NOW(), NOW()
),
(
  gen_random_uuid(), 'CVS', 'CVS Health Corporation', 'CVS', 'CVS Health Corporation - Retail Trade / Drugstore Chains',
  'stock', 'stock', 'Retail Trade', 'stock_etf',
  'CVS', 'USD', 'USD', 'unit',
  1, 'share', 2, 0.01,
  'price_difference_contract', false, '/assets/stocks/stk_us_cvs.svg',
  ARRAY['cvs', 'cvs', 'retail trade', 'stock', 'equity', 'nyse']::text[], true, 1299,
  'nyse', 'NYSE:CVS', '{"country":"US","exchange":"NYSE","sector":"Retail Trade","industry":"Drugstore Chains","logoid":"cvs-health"}'::jsonb,
  false, false, false, NOW(), NOW()
)
ON CONFLICT (symbol) DO UPDATE SET
  name = EXCLUDED.name,
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  asset_class = EXCLUDED.asset_class,
  sub_category = EXCLUDED.sub_category,
  product_type = EXCLUDED.product_type,
  base_asset = EXCLUDED.base_asset,
  quote_asset = EXCLUDED.quote_asset,
  profit_currency = EXCLUDED.profit_currency,
  quantity_type = EXCLUDED.quantity_type,
  contract_size = EXCLUDED.contract_size,
  contract_unit = EXCLUDED.contract_unit,
  digits = EXCLUDED.digits,
  tick_size = EXCLUDED.tick_size,
  pnl_calculation_mode = EXCLUDED.pnl_calculation_mode,
  supports_pips = EXCLUDED.supports_pips,
  icon = EXCLUDED.icon,
  search_keywords = EXCLUDED.search_keywords,
  is_active = EXCLUDED.is_active,
  market_source = EXCLUDED.market_source,
  source_symbol = EXCLUDED.source_symbol,
  source_metadata = EXCLUDED.source_metadata,
  updated_at = NOW();

NOTIFY db_changes, '{"table":"instruments","action":"REFRESH"}';
