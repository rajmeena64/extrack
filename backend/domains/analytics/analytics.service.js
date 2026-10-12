const pool = require('../../infra/db/supabase');
const { TABLES } = require('../../config/tables');

const USD_VALUE = {
  USD: 1,
  USC: 0.01,
  INR: 1 / 94.425,
  CNY: 1 / 6.804,
  EUR: 1.175,
};

function convertCurrency(val, fromCode = 'USD', toCode = 'USD') {
  const num = Number(val);
  if (!Number.isFinite(num)) return 0;
  const from = String(fromCode || 'USD').toUpperCase();
  const to = String(toCode || 'USD').toUpperCase();
  if (from === to) return num;
  const fromRate = USD_VALUE[from] || 1;
  const toRate = USD_VALUE[to] || 1;
  return (num * fromRate) / toRate;
}

function computeRadarMetrics(trades) {
  if (!trades.length) {
    return { win: 0, profit: 0, avg: 0, recovery: 0, drawdown: 0, consistency: 0, overallScore: 0 };
  }
  const pnls = trades.map((t) => t.convertedPnl);
  const winners = pnls.filter((p) => p > 0);
  const losers = pnls.filter((p) => p < 0);
  const winRate = (winners.length / trades.length) * 100;
  const grossProfit = winners.reduce((s, p) => s + p, 0);
  const grossLoss = Math.abs(losers.reduce((s, p) => s + p, 0));
  const rawPF = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 3 : 0;
  const profitFactor = Math.min((rawPF / 3) * 100, 100);
  const avgWin = winners.length > 0 ? grossProfit / winners.length : 0;
  const avgLoss = losers.length > 0 ? grossLoss / losers.length : 1;
  const avgRatio = Math.min(((avgWin / (avgLoss || 1)) / 2) * 100, 100);
  const netPnL = pnls.reduce((s, p) => s + p, 0);
  let peak = 0;
  let maxDD = 0;
  let running = 0;
  for (const p of pnls) {
    running += p;
    if (running > peak) peak = running;
    const dd = peak - running;
    if (dd > maxDD) maxDD = dd;
  }
  const rawRF = maxDD > 0 ? netPnL / maxDD : netPnL > 0 ? 3 : 0;
  const recovery = Math.min(Math.max((rawRF / 3) * 100, 0), 100);
  const drawdown = Math.max(100 - (peak > 0 ? (maxDD / peak) * 100 : 0), 0);
  const weekMap = {};
  trades.forEach((t) => {
    if (!t.displayDate) return;
    const d = new Date(t.displayDate);
    const jan1 = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
    const key = `${d.getFullYear()}-W${week}`;
    weekMap[key] = (weekMap[key] || 0) + t.convertedPnl;
  });
  const weeks = Object.values(weekMap);
  const consistency = weeks.length > 0 ? (weeks.filter((w) => w > 0).length / weeks.length) * 100 : 0;
  const win = Math.round(winRate);
  const profit = Math.round(profitFactor);
  const avg = Math.round(avgRatio);
  const recoveryScore = Math.round(recovery);
  const drawdownScore = Math.round(drawdown);
  const consistencyScore = Math.round(consistency);
  const overallScore = Math.round(
    win * 0.20 +
    profit * 0.25 +
    avg * 0.15 +
    recoveryScore * 0.15 +
    drawdownScore * 0.15 +
    consistencyScore * 0.10
  );
  return { win, profit, avg, recovery: recoveryScore, drawdown: drawdownScore, consistency: consistencyScore, overallScore };
}

