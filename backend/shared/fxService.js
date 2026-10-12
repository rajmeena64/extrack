const pool = require('../infra/db/supabase');

// Supported 10 fixed currencies for dashboard switching
const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'AUD', 'CAD', 'CHF', 'SGD', 'AED'];

/**
 * Fast upsert of daily FX rates into database using a single dedicated client connection
 * @param {Array<{rate_date: string, base_currency: string, quote_currency: string, rate: number, source?: string}>} rates 
 */
async function upsertFxRates(rates) {
  if (!Array.isArray(rates) || rates.length === 0) return 0;

  // Deduplicate items in array by (rate_date, base_currency, quote_currency)
  const uniqueMap = new Map();
  for (const item of rates) {
    if (!item.rate_date || !item.base_currency || !item.quote_currency || !Number.isFinite(Number(item.rate))) continue;
    const key = `${item.rate_date}_${item.base_currency.toUpperCase()}_${item.quote_currency.toUpperCase()}`;
    uniqueMap.set(key, {
      rate_date: item.rate_date,
      base_currency: item.base_currency.toUpperCase(),
      quote_currency: item.quote_currency.toUpperCase(),
      rate: Number(item.rate),
      source: item.source || 'ctrader',
    });
  }

  const uniqueRates = Array.from(uniqueMap.values());
  let totalInserted = 0;

  const client = await pool.connect();
  try {
    const queryStr = `
      INSERT INTO fx_rates (rate_date, base_currency, quote_currency, rate, source)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (rate_date, base_currency, quote_currency)
      DO UPDATE SET rate = EXCLUDED.rate, source = EXCLUDED.source, created_at = NOW()
    `;

    for (const item of uniqueRates) {
      try {
        await client.query(queryStr, [
          item.rate_date,
          item.base_currency,
          item.quote_currency,
          item.rate,
          item.source,
        ]);
        totalInserted++;
      } catch (err) {
        console.error('Insert row error:', err.message);
      }
    }
  } finally {
    client.release();
  }

  return totalInserted;
}

/**
 * Get FX rate for a given date.
 * If exact date is missing (e.g. weekend or holiday), gets the most recent available rate prior to that date.
 */
async function getFxRate(baseCurrency, quoteCurrency, date = new Date()) {
  const base = String(baseCurrency || 'USD').toUpperCase();
  const quote = String(quoteCurrency || 'USD').toUpperCase();

  if (base === quote) return 1.0;

  const dateStr = typeof date === 'string' ? date.split('T')[0] : new Date(date).toISOString().split('T')[0];

  // Try direct lookup (exact or most recent prior date for weekends/holidays)
  const directRes = await pool.query(
    `SELECT rate FROM fx_rates
     WHERE base_currency = $1 AND quote_currency = $2 AND rate_date <= $3
     ORDER BY rate_date DESC
     LIMIT 1`,
    [base, quote, dateStr]
  );

  if (directRes.rows.length > 0) {
    return Number(directRes.rows[0].rate);
  }

  // Try inverse lookup
  const inverseRes = await pool.query(
    `SELECT rate FROM fx_rates
     WHERE base_currency = $1 AND quote_currency = $2 AND rate_date <= $3
     ORDER BY rate_date DESC
     LIMIT 1`,
    [quote, base, dateStr]
  );

  if (inverseRes.rows.length > 0 && Number(inverseRes.rows[0].rate) > 0) {
    return 1 / Number(inverseRes.rows[0].rate);
  }

  // Try cross-rate lookup via USD
  if (base !== 'USD' && quote !== 'USD') {
    const baseToUsd = await getFxRate(base, 'USD', dateStr);
    const usdToQuote = await getFxRate('USD', quote, dateStr);
    if (baseToUsd && usdToQuote) {
      return baseToUsd * usdToQuote;
    }
  }

  return 1.0; // Fallback
}

module.exports = {
  SUPPORTED_CURRENCIES,
  upsertFxRates,
  getFxRate,
};
