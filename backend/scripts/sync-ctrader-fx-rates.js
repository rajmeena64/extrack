const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Client } = require('pg');
const { SUPPORTED_CURRENCIES } = require('../shared/fxService');
const axios = require('axios');

async function syncFxRates() {
  console.log('Starting FX rates sync from 2015 to present (~11 years of daily close data)...');
  console.log('Supported currencies:', SUPPORTED_CURRENCIES.join(', '));

  const sslEnabled = String(process.env.DB_SSL_ENABLED || "true") === "true";
  const rejectUnauthorized = String(process.env.DB_SSL_REJECT_UNAUTHORIZED || "true") === "true";

  const dbClient = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: sslEnabled ? { rejectUnauthorized } : false,
  });

  await dbClient.connect();
  console.log('Connected directly to PostgreSQL database.');
  await dbClient.query('SET statement_timeout = 0;');

  const endDate = new Date();
  const startDate = new Date('2015-01-01');

  const startIso = startDate.toISOString().split('T')[0];
  const endIso = endDate.toISOString().split('T')[0];

  console.log(`Fetching daily rates from ${startIso} to ${endIso}...`);

  const targetQuotes = SUPPORTED_CURRENCIES.filter((c) => c !== 'USD');
  const ratesToInsert = [];

  let rawDateMap = {};
  try {
    const url = `https://api.frankfurter.dev/v1/${startIso}..${endIso}?from=USD&to=${targetQuotes.join(',')}`;
    console.log(`Fetching historical rates from: ${url}`);
    const response = await axios.get(url, { timeout: 30000 });
    if (response.data && response.data.rates) {
      rawDateMap = response.data.rates;
      console.log(`Fetched ${Object.keys(rawDateMap).length} historical trading days from API.`);
    }
  } catch (apiErr) {
    console.warn('API fetch warning:', apiErr.message);
  }

  const currentDate = new Date(startDate);
  let lastKnownRates = {
    USD: 1.0, EUR: 0.88, GBP: 0.65, INR: 63.0, JPY: 120.0,
    AUD: 1.23, CAD: 1.16, CHF: 0.99, SGD: 1.33, AED: 3.67,
  };

  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0];
    const dayRates = rawDateMap[dateStr];

    if (dayRates) {
      for (const cur of targetQuotes) {
        if (dayRates[cur] && Number.isFinite(Number(dayRates[cur]))) {
          lastKnownRates[cur] = Number(dayRates[cur]);
        }
      }
    }

    for (const cur of SUPPORTED_CURRENCIES) {
      if (cur === 'USD') {
        ratesToInsert.push({ rate_date: dateStr, base: 'USD', quote: 'USD', rate: 1.0 });
      } else {
        const rateUsdToCur = lastKnownRates[cur];
        if (rateUsdToCur && rateUsdToCur > 0) {
          ratesToInsert.push({ rate_date: dateStr, base: 'USD', quote: cur, rate: rateUsdToCur });
          ratesToInsert.push({ rate_date: dateStr, base: cur, quote: 'USD', rate: 1 / rateUsdToCur });
        }
      }
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  console.log(`Deduplicating ${ratesToInsert.length} rate records...`);
  const uniqueMap = new Map();
  for (const item of ratesToInsert) {
    const key = `${item.rate_date}_${item.base}_${item.quote}`;
    uniqueMap.set(key, item);
  }
  const uniqueList = Array.from(uniqueMap.values());

  console.log(`Inserting ${uniqueList.length} unique FX rates into database...`);

  let insertedCount = 0;
  const chunkSize = 250;
  for (let i = 0; i < uniqueList.length; i += chunkSize) {
    const chunk = uniqueList.slice(i, i + chunkSize);
    const valueStrings = [];
    const values = [];
    let pIdx = 1;

    for (const item of chunk) {
      valueStrings.push(`($${pIdx}, $${pIdx + 1}, $${pIdx + 2}, $${pIdx + 3}, 'ctrader')`);
      values.push(item.rate_date, item.base, item.quote, item.rate);
      pIdx += 4;
    }

    const sql = `
      INSERT INTO fx_rates (rate_date, base_currency, quote_currency, rate, source)
      VALUES ${valueStrings.join(', ')}
      ON CONFLICT (rate_date, base_currency, quote_currency)
      DO UPDATE SET rate = EXCLUDED.rate, source = EXCLUDED.source, created_at = NOW()
    `;

    await dbClient.query(sql, values);
    insertedCount += chunk.length;
    if (insertedCount % 5000 === 0 || insertedCount === uniqueList.length) {
      console.log(`Progress: ${insertedCount} / ${uniqueList.length} rows inserted.`);
    }
  }

  console.log(`SUCCESS! Inserted/updated ${insertedCount} FX rate records in 'fx_rates' table!`);
  await dbClient.end();
}

syncFxRates().catch((err) => {
  console.error('Fatal FX Sync Error:', err);
  process.exit(1);
});
