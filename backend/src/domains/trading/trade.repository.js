const postgres = require('../../infra/db/postgres');
const { TABLES } = require('../../core/constants/tables');

const tradeRepository = {
  async queryUserTrades(userId, { page, limit } = {}) {
    const params = [userId];
    let paginationSql = '';
    if (limit) {
      const parsedLimit = Math.max(1, Math.min(100, Number(limit) || 25));
      const parsedPage = Math.max(1, Number(page) || 1);
      const offset = (parsedPage - 1) * parsedLimit;
      params.push(parsedLimit, offset);
      paginationSql = 'LIMIT $2 OFFSET $3';
    }

    const res = await postgres.query(`
      SELECT *, COUNT(*) OVER()::int AS total_count
      FROM ${TABLES.trades}
      WHERE user_id = $1
      ORDER BY exit_timestamp DESC NULLS LAST, entry_timestamp DESC
      ${paginationSql}
    `, params);

    return {
      trades: res.rows,
      totalCount: res.rows.length > 0 ? (res.rows[0].total_count || 0) : 0
    };
  },

  async findTradeById(uniqueId, userId) {
    const res = await postgres.query(`
      SELECT * FROM ${TABLES.trades}
      WHERE (unique_id = $1 OR CAST(id AS TEXT) = $1) AND user_id = $2
      LIMIT 1
    `, [uniqueId, userId]);
    return res.rows[0] || null;
  },

  async insertTrade(t) {
    const res = await postgres.query(`
      INSERT INTO ${TABLES.trades} (
        unique_id, user_id, broker_connection_id, symbol, side, status,
        quantity, entry_price, exit_price, entry_timestamp, exit_timestamp,
        gross_pnl, net_pnl, total_charges, pnl_currency, stop_loss, take_profit,
        percent_change, product_type, category, strategy, notes, attachments, source, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, NOW(), NOW()
      ) RETURNING *
    `, [
      t.uniqueId, t.userId, t.brokerConnectionId, t.symbol, t.side, t.status,
      t.quantity, t.entryPrice, t.exitPrice, t.entryTimestamp, t.exitTimestamp,
      t.grossPnl, t.netPnl, t.totalCharges, t.pnlCurrency, t.stopLoss, t.takeProfit,
      t.percentChange, t.productType, t.category, t.strategy, t.notes,
      JSON.stringify(t.attachments || []), t.source || 'manual'
    ]);
    return res.rows[0];
  },

  async updateTrade(uniqueId, userId, updates = {}) {
    const keys = Object.keys(updates);
    if (!keys.length) return null;

    const setClauses = keys.map((key, i) => `${key} = $${i + 1}`);
    const values = keys.map((key) => updates[key]);
    values.push(uniqueId, userId);

    const res = await postgres.query(`
      UPDATE ${TABLES.trades}
      SET ${setClauses.join(', ')}, updated_at = NOW()
      WHERE (unique_id = $${keys.length + 1} OR CAST(id AS TEXT) = $${keys.length + 1}) AND user_id = $${keys.length + 2}
      RETURNING *
    `, values);
    return res.rows[0] || null;
  },

  async deleteTrade(uniqueId, userId) {
    const res = await postgres.query(`
      DELETE FROM ${TABLES.trades}
      WHERE (unique_id = $1 OR CAST(id AS TEXT) = $1) AND user_id = $2
      RETURNING id, unique_id, symbol
    `, [uniqueId, userId]);
    return res.rows[0] || null;
  },

  async updateAttachments(uniqueId, userId, attachments) {
    const res = await postgres.query(`
      UPDATE ${TABLES.trades}
      SET attachments = $1, updated_at = NOW()
      WHERE (unique_id = $2 OR CAST(id AS TEXT) = $2) AND user_id = $3
      RETURNING id, unique_id, attachments
    `, [JSON.stringify(attachments), uniqueId, userId]);
    return res.rows[0] || null;
  },

  async toggleBreakevenDay(userId, date, isBreakeven) {
    const res = await postgres.query(`
      INSERT INTO ${TABLES.journalEntries} (user_id, journal_date, is_breakeven, updated_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (user_id, journal_date)
      DO UPDATE SET is_breakeven = $3, updated_at = NOW()
      RETURNING *
    `, [userId, date, isBreakeven]);
    return res.rows[0];
  },

  async getNotes(uniqueId, userId) {
    const res = await postgres.query(`
      SELECT notes FROM ${TABLES.trades}
      WHERE (unique_id = $1 OR CAST(id AS TEXT) = $1) AND user_id = $2
    `, [uniqueId, userId]);
    return res.rows[0]?.notes || null;
  },

  async updateNotes(uniqueId, userId, notes) {
    const res = await postgres.query(`
      UPDATE ${TABLES.trades}
      SET notes = $1, updated_at = NOW()
      WHERE (unique_id = $2 OR CAST(id AS TEXT) = $2) AND user_id = $3
      RETURNING unique_id, notes
    `, [notes, uniqueId, userId]);
    return res.rows[0]?.notes || null;
  }
};

module.exports = tradeRepository;
