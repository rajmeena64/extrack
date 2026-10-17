UPDATE trading_catalog.instruments SET icon = 'idx_nifty_50', contract_size = 25, updated_at = NOW() WHERE symbol = 'NIFTY';

UPDATE trading_catalog.instruments SET icon = 'idx_nifty_bank_index', contract_size = 15, updated_at = NOW() WHERE symbol = 'BANKNIFTY';

UPDATE trading_catalog.instruments SET icon = 'idx_nifty_financial_services_index', contract_size = 25, updated_at = NOW() WHERE symbol = 'FINNIFTY';

UPDATE trading_catalog.instruments SET icon = 'idx_nifty_midcap', contract_size = 50, updated_at = NOW() WHERE symbol = 'MIDCPNIFTY';

UPDATE trading_catalog.instruments SET icon = 'idx_nifty_next_50_index', contract_size = 10, updated_at = NOW() WHERE symbol = 'NIFTYNXT50';

UPDATE trading_catalog.instruments SET icon = 'idx_bse_sensex', contract_size = 10, updated_at = NOW() WHERE symbol = 'SENSEX';

UPDATE trading_catalog.instruments SET icon = 'idx_bse_sensex', contract_size = 15, updated_at = NOW() WHERE symbol = 'BANKEX';

UPDATE trading_catalog.instruments SET icon = 'idx_bse_sensex', contract_size = 50, updated_at = NOW() WHERE symbol = 'SENSEX50';

UPDATE trading_catalog.instruments SET icon = 'idx_s_and_p_500', contract_size = 50, updated_at = NOW() WHERE symbol = 'ES';

UPDATE trading_catalog.instruments SET icon = 'idx_s_and_p_500', contract_size = 5, updated_at = NOW() WHERE symbol = 'MES';

UPDATE trading_catalog.instruments SET icon = 'idx_nasdaq_100', contract_size = 20, updated_at = NOW() WHERE symbol = 'NQ';

UPDATE trading_catalog.instruments SET icon = 'idx_nasdaq_100', contract_size = 2, updated_at = NOW() WHERE symbol = 'MNQ';

UPDATE trading_catalog.instruments SET icon = 'idx_dow_30', contract_size = 5, updated_at = NOW() WHERE symbol = 'YM';

UPDATE trading_catalog.instruments SET icon = 'idx_dow_30', contract_size = 0.5, updated_at = NOW() WHERE symbol = 'MYM';

UPDATE trading_catalog.instruments SET icon = 'idx_russell_2000', contract_size = 50, updated_at = NOW() WHERE symbol = 'RTY';

UPDATE trading_catalog.instruments SET icon = 'idx_russell_2000', contract_size = 5, updated_at = NOW() WHERE symbol = 'M2K';

UPDATE trading_catalog.instruments SET icon = 'idx_nikkei_225', contract_size = 5, updated_at = NOW() WHERE symbol = 'NKD';

UPDATE trading_catalog.instruments SET icon = 'idx_dax', contract_size = 25, updated_at = NOW() WHERE symbol = 'FDAX';

UPDATE trading_catalog.instruments SET icon = 'idx_dax', contract_size = 5, updated_at = NOW() WHERE symbol = 'FDXM';

UPDATE trading_catalog.instruments SET icon = 'idx_euro_stoxx_50', contract_size = 10, updated_at = NOW() WHERE symbol = 'FESX';

UPDATE trading_catalog.instruments SET icon = 'idx_asx_200', contract_size = 25, updated_at = NOW() WHERE symbol = 'AUS200';


