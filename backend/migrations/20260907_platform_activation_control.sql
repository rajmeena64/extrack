UPDATE trading_catalog.platforms
SET is_active = CASE
      WHEN slug IN ('ctrader', 'metatrader-5') THEN TRUE
      ELSE FALSE
    END,
    updated_at = NOW();

UPDATE trading_catalog.broker_integrations integration
SET is_active = platform.is_active,
    updated_at = NOW()
FROM trading_catalog.platforms platform
WHERE platform.id = integration.platform_id;
