const pool = require('../../infra/db/supabase');
const { TABLES, MANUAL_TRADE_SELECT } = require('../../config/tables');
const { normalizeOptionDetails, firstValue } = require('./trade.normalization');

const TRADE_RELATIONS_SELECT = `
  (SELECT JSONB_BUILD_OBJECT(
    'underlyingInstrumentId', option_detail.underlying_instrument_id,
    'underlyingSymbol', option_detail.underlying_symbol,
    'optionType', option_detail.option_type,
    'strikePrice', option_detail.strike_price,
    'expiryDate', option_detail.expiry_date,
    'expiryAt', option_detail.expiry_at,
    'expiryTimezone', option_detail.expiry_timezone,
    'expiryTimeSource', option_detail.expiry_time_source,
    'contractMultiplier', option_detail.contract_multiplier,
    'lotSize', option_detail.lot_size,
    'exerciseStyle', option_detail.exercise_style,
    'settlementType', option_detail.settlement_type,
    'settlementAt', option_detail.settlement_at,
    'settlementPrice', option_detail.settlement_price,
    'expirationOutcome', option_detail.expiration_outcome
  ) FROM trading.option_trade_details option_detail WHERE option_detail.trade_id = trade.id) AS option_details,
  (SELECT market_detail.details FROM trading.trade_market_details market_detail WHERE market_detail.trade_id = trade.id) AS market_details,
  (SELECT calculation.snapshot FROM trading.trade_calculations calculation WHERE calculation.trade_id = trade.id) AS calculation_snapshot,
  (SELECT JSONB_BUILD_OBJECT(
    'mistakes', journal.mistakes,
    'customTags', journal.custom_tags,
    'executionScore', journal.execution_score,
    'reviewSummary', journal.review_summary
  ) FROM trading.journal_entries journal WHERE journal.user_id = trade.user_id AND journal.trade_id = trade.id) AS journal_details,
  (SELECT journal.is_breakeven FROM trading.journal_entries journal WHERE journal.user_id = trade.user_id AND journal.journal_date = trade.entry_timestamp::date) AS is_breakeven,
  (SELECT COALESCE(JSONB_AGG(JSONB_BUILD_OBJECT(
    'id', execution.id,
    'action', execution.action,
    'positionEffect', execution.position_effect,
    'quantity', execution.quantity,
    'price', execution.price,
    'executedAt', execution.executed_at,
    'fees', execution.fees,
    'feeCurrency', execution.fee_currency,
    'brokerOrderId', execution.broker_order_id,
    'brokerExecutionId', execution.broker_execution_id
  ) ORDER BY execution.executed_at, execution.id), '[]'::jsonb)
  FROM trading.trade_executions execution WHERE execution.trade_id = trade.id) AS executions
`;

const TRADE_METADATA_JOINS = `
  (SELECT instrument.digits FROM trading_catalog.instruments instrument WHERE instrument.id = trade.instrument_id OR UPPER(instrument.symbol) = UPPER(trade.symbol) LIMIT 1) AS instrument_digits,
  (SELECT broker.name FROM broker_connections.user_broker_connections connection JOIN trading_catalog.broker_integrations integration ON integration.id = connection.integration_id JOIN trading_catalog.brokers broker ON broker.id = integration.broker_id WHERE connection.id = trade.broker_connection_id AND connection.user_id = trade.user_id LIMIT 1) AS broker_name,
  (SELECT broker.slug FROM broker_connections.user_broker_connections connection JOIN trading_catalog.broker_integrations integration ON integration.id = connection.integration_id JOIN trading_catalog.brokers broker ON broker.id = integration.broker_id WHERE connection.id = trade.broker_connection_id AND connection.user_id = trade.user_id LIMIT 1) AS broker_slug,
  (SELECT connection.account_name FROM broker_connections.user_broker_connections connection WHERE connection.id = trade.broker_connection_id AND connection.user_id = trade.user_id LIMIT 1) AS account_name,
  (SELECT platform.name FROM broker_connections.user_broker_connections connection JOIN trading_catalog.broker_integrations integration ON integration.id = connection.integration_id JOIN trading_catalog.platforms platform ON platform.id = integration.platform_id WHERE connection.id = trade.broker_connection_id AND connection.user_id = trade.user_id LIMIT 1) AS platform_name
`;

