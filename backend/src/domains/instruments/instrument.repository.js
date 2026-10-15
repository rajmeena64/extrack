const postgres = require('../../infra/db/postgres');

const INSTRUMENT_SELECT = `id, symbol, name, display_name AS "displayName", category, asset_class AS "assetClass", product_type AS "productType", profit_currency AS "profitCurrency", digits, icon, TRIM_SCALE(contract_size)::text AS "contractSize", TRIM_SCALE(tick_size)::text AS "tickSize", TRIM_SCALE(pip_size)::text AS "pipSize"`;

const instrumentRepository = {
  async fetchActiveInstruments() {
    const res = await postgres.query(
      `SELECT ${INSTRUMENT_SELECT} FROM trading_catalog.instruments WHERE is_active = TRUE ORDER BY sort_order, symbol`
    );
    return res.rows;
  }
};

module.exports = instrumentRepository;
