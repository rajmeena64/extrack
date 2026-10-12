const pool = require('../infra/db/supabase');
const feedClient = require('../integrations/ctrader/clients/feed.client');
const axios = require('axios');

const BINANCE_URLS = {
  spot: 'https://api.binance.com/api/v3/exchangeInfo',
  usd_m_futures: 'https://fapi.binance.com/fapi/v1/exchangeInfo',
  coin_m_futures: 'https://dapi.binance.com/dapi/v1/exchangeInfo',
};

function decimalStep(filters, filterType, field) {
  return filters?.find((filter) => filter.filterType === filterType)?.[field] || null;
}

function digitsFromStep(step) {
  if (!step) return null;
  const normalized = String(step).replace(/0+$/, '');
  const decimal = normalized.indexOf('.');
  return decimal === -1 ? 0 : normalized.length - decimal - 1;
}

function classifyCtrader(raw) {
  const sourceSymbol = String(raw.name || '').trim();
  const symbol = String(raw.normalizedName || sourceSymbol).toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!symbol || !sourceSymbol) return null;

  const isNum = (val) => val !== null && val !== undefined && val !== '' && Number.isFinite(Number(val));
  const pipPosition = isNum(raw.pipPosition) ? Number(raw.pipPosition) : null;
  const digits = isNum(raw.digits) ? Number(raw.digits) : (raw.tickSize ? digitsFromStep(raw.tickSize) : null);
  const tickSize = raw.tickSize || (digits !== null ? (10 ** -digits).toFixed(digits) : null);
  const pipSize = raw.pipSize || (pipPosition !== null ? (10 ** -pipPosition).toFixed(pipPosition) : null);

  const baseAsset = raw.baseAsset ?? null;
  const quoteAsset = raw.quoteAsset ?? null;
  const profitCurrency = raw.profitCurrency ?? quoteAsset;

  return {
    symbol,
    sourceSymbol,
    name: String(raw.description || sourceSymbol),
    displayName: String(raw.displayName || sourceSymbol),
    description: raw.description ?? null,
    category: 'forex_cfd',
    assetClass: raw.assetClass ?? 'other',
    productType: 'forex_cfd',
    baseAsset,
    quoteAsset,
    profitCurrency,
    quantityType: 'lot',
    contractSize: raw.contractSize ?? null,
    contractUnit: raw.contractUnit ?? null,
    digits,
    tickSize,
    pipSize,
    minQuantity: raw.minQuantity ?? null,
    maxQuantity: raw.maxQuantity ?? null,
    quantityStep: raw.quantityStep ?? null,
    pnlMode: 'price_difference_contract',
    supportsPips: pipPosition !== null,
    keywords: [symbol.toLowerCase(), sourceSymbol.toLowerCase(), String(raw.description || '').toLowerCase()].filter(Boolean),
    source: 'entrackCfeed',
    metadata: raw,
  };
}

function normalizeBinance(raw, market) {
  if (raw.status !== 'TRADING') return null;
  const tickSize = decimalStep(raw.filters, 'PRICE_FILTER', 'tickSize');
  const minQuantity = decimalStep(raw.filters, 'LOT_SIZE', 'minQty');
  const maxQuantity = decimalStep(raw.filters, 'LOT_SIZE', 'maxQty');
  const quantityStep = decimalStep(raw.filters, 'LOT_SIZE', 'stepSize');
  const perpetual = market !== 'spot' && raw.contractType === 'PERPETUAL';
  return {
    symbol: raw.symbol, sourceSymbol: raw.symbol, name: `${raw.baseAsset} / ${raw.quoteAsset}`,
    displayName: `${raw.baseAsset}${raw.quoteAsset}${market === 'spot' ? '' : ' Perpetual'}`, description: `Binance ${market.replaceAll('_', ' ')} ${raw.contractType || ''}`.trim(),
    category: 'crypto', assetClass: 'crypto', productType: 'crypto', baseAsset: raw.baseAsset,
    quoteAsset: raw.quoteAsset, profitCurrency: raw.quoteAsset, quantityType: 'unit',
    contractSize: null, contractUnit: raw.baseAsset, digits: digitsFromStep(tickSize), tickSize,
    pipSize: null, minQuantity, maxQuantity, quantityStep, pnlMode: 'price_difference_quantity',
    supportsPips: false, keywords: [raw.symbol.toLowerCase(), raw.baseAsset.toLowerCase(), raw.quoteAsset.toLowerCase(), 'binance'],
    source: 'entrackBfeed', metadata: { market, exchangeInfo: raw },
  };
}

function mergeBinanceMarkets(catalogs) {
  const instruments = new Map();
  for (const [market, response] of Object.entries(catalogs)) {
    for (const raw of Array.isArray(response?.symbols) ? response.symbols : []) {
      const item = normalizeBinance(raw, market);
      if (!item) continue;
      const existing = instruments.get(item.symbol);
      if (!existing) {
        item.metadata.markets = [market];
        instruments.set(item.symbol, item);
        continue;
      }
      existing.metadata.markets.push(market);
      existing.metadata[market] = raw;
      existing.keywords = Array.from(new Set([...existing.keywords, market.replaceAll('_', ' ')]));
    }
  }
  return Array.from(instruments.values());
}

