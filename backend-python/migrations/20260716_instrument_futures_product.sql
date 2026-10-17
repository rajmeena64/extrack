ALTER TABLE trading.instruments DROP CONSTRAINT IF EXISTS instruments_product_type_check;
ALTER TABLE trading.instruments
  ADD CONSTRAINT instruments_product_type_check
  CHECK (product_type IN ('forex', 'cfd', 'crypto_spot', 'futures', 'perpetual'));