async function findTradeById(database, uniqueId, userId) {
  const result = await database.query(`
    SELECT ${MANUAL_TRADE_SELECT}, ${TRADE_RELATIONS_SELECT}, ${TRADE_METADATA_JOINS}
    FROM ${TABLES.trades} trade
    WHERE (trade.unique_id = $1 OR CAST(trade.id AS TEXT) = $1) AND trade.user_id = $2 LIMIT 1`,
    [uniqueId, userId]
  );
  return result.rows[0] || null;
}

async function queryUserTrades(database, userId, sourceFilter = null, options = {}) {
  const params = [userId, sourceFilter];
  let paginationSql = '';
  if (options.limit) {
    const limit = Math.max(1, Math.min(100, Number(options.limit) || 25));
    const page = Math.max(1, Number(options.page) || 1);
    const offset = (page - 1) * limit;
    params.push(limit, offset);
    paginationSql = `LIMIT $3 OFFSET $4`;
  }
  const result = await database.query(`
    SELECT ${MANUAL_TRADE_SELECT}, ${TRADE_RELATIONS_SELECT}, ${TRADE_METADATA_JOINS},
           COUNT(*) OVER()::int AS total_count
    FROM ${TABLES.trades} trade
    WHERE trade.user_id = $1 AND ($2::text[] IS NULL OR trade.source = ANY($2))
      AND NOT EXISTS (
        SELECT 1 FROM broker_connections.user_broker_connections retained
        WHERE retained.id = trade.broker_connection_id AND retained.user_id = trade.user_id AND retained.deleted_at IS NOT NULL
      )
    ORDER BY trade.exit_timestamp DESC
    ${paginationSql}`,
    params
  );
  if (options.limit) {
    return {
      rows: result.rows,
      totalCount: result.rows.length > 0 ? (result.rows[0].total_count || 0) : 0,
    };
  }
  return result.rows;
}

async function deleteTradeById(database, uniqueId, userId) {
  const result = await database.query(`
    DELETE FROM ${TABLES.trades}
    WHERE (unique_id = $1 OR CAST(id AS TEXT) = $1) AND user_id = $2
    RETURNING id AS "ID", unique_id, symbol`,
    [uniqueId, userId]
  );
  return result.rows[0] || null;
}

async function insertTrade(database, t) {
  const result = await database.query(`
    INSERT INTO ${TABLES.trades} (
      unique_id, user_id, symbol, side, quantity, quantity_unit, entry_price, exit_price,
      entry_timestamp, exit_timestamp, gross_pnl, net_pnl, total_charges, charges, pnl_currency,
      currency, percent_change, stop_loss, take_profit, strategy, notes, attachments,
      status, close_reason, product_type, category, instrument_id, broker_connection_id, source, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, NOW(), NOW()
    )
    RETURNING id, unique_id, symbol, side, quantity, quantity_unit, entry_price, exit_price,
              entry_timestamp, exit_timestamp, gross_pnl, net_pnl, total_charges, charges, pnl_currency,
              currency, percent_change, stop_loss, take_profit, strategy, notes, attachments,
              status, close_reason, product_type, category, instrument_id, broker_connection_id, source`,
    [
      t.unique_id, t.user_id, t.symbol, t.side, t.quantity, t.quantity_unit, t.entry_price, t.exit_price,
      t.entry_timestamp, t.exit_timestamp, t.gross_pnl, t.net_pnl, t.total_charges, t.charges, t.pnl_currency,
      t.currency, t.percent_change, t.stop_loss, t.take_profit, t.strategy, t.notes, t.attachments,
      t.status, t.close_reason, t.product_type, t.category, t.instrument_id, t.broker_connection_id, t.source,
    ]
  );
  return result.rows[0];
}

async function updateTradeFields(database, tradeId, userId, updates = [], values = []) {
  if (!updates.length) return null;
  const paramOffset = values.length;
  const result = await database.query(`
    UPDATE ${TABLES.trades}
    SET ${updates.join(', ')}, updated_at = NOW()
    WHERE (unique_id = $${paramOffset + 1} OR CAST(id AS TEXT) = $${paramOffset + 1}) AND user_id = $${paramOffset + 2}
    RETURNING *`,
    [...values, tradeId, userId]
  );
  return result.rows[0] || null;
}