async function fetchSources() {
  console.log('Fetching cTrader and Binance symbol catalogs...');
  const requests = Promise.all([
    feedClient.getFeedSymbols(),
    Promise.all(Object.entries(BINANCE_URLS).map(async ([market, url]) => {
      const response = await axios.get(url, { timeout: 15000 });
      return [market, response.data];
    })).then((entries) => Object.fromEntries(entries)),
  ]);
  const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Instrument API fetch timed out after 25 seconds; database was not changed')), 25000));
  const [ctraderResponse, binanceResponse] = await Promise.race([requests, timeout]);
  const ctrader = (Array.isArray(ctraderResponse?.symbols) ? ctraderResponse.symbols : []).map(classifyCtrader).filter(Boolean);
  const binance = mergeBinanceMarkets(binanceResponse);
  if (!ctrader.length) throw new Error('cTrader returned no symbols; database was not changed');
  if (!binance.length) throw new Error('Binance returned no symbols; database was not changed');
  return { ctrader, binance };
}

const COLUMNS = `symbol,name,display_name,description,category,asset_class,product_type,base_asset,quote_asset,
 profit_currency,quantity_type,contract_size,contract_unit,digits,tick_size,pip_size,min_quantity,
 max_quantity,quantity_step,pnl_calculation_mode,supports_pips,search_keywords,is_active,sort_order,
 market_source,source_symbol,source_metadata,last_synced_at,updated_at`;
const UPSERT_SUFFIX = `
 ON CONFLICT (symbol) DO UPDATE SET name=EXCLUDED.name,display_name=EXCLUDED.display_name,
 description=EXCLUDED.description,category=EXCLUDED.category,asset_class=EXCLUDED.asset_class,
 product_type=EXCLUDED.product_type,base_asset=EXCLUDED.base_asset,quote_asset=EXCLUDED.quote_asset,
 profit_currency=EXCLUDED.profit_currency,quantity_type=EXCLUDED.quantity_type,contract_size=EXCLUDED.contract_size,
 contract_unit=EXCLUDED.contract_unit,digits=EXCLUDED.digits,tick_size=EXCLUDED.tick_size,pip_size=EXCLUDED.pip_size,
 min_quantity=EXCLUDED.min_quantity,max_quantity=EXCLUDED.max_quantity,quantity_step=EXCLUDED.quantity_step,
 pnl_calculation_mode=EXCLUDED.pnl_calculation_mode,supports_pips=EXCLUDED.supports_pips,
 search_keywords=EXCLUDED.search_keywords,is_active=TRUE,sort_order=EXCLUDED.sort_order,
 market_source=EXCLUDED.market_source,source_symbol=EXCLUDED.source_symbol,source_metadata=EXCLUDED.source_metadata,
 last_synced_at=NOW(),updated_at=NOW()`;

function batchQuery(items, startingOrder) {
  const values = [];
  const rows = items.map((item, index) => {
    const row = [item.symbol,item.name,item.displayName,item.description,item.category,item.assetClass,
      item.productType,item.baseAsset,item.quoteAsset,item.profitCurrency,item.quantityType,item.contractSize,
      item.contractUnit,item.digits,item.tickSize,item.pipSize,item.minQuantity,item.maxQuantity,item.quantityStep,
      item.pnlMode,item.supportsPips,item.keywords,startingOrder + index,item.source,item.sourceSymbol,JSON.stringify(item.metadata)];
    const offset = values.length;
    values.push(...row);
    const parameters = row.map((_, parameterIndex) => `$${offset + parameterIndex + 1}`);
    parameters[25] = `${parameters[25]}::jsonb`;
    return `(${parameters.slice(0, 22).join(',')},TRUE,${parameters.slice(22).join(',')},NOW(),NOW())`;
  });
  return { text: `INSERT INTO trading_catalog.instruments (${COLUMNS}) VALUES ${rows.join(',')} ${UPSERT_SUFFIX}`, values };
}

async function sync() {
  const sources = await fetchSources();
  const ctraderSymbols = new Set(sources.ctrader.map((s) => s.symbol));
  const binance = sources.binance.filter((b) => !ctraderSymbols.has(b.symbol));
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const all = [...sources.ctrader, ...binance];
    for (let index = 0; index < all.length; index += 100) {
      await client.query(batchQuery(all.slice(index, index + 100), index + 1));
    }
    await client.query(`DELETE FROM trading_catalog.instruments i WHERE i.market_source = 'seed' AND NOT EXISTS (SELECT 1 FROM trading.trades t WHERE t.instrument_id = i.id)`);
    await client.query(`UPDATE trading_catalog.instruments i SET is_active = FALSE WHERE i.market_source = 'seed' AND EXISTS (SELECT 1 FROM trading.trades t WHERE t.instrument_id = i.id)`);
    await client.query(`UPDATE trading_catalog.instruments SET is_active = FALSE WHERE market_source IN ('entrackCfeed','entrackBfeed','ctrader','binance') AND last_synced_at < NOW() - INTERVAL '1 minute'`);
    await client.query('COMMIT');
    console.log(`Synced ${sources.ctrader.length} cTrader and ${binance.length} Binance instruments.`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

sync()
  .then(() => pool.end())
  .catch(async (error) => {
    console.error(error.message);
    await Promise.race([pool.end(), new Promise((resolve) => setTimeout(resolve, 2000))]);
    process.exit(1);
  });
