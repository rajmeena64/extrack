UPDATE trading.brokers
SET logo_path = '/assets/provider-logo/logos/binance.svg', updated_at = NOW()
WHERE slug = 'binance';
