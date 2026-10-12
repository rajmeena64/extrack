require('dotenv').config();
const pool = require('../infra/db/supabase');

async function run() {
  console.log('Running instrument catalog migration in backend...');

  // 1. Add columns
  await pool.query(`
    ALTER TABLE trading_catalog.instruments 
    ADD COLUMN IF NOT EXISTS is_live_feed BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS is_ram_cached BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS historical_data_source VARCHAR(50) DEFAULT NULL;
  `);
  console.log('✓ Added is_live_feed, is_ram_cached, historical_data_source columns.');

  // 2. Set Binance symbols
  await pool.query(`
    UPDATE trading_catalog.instruments 
    SET is_live_feed = TRUE, historical_data_source = 'binance' 
    WHERE market_source = 'binance';
  `);
  console.log('✓ Initialized Binance symbols.');

  // 3. Set Tinybird historical symbols
  await pool.query(`
    UPDATE trading_catalog.instruments 
    SET historical_data_source = 'tinybird' 
    WHERE is_historical_sync = TRUE;
  `);
  console.log('✓ Initialized Tinybird historical source.');

  // 4. Set remaining cTrader symbols
  await pool.query(`
    UPDATE trading_catalog.instruments 
    SET historical_data_source = 'ctrader' 
    WHERE market_source = 'ctrader' AND (is_historical_sync IS NULL OR is_historical_sync = FALSE);
  `);
  console.log('✓ Initialized cTrader historical source.');

  // 5. Set active watchlist Forex & Metals to is_live_feed = true and is_ram_cached = true
  const activeWatchlist = [
    'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 
    'USDCHF', 'NZDUSD', 'EURJPY', 'GBPJPY', 'XAUUSD', 'XAGUSD'
  ];
  await pool.query(`
    UPDATE trading_catalog.instruments 
    SET is_live_feed = TRUE, is_ram_cached = TRUE 
    WHERE UPPER(symbol) = ANY($1::text[]);
  `, [activeWatchlist]);
  console.log(`✓ Configured ${activeWatchlist.length} watchlist symbols with is_live_feed = true and is_ram_cached = true.`);

  const audit = await pool.query(`
    SELECT 
      count(*) FILTER (WHERE is_live_feed = TRUE) as live_feed_count,
      count(*) FILTER (WHERE is_ram_cached = TRUE) as ram_cached_count,
      count(*) FILTER (WHERE is_historical_sync = TRUE) as historical_sync_count,
      count(*) as total_count
    FROM trading_catalog.instruments;
  `);
  console.table(audit.rows);

  console.log('Migration completed successfully.');
  process.exit(0);
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
