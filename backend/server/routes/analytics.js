const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// GET TRADES BY DATE
router.get('/trades-by-date/:userid', async (req, res) => {
    const userId = req.params.userid;
    const { date } = req.query;

    console.log("📅 GET TRADES BY DATE - User ID:", userId, "Date:", date);

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

        console.log(`✅ TRADES BY DATE FETCHED - Manual: ${manualResult.rows.length}, API: ${apiResult.rows.length}`);
        
        res.json(response);

    } catch (error) {
        console.log("❌ Get Trades By Date Error:", error.message);
        res.json({ 
            success: false, 
            error: error.message 
        });
    }
});

// GET TRADES BY DATE RANGE
router.get('/trades-by-date-range/:userid', async (req, res) => {
    const userId = req.params.userid;
    const { start_date, end_date } = req.query;

    console.log("📊 GET TRADES BY DATE RANGE - User ID:", userId, "From:", start_date, "To:", end_date);

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

        console.log(`✅ TRADES BY DATE RANGE FETCHED - Days with trades: ${manualResult.rows.length}`);
        
        res.json({
            success: true,
            start_date: start_date,
            end_date: end_date,
            daily_data: manualResult.rows,
            total_days: manualResult.rows.length
        });

    } catch (error) {
        console.log("❌ Get Trades By Date Range Error:", error.message);
        res.json({ 
            success: false, 
            error: error.message 
        });
    }
});

// GET TRADE SUMMARY
router.get('/trade-summary/:userid', async (req, res) => {
    const userId = req.params.userid;

    console.log("📈 GET TRADE SUMMARY - User ID:", userId);

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
             FROM api_trades WHERE user_id = $1`,
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

        console.log("✅ TRADE SUMMARY FETCHED:", combinedSummary);
        
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
        console.log("❌ Get Trade Summary Error:", error.message);
        res.json({ success: false, error: error.message });
    }
});

module.exports = router;