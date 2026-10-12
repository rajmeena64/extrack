const postgres = require('../../infra/db/postgres');
const { TABLES } = require('../../core/constants/tables');
const { computeStats, computeRadar } = require('./analytics.calculator');

const analyticsService = {
  async getDashboardAnalytics(userId, options = {}) {
    const { tradeMode, from, to, currency } = options;
    const params = [userId];
    const conditions = ['user_id = $1'];

    if (tradeMode === 'api') conditions.push("source = 'sync'");
    else if (tradeMode === 'manual') conditions.push("source IN ('manual', 'file', 'csv_upload')");

    if (from) {
      params.push(from);
      conditions.push(`COALESCE(exit_timestamp, entry_timestamp) >= $${params.length}::timestamptz`);
    }
    if (to) {
      params.push(to);
      conditions.push(`COALESCE(exit_timestamp, entry_timestamp) <= $${params.length}::timestamptz`);
    }

    const res = await postgres.query(`
      SELECT id, unique_id, symbol, side, quantity, entry_price, exit_price,
             gross_pnl, net_pnl, total_charges, pnl_currency, status, strategy,
             entry_timestamp, exit_timestamp,
             COALESCE(exit_timestamp, entry_timestamp)::date::text AS date
      FROM ${TABLES.trades}
      WHERE ${conditions.join(' AND ')}
      ORDER BY COALESCE(exit_timestamp, entry_timestamp) ASC
    `, params);

    const trades = res.rows.map((r) => ({
      ...r,
      pnl: r.net_pnl !== null ? Number(r.net_pnl) : Number(r.gross_pnl || 0)
    }));

    const stats = computeStats(trades);
    const radar = computeRadar(trades);

    const sortedDates = Array.from(stats.dayMap.keys()).sort();
    let cumulative = 0;
    const performanceChart = sortedDates.map((d) => {
      const pnl = Number((stats.dayMap.get(d) || 0).toFixed(2));
      cumulative = Number((cumulative + pnl).toFixed(2));
      return { date: d, pnl, cumulativePnL: cumulative };
    });

    const calendar = sortedDates.map((d) => ({
      date: d,
      pnl: Number((stats.dayMap.get(d) || 0).toFixed(2))
    }));

    const recentTrades = trades.slice(-12).reverse().map((t) => ({
      id: t.id,
      uniqueId: t.unique_id,
      symbol: t.symbol,
      side: t.side,
      quantity: Number(t.quantity),
      entryPrice: Number(t.entry_price),
      exitPrice: t.exit_price !== null ? Number(t.exit_price) : null,
      pnl: t.pnl,
      pnlCurrency: t.pnl_currency,
      status: t.status,
      entryTimestamp: t.entry_timestamp,
      exitTimestamp: t.exit_timestamp
    }));

    const { dayMap, ...cleanStats } = stats;

    return {
      stats: cleanStats,
      performanceChart,
      calendar,
      radar,
      recentTrades
    };
  }
};

module.exports = analyticsService;
