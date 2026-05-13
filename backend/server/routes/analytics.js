const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authCheck } = require('./auth');

const REAL_API_TRADE_FILTER = `
    symbol IS NOT NULL
    AND NULLIF(TRIM(symbol), '') IS NOT NULL
    AND LOWER(COALESCE(trade_type, '')) IN ('buy', 'sell')
    AND COALESCE(quantity, 0) > 0
    AND COALESCE(price, 0) > 0
    AND COALESCE(exit_price, 0) > 0
`;

// GET TRADES BY DATE
router.get('/trades-by-date/:userid?', authCheck, async (req, res) => {
    const userId = req.userId;
    const { date } = req.query;

    if (!date) {
        return res.json({ 
            success: false, 
            error: 'Date parameter required (YYYY-MM-DD format)' 
        });
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
        return res.json({ 
            success: false, 
            error: 'Invalid date format. Use YYYY-MM-DD' 
        });
    }

    try {
        const manualResult = await pool.query(
            `SELECT * FROM trades 
             WHERE user_id = $1 
             AND DATE(timestamp) = $2
             ORDER BY timestamp DESC`,
            [userId, date]
        );

        const apiResult = await pool.query(
            `SELECT * FROM api_trades 
             WHERE user_id = $1 
             AND ${REAL_API_TRADE_FILTER}
             AND DATE(timestamp) = $2
             ORDER BY timestamp DESC`,
            [userId, date]
        );

        const response = {
            success: true,
            date: date,
            manual_trades: manualResult.rows,
            api_trades: apiResult.rows,
            total_manual: manualResult.rows.length,
            total_api: apiResult.rows.length,
            total_all: manualResult.rows.length + apiResult.rows.length
        };

        res.json(response);

    } catch (error) {
        res.json({ 
            success: false, 
            error: error.message 
        });
    }
});

// GET TRADES BY DATE RANGE
router.get('/trades-by-date-range/:userid?', authCheck, async (req, res) => {
    const userId = req.userId;
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
        return res.json({ 
            success: false, 
            error: 'start_date and end_date parameters required' 
        });
    }

    try {
        const manualResult = await pool.query(
            `SELECT 
                DATE(timestamp) as trade_date,
                COUNT(*) as trade_count,
                SUM(pnl) as daily_pnl,
                SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END) as winning_trades,
                SUM(CASE WHEN pnl < 0 THEN 1 ELSE 0 END) as losing_trades
             FROM trades 
             WHERE user_id = $1 
             AND DATE(timestamp) BETWEEN $2 AND $3
             GROUP BY DATE(timestamp)
             ORDER BY trade_date DESC`,
            [userId, start_date, end_date]
        );

        const apiResult = await pool.query(
            `SELECT 
                DATE(timestamp) as trade_date,
                COUNT(*) as trade_count,
                SUM(pnl) as daily_pnl,
                SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END) as winning_trades,
                SUM(CASE WHEN pnl < 0 THEN 1 ELSE 0 END) as losing_trades
             FROM api_trades 
             WHERE user_id = $1
             AND ${REAL_API_TRADE_FILTER}
             AND DATE(timestamp) BETWEEN $2 AND $3
             GROUP BY DATE(timestamp)
             ORDER BY trade_date DESC`,
            [userId, start_date, end_date]
        );

        const mergedByDate = new Map();

        for (const row of [...manualResult.rows, ...apiResult.rows]) {
            const dateKey = row.trade_date instanceof Date
                ? row.trade_date.toISOString().slice(0, 10)
                : String(row.trade_date);

            const existing = mergedByDate.get(dateKey) || {
                trade_date: row.trade_date,
                trade_count: 0,
                daily_pnl: 0,
                winning_trades: 0,
                losing_trades: 0,
            };

            existing.trade_count += Number(row.trade_count || 0);
            existing.daily_pnl += Number(row.daily_pnl || 0);
            existing.winning_trades += Number(row.winning_trades || 0);
            existing.losing_trades += Number(row.losing_trades || 0);

            mergedByDate.set(dateKey, existing);
        }

        const dailyData = Array.from(mergedByDate.values())
            .sort((a, b) => new Date(b.trade_date) - new Date(a.trade_date));

        res.json({
            success: true,
            start_date: start_date,
            end_date: end_date,
            daily_data: dailyData,
            total_days: dailyData.length
        });

    } catch (error) {
        res.json({ 
            success: false, 
            error: error.message 
        });
    }
});

// GET TRADE SUMMARY
router.get('/trade-summary/:userid?', authCheck, async (req, res) => {
    const userId = req.userId;

    try {
        const manualResult = await pool.query(
            `SELECT 
                COUNT(*) as total_trades,
                SUM(pnl) as total_pnl,
                SUM(CASE WHEN pnl > 0 THEN pnl ELSE 0 END) as total_profit,
                SUM(CASE WHEN pnl < 0 THEN pnl ELSE 0 END) as total_loss,
                COUNT(CASE WHEN pnl > 0 THEN 1 END) as winning_trades,
                COUNT(CASE WHEN pnl < 0 THEN 1 END) as losing_trades
             FROM trades WHERE user_id = $1`,
            [userId]
        );

        const apiResult = await pool.query(
            `SELECT 
                COUNT(*) as total_trades,
                SUM(pnl) as total_pnl,
                SUM(CASE WHEN pnl > 0 THEN pnl ELSE 0 END) as total_profit,
                SUM(CASE WHEN pnl < 0 THEN pnl ELSE 0 END) as total_loss,
                COUNT(CASE WHEN pnl > 0 THEN 1 END) as winning_trades,
                COUNT(CASE WHEN pnl < 0 THEN 1 END) as losing_trades
             FROM api_trades
             WHERE user_id = $1
             AND ${REAL_API_TRADE_FILTER}`,
            [userId]
        );

        const manualSummary = manualResult.rows[0] || {
            total_trades: 0, total_pnl: 0, total_profit: 0, total_loss: 0, 
            winning_trades: 0, losing_trades: 0
        };

        const apiSummary = apiResult.rows[0] || {
            total_trades: 0, total_pnl: 0, total_profit: 0, total_loss: 0, 
            winning_trades: 0, losing_trades: 0
        };

        const combinedSummary = {
            total_trades: parseInt(manualSummary.total_trades) + parseInt(apiSummary.total_trades),
            total_pnl: parseFloat(manualSummary.total_pnl || 0) + parseFloat(apiSummary.total_pnl || 0),
            total_profit: parseFloat(manualSummary.total_profit || 0) + parseFloat(apiSummary.total_profit || 0),
            total_loss: parseFloat(manualSummary.total_loss || 0) + parseFloat(apiSummary.total_loss || 0),
            winning_trades: parseInt(manualSummary.winning_trades) + parseInt(apiSummary.winning_trades),
            losing_trades: parseInt(manualSummary.losing_trades) + parseInt(apiSummary.losing_trades)
        };

        const totalTrades = combinedSummary.total_trades;
        const winRate = totalTrades > 0 ? (combinedSummary.winning_trades / totalTrades * 100).toFixed(2) : 0;

        res.json({
            success: true,
            summary: {
                ...combinedSummary,
                win_rate: winRate,
                manual_trades: parseInt(manualSummary.total_trades),
                api_trades: parseInt(apiSummary.total_trades)
            }
        });

    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

module.exports = router;









