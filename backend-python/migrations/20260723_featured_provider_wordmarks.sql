UPDATE trading.brokers
SET logo_path = '/assets/provider-logo/logos/alpha-capital-group.svg', updated_at = NOW()
WHERE slug = 'alpha-capital-group';

UPDATE trading.brokers
SET logo_path = '/assets/provider-logo/logos/coinbase.svg', updated_at = NOW()
WHERE slug = 'coinbase';

UPDATE trading.brokers
SET logo_path = '/assets/provider-logo/logos/angel-one.svg', updated_at = NOW()
WHERE slug = 'angel-one';
