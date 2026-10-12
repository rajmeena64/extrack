const express = require('express');
const pool = require('../../db/supabase');

const router = express.Router();

router.get('/active-symbols', async (_req, res, next) => {
  try {
    const ramRes = await pool.query(
      `SELECT symbol FROM trading_catalog.instruments WHERE is_ram_cached = true AND category = 'forex_cfd' ORDER BY symbol ASC`
    );
    const liveRes = await pool.query(
      `SELECT symbol FROM trading_catalog.instruments WHERE is_live_feed = true AND category = 'forex_cfd' ORDER BY symbol ASC`
    );
    return res.json({
      success: true,
      ramCachedSymbols: ramRes.rows.map((r) => r.symbol),
      liveFeedSymbols: liveRes.rows.map((r) => r.symbol),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
