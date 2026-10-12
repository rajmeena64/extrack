UPDATE trading.platforms
SET logo_path = '/assets/provider-logo/logos/mt5.svg', updated_at = NOW()
WHERE slug = 'metatrader-5';

UPDATE trading.platforms
SET logo_path = '/assets/provider-logo/logos/ctrader-official.svg', updated_at = NOW()
WHERE slug = 'ctrader';

UPDATE trading.brokers
SET logo_path = '/assets/provider-logo/logos/mt5.svg', updated_at = NOW()
WHERE slug = 'mt5';

UPDATE trading.brokers
SET logo_path = '/assets/provider-logo/logos/ctrader-official.svg', updated_at = NOW()
WHERE slug = 'ctrader';
