const path = require('path');
const pool = require('../infra/db/supabase');
const { syncSymbols } = require('../infra/entrackmicro/feedservice');

async function main() {
  const t0 = Date.now();

  try {
    const ramRes = await pool.query(
      `SELECT symbol, display_name, category, historical_data_source
       FROM trading_catalog.instruments
       WHERE is_ram_cached = true
       ORDER BY symbol ASC`
    );
    const ramCachedSymbols = ramRes.rows.map((r) => r.symbol);

    const liveRes = await pool.query(
      `SELECT symbol, display_name, category
       FROM trading_catalog.instruments
       WHERE is_live_feed = true AND category = 'forex_cfd'
       ORDER BY symbol ASC`
    );
    const liveFeedSymbols = liveRes.rows.map((r) => r.symbol);

    console.log(`[CATALOG SYNC]`);
    console.log(`RAM CACHED (${ramCachedSymbols.length}): ${ramCachedSymbols.join(', ')}`);
    console.log(`LIVE STREAM (${liveFeedSymbols.length}): ${liveFeedSymbols.join(', ')}`);

    if (ramCachedSymbols.length === 0 && liveFeedSymbols.length === 0) {
      console.log(`[INFO] No symbols marked for sync in database.`);
      await pool.end();
      process.exit(0);
    }

    const result = await syncSymbols({
      ramCachedSymbols,
      liveFeedSymbols,
    });

    const duration = Date.now() - t0;

    console.log(`\n[SYNC COMPLETE] (${duration}ms)`);
    console.log(`MESSAGE:       ${result.message}`);
    console.log(`SUBSCRIPTIONS: ${result.activeLiveSubscriptionsCount} active live streams`);
    console.log(`WARMED UP:     ${result.warmedUpSymbols?.length ? result.warmedUpSymbols.join(', ') : 'Already cached'}`);
    console.log(`CACHED KEYS:   ${result.totalCachedSymbolsCount} in RAM`);
    console.log(`TOTAL CANDLES: ${result.totalCandlesInMemory} in memory\n`);

    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error(`\n[ERROR] Sync failed: ${err.message}`);
    if (err.response?.data) {
      console.error('RESPONSE:', err.response.data);
    }
    await pool.end().catch(() => {});
    process.exit(1);
  }
}

main();