async function getDashboardAnalytics(userId, options = {}, database = pool) {
  const { tradeMode = 'all', from = null, to = null, currency = 'USD' } = options;
  const params = [userId];
  const conditions = [
    'trade.user_id = $1',
    `NOT EXISTS (
      SELECT 1 FROM broker_connections.user_broker_connections retained
      WHERE retained.id = trade.broker_connection_id
        AND retained.user_id = trade.user_id
        AND retained.deleted_at IS NOT NULL
    )`,
  ];
  if (tradeMode === 'api') {
    conditions.push("trade.source = 'sync'");
  } else if (tradeMode === 'manual') {
    conditions.push("trade.source IN ('manual', 'file', 'csv_upload')");
  }
  if (from) {
    params.push(from);
    conditions.push(`COALESCE(trade.exit_timestamp, trade.entry_timestamp) >= $${params.length}::timestamptz`);
  }
  if (to) {
    const toDate = new Date(to);
    if (!Number.isNaN(toDate.getTime()) && toDate.getUTCHours() === 0 && toDate.getUTCMinutes() === 0 && toDate.getUTCSeconds() === 0) {
      toDate.setUTCHours(23, 59, 59, 999);
      params.push(toDate.toISOString());
    } else {
      params.push(to);
    }
    conditions.push(`COALESCE(trade.exit_timestamp, trade.entry_timestamp) <= $${params.length}::timestamptz`);
  }
  const whereClause = conditions.join(' AND ');
  const tradesQuery = `
    SELECT
      trade.id,
      COALESCE(trade.unique_id, CAST(trade.id AS TEXT)) AS unique_id,
      trade.symbol,
      trade.side,
      trade.quantity,
      trade.entry_price,
      trade.exit_price,
      trade.gross_pnl,
      trade.net_pnl,
      trade.total_charges,
      trade.pnl_currency,
      trade.status,
      trade.strategy,
      trade.notes,
      trade.entry_timestamp,
      trade.exit_timestamp,
      COALESCE(trade.exit_timestamp, trade.entry_timestamp) AS display_timestamp,
      (SELECT journal.is_breakeven FROM trading.journal_entries journal
       WHERE journal.user_id = trade.user_id
         AND journal.journal_date = COALESCE(trade.exit_timestamp, trade.entry_timestamp)::date
       LIMIT 1) AS is_breakeven
    FROM ${TABLES.trades} trade
    WHERE ${whereClause}
    ORDER BY COALESCE(trade.exit_timestamp, trade.entry_timestamp) ASC
  `;
  const { rows } = await database.query(tradesQuery, params);
  const targetCurrency = String(currency || 'USD').toUpperCase();
  const processedTrades = rows.map((r) => {
    const rawPnl = r.net_pnl !== null && r.net_pnl !== undefined ? Number(r.net_pnl) : Number(r.gross_pnl || 0);
    const convertedPnl = convertCurrency(rawPnl, r.pnl_currency || 'USD', targetCurrency);
    const d = r.display_timestamp ? new Date(r.display_timestamp) : null;
    const dateKey = d && !Number.isNaN(d.getTime())
      ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      : null;
    return {
      ...r,
      convertedPnl,
      dateKey,
      displayDate: d,
    };
  });
  let totalPnL = 0;
  let winningTrades = 0;
  let losingTrades = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  const dayPnLMap = new Map();
  processedTrades.forEach((t) => {
    const pnl = t.convertedPnl;
    totalPnL += pnl;
    if (pnl > 0) {
      winningTrades += 1;
      grossProfit += pnl;
    } else if (pnl < 0) {
      losingTrades += 1;
      grossLoss += Math.abs(pnl);
    }
    if (t.dateKey) {
      dayPnLMap.set(t.dateKey, (dayPnLMap.get(t.dateKey) || 0) + pnl);
    }
  });
  let winningDays = 0;
  let losingDays = 0;
  dayPnLMap.forEach((dayPnL) => {
    if (dayPnL > 0) winningDays += 1;
    else if (dayPnL < 0) losingDays += 1;
  });
  const totalTrades = processedTrades.length;
  const totalTradingDays = winningDays + losingDays;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
  const dayWinRate = totalTradingDays > 0 ? (winningDays / totalTradingDays) * 100 : 0;
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? grossProfit : 0;
  const avgPnL = totalTrades > 0 ? totalPnL / totalTrades : 0;
  const stats = {
    totalPnL: Number(totalPnL.toFixed(2)),
    winRate: Number(winRate.toFixed(2)),
    winningTrades,
    losingTrades,
    totalTrades,
    winningDays,
    losingDays,
    totalTradingDays,
    dayWinRate: Number(dayWinRate.toFixed(2)),
    profitFactor: Number(profitFactor.toFixed(2)),
    grossProfit: Number(grossProfit.toFixed(2)),
    grossLoss: Number(grossLoss.toFixed(2)),
    avgPnL: Number(avgPnL.toFixed(2)),
  };
  const sortedDates = Array.from(dayPnLMap.keys()).sort();
  let cumulative = 0;
  const performanceChart = sortedDates.map((date) => {
    const dayPnl = Number((dayPnLMap.get(date) || 0).toFixed(2));
    cumulative = Number((cumulative + dayPnl).toFixed(2));
    return { date, pnl: dayPnl, cumulativePnL: cumulative };
  });
  const activityLabels = sortedDates.slice(-30);
  const activityChart = activityLabels.map((date) => ({
    date,
    pnl: Number((dayPnLMap.get(date) || 0).toFixed(2)),
  }));
  const radar = computeRadarMetrics(processedTrades);
  const sortedDescending = [...processedTrades].reverse();
  const recentTrades = sortedDescending.slice(0, 12).map((t) => ({
    id: t.id,
    unique_id: t.unique_id,
    symbol: t.symbol,
    side: t.side,
    quantity: t.quantity,
    entryPrice: t.entry_price,
    exitPrice: t.exit_price,
    pnl: Number(t.convertedPnl.toFixed(2)),
    pnl_currency: targetCurrency,
    status: t.status,
    strategy: t.strategy,
    entry_timestamp: t.entry_timestamp,
    exit_timestamp: t.exit_timestamp,
    trade_time: t.display_timestamp,
  }));
  const calendarParams = [userId];
  const calendarConditions = [
    'trade.user_id = $1',
    `COALESCE(trade.exit_timestamp, trade.entry_timestamp) >= NOW() - INTERVAL '365 days'`,
    `NOT EXISTS (
      SELECT 1 FROM broker_connections.user_broker_connections retained
      WHERE retained.id = trade.broker_connection_id
        AND retained.user_id = trade.user_id
        AND retained.deleted_at IS NOT NULL
    )`,
  ];
  if (tradeMode === 'api') {
    calendarConditions.push("trade.source = 'sync'");
  } else if (tradeMode === 'manual') {
    calendarConditions.push("trade.source IN ('manual', 'file', 'csv_upload')");
  }
  const calendarQuery = `
    SELECT
      COALESCE(trade.exit_timestamp, trade.entry_timestamp)::date AS trade_date,
      COALESCE(trade.net_pnl, trade.gross_pnl, 0) AS pnl,
      trade.pnl_currency,
      (CASE WHEN (trade.notes IS NOT NULL AND trade.notes != '') OR (trade.strategy IS NOT NULL AND trade.strategy != '') THEN true ELSE false END) AS has_badge,
      (SELECT journal.is_breakeven FROM trading.journal_entries journal
       WHERE journal.user_id = trade.user_id
         AND journal.journal_date = COALESCE(trade.exit_timestamp, trade.entry_timestamp)::date
       LIMIT 1) AS is_breakeven
    FROM ${TABLES.trades} trade
    WHERE ${calendarConditions.join(' AND ')}
    ORDER BY trade_date ASC
  `;
  const calendarResult = await database.query(calendarQuery, calendarParams);
  const calendarDayMap = new Map();
  calendarResult.rows.forEach((r) => {
    if (!r.trade_date) return;
    const d = new Date(r.trade_date);
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const pnl = convertCurrency(Number(r.pnl || 0), r.pnl_currency || 'USD', targetCurrency);
    if (!calendarDayMap.has(dateKey)) {
      calendarDayMap.set(dateKey, {
        dateKey,
        pnl: 0,
        trades: 0,
        wins: 0,
        hasBadge: false,
        isBreakeven: Boolean(r.is_breakeven),
      });
    }
    const day = calendarDayMap.get(dateKey);
    day.pnl += pnl;
    day.trades += 1;
    if (pnl > 0) day.wins += 1;
    if (r.has_badge) day.hasBadge = true;
    if (r.is_breakeven) day.isBreakeven = true;
  });
  const calendar = Array.from(calendarDayMap.values()).map((day) => ({
    ...day,
    pnl: Number(day.pnl.toFixed(2)),
    winRate: day.trades > 0 ? Number(((day.wins / day.trades) * 100).toFixed(1)) : 0,
  }));
  return {
    stats,
    performanceChart,
    activityChart,
    radar,
    recentTrades,
    calendar,
    currency: targetCurrency,
  };
}

module.exports = { getDashboardAnalytics, convertCurrency };
