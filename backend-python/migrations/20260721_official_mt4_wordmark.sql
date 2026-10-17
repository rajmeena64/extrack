UPDATE trading.platforms
SET logo_path = '/assets/provider-logo/logos/mt4.svg', updated_at = NOW()
WHERE slug = 'metatrader-4';

UPDATE trading.brokers
SET logo_path = '/assets/provider-logo/logos/mt4.svg', updated_at = NOW()
WHERE slug = 'mt4';