async function upsertOptionDetails(database, primaryDbId, details) {
  const option = normalizeOptionDetails(details);
  await database.query(`
    INSERT INTO trading.option_trade_details (
      trade_id, underlying_instrument_id, underlying_symbol, option_type, strike_price,
      expiry_date, expiry_at, expiry_timezone, expiry_time_source, contract_multiplier,
      lot_size, exercise_style, settlement_type, settlement_at, settlement_price,
      expiration_outcome
    ) VALUES ($1, $2::uuid, $3, $4, $5, $6::date, $7::timestamptz, $8, $9, $10, $11, $12, $13, $14::timestamptz, $15, $16)
    ON CONFLICT (trade_id) DO UPDATE SET
      underlying_instrument_id = EXCLUDED.underlying_instrument_id, underlying_symbol = EXCLUDED.underlying_symbol,
      option_type = EXCLUDED.option_type, strike_price = EXCLUDED.strike_price, expiry_date = EXCLUDED.expiry_date,
      expiry_at = EXCLUDED.expiry_at, expiry_timezone = EXCLUDED.expiry_timezone, expiry_time_source = EXCLUDED.expiry_time_source,
      contract_multiplier = EXCLUDED.contract_multiplier, lot_size = EXCLUDED.lot_size, exercise_style = EXCLUDED.exercise_style,
      settlement_type = EXCLUDED.settlement_type, settlement_at = EXCLUDED.settlement_at, settlement_price = EXCLUDED.settlement_price,
      expiration_outcome = EXCLUDED.expiration_outcome, updated_at = NOW()`,
    [
      primaryDbId, option.underlyingInstrumentId, option.underlyingSymbol, option.optionType,
      option.strikePrice, option.expiryDate, option.expiryAt, option.expiryTimezone,
      option.expiryTimeSource, option.contractMultiplier, option.lotSize, option.exerciseStyle,
      option.settlementType, option.settlementAt, option.settlementPrice, option.expirationOutcome,
    ]
  );
  return option;
}

async function upsertMarketDetails(database, primaryDbId, productType, details) {
  if (!details || typeof details !== 'object' || Array.isArray(details) || !Object.keys(details).length) return null;
  await database.query(`
    INSERT INTO trading.trade_market_details (trade_id, product_type, details)
    VALUES ($1, $2, $3::jsonb)
    ON CONFLICT (trade_id) DO UPDATE SET product_type = EXCLUDED.product_type, details = EXCLUDED.details, updated_at = NOW()`,
    [primaryDbId, productType, JSON.stringify(details)]
  );
  return details;
}

async function upsertTradeCalculation(database, primaryDbId, snapshot) {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot) || !Object.keys(snapshot).length) return null;
  await database.query(`
    INSERT INTO trading.trade_calculations (trade_id, snapshot)
    VALUES ($1, $2::jsonb)
    ON CONFLICT (trade_id) DO UPDATE SET snapshot = EXCLUDED.snapshot, updated_at = NOW()`,
    [primaryDbId, JSON.stringify(snapshot)]
  );
  return snapshot;
}

function normalizeExecution(execution = {}) {
  const rawAction = String(firstValue(execution, 'action', 'side') || 'long').trim().toLowerCase();
  const action = ['short', 'sell', 's', '2'].includes(rawAction) ? 'short' : 'long';
  const rawEffect = String(firstValue(execution, 'position_effect', 'positionEffect') || 'open').trim().toLowerCase();
  const position_effect = ['close', 'closed'].includes(rawEffect) ? 'close' : rawEffect === 'unknown' ? 'unknown' : 'open';
  const rawExecutedAt = firstValue(execution, 'executed_at', 'executedAt');
  const executedDate = rawExecutedAt ? new Date(Number.isFinite(Number(rawExecutedAt)) ? Number(rawExecutedAt) : rawExecutedAt) : new Date();
  const executed_at = Number.isNaN(executedDate.valueOf()) ? new Date().toISOString() : executedDate.toISOString();
  const quantity = Math.max(0, Number(firstValue(execution, 'quantity', 'qty') || 0));
  const price = Math.max(0, Number(execution.price || 0));
  const fees = Number(firstValue(execution, 'fees', 'fee', 'commission') || 0);
  const fee_currency = String(firstValue(execution, 'fee_currency', 'feeCurrency', 'currency') || 'USD').toUpperCase();
  const broker_order_id = firstValue(execution, 'broker_order_id', 'brokerOrderId') ? String(firstValue(execution, 'broker_order_id', 'brokerOrderId')) : null;
  const broker_execution_id = firstValue(execution, 'broker_execution_id', 'brokerExecutionId') ? String(firstValue(execution, 'broker_execution_id', 'brokerExecutionId')) : null;
  const metadata = execution.metadata && typeof execution.metadata === 'object' && !Array.isArray(execution.metadata) ? execution.metadata : {};
  return {
    action, position_effect, positionEffect: position_effect,
    quantity, price, executed_at, executedAt: executed_at, fees,
    fee_currency, feeCurrency: fee_currency, broker_order_id,
    brokerOrderId: broker_order_id, broker_execution_id,
    brokerExecutionId: broker_execution_id, metadata,
  };
}