INSERT INTO trading_catalog.instruments (
  id, symbol, name, display_name, description,
  category, asset_class, product_type, contract_size, quantity_type, pnl_calculation_mode,
  quote_asset, profit_currency, digits, tick_size, icon, supports_pips,
  search_keywords, is_active, sort_order, market_source,
  source_symbol, source_metadata, is_historical_sync, is_live_feed, is_ram_cached, created_at, updated_at
) VALUES
(
    gen_random_uuid(), 'SPX', 'S&P 500', 'SPX', 'S&P 500 (SP)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_s_and_p_500', false,
    ARRAY['spx','s&p','500','sp','index'], true, 300, 'sp',
    'SPX', '{"exchange":"SP","logoid":"indices/s-and-p-500","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'IXIC', 'US Composite Index', 'IXIC', 'US Composite Index (TVC)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_nasdaq_composite', false,
    ARRAY['ixic','us','composite','index','tvc'], true, 301, 'tvc',
    'IXIC', '{"exchange":"TVC","logoid":"indices/nasdaq-composite","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'DJI', 'Dow Jones Industrial Average', 'DJI', 'Dow Jones Industrial Average (DJ)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_dow_30', false,
    ARRAY['dji','dow','jones','industrial','average','dj','index'], true, 302, 'dj',
    'DJI', '{"exchange":"DJ","logoid":"indices/dow-30","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'VIX', 'CBOE Volatility Index', 'VIX', 'CBOE Volatility Index (CBOE)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_volatility_s_and_p_500', false,
    ARRAY['vix','cboe','volatility','index'], true, 303, 'cboe',
    'VIX', '{"exchange":"CBOE","logoid":"indices/volatility-s-and-p-500","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'TSX', 'S&P/TSX Composite index', 'TSX', 'S&P/TSX Composite index (TSX)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_s_and_p_tsx_composite_index', false,
    ARRAY['tsx','s&p/tsx','composite','index'], true, 304, 'tsx',
    'TSX', '{"exchange":"TSX","logoid":"indices/s-and-p-tsx-composite-index","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'UKX', 'UK 100 INDEX', 'UKX', 'UK 100 INDEX (TVC)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_uk_100', false,
    ARRAY['ukx','uk','100','index','tvc'], true, 305, 'tvc',
    'UKX', '{"exchange":"TVC","logoid":"indices/uk-100","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'DAX', 'DAX Index', 'DAX', 'DAX Index (XETR)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_dax', false,
    ARRAY['dax','index','xetr'], true, 306, 'xetr',
    'DAX', '{"exchange":"XETR","logoid":"indices/dax","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'PX1', 'CAC 40 Index', 'PX1', 'CAC 40 Index (EURONEXT)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_cac_40', false,
    ARRAY['px1','cac','40','index','euronext'], true, 307, 'euronext',
    'PX1', '{"exchange":"EURONEXT","logoid":"indices/cac-40","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'FTMIB', 'MILANO ITALIA BORSA INDEX', 'FTMIB', 'MILANO ITALIA BORSA INDEX (TVC)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_ftse_mib', false,
    ARRAY['ftmib','milano','italia','borsa','index','tvc'], true, 308, 'tvc',
    'FTMIB', '{"exchange":"TVC","logoid":"indices/ftse-mib","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'NI225', 'Japan 225 Index', 'NI225', 'Japan 225 Index (TVC)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_nikkei_225', false,
    ARRAY['ni225','japan','225','index','tvc'], true, 309, 'tvc',
    'NI225', '{"exchange":"TVC","logoid":"indices/nikkei-225","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'KOSPI', 'KOREA COMPOSITE STOCK PRICE INDEX (KOSPI)', 'KOSPI', 'KOREA COMPOSITE STOCK PRICE INDEX (KOSPI) (TVC)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_korea_composite_index', false,
    ARRAY['kospi','korea','composite','stock','price','index','(kospi)','tvc'], true, 310, 'tvc',
    'KOSPI', '{"exchange":"TVC","logoid":"indices/korea-composite-index","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), '000001', 'SSE Composite Index', '000001', 'SSE Composite Index (SSE)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_sse_composite', false,
    ARRAY['000001','sse','composite','index'], true, 311, 'sse',
    '000001', '{"exchange":"SSE","logoid":"indices/sse-composite","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), '399001', 'Shenzhen Component Index', '399001', 'Shenzhen Component Index (SZSE)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_szse_component_index', false,
    ARRAY['399001','shenzhen','component','index','szse'], true, 312, 'szse',
    '399001', '{"exchange":"SZSE","logoid":"indices/szse-component-index","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'HSI', 'Hang Seng Index', 'HSI', 'Hang Seng Index (HSI)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_hang_seng', false,
    ARRAY['hsi','hang','seng','index'], true, 313, 'hsi',
    'HSI', '{"exchange":"HSI","logoid":"indices/hang-seng","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'STI', 'STRAITS TIMES INDEX', 'STI', 'STRAITS TIMES INDEX (TVC)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_straits_times_index', false,
    ARRAY['sti','straits','times','index','tvc'], true, 314, 'tvc',
    'STI', '{"exchange":"TVC","logoid":"indices/straits-times-index","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'XJO', 'S&P/ASX 200 Index', 'XJO', 'S&P/ASX 200 Index (SP)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_asx_200', false,
    ARRAY['xjo','s&p/asx','200','index','sp'], true, 315, 'sp',
    'XJO', '{"exchange":"SP","logoid":"indices/asx-200","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'NZ50G', 'S&P/NZX 50 Gross Index', 'NZ50G', 'S&P/NZX 50 Gross Index (NZX)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_s_and_p_nzx_50_index_gross', false,
    ARRAY['nz50g','s&p/nzx','50','gross','index','nzx'], true, 316, 'nzx',
    'NZ50G', '{"exchange":"NZX","logoid":"indices/s-and-p-nzx-50-index-gross","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'FBMKLCI', 'FBM KLCI', 'FBMKLCI', 'FBM KLCI (FTSEMYX)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_ftse_bursa_malaysia', false,
    ARRAY['fbmklci','fbm','klci','ftsemyx','index'], true, 317, 'ftsemyx',
    'FBMKLCI', '{"exchange":"FTSEMYX","logoid":"indices/ftse-bursa-malaysia","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'COMPOSITE', 'IDX Composite Index', 'COMPOSITE', 'IDX Composite Index (IDX)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_jakarta_composite_index', false,
    ARRAY['composite','idx','index'], true, 318, 'idx',
    'COMPOSITE', '{"exchange":"IDX","logoid":"indices/jakarta-composite-index","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'SX5E', 'STOXX 50', 'SX5E', 'STOXX 50 (TVC)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_euro_stoxx_50', false,
    ARRAY['sx5e','stoxx','50','tvc','index'], true, 319, 'tvc',
    'SX5E', '{"exchange":"TVC","logoid":"indices/euro-stoxx-50","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'IBC', 'IBEX 35 Index', 'IBC', 'IBEX 35 Index (BME)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_ibex_35', false,
    ARRAY['ibc','ibex','35','index','bme'], true, 320, 'bme',
    'IBC', '{"exchange":"BME","logoid":"indices/ibex-35","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'SMI', 'Swiss Market Index', 'SMI', 'Swiss Market Index (SIX)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_swiss_market_index', false,
    ARRAY['smi','swiss','market','index','six'], true, 321, 'six',
    'SMI', '{"exchange":"SIX","logoid":"indices/swiss-market-index","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'WIG20', 'WIG20 Index', 'WIG20', 'WIG20 Index (GPW)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_wig_20', false,
    ARRAY['wig20','index','gpw'], true, 322, 'gpw',
    'WIG20', '{"exchange":"GPW","logoid":"indices/wig-20","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'AEX', 'AEX-Index', 'AEX', 'AEX-Index (EURONEXT)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_aex_index', false,
    ARRAY['aex','aex-index','euronext','index'], true, 323, 'euronext',
    'AEX', '{"exchange":"EURONEXT","logoid":"indices/aex-index","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'BEL20', 'BEL 20 Index', 'BEL20', 'BEL 20 Index (EURONEXT)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_bel_20_index', false,
    ARRAY['bel20','bel','20','index','euronext'], true, 324, 'euronext',
    'BEL20', '{"exchange":"EURONEXT","logoid":"indices/bel-20-index","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'OMXH25', 'OMX Helsinki 25 Index', 'OMXH25', 'OMX Helsinki 25 Index (OMXHEX)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_omx_helsinki_25_index', false,
    ARRAY['omxh25','omx','helsinki','25','index','omxhex'], true, 325, 'omxhex',
    'OMXH25', '{"exchange":"OMXHEX","logoid":"indices/omx-helsinki-25-index","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'OMXS30', 'OMX Stockholm 30 Index', 'OMXS30', 'OMX Stockholm 30 Index (OMXSTO)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_omxs_30', false,
    ARRAY['omxs30','omx','stockholm','30','index','omxsto'], true, 326, 'omxsto',
    'OMXS30', '{"exchange":"OMXSTO","logoid":"indices/omxs-30","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'OMXC25', 'OMX Copenhagen 25 Index', 'OMXC25', 'OMX Copenhagen 25 Index (OMXCOP)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_omx_copenhagen_25_index', false,
    ARRAY['omxc25','omx','copenhagen','25','index','omxcop'], true, 327, 'omxcop',
    'OMXC25', '{"exchange":"OMXCOP","logoid":"indices/omx-copenhagen-25-index","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'BELEX15', 'BELEX 15 Index', 'BELEX15', 'BELEX 15 Index (BELEX)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_belex_15_index', false,
    ARRAY['belex15','belex','15','index'], true, 328, 'belex',
    'BELEX15', '{"exchange":"BELEX","logoid":"indices/belex-15-index","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'XU100', 'BIST 100 Index', 'XU100', 'BIST 100 Index (BIST)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_bist_100', false,
    ARRAY['xu100','bist','100','index'], true, 329, 'bist',
    'XU100', '{"exchange":"BIST","logoid":"indices/bist-100","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'TA35', 'TA-35 Index', 'TA35', 'TA-35 Index (TASE)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_ta_53_index', false,
    ARRAY['ta35','ta-35','index','tase'], true, 330, 'tase',
    'TA35', '{"exchange":"TASE","logoid":"indices/ta-53-index","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'SA40', 'SOUTH AFRICA TOP 40 INDEX', 'SA40', 'SOUTH AFRICA TOP 40 INDEX (TVC)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_csouth_africa_top_40_index', false,
    ARRAY['sa40','south','africa','top','40','index','tvc'], true, 331, 'tvc',
    'SA40', '{"exchange":"TVC","logoid":"indices/csouth-africa-top-40-index","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'DFMGI', 'DFM General Index', 'DFMGI', 'DFM General Index (DFM)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_dfm_index', false,
    ARRAY['dfmgi','dfm','general','index'], true, 332, 'dfm',
    'DFMGI', '{"exchange":"DFM","logoid":"indices/dfm-index","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'TASI', 'Tadawul All Shares Index', 'TASI', 'Tadawul All Shares Index (TADAWUL)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_tadawul_all_shares_index', false,
    ARRAY['tasi','tadawul','all','shares','index'], true, 333, 'tadawul',
    'TASI', '{"exchange":"TADAWUL","logoid":"indices/tadawul-all-shares-index","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'GNRI', 'QE Index', 'GNRI', 'QE Index (QSE)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_qe_index', false,
    ARRAY['gnri','qe','index','qse'], true, 334, 'qse',
    'GNRI', '{"exchange":"QSE","logoid":"indices/qe-index","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'EGX30', 'EGX 30 Index', 'EGX30', 'EGX 30 Index (EGX)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_egx_30_index', false,
    ARRAY['egx30','egx','30','index'], true, 335, 'egx',
    'EGX30', '{"exchange":"EGX","logoid":"indices/egx-30-index","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'IBOV', 'Bovespa Index', 'IBOV', 'Bovespa Index (BMFBOVESPA)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_bovespa_index', false,
    ARRAY['ibov','bovespa','index','bmfbovespa'], true, 336, 'bmfbovespa',
    'IBOV', '{"exchange":"BMFBOVESPA","logoid":"indices/bovespa-index","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'ME', 'S&P/BMV IPC Index', 'ME', 'S&P/BMV IPC Index (BMV)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_ipc_mexico_index', false,
    ARRAY['me','s&p/bmv','ipc','index','bmv'], true, 337, 'bmv',
    'ME', '{"exchange":"BMV","logoid":"indices/ipc-mexico-index","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'IMV', 'S&P MERVAL Index', 'IMV', 'S&P MERVAL Index (SP)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_merval_index', false,
    ARRAY['imv','s&p','merval','index','sp'], true, 338, 'sp',
    'IMV', '{"exchange":"SP","logoid":"indices/merval-index","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'ICAP', 'MSCI COLCAP Index', 'ICAP', 'MSCI COLCAP Index (BVC)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_indice_bursatil_de_capitalizacion', false,
    ARRAY['icap','msci','colcap','index','bvc'], true, 339, 'bvc',
    'ICAP', '{"exchange":"BVC","logoid":"indices/indice-bursatil-de-capitalizacion","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'MXNUAMPEGEN', 'MSCI NUAM Peru General', 'MXNUAMPEGEN', 'MSCI NUAM Peru General (BVL)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_s_and_p_bvl_peru_general_index', false,
    ARRAY['mxnuampegen','msci','nuam','peru','general','bvl','index'], true, 340, 'bvl',
    'MXNUAMPEGEN', '{"exchange":"BVL","logoid":"indices/s-and-p-bvl-peru-general-index","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'BUX', 'EURO STOXX® 50 Index – EUR (Price Return)', 'BUX', 'EURO STOXX® 50 Index – EUR (Price Return) (STOXX)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_budapest_stock_index', false,
    ARRAY['bux','euro','stoxx®','50','index','eur','(price','return)','stoxx'], true, 341, 'stoxx',
    'BUX', '{"exchange":"STOXX","logoid":"indices/budapest-stock-index","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'GD', 'ATHEX Composite Index', 'GD', 'ATHEX Composite Index (ATHEX)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_composite_index_gd', false,
    ARRAY['gd','athex','composite','index'], true, 342, 'athex',
    'GD', '{"exchange":"ATHEX","logoid":"indices/composite-index-gd","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'IDX30', 'Bucharest Exchange Trading Index', 'IDX30', 'Bucharest Exchange Trading Index (BVB)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_idx_30_index', false,
    ARRAY['idx30','bucharest','exchange','trading','index','bvb'], true, 343, 'bvb',
    'IDX30', '{"exchange":"BVB","logoid":"indices/idx-30-index","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'SET', 'SET Index', 'SET', 'SET Index (SET)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_set', false,
    ARRAY['set','index'], true, 344, 'set',
    'SET', '{"exchange":"SET","logoid":"indices/set","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'N100', 'Euronext 100 Index', 'N100', 'Euronext 100 Index (EURONEXT)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_euronext_100', false,
    ARRAY['n100','euronext','100','index'], true, 345, 'euronext',
    'N100', '{"exchange":"EURONEXT","logoid":"indices/euronext-100","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'RUT', 'ICE BofAML U.S. Bond Market Option Volatility Estimate Index', 'RUT', 'ICE BofAML U.S. Bond Market Option Volatility Estimate Index (TVC)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_russell_2000', false,
    ARRAY['rut','ice','bofaml','u.s.','bond','market','option','volatility','estimate','index','tvc'], true, 346, 'tvc',
    'RUT', '{"exchange":"TVC","logoid":"indices/russell-2000","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'NYA', 'AEX', 'NYA', 'AEX (TVC)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_nyce_composite', false,
    ARRAY['nya','aex','tvc','index'], true, 347, 'tvc',
    'NYA', '{"exchange":"TVC","logoid":"indices/nyce-composite","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'RUI', 'US Small Cap 1000 Index', 'RUI', 'US Small Cap 1000 Index (TVC)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_russell_1000_index', false,
    ARRAY['rui','us','small','cap','1000','index','tvc'], true, 348, 'tvc',
    'RUI', '{"exchange":"TVC","logoid":"indices/russell-1000-index","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'SXXP', 'STOXX 600', 'SXXP', 'STOXX 600 (TVC)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_stoxx_600', false,
    ARRAY['sxxp','stoxx','600','tvc','index'], true, 349, 'tvc',
    'SXXP', '{"exchange":"TVC","logoid":"indices/stoxx-600","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'SVX', 'S&P 500 Value', 'SVX', 'S&P 500 Value (SP)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_s_and_p_500_value_index', false,
    ARRAY['svx','s&p','500','value','sp','index'], true, 350, 'sp',
    'SVX', '{"exchange":"SP","logoid":"indices/s-and-p-500-value-index","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'MID', 'S&P 400', 'MID', 'S&P 400 (SP)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_s_and_p_400_index', false,
    ARRAY['mid','s&p','400','sp','index'], true, 351, 'sp',
    'MID', '{"exchange":"SP","logoid":"indices/s-and-p-400-index","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'OEX', 'S&P 100', 'OEX', 'S&P 100 (SP)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_s_and_p_100_index', false,
    ARRAY['oex','s&p','100','sp','index'], true, 352, 'sp',
    'OEX', '{"exchange":"SP","logoid":"indices/s-and-p-100-index","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'SPGSCI', 'S&P GSCI', 'SPGSCI', 'S&P GSCI (SP)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_s_and_p_goldman_sachs_commodity_index', false,
    ARRAY['spgsci','s&p','gsci','sp','index'], true, 353, 'sp',
    'SPGSCI', '{"exchange":"SP","logoid":"indices/s-and-p-goldman-sachs-commodity-index","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'NDX', 'NASDAQ-100 Index', 'NDX', 'NASDAQ-100 Index (NASDAQ)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_nasdaq_100', false,
    ARRAY['ndx','nasdaq-100','index','nasdaq'], true, 354, 'nasdaq',
    'NDX', '{"exchange":"NASDAQ","logoid":"indices/nasdaq-100","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'XAX', 'NYSE AMERICAN COMPOSITE INDEX', 'XAX', 'NYSE AMERICAN COMPOSITE INDEX (NYSE)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_amex_composite_index', false,
    ARRAY['xax','nyse','american','composite','index'], true, 355, 'nyse',
    'XAX', '{"exchange":"NYSE","logoid":"indices/amex-composite-index","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'SOX', 'PHLX Oil Service Sector', 'SOX', 'PHLX Oil Service Sector (NASDAQ)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_philadelphia_semiconductor_index', false,
    ARRAY['sox','phlx','oil','service','sector','nasdaq','index'], true, 356, 'nasdaq',
    'SOX', '{"exchange":"NASDAQ","logoid":"indices/philadelphia-semiconductor-index","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'DJT', 'Dow Jones Transportation Average', 'DJT', 'Dow Jones Transportation Average (DJ)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_dow_jones_transporation_average_index', false,
    ARRAY['djt','dow','jones','transportation','average','dj','index'], true, 357, 'dj',
    'DJT', '{"exchange":"DJ","logoid":"indices/dow-jones-transporation-average-index","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'W1DOW', 'Dow Jones Commodity Index Wheat Total Return', 'W1DOW', 'Dow Jones Commodity Index Wheat Total Return (DJ)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_dow_jones_global', false,
    ARRAY['w1dow','dow','jones','commodity','index','wheat','total','return','dj'], true, 358, 'dj',
    'W1DOW', '{"exchange":"DJ","logoid":"indices/dow-jones-global","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'DJA', 'Dow Jones Composite Average', 'DJA', 'Dow Jones Composite Average (DJ)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_dow_jones_composite_average_index', false,
    ARRAY['dja','dow','jones','composite','average','dj','index'], true, 359, 'dj',
    'DJA', '{"exchange":"DJ","logoid":"indices/dow-jones-composite-average-index","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'REIT', 'Dow Jones Utility Average', 'REIT', 'Dow Jones Utility Average (DJ)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_dow_jones_equity_all_reit_tr', false,
    ARRAY['reit','dow','jones','utility','average','dj','index'], true, 360, 'dj',
    'REIT', '{"exchange":"DJ","logoid":"indices/dow-jones-equity-all-reit-tr","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'DJCIGR', 'Dow Jones Commodity Index Grains', 'DJCIGR', 'Dow Jones Commodity Index Grains (DJ)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_dow_jones_commodity_index_grains', false,
    ARRAY['djcigr','dow','jones','commodity','index','grains','dj'], true, 361, 'dj',
    'DJCIGR', '{"exchange":"DJ","logoid":"indices/dow-jones-commodity-index-grains","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'VXXIDSP', 'S&P 500 VIX Short-Term Futures Index Excess Return', 'VXXIDSP', 'S&P 500 VIX Short-Term Futures Index Excess Return (SP)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_s_and_p_500_vix_short_term_futures', false,
    ARRAY['vxxidsp','s&p','500','vix','short-term','futures','index','excess','return','sp'], true, 362, 'sp',
    'VXXIDSP', '{"exchange":"SP","logoid":"indices/s-and-p-500-vix-short-term-futures","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'DWCPF', 'Dow Jones Commodity Index Silver', 'DWCPF', 'Dow Jones Commodity Index Silver (DJ)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_dow_jones_us_completion_total_stock_market', false,
    ARRAY['dwcpf','dow','jones','commodity','index','silver','dj'], true, 363, 'dj',
    'DWCPF', '{"exchange":"DJ","logoid":"indices/dow-jones-us-completion-total-stock-market","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'SP500LVOL', 'Dow Jones Commodity Index Sugar', 'SP500LVOL', 'Dow Jones Commodity Index Sugar (DJ)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_s_and_p_500_low_volatility', false,
    ARRAY['sp500lvol','dow','jones','commodity','index','sugar','dj'], true, 364, 'dj',
    'SP500LVOL', '{"exchange":"DJ","logoid":"indices/s-and-p-500-low-volatility","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'DXY', 'U.S. Dollar Currency Index', 'DXY', 'U.S. Dollar Currency Index (TVC)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_u_s_dollar_index', false,
    ARRAY['dxy','u.s.','dollar','currency','index','tvc'], true, 365, 'tvc',
    'DXY', '{"exchange":"TVC","logoid":"indices/u-s-dollar-index","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'EXY', 'Euro Currency Index', 'EXY', 'Euro Currency Index (TVC)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_euro_currency_index', false,
    ARRAY['exy','euro','currency','index','tvc'], true, 366, 'tvc',
    'EXY', '{"exchange":"TVC","logoid":"indices/euro-currency-index","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'BXY', 'British Pound Currency Index', 'BXY', 'British Pound Currency Index (TVC)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_british_ppound_currency_index', false,
    ARRAY['bxy','british','pound','currency','index','tvc'], true, 367, 'tvc',
    'BXY', '{"exchange":"TVC","logoid":"indices/british-ppound-currency-index","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'SXY', 'Swiss Franc Currency Index', 'SXY', 'Swiss Franc Currency Index (TVC)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_swiss_franc_currency_index', false,
    ARRAY['sxy','swiss','franc','currency','index','tvc'], true, 368, 'tvc',
    'SXY', '{"exchange":"TVC","logoid":"indices/swiss-franc-currency-index","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'JXY', 'Japanese Yen Currency Index', 'JXY', 'Japanese Yen Currency Index (TVC)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_japanese_yen_currency_index', false,
    ARRAY['jxy','japanese','yen','currency','index','tvc'], true, 369, 'tvc',
    'JXY', '{"exchange":"TVC","logoid":"indices/japanese-yen-currency-index","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'CXY', 'Canadian Dollar Currency Index', 'CXY', 'Canadian Dollar Currency Index (TVC)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_canadian_dollar_currency_index', false,
    ARRAY['cxy','canadian','dollar','currency','index','tvc'], true, 370, 'tvc',
    'CXY', '{"exchange":"TVC","logoid":"indices/canadian-dollar-currency-index","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'AXY', 'Australian Dollar Currency Index', 'AXY', 'Australian Dollar Currency Index (TVC)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_australian_dollar_currency_index', false,
    ARRAY['axy','australian','dollar','currency','index','tvc'], true, 371, 'tvc',
    'AXY', '{"exchange":"TVC","logoid":"indices/australian-dollar-currency-index","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'ZXY', 'New Zealand Dollar Currency Index', 'ZXY', 'New Zealand Dollar Currency Index (TVC)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_new_zealand_dollar_currency_index', false,
    ARRAY['zxy','new','zealand','dollar','currency','index','tvc'], true, 372, 'tvc',
    'ZXY', '{"exchange":"TVC","logoid":"indices/new-zealand-dollar-currency-index","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'MXIPSAGC', 'MSCI IPSA Index (with dividends)', 'MXIPSAGC', 'MSCI IPSA Index (with dividends) (BCS)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_s_and_p_ipsa', false,
    ARRAY['mxipsagc','msci','ipsa','index','(with','dividends)','bcs'], true, 373, 'bcs',
    'MXIPSAGC', '{"exchange":"BCS","logoid":"indices/s-and-p-ipsa","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'IAB', 'THOMSON REUTERS/CORECOMMODITY CRB INDEX', 'IAB', 'THOMSON REUTERS/CORECOMMODITY CRB INDEX (TVC)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_s_and_p_byma_argentina_general_index', false,
    ARRAY['iab','thomson','reuters/corecommodity','crb','index','tvc'], true, 374, 'tvc',
    'IAB', '{"exchange":"TVC","logoid":"indices/s-and-p-byma-argentina-general-index","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'IBXL', 'IND FDO IMOB', 'IBXL', 'IND FDO IMOB (BMFBOVESPA)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_ibrx_50', false,
    ARRAY['ibxl','ind','fdo','imob','bmfbovespa','index'], true, 375, 'bmfbovespa',
    'IBXL', '{"exchange":"BMFBOVESPA","logoid":"indices/ibrx-50","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'MDAX', 'Russia Index', 'MDAX', 'Russia Index (RUS)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_mdax', false,
    ARRAY['mdax','russia','index','rus'], true, 376, 'rus',
    'MDAX', '{"exchange":"RUS","logoid":"indices/mdax","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'OSEBX', 'Oslo Børs Benchmark GI Index', 'OSEBX', 'Oslo Børs Benchmark GI Index (OSL)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_oslo_b_rs_benchmark_gi_index', false,
    ARRAY['osebx','oslo','børs','benchmark','gi','index','osl'], true, 377, 'osl',
    'OSEBX', '{"exchange":"OSL","logoid":"indices/oslo-b-rs-benchmark-gi-index","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'ATX', 'Austrian Traded Index in EUR', 'ATX', 'Austrian Traded Index in EUR (VIE)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_austrian_traded_index_in_eur', false,
    ARRAY['atx','austrian','traded','index','in','eur','vie'], true, 378, 'vie',
    'ATX', '{"exchange":"VIE","logoid":"indices/austrian-traded-index-in-eur","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'PX', 'PX Index', 'PX', 'PX Index (PSECZ)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_px_index', false,
    ARRAY['px','index','psecz'], true, 379, 'psecz',
    'PX', '{"exchange":"PSECZ","logoid":"indices/px-index","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'PSI20', 'PSI Index', 'PSI20', 'PSI Index (EURONEXT)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_psi_index', false,
    ARRAY['psi20','psi','index','euronext'], true, 380, 'euronext',
    'PSI20', '{"exchange":"EURONEXT","logoid":"indices/psi-index","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'ISEQ', 'ISEQ All Share', 'ISEQ', 'ISEQ All Share (EURONEXT)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_iseq_all_share', false,
    ARRAY['iseq','all','share','euronext','index'], true, 381, 'euronext',
    'ISEQ', '{"exchange":"EURONEXT","logoid":"indices/iseq-all-share","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'OMXI15', 'OMX Iceland 15 Index', 'OMXI15', 'OMX Iceland 15 Index (OMXICE)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_omx_iceland_15_index', false,
    ARRAY['omxi15','omx','iceland','15','index','omxice'], true, 382, 'omxice',
    'OMXI15', '{"exchange":"OMXICE","logoid":"indices/omx-iceland-15-index","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'ITLMS', 'FTSE Italia All-Share Index', 'ITLMS', 'FTSE Italia All-Share Index (FTSE)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_ftse_italia_all_share', false,
    ARRAY['itlms','ftse','italia','all-share','index'], true, 383, 'ftse',
    'ITLMS', '{"exchange":"FTSE","logoid":"indices/ftse-italia-all-share","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'OMXRGI', 'OMX Riga Gross Index', 'OMXRGI', 'OMX Riga Gross Index (OMXRSE)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_omx_riga_gi', false,
    ARRAY['omxrgi','omx','riga','gross','index','omxrse'], true, 384, 'omxrse',
    'OMXRGI', '{"exchange":"OMXRSE","logoid":"indices/omx-riga-gi","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'OMXVGI', 'OMX Vilnius Gross Index', 'OMXVGI', 'OMX Vilnius Gross Index (OMXVSE)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_omx_vilnius_gi', false,
    ARRAY['omxvgi','omx','vilnius','gross','index','omxvse'], true, 385, 'omxvse',
    'OMXVGI', '{"exchange":"OMXVSE","logoid":"indices/omx-vilnius-gi","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'LUXX', 'LuxX Price Index', 'LUXX', 'LuxX Price Index (LUXSE)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_luxx_price_index', false,
    ARRAY['luxx','price','index','luxse'], true, 386, 'luxse',
    'LUXX', '{"exchange":"LUXSE","logoid":"indices/luxx-price-index","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'AMX', 'AMX-Index', 'AMX', 'AMX-Index (EURONEXT)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_amx_index', false,
    ARRAY['amx','amx-index','euronext','index'], true, 387, 'euronext',
    'AMX', '{"exchange":"EURONEXT","logoid":"indices/amx-index","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'OBX', 'AEX All-Share Index', 'OBX', 'AEX All-Share Index (EURONEXT)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_obx_total_return_index', false,
    ARRAY['obx','aex','all-share','index','euronext'], true, 388, 'euronext',
    'OBX', '{"exchange":"EURONEXT","logoid":"indices/obx-total-return-index","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'WIG', 'WIG Index', 'WIG', 'WIG Index (GPW)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_wig', false,
    ARRAY['wig','index','gpw'], true, 389, 'gpw',
    'WIG', '{"exchange":"GPW","logoid":"indices/wig","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'MWIG40', 'mWIG40 Index', 'MWIG40', 'mWIG40 Index (GPW)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_mwig40', false,
    ARRAY['mwig40','index','gpw'], true, 390, 'gpw',
    'MWIG40', '{"exchange":"GPW","logoid":"indices/mwig40","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'SWIG80', 'sWIG80 Index', 'SWIG80', 'sWIG80 Index (GPW)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_swig80', false,
    ARRAY['swig80','index','gpw'], true, 391, 'gpw',
    'SWIG80', '{"exchange":"GPW","logoid":"indices/swig80","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'BVL', 'PSI All-Share Index', 'BVL', 'PSI All-Share Index (EURONEXT)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_psi_all_share_index', false,
    ARRAY['bvl','psi','all-share','index','euronext'], true, 392, 'euronext',
    'BVL', '{"exchange":"EURONEXT","logoid":"indices/psi-all-share-index","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'TDXP', 'TecDAX Index', 'TDXP', 'TecDAX Index (XETR)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_tecdax', false,
    ARRAY['tdxp','tecdax','index','xetr'], true, 393, 'xetr',
    'TDXP', '{"exchange":"XETR","logoid":"indices/tecdax","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'SAX', 'The Slovak Share Index', 'SAX', 'The Slovak Share Index (BSSE)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_the_slovak_share_index', false,
    ARRAY['sax','the','slovak','share','index','bsse'], true, 394, 'bsse',
    'SAX', '{"exchange":"BSSE","logoid":"indices/the-slovak-share-index","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'LXC', 'Latibex All Share Index', 'LXC', 'Latibex All Share Index (BME)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_latibex_as', false,
    ARRAY['lxc','latibex','all','share','index','bme'], true, 395, 'bme',
    'LXC', '{"exchange":"BME","logoid":"indices/latibex-as","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'OMXTGI', 'OMX Copenhagen 20 Index', 'OMXTGI', 'OMX Copenhagen 20 Index (OMXCOP)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_omx_tallinn_gi', false,
    ARRAY['omxtgi','omx','copenhagen','20','index','omxcop'], true, 396, 'omxcop',
    'OMXTGI', '{"exchange":"OMXCOP","logoid":"indices/omx-tallinn-gi","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'XU030', 'OMX Stockholm Price Index', 'XU030', 'OMX Stockholm Price Index (OMXSTO)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_bist_30', false,
    ARRAY['xu030','omx','stockholm','price','index','omxsto'], true, 397, 'omxsto',
    'XU030', '{"exchange":"OMXSTO","logoid":"indices/bist-30","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'XUTUM', 'BIST All Shares Index', 'XUTUM', 'BIST All Shares Index (BIST)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_bist_katilim_tum', false,
    ARRAY['xutum','bist','all','shares','index'], true, 398, 'bist',
    'XUTUM', '{"exchange":"BIST","logoid":"indices/bist-katilim-tum","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'MCX', 'BIST Banks Index', 'MCX', 'BIST Banks Index (BIST)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_ftse_250_esg_risk_adjusted', false,
    ARRAY['mcx','bist','banks','index'], true, 399, 'bist',
    'MCX', '{"exchange":"BIST","logoid":"indices/ftse-250-esg-risk-adjusted","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'AIM5', 'FTSE AIM UK 50 Index', 'AIM5', 'FTSE AIM UK 50 Index (FTSE)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_ftse_twse_rafi_taiwan_50', false,
    ARRAY['aim5','ftse','aim','uk','50','index'], true, 400, 'ftse',
    'AIM5', '{"exchange":"FTSE","logoid":"indices/ftse-twse-rafi-taiwan-50","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'NMX', 'FTSE 350 Index', 'NMX', 'FTSE 350 Index (FTSE)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_ftse_rafi_japan_350', false,
    ARRAY['nmx','ftse','350','index'], true, 401, 'ftse',
    'NMX', '{"exchange":"FTSE","logoid":"indices/ftse-rafi-japan-350","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'CACT', 'BEL All-Share Index', 'CACT', 'BEL All-Share Index (EURONEXT)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_cac_all_tradable', false,
    ARRAY['cact','bel','all-share','index','euronext'], true, 402, 'euronext',
    'CACT', '{"exchange":"EURONEXT","logoid":"indices/cac-all-tradable","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'PX4', 'SBF 120 Index', 'PX4', 'SBF 120 Index (EURONEXT)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_sbf_120', false,
    ARRAY['px4','sbf','120','index','euronext'], true, 403, 'euronext',
    'PX4', '{"exchange":"EURONEXT","logoid":"indices/sbf-120","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'OMXIPI', 'FTSE/ATHEX Large Cap Index', 'OMXIPI', 'FTSE/ATHEX Large Cap Index (ATHEX)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_omx_iceland_all_share_price_index', false,
    ARRAY['omxipi','ftse/athex','large','cap','index','athex'], true, 404, 'athex',
    'OMXIPI', '{"exchange":"ATHEX","logoid":"indices/omx-iceland-all-share-price-index","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'GEN', 'ISEQ 20', 'GEN', 'ISEQ 20 (EURONEXT)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_general_index_cse', false,
    ARRAY['gen','iseq','20','euronext','index'], true, 405, 'euronext',
    'GEN', '{"exchange":"EURONEXT","logoid":"indices/general-index-cse","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'FTSE20', 'FTSE/CySE 20 Index', 'FTSE20', 'FTSE/CySE 20 Index (CSECY)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_ftse_cyse_20', false,
    ARRAY['ftse20','ftse/cyse','20','index','csecy'], true, 406, 'csecy',
    'FTSE20', '{"exchange":"CSECY","logoid":"indices/ftse-cyse-20","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'IX0001', 'TSEC CAPITALIZATION WEIGHTED STOCK INDEX', 'IX0001', 'TSEC CAPITALIZATION WEIGHTED STOCK INDEX (TWSE)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_tsec_capitalization_weighted_stock_index', false,
    ARRAY['ix0001','tsec','capitalization','weighted','stock','index','twse'], true, 407, 'twse',
    'IX0001', '{"exchange":"TWSE","logoid":"indices/tsec-capitalization-weighted-stock-index","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'VNINDEX', 'VNINDEX', 'VNINDEX', 'VNINDEX (HOSE)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_vietnam_index', false,
    ARRAY['vnindex','hose','index'], true, 408, 'hose',
    'VNINDEX', '{"exchange":"HOSE","logoid":"indices/vietnam-index","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'TOPIX', 'TOPIX Index', 'TOPIX', 'TOPIX Index (TSE)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_topix_small', false,
    ARRAY['topix','index','tse'], true, 409, 'tse',
    'TOPIX', '{"exchange":"TSE","logoid":"indices/topix-small","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), '000300', 'CSI 300 Index', '000300', 'CSI 300 Index (SSE)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_csi_300_index_futures', false,
    ARRAY['000300','csi','300','index','sse'], true, 410, 'sse',
    '000300', '{"exchange":"SSE","logoid":"indices/csi-300-index-futures","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'CNXFINANCE', 'Nifty Financial Services Index', 'CNXFINANCE', 'Nifty Financial Services Index (NSE)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'INR', 'INR', 2, 0.01, 'idx_nifty_financial_services_index', false,
    ARRAY['cnxfinance','nifty','financial','services','index','nse'], true, 411, 'nse',
    'CNXFINANCE', '{"exchange":"NSE","logoid":"indices/nifty-financial-services-index","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'NIFTY_MID_SELECT', 'Nifty MidCap Select Index', 'NIFTY_MID_SELECT', 'Nifty MidCap Select Index (NSE)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'INR', 'INR', 2, 0.01, 'idx_nifty_midcap', false,
    ARRAY['nifty_mid_select','nifty','midcap','select','index','nse'], true, 412, 'nse',
    'NIFTY_MID_SELECT', '{"exchange":"NSE","logoid":"indices/nifty-midcap","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'NIFTYJR', 'Nifty Next 50 Index', 'NIFTYJR', 'Nifty Next 50 Index (NSE)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'INR', 'INR', 2, 0.01, 'idx_nifty_next_50_index', false,
    ARRAY['niftyjr','nifty','next','50','index','nse'], true, 413, 'nse',
    'NIFTYJR', '{"exchange":"NSE","logoid":"indices/nifty-next-50-index","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'CNX500', 'Nifty 500 Index', 'CNX500', 'Nifty 500 Index (NSE)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'INR', 'INR', 2, 0.01, 'idx_nifty_500', false,
    ARRAY['cnx500','nifty','500','index','nse'], true, 414, 'nse',
    'CNX500', '{"exchange":"NSE","logoid":"indices/nifty-500","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'VN30', 'VN30 Index', 'VN30', 'VN30 Index (HOSE)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_vietnam_30', false,
    ARRAY['vn30','index','hose'], true, 415, 'hose',
    'VN30', '{"exchange":"HOSE","logoid":"indices/vietnam-30","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'KOSPI200', 'KOSPI 200 Index', 'KOSPI200', 'KOSPI 200 Index (KRX)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_kospi_200', false,
    ARRAY['kospi200','kospi','200','index','krx'], true, 416, 'krx',
    'KOSPI200', '{"exchange":"KRX","logoid":"indices/kospi-200","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'KOSDAQ', 'KOSDAQ Composite Index', 'KOSDAQ', 'KOSDAQ Composite Index (KRX)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_kosdaq', false,
    ARRAY['kosdaq','composite','index','krx'], true, 417, 'krx',
    'KOSDAQ', '{"exchange":"KRX","logoid":"indices/kosdaq","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'PSEI', 'PSEi Index', 'PSEI', 'PSEi Index (PSE)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_psei_index', false,
    ARRAY['psei','index','pse'], true, 418, 'pse',
    'PSEI', '{"exchange":"PSE","logoid":"indices/psei-index","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'HSCEI', 'Hang Seng China Enterprises Index', 'HSCEI', 'Hang Seng China Enterprises Index (HSI)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_hang_seng_china_enterprises', false,
    ARRAY['hscei','hang','seng','china','enterprises','index','hsi'], true, 419, 'hsi',
    'HSCEI', '{"exchange":"HSI","logoid":"indices/hang-seng-china-enterprises","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'LQ45', 'IDX LQ45 Index', 'LQ45', 'IDX LQ45 Index (IDX)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_idx_lq45', false,
    ARRAY['lq45','idx','index'], true, 420, 'idx',
    'LQ45', '{"exchange":"IDX","logoid":"indices/idx-lq45","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'PLANTATION', 'BM PLANTATION', 'PLANTATION', 'BM PLANTATION (MYX)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_bursa_malaysia_plantations_index', false,
    ARRAY['plantation','bm','myx','index'], true, 421, 'myx',
    'PLANTATION', '{"exchange":"MYX","logoid":"indices/bursa-malaysia-plantations-index","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'ALL', 'PSE All Shares Index', 'ALL', 'PSE All Shares Index (PSE)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_pse_all_shares_index', false,
    ARRAY['all','pse','shares','index'], true, 422, 'pse',
    'ALL', '{"exchange":"PSE","logoid":"indices/pse-all-shares-index","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'ASI', 'KSE 100 Index', 'ASI', 'KSE 100 Index (PSX)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_all_share', false,
    ARRAY['asi','kse','100','index','psx'], true, 423, 'psx',
    'ASI', '{"exchange":"PSX","logoid":"indices/all-share","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'SPSL20', 'S&P Sri Lanka 20 Index', 'SPSL20', 'S&P Sri Lanka 20 Index (SP)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_s_and_p_sri_lanka_20_index', false,
    ARRAY['spsl20','s&p','sri','lanka','20','index','sp'], true, 424, 'sp',
    'SPSL20', '{"exchange":"SP","logoid":"indices/s-and-p-sri-lanka-20-index","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'SET50', 'SET 50 Index', 'SET50', 'SET 50 Index (SET)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_set_50', false,
    ARRAY['set50','set','50','index'], true, 425, 'set',
    'SET50', '{"exchange":"SET","logoid":"indices/set-50","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'MAI', 'SET MAI Index', 'MAI', 'SET MAI Index (SET)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_mai', false,
    ARRAY['mai','set','index'], true, 426, 'set',
    'MAI', '{"exchange":"SET","logoid":"indices/mai","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'SET100', 'SET 100 Index', 'SET100', 'SET 100 Index (SET)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_set_100', false,
    ARRAY['set100','set','100','index'], true, 427, 'set',
    'SET100', '{"exchange":"SET","logoid":"indices/set-100","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'VN100', 'VN100 Index', 'VN100', 'VN100 Index (HOSE)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_vietnam_100', false,
    ARRAY['vn100','index','hose'], true, 428, 'hose',
    'VN100', '{"exchange":"HOSE","logoid":"indices/vietnam-100","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'HNXINDEX', 'HNX Index', 'HNXINDEX', 'HNX Index (HNX)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_hanoi_stock_exchange_equity_index', false,
    ARRAY['hnxindex','hnx','index'], true, 429, 'hnx',
    'HNXINDEX', '{"exchange":"HNX","logoid":"indices/hanoi-stock-exchange-equity-index","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), '000905', 'CSI 500 Index', '000905', 'CSI 500 Index (SSE)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_csi_500_index_futures', false,
    ARRAY['000905','csi','500','index','sse'], true, 430, 'sse',
    '000905', '{"exchange":"SSE","logoid":"indices/csi-500-index-futures","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), '000016', 'SSE 50 Index', '000016', 'SSE 50 Index (SSE)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_sse_50_index_futures', false,
    ARRAY['000016','sse','50','index'], true, 431, 'sse',
    '000016', '{"exchange":"SSE","logoid":"indices/sse-50-index-futures","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), '399106', 'SZSE Composite Index', '399106', 'SZSE Composite Index (SZSE)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_szse_composite_index', false,
    ARRAY['399106','szse','composite','index'], true, 432, 'szse',
    '399106', '{"exchange":"SZSE","logoid":"indices/szse-composite-index","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), '000852', 'CSI 1000 Index', '000852', 'CSI 1000 Index (SSE)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_csi_1000_index_futures', false,
    ARRAY['000852','csi','1000','index','sse'], true, 433, 'sse',
    '000852', '{"exchange":"SSE","logoid":"indices/csi-1000-index-futures","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'XIN9', 'FTSE China A50 Index', 'XIN9', 'FTSE China A50 Index (FTSE)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_china_a_50', false,
    ARRAY['xin9','ftse','china','a50','index'], true, 434, 'ftse',
    'XIN9', '{"exchange":"FTSE","logoid":"indices/china-a-50","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'DSEX', 'DSE Broad Index', 'DSEX', 'DSE Broad Index (DSEBD)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_dse_broad_index', false,
    ARRAY['dsex','dse','broad','index','dsebd'], true, 435, 'dsebd',
    'DSEX', '{"exchange":"DSEBD","logoid":"indices/dse-broad-index","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'I0500', 'JPX-Nikkei Index 400', 'I0500', 'JPX-Nikkei Index 400 (TSE)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_tokyo_stock_exchange_prime_market_index', false,
    ARRAY['i0500','jpx-nikkei','index','400','tse'], true, 436, 'tse',
    'I0500', '{"exchange":"TSE","logoid":"indices/tokyo-stock-exchange-prime-market-index","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'FBM70', 'FBM MID 70', 'FBM70', 'FBM MID 70 (FTSEMYX)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_ftse_bursa_malaysia_mid_70_index', false,
    ARRAY['fbm70','fbm','mid','70','ftsemyx','index'], true, 437, 'ftsemyx',
    'FBM70', '{"exchange":"FTSEMYX","logoid":"indices/ftse-bursa-malaysia-mid-70-index","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'FADGI', 'FTSE ADX General Index', 'FADGI', 'FTSE ADX General Index (ADX)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_ftse_adx_index', false,
    ARRAY['fadgi','ftse','adx','general','index'], true, 438, 'adx',
    'FADGI', '{"exchange":"ADX","logoid":"indices/ftse-adx-index","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'BKP', 'Boursa Kuwait Premier Market Index', 'BKP', 'Boursa Kuwait Premier Market Index (KSE)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_premier_market_index_pr', false,
    ARRAY['bkp','boursa','kuwait','premier','market','index','kse'], true, 439, 'kse',
    'BKP', '{"exchange":"KSE","logoid":"indices/premier-market-index-pr","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'BHBX', 'Bahrain All Share Index', 'BHBX', 'Bahrain All Share Index (BAHRAIN)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_bahrain_all_share_index', false,
    ARRAY['bhbx','bahrain','all','share','index'], true, 440, 'bahrain',
    'BHBX', '{"exchange":"BAHRAIN","logoid":"indices/bahrain-all-share-index","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'MT30', 'MSCI Tadawul 30 Index', 'MT30', 'MSCI Tadawul 30 Index (TADAWUL)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_tadawul_30', false,
    ARRAY['mt30','msci','tadawul','30','index'], true, 441, 'tadawul',
    'MT30', '{"exchange":"TADAWUL","logoid":"indices/tadawul-30","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'FADX15', 'FTSE ADX 15 Index', 'FADX15', 'FTSE ADX 15 Index (ADX)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_ftse_adx_15_index', false,
    ARRAY['fadx15','ftse','adx','15','index'], true, 442, 'adx',
    'FADX15', '{"exchange":"ADX","logoid":"indices/ftse-adx-15-index","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'TA125', 'TA-125 Index', 'TA125', 'TA-125 Index (TASE)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_ta_125', false,
    ARRAY['ta125','ta-125','index','tase'], true, 443, 'tase',
    'TA125', '{"exchange":"TASE","logoid":"indices/ta-125","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'BKA', 'QE All Share Index', 'BKA', 'QE All Share Index (QSE)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_all_share_index_pr', false,
    ARRAY['bka','qe','all','share','index','qse'], true, 444, 'qse',
    'BKA', '{"exchange":"QSE","logoid":"indices/all-share-index-pr","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'BKM', 'Boursa Kuwait Main Market Index', 'BKM', 'Boursa Kuwait Main Market Index (KSE)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_main_market_index_pr', false,
    ARRAY['bkm','boursa','kuwait','main','market','index','kse'], true, 445, 'kse',
    'BKM', '{"exchange":"KSE","logoid":"indices/main-market-index-pr","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'J200', 'Top 40 Index', 'J200', 'Top 40 Index (JSE)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_top_40_index', false,
    ARRAY['j200','top','40','index','jse'], true, 446, 'jse',
    'J200', '{"exchange":"JSE","logoid":"indices/top-40-index","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'MASI', 'MASI Index', 'MASI', 'MASI Index (CSEMA)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_masi_index', false,
    ARRAY['masi','index','csema'], true, 447, 'csema',
    'MASI', '{"exchange":"CSEMA","logoid":"indices/masi-index","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'MSI20', 'EGX 70 EWI Index', 'MSI20', 'EGX 70 EWI Index (EGX)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_masi_20_index', false,
    ARRAY['msi20','egx','70','ewi','index'], true, 448, 'egx',
    'MSI20', '{"exchange":"EGX","logoid":"indices/masi-20-index","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'NGX30', 'NGX 30 Index', 'NGX30', 'NGX 30 Index (NSENG)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_ngx_30_index', false,
    ARRAY['ngx30','ngx','30','index','nseng'], true, 449, 'nseng',
    'NGX30', '{"exchange":"NSENG","logoid":"indices/ngx-30-index","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'TUN20', 'Tunindex 20', 'TUN20', 'Tunindex 20 (BVMT)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'USD', 'USD', 2, 0.01, 'idx_tunis_index_20', false,
    ARRAY['tun20','tunindex','20','bvmt','index'], true, 450, 'bvmt',
    'TUN20', '{"exchange":"BVMT","logoid":"indices/tunis-index-20","country":null}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'INDIAVIX', 'India VIX Index', 'INDIAVIX', 'India VIX Index (NSE)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'INR', 'INR', 2, 0.01, 'idx_india_vix', false,
    ARRAY['indiavix','india','vix','index','nse'], true, 451, 'nse',
    'INDIAVIX', '{"exchange":"NSE","logoid":"indices/india-vix","country":"IN"}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'CNXIT', 'Nifty IT Index', 'CNXIT', 'Nifty IT Index (NSE)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'INR', 'INR', 2, 0.01, 'idx_nifty_it_index', false,
    ARRAY['cnxit','nifty','it','index','nse'], true, 452, 'nse',
    'CNXIT', '{"exchange":"NSE","logoid":"indices/nifty-it-index","country":"IN"}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'NIFTYMIDSML400', 'Nifty MidSmallCap 400 Index', 'NIFTYMIDSML400', 'Nifty MidSmallCap 400 Index (NSE)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'INR', 'INR', 2, 0.01, 'idx_nifty_midsmallcap_400_index', false,
    ARRAY['niftymidsml400','nifty','midsmallcap','400','index','nse'], true, 453, 'nse',
    'NIFTYMIDSML400', '{"exchange":"NSE","logoid":"indices/nifty-midsmallcap-400-index","country":"IN"}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'CNXPHARMA', 'Nifty Pharma Index', 'CNXPHARMA', 'Nifty Pharma Index (NSE)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'INR', 'INR', 2, 0.01, 'idx_nifty_pharma_index', false,
    ARRAY['cnxpharma','nifty','pharma','index','nse'], true, 454, 'nse',
    'CNXPHARMA', '{"exchange":"NSE","logoid":"indices/nifty-pharma-index","country":"IN"}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'CNXAUTO', 'Nifty Auto Index', 'CNXAUTO', 'Nifty Auto Index (NSE)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'INR', 'INR', 2, 0.01, 'idx_nifty_auto_index', false,
    ARRAY['cnxauto','nifty','auto','index','nse'], true, 455, 'nse',
    'CNXAUTO', '{"exchange":"NSE","logoid":"indices/nifty-auto-index","country":"IN"}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'NIFTYSMLCAP250', 'Nifty SmallCap 250 Index', 'NIFTYSMLCAP250', 'Nifty SmallCap 250 Index (NSE)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'INR', 'INR', 2, 0.01, 'idx_nifty_largemidcap_250_index', false,
    ARRAY['niftysmlcap250','nifty','smallcap','250','index','nse'], true, 456, 'nse',
    'NIFTYSMLCAP250', '{"exchange":"NSE","logoid":"indices/nifty-largemidcap-250-index","country":"IN"}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'CNXFMCG', 'Nifty FMCG Index', 'CNXFMCG', 'Nifty FMCG Index (NSE)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'INR', 'INR', 2, 0.01, 'idx_nifty_noncyc_cons', false,
    ARRAY['cnxfmcg','nifty','fmcg','index','nse'], true, 457, 'nse',
    'CNXFMCG', '{"exchange":"NSE","logoid":"indices/nifty-noncyc-cons","country":"IN"}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'CNXMETAL', 'Nifty Metal Index', 'CNXMETAL', 'Nifty Metal Index (NSE)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'INR', 'INR', 2, 0.01, 'idx_nifty_metal_index', false,
    ARRAY['cnxmetal','nifty','metal','index','nse'], true, 458, 'nse',
    'CNXMETAL', '{"exchange":"NSE","logoid":"indices/nifty-metal-index","country":"IN"}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'CNXENERGY', 'Nifty Energy Index', 'CNXENERGY', 'Nifty Energy Index (NSE)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'INR', 'INR', 2, 0.01, 'idx_nifty_energy_index', false,
    ARRAY['cnxenergy','nifty','energy','index','nse'], true, 459, 'nse',
    'CNXENERGY', '{"exchange":"NSE","logoid":"indices/nifty-energy-index","country":"IN"}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'CNXREALTY', 'Nifty Realty Index', 'CNXREALTY', 'Nifty Realty Index (NSE)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'INR', 'INR', 2, 0.01, 'idx_nifty_housing', false,
    ARRAY['cnxrealty','nifty','realty','index','nse'], true, 460, 'nse',
    'CNXREALTY', '{"exchange":"NSE","logoid":"indices/nifty-housing","country":"IN"}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'NIFTYMIDCAP150', 'Nifty MidCap 150 Index', 'NIFTYMIDCAP150', 'Nifty MidCap 150 Index (NSE)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'INR', 'INR', 2, 0.01, 'idx_nifty_fpi_150', false,
    ARRAY['niftymidcap150','nifty','midcap','150','index','nse'], true, 461, 'nse',
    'NIFTYMIDCAP150', '{"exchange":"NSE","logoid":"indices/nifty-fpi-150","country":"IN"}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'NIFTY_IND_DEFENCE', 'Nifty India Defence Index', 'NIFTY_IND_DEFENCE', 'Nifty India Defence Index (NSE)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'INR', 'INR', 2, 0.01, 'idx_nifty_ind_defence', false,
    ARRAY['nifty_ind_defence','nifty','india','defence','index','nse'], true, 462, 'nse',
    'NIFTY_IND_DEFENCE', '{"exchange":"NSE","logoid":"indices/nifty-ind-defence","country":"IN"}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'NIFTYPVTBANK', 'Nifty Private Bank Index', 'NIFTYPVTBANK', 'Nifty Private Bank Index (NSE)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'INR', 'INR', 2, 0.01, 'idx_nifty_private_bank_index', false,
    ARRAY['niftypvtbank','nifty','private','bank','index','nse'], true, 463, 'nse',
    'NIFTYPVTBANK', '{"exchange":"NSE","logoid":"indices/nifty-private-bank-index","country":"IN"}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'CNXINFRA', 'Nifty Infrastructure Index', 'CNXINFRA', 'Nifty Infrastructure Index (NSE)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'INR', 'INR', 2, 0.01, 'idx_nifty_multi_infra', false,
    ARRAY['cnxinfra','nifty','infrastructure','index','nse'], true, 464, 'nse',
    'CNXINFRA', '{"exchange":"NSE","logoid":"indices/nifty-multi-infra","country":"IN"}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'NIFTY_OIL_AND_GAS', 'Nifty Oil & Gas Index', 'NIFTY_OIL_AND_GAS', 'Nifty Oil & Gas Index (NSE)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'INR', 'INR', 2, 0.01, 'idx_nifty_oil_and_gas_index', false,
    ARRAY['nifty_oil_and_gas','nifty','oil','gas','index','nse'], true, 465, 'nse',
    'NIFTY_OIL_AND_GAS', '{"exchange":"NSE","logoid":"indices/nifty-oil-and-gas-index","country":"IN"}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'CNXMEDIA', 'Nifty Media Index', 'CNXMEDIA', 'Nifty Media Index (NSE)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'INR', 'INR', 2, 0.01, 'idx_nifty_media_index', false,
    ARRAY['cnxmedia','nifty','media','index','nse'], true, 466, 'nse',
    'CNXMEDIA', '{"exchange":"NSE","logoid":"indices/nifty-media-index","country":"IN"}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'NIFTY_HEALTHCARE', 'Nifty Healthcare Index', 'NIFTY_HEALTHCARE', 'Nifty Healthcare Index (NSE)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'INR', 'INR', 2, 0.01, 'idx_nifty_midsml_hlth', false,
    ARRAY['nifty_healthcare','nifty','healthcare','index','nse'], true, 467, 'nse',
    'NIFTY_HEALTHCARE', '{"exchange":"NSE","logoid":"indices/nifty-midsml-hlth","country":"IN"}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'NIFTY_CONSR_DURBL', 'Nifty Consumer Durables Index', 'NIFTY_CONSR_DURBL', 'Nifty Consumer Durables Index (NSE)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'INR', 'INR', 2, 0.01, 'idx_nifty_consumer_durables_index', false,
    ARRAY['nifty_consr_durbl','nifty','consumer','durables','index','nse'], true, 468, 'nse',
    'NIFTY_CONSR_DURBL', '{"exchange":"NSE","logoid":"indices/nifty-consumer-durables-index","country":"IN"}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'CNXPSE', 'Nifty PSE Index', 'CNXPSE', 'Nifty PSE Index (NSE)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'INR', 'INR', 2, 0.01, 'idx_nifty_sme_emerge', false,
    ARRAY['cnxpse','nifty','pse','index','nse'], true, 469, 'nse',
    'CNXPSE', '{"exchange":"NSE","logoid":"indices/nifty-sme-emerge","country":"IN"}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'CNXCONSUMPTION', 'Nifty India Consumption Index', 'CNXCONSUMPTION', 'Nifty India Consumption Index (NSE)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'INR', 'INR', 2, 0.01, 'idx_nifty_india_consumption_index', false,
    ARRAY['cnxconsumption','nifty','india','consumption','index','nse'], true, 470, 'nse',
    'CNXCONSUMPTION', '{"exchange":"NSE","logoid":"indices/nifty-india-consumption-index","country":"IN"}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'CNXCOMMODITIES', 'Nifty Commodities Index', 'CNXCOMMODITIES', 'Nifty Commodities Index (NSE)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'INR', 'INR', 2, 0.01, 'idx_nifty_commodities_index', false,
    ARRAY['cnxcommodities','nifty','commodities','index','nse'], true, 471, 'nse',
    'CNXCOMMODITIES', '{"exchange":"NSE","logoid":"indices/nifty-commodities-index","country":"IN"}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'NIFTY_CHEMICALS', 'Nifty Chemicals Index', 'NIFTY_CHEMICALS', 'Nifty Chemicals Index (NSE)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'INR', 'INR', 2, 0.01, 'idx_nifty_chemicals', false,
    ARRAY['nifty_chemicals','nifty','chemicals','index','nse'], true, 472, 'nse',
    'NIFTY_CHEMICALS', '{"exchange":"NSE","logoid":"indices/nifty-chemicals","country":"IN"}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'CNXSERVICE', 'NIfty Services Sector Index', 'CNXSERVICE', 'NIfty Services Sector Index (NSE)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'INR', 'INR', 2, 0.01, 'idx_nifty_services_sector_index', false,
    ARRAY['cnxservice','nifty','services','sector','index','nse'], true, 473, 'nse',
    'CNXSERVICE', '{"exchange":"NSE","logoid":"indices/nifty-services-sector-index","country":"IN"}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'CNX200', 'Nifty 200 Index', 'CNX200', 'Nifty 200 Index (NSE)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'INR', 'INR', 2, 0.01, 'idx_nifty_200_index', false,
    ARRAY['cnx200','nifty','200','index','nse'], true, 474, 'nse',
    'CNX200', '{"exchange":"NSE","logoid":"indices/nifty-200-index","country":"IN"}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'CNXMNC', 'Nifty MNC Index', 'CNXMNC', 'Nifty MNC Index (NSE)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'INR', 'INR', 2, 0.01, 'idx_nifty_mnc_index', false,
    ARRAY['cnxmnc','nifty','mnc','index','nse'], true, 475, 'nse',
    'CNXMNC', '{"exchange":"NSE","logoid":"indices/nifty-mnc-index","country":"IN"}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'CNX100', 'Nifty 100 Index', 'CNX100', 'Nifty 100 Index (NSE)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'INR', 'INR', 2, 0.01, 'idx_nifty100_enh_esg', false,
    ARRAY['cnx100','nifty','100','index','nse'], true, 476, 'nse',
    'CNX100', '{"exchange":"NSE","logoid":"indices/nifty100-enh-esg","country":"IN"}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'NIFTY_IND_DIGITAL', 'Nifty India Digital Index', 'NIFTY_IND_DIGITAL', 'Nifty India Digital Index (NSE)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'INR', 'INR', 2, 0.01, 'idx_nifty_india_digital_index', false,
    ARRAY['nifty_ind_digital','nifty','india','digital','index','nse'], true, 477, 'nse',
    'NIFTY_IND_DIGITAL', '{"exchange":"NSE","logoid":"indices/nifty-india-digital-index","country":"IN"}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'NIFTY_IND_TOURISM', 'Nifty India Tourism Index', 'NIFTY_IND_TOURISM', 'Nifty India Tourism Index (NSE)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'INR', 'INR', 2, 0.01, 'idx_nifty_ind_tourism', false,
    ARRAY['nifty_ind_tourism','nifty','india','tourism','index','nse'], true, 478, 'nse',
    'NIFTY_IND_TOURISM', '{"exchange":"NSE","logoid":"indices/nifty-ind-tourism","country":"IN"}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'NIFTY_INDIA_MFG', 'Nifty India Manufacturing Index', 'NIFTY_INDIA_MFG', 'Nifty India Manufacturing Index (NSE)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'INR', 'INR', 2, 0.01, 'idx_nifty_india_manufacturing_index', false,
    ARRAY['nifty_india_mfg','nifty','india','manufacturing','index','nse'], true, 479, 'nse',
    'NIFTY_INDIA_MFG', '{"exchange":"NSE","logoid":"indices/nifty-india-manufacturing-index","country":"IN"}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'NIFTY500_EW', 'Nifty 500 Equal Weight Index', 'NIFTY500_EW', 'Nifty 500 Equal Weight Index (NSE)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'INR', 'INR', 2, 0.01, 'idx_nifty500_ew', false,
    ARRAY['nifty500_ew','nifty','500','equal','weight','index','nse'], true, 480, 'nse',
    'NIFTY500_EW', '{"exchange":"NSE","logoid":"indices/nifty500-ew","country":"IN"}'::jsonb, false, false, false, NOW(), NOW()
  ),
(
    gen_random_uuid(), 'NIFTY_FINSEREXBNK', 'Nifty Financial Services Ex-Bank Index', 'NIFTY_FINSEREXBNK', 'Nifty Financial Services Ex-Bank Index (NSE)',
    'index', 'index', 'future', 1.0, 'unit', 'price_difference_contract',
    'INR', 'INR', 2, 0.01, 'idx_nifty_finserexbnk', false,
    ARRAY['nifty_finserexbnk','nifty','financial','services','ex-bank','index','nse'], true, 481, 'nse',
    'NIFTY_FINSEREXBNK', '{"exchange":"NSE","logoid":"indices/nifty-finserexbnk","country":"IN"}'::jsonb, false, false, false, NOW(), NOW()
  )
ON CONFLICT (symbol) DO UPDATE SET
  icon = EXCLUDED.icon,
  name = EXCLUDED.name,
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  quote_asset = EXCLUDED.quote_asset,
  profit_currency = EXCLUDED.profit_currency,
  updated_at = NOW();
