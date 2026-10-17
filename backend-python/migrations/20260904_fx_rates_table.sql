-- Create fx_rates table for multi-currency conversion rates
CREATE TABLE IF NOT EXISTS fx_rates (
    id BIGSERIAL PRIMARY KEY,
    rate_date DATE NOT NULL,
    base_currency VARCHAR(4) NOT NULL,
    quote_currency VARCHAR(4) NOT NULL,
    rate NUMERIC(18, 8) NOT NULL,
    source VARCHAR(50) DEFAULT 'ctrader',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE (rate_date, base_currency, quote_currency)
);

CREATE INDEX IF NOT EXISTS idx_fx_rates_lookup 
ON fx_rates (base_currency, quote_currency, rate_date DESC);