async function upsertTradeExecutions(database, primaryDbId, executions) {
  const normalized = (executions || []).map(normalizeExecution).filter((e) => e.quantity > 0 && e.price > 0);
  if (!normalized.length) return 0;
  const result = await database.query(`
    INSERT INTO trading.trade_executions (
      trade_id, action, position_effect, quantity, price, executed_at, fees,
      fee_currency, broker_order_id, broker_execution_id, metadata
    )
    SELECT $1, execution.action, execution.position_effect, execution.quantity,
      execution.price, execution.executed_at, execution.fees, execution.fee_currency,
      execution.broker_order_id, execution.broker_execution_id, execution.metadata
    FROM JSONB_TO_RECORDSET($2::jsonb) AS execution(
      action text, position_effect text, quantity numeric, price numeric,
      executed_at timestamptz, fees numeric, fee_currency text,
      broker_order_id text, broker_execution_id text, metadata jsonb
    )
    ON CONFLICT (trade_id, broker_execution_id) WHERE broker_execution_id IS NOT NULL
    DO UPDATE SET
      action = EXCLUDED.action, position_effect = EXCLUDED.position_effect, quantity = EXCLUDED.quantity,
      price = EXCLUDED.price, executed_at = EXCLUDED.executed_at, fees = EXCLUDED.fees,
      fee_currency = EXCLUDED.fee_currency, broker_order_id = EXCLUDED.broker_order_id,
      metadata = EXCLUDED.metadata
    RETURNING id`,
    [primaryDbId, JSON.stringify(normalized)]
  );
  return result.rowCount;
}

async function upsertJournalEntry(database, userId, tradeId, { mistakes, customTags, executionScore, reviewSummary }) {
  await database.query(`
    INSERT INTO trading.journal_entries (
      user_id, trade_id, mistakes, custom_tags, execution_score, review_summary, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
    ON CONFLICT (user_id, trade_id) DO UPDATE SET
      mistakes = COALESCE(EXCLUDED.mistakes, trading.journal_entries.mistakes),
      custom_tags = COALESCE(EXCLUDED.custom_tags, trading.journal_entries.custom_tags),
      execution_score = COALESCE(EXCLUDED.execution_score, trading.journal_entries.execution_score),
      review_summary = COALESCE(EXCLUDED.review_summary, trading.journal_entries.review_summary),
      updated_at = NOW()`,
    [userId, tradeId, mistakes || null, customTags || null, executionScore ?? null, reviewSummary || null]
  );
}

async function toggleBreakevenDay(database, userId, date, isBreakeven) {
  const result = await database.query(`
    INSERT INTO trading.journal_entries (user_id, journal_date, is_breakeven, created_at, updated_at)
    VALUES ($1, $2::date, $3, NOW(), NOW())
    ON CONFLICT (user_id, journal_date) DO UPDATE SET is_breakeven = EXCLUDED.is_breakeven, updated_at = NOW()
    RETURNING id, journal_date, is_breakeven`,
    [userId, date, isBreakeven]
  );
  return result.rows[0];
}

module.exports = {
  TRADE_METADATA_JOINS,
  TRADE_RELATIONS_SELECT,
  deleteTradeById,
  findTradeById,
  insertTrade,
  normalizeExecution,
  queryUserTrades,
  toggleBreakevenDay,
  updateTradeFields,
  upsertJournalEntry,
  upsertMarketDetails,
  upsertOptionDetails,
  upsertTradeCalculation,
  upsertTradeExecutions,
};
