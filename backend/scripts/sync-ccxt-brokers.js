const ccxt = require('ccxt');
const pool = require('../infra/db/supabase');

const ALIASES = {
  'gate': 'gate-io',
  'woo': 'woo-x',
  'delta': 'delta-exchange',
  'cryptocom': 'crypto-com',
  'backpack': 'backpack-exchange'
};

async function sync() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let inserted = 0;
    let updated = 0;
    for (const slug of ccxt.exchanges) {
      let name = slug.toUpperCase();
      try {
        const inst = new ccxt[slug]();
        if (inst.name) name = inst.name;
      } catch {}
      const targetSlug = ALIASES[slug] || slug;
      const existing = await client.query(
        'SELECT id, name FROM trading_catalog.brokers WHERE slug = $1::text OR LOWER(name) = LOWER($2::text) LIMIT 1',
        [targetSlug, name]
      );
      let brokerId;
      if (existing.rows.length) {
        brokerId = existing.rows[0].id;
        await client.query(`
          UPDATE trading_catalog.brokers
          SET supported_trade_methods = ARRAY(
                SELECT DISTINCT m FROM UNNEST(COALESCE(supported_trade_methods, '{}') || ARRAY['api_sync']) m
              ),
              is_active = TRUE,
              updated_at = NOW()
          WHERE id = $1
        `, [brokerId]);
        updated++;
      } else {
        const ins = await client.query(`
          INSERT INTO trading_catalog.brokers (
            name, slug, provider_type, supported_instruments, supported_trade_methods,
            is_active, is_visible, search_keywords
          ) VALUES ($1::varchar, $2::varchar, 'exchange', ARRAY['crypto'], ARRAY['api_sync'], TRUE, TRUE, ARRAY[$2::text, $1::text])
          RETURNING id
        `, [name, targetSlug]);
        brokerId = ins.rows[0].id;
        inserted++;
      }
      await client.query(`
        INSERT INTO trading_catalog.broker_integrations (broker_id, trade_method, is_active, is_visible)
        VALUES ($1, 'api_sync', TRUE, TRUE)
        ON CONFLICT (broker_id, trade_method) WHERE platform_id IS NULL DO UPDATE
        SET is_active = TRUE, is_visible = TRUE
      `, [brokerId]);
    }
    await client.query('COMMIT');
    console.log(`CCXT Sync Finished: Inserted=${inserted}, Updated=${updated}`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('CCXT Sync Failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

sync().catch(() => process.exit(1));
