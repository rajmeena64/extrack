INSERT INTO trading_catalog.platforms (name, slug, logo_path, sort_order)
VALUES
  ('MetaTrader 4', 'metatrader-4', '/assets/provider-logo/logos/mt4.svg', 10),
  ('MetaTrader 5', 'metatrader-5', '/assets/provider-logo/logos/mt5.svg', 20),
  ('cTrader', 'ctrader', '/assets/provider-logo/logos/ctrader-official.svg', 30),
  ('DAS Trader Pro', 'das-trader-pro', NULL, 40)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  logo_path = COALESCE(EXCLUDED.logo_path, trading_catalog.platforms.logo_path),
  updated_at = NOW();

WITH platform_support(platform_slug, trade_method, broker_names) AS (
  VALUES
    ('metatrader-4', 'terminal_sync', ARRAY[
      'AAAFX','AMarkets','ATC Brokers','ActivTrades','Admiral Markets','Advanced Markets','AvaTrade','Axi','Axiory','BDSwiss','BlackBull Markets','Blackwell Global','Blueberry Markets','CMC Markets','CMTrading','Capital Index','Capital.com','City Index','Coinexx','Darwinex','Dominion Markets','Dukascopy','EGM Securities','EagleFX','Eightcap','Empower','Exclusive Markets','Exness','FBS','FIBO Group','FOREX.com','FP Markets','FTMO','FXCESS','FXCM','FXChoice','FXDD','FXFlat','FXGlobe','FXOpen','FXPRIMUS','FXPig','Focus Markets','ForexChief','ForexVox','Fortrade','FreshForex','FundingPips','Fusion Markets','FxPro','GBE Brokers','GCI Trading','GKFX','GO Markets','GTC Global Trade','GerchikCo','Global Prime','HF Markets','HYCM','HankoTrade','Hantec Markets','HeroFX','IC Markets','ICM Capital','IFC Markets','IG','INFINOX','INGOT Brokers','Instant Funding','InterTrader','Invast','IronFX','JFD Brokers','JustMarkets','KOT4X','LMFX','Land FX','Libertex','LiteFinance','Longhorn','MTrading','Markets.com','MidasFX','Moneta Markets','NCM Investment','Naga','NordFX','Number One Capital Markets','OANDA','Octa','PU Prime','Pepperstone','Plexytrade','Purple Trading','RoboForex','RoboMarkets','Saxo Bank','SimpleFX','Skilling','SquaredFinancial','Swissquote','TIOmarkets','TeleTrade','ThinkMarkets','Tickmill','Tier1FX','TopFX','Trade Nation','TradeFXP','TradersWay','Tradeview Markets','Trading Pro International','TrioMarkets','Trive Financial Services','VT Markets','Valutrades','Vantage','Varianse','Vault Markets','Weltrade','Windsor Brokers','XM','XTB','easyMarkets'
    ]::text[]),
    ('metatrader-5', 'terminal_sync', ARRAY[
      'ActivTrades','Admiral Markets','AMarkets','AvaTrade','Blueberry Markets','City Index','Coinexx','Darwinex','Dukascopy','Eightcap','Exness','FBS','FOREX.com','Fusion Markets','FXCM','FXPig','FxPro','GBE Brokers','Global Prime','GO Markets','Hantec Markets','IC Markets','Invast','IronFX','LMFX','Markets.com','Naga','NordFX','OANDA','Octa','Pepperstone','RoboForex','Saxo Bank','Swissquote','Tickmill','TIOmarkets','TradersWay','Weltrade','XM','Axi','BlackBull Markets','BDSwiss','FP Markets','Vantage','ThinkMarkets','JustMarkets','FIBO Group','FXOpen','FXChoice','FXDD','Libertex','Skilling','Moneta Markets','HYCM','IFC Markets','RoboMarkets','SquaredFinancial','ATC Brokers','Advanced Markets','easyMarkets','Tradeview Markets','FundingPips','AAAFX','Blackwell Global','Capital Index','CMTrading','ForexChief','ForexVox','FreshForex','FXFlat','FXGlobe','FXPRIMUS','InterTrader','JFD Brokers','Land FX','SimpleFX','TeleTrade','Tier1FX','TrioMarkets','Valutrades','EagleFX','MTrading','GCI Trading','GKFX','Plexytrade','INGOT Brokers','Number One Capital Markets','Instant Funding'
    ]::text[]),
    ('ctrader', 'oauth_sync', ARRAY[
      'Fusion Markets','FXPig','FxPro','GO Markets','IC Markets','LiteFinance','Pepperstone','TradersWay','BlackBull Markets','FP Markets','Skilling','Deriv','Purple Trading','Tradeview Markets','Axiory','TopFX','Varianse','Dominion Markets','IC Trading','Focus Markets'
    ]::text[]),
    ('das-trader-pro', 'terminal_sync', ARRAY[
      'Lightspeed','CenterPoint Securities','Cobra Trading','Alaric Securities','ChoiceTrade'
    ]::text[])
), supported_brokers AS (
  SELECT platform_support.platform_slug, platform_support.trade_method, broker.id AS broker_id
  FROM platform_support
  CROSS JOIN LATERAL UNNEST(platform_support.broker_names) broker_name
  JOIN trading_catalog.brokers broker ON LOWER(broker.name) = LOWER(broker_name)
)
INSERT INTO trading_catalog.broker_integrations (
  broker_id, platform_id, trade_method, is_active, is_visible, sort_order
)
SELECT supported_brokers.broker_id, platform.id, supported_brokers.trade_method, TRUE, TRUE, platform.sort_order
FROM supported_brokers
JOIN trading_catalog.platforms platform ON platform.slug = supported_brokers.platform_slug
ON CONFLICT DO NOTHING;

UPDATE trading_catalog.platforms
SET normalization_config = JSONB_SET(
      JSONB_SET(
        normalization_config,
        '{fieldMapping,pnl_currency}',
        '"accountCurrency"'::jsonb,
        TRUE
      ),
      '{transforms,pnl_currency}',
      '"string"'::jsonb,
      TRUE
    ),
    updated_at = NOW()
WHERE slug = 'ctrader';

UPDATE trading_catalog.broker_integrations integration
SET trade_mapping = platform.normalization_config,
    updated_at = NOW()
FROM trading_catalog.platforms platform
WHERE platform.id = integration.platform_id
  AND platform.normalization_config <> '{}'::jsonb
  AND (integration.trade_mapping = '{}'::jsonb OR platform.slug = 'ctrader');
