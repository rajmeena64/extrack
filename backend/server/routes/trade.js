const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authCheck } = require('./auth');
const {
    encryptMT5Password,
    verifyMT5Password,
} = require('../utils/mt5Credentials');

function normalizeScreenshots(screenshots) {
    if (!screenshots) return null;
    return Array.isArray(screenshots)
        ? JSON.stringify(screenshots)
        : JSON.stringify([screenshots]);
}

function parseTradeId(value) {
    const numericId = Number.parseInt(value, 10);
    return Number.isNaN(numericId) ? null : numericId;
}

router.post('/save-trade', authCheck, async (req, res) => {
    const {
        symbol,
        trade_type,
        category,
        quantity,
        price,
        exit_price,
        pnl,
        strategy,
        timestamp,
        notes,
        screenshots
    } = req.body;

    try {
        const screenshotsJson = normalizeScreenshots(screenshots);

        await pool.query(
            `INSERT INTO trades
             (user_id, symbol, trade_type, category, quantity, price, exit_price, pnl, strategy, timestamp, notes, screenshots)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
            [req.userId, symbol, trade_type, category, quantity, price, exit_price, pnl, strategy, timestamp, notes, screenshotsJson]
        );

        res.json({
            success: true,
            message: 'Manual trade saved!',
            screenshotCount: screenshotsJson ? JSON.parse(screenshotsJson).length : 0
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/save-bulk-trades', authCheck, async (req, res) => {
    const { trades } = req.body;

    if (!trades || !Array.isArray(trades)) {
        return res.status(400).json({ success: false, error: 'Invalid trades data' });
    }

    const MAX_TRADES_PER_REQUEST = 500;
    if (trades.length > MAX_TRADES_PER_REQUEST) {
        return res.status(400).json({
            success: false,
            error: `Too many trades. Maximum ${MAX_TRADES_PER_REQUEST} trades per request.`
        });
    }

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const trade of trades) {
        try {
            const exitPrice = trade.exit_price || trade.closing_price;
            const entryPrice = trade.price || trade.opening_price;
            const tradeType = trade.trade_type || trade.type;
            const tradeQuantity = trade.quantity || trade.lots;
            const tradeTimestamp = trade.timestamp || trade.opening_time_utc;
            const tradePNL = trade.pnl || trade.profit_usd || 0;
            const screenshotsJson = normalizeScreenshots(trade.screenshots || null);

            if (!trade.symbol) {
                results.push({ success: false, trade: 'Unknown', error: 'Missing symbol' });
                errorCount++;
                continue;
            }
            if (!tradeType) {
                results.push({ success: false, trade: trade.symbol, error: 'Missing trade_type' });
                errorCount++;
                continue;
            }
            if (!tradeQuantity || tradeQuantity <= 0) {
                results.push({ success: false, trade: trade.symbol, error: 'Invalid quantity' });
                errorCount++;
                continue;
            }
            if (!entryPrice || entryPrice <= 0) {
                results.push({ success: false, trade: trade.symbol, error: 'Invalid price' });
                errorCount++;
                continue;
            }
            if (!exitPrice || exitPrice <= 0) {
                results.push({ success: false, trade: trade.symbol, error: 'Invalid exit_price' });
                errorCount++;
                continue;
            }
            if (!tradeTimestamp) {
                results.push({ success: false, trade: trade.symbol, error: 'Missing timestamp' });
                errorCount++;
                continue;
            }

            const normalizedTradeType = tradeType.toLowerCase().includes('buy')
                ? 'buy'
                : tradeType.toLowerCase().includes('sell')
                    ? 'sell'
                    : tradeType;

            await pool.query(
                `INSERT INTO trades
                 (user_id, symbol, trade_type, category, quantity, price, exit_price, pnl, strategy, timestamp, notes, screenshots)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
                [
                    req.userId,
                    trade.symbol,
                    normalizedTradeType,
                    trade.category || 'forex',
                    parseFloat(tradeQuantity),
                    parseFloat(entryPrice),
                    parseFloat(exitPrice),
                    parseFloat(tradePNL) || 0,
                    trade.strategy || null,
                    tradeTimestamp,
                    trade.notes || null,
                    screenshotsJson
                ]
            );

            results.push({ success: true, trade: trade.symbol });
            successCount++;
        } catch (error) {
            results.push({ success: false, trade: trade.symbol, error: error.message });
            errorCount++;
        }
    }

    res.json({
        success: true,
        message: `Processed ${trades.length} trades: ${successCount} successful, ${errorCount} failed`,
        savedCount: successCount,
        errorCount,
        results
    });
});

router.post('/save-api-trade', async (req, res) => {
    try {
        let trades = req.body;
        if (!Array.isArray(trades)) trades = [trades];

        const results = [];
        let skippedCount = 0;
        let errorCount = 0;
        const values = [];
        const params = [];
        let i = 1;
        const userIdMap = new Map();

        for (const trade of trades) {
            try {
                const {
                    account_id,
                    ticket,
                    symbol,
                    type,
                    volume,
                    entry_price,
                    exit_price,
                    profit,
                    close_time,
                    open_timestamp,
                    close_timestamp,
                    balance,
                    account_currency
                } = trade;

                if (!account_id || !ticket || balance === undefined) {
                    errorCount++;
                    results.push({ success: false, ticket, error: 'missing required fields' });
                    continue;
                }

                if (!open_timestamp || !close_timestamp) {
                    errorCount++;
                    results.push({ success: false, ticket, error: 'missing timestamps' });
                    continue;
                }

                let userId;

                if (userIdMap.has(account_id)) {
                    userId = userIdMap.get(account_id);
                } else {
                    const accRes = await pool.query(
                        `SELECT user_id, balance FROM mt5_accounts WHERE account_id = $1`,
                        [account_id]
                    );

                    if (accRes.rows.length === 0) {
                        errorCount++;
                        results.push({ success: false, ticket, error: 'account not found' });
                        continue;
                    }

                    userId = accRes.rows[0].user_id;
                    userIdMap.set(account_id, userId);

                    const oldBalance = Number(accRes.rows[0].balance);
                    const balanceChangePercent = oldBalance > 0
                        ? ((balance - oldBalance) / oldBalance) * 100
                        : 0;

                    await pool.query(
                        `UPDATE mt5_accounts
                         SET balance = $1,
                             balance_change = $2,
                             account_currency = $3,
                             last_connected = NOW()
                         WHERE account_id = $4`,
                        [balance, balanceChangePercent, account_currency, account_id]
                    );
                }

                values.push(
                    `($${i++},$${i++},'mt5',$${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++})`
                );

                params.push(
                    userId,
                    account_id,
                    symbol,
                    type.toLowerCase(),
                    volume,
                    entry_price,
                    exit_price,
                    profit,
                    close_time,
                    open_timestamp,
                    close_timestamp,
                    ticket
                );
            } catch (err) {
                errorCount++;
                results.push({ success: false, error: err.message });
            }
        }

        if (values.length > 0) {
            const query = `
                INSERT INTO api_trades
                (
                    user_id,
                    account_id,
                    platform,
                    symbol,
                    trade_type,
                    quantity,
                    price,
                    exit_price,
                    pnl,
                    timestamp,
                    open_timestamp,
                    close_timestamp,
                    ticket
                )
                VALUES ${values.join(",")}
                ON CONFLICT (ticket) DO NOTHING
                RETURNING id
            `;

            const tradeRes = await pool.query(query, params);
            skippedCount = values.length - tradeRes.rows.length;
            results.push({ success: true, inserted: tradeRes.rows.length });
        }

        res.json({ success: true, errorCount, skippedCount, results });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.get('/user-trades/:userid?', authCheck, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM trades WHERE user_id = $1 ORDER BY timestamp DESC`,
            [req.userId]
        );

        res.json({ success: true, trades: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/user-api-trades/:userid?', authCheck, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM api_trades WHERE user_id = $1 ORDER BY timestamp DESC`,
            [req.userId]
        );

        res.json({ success: true, trades: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.delete('/trades/:uniqueId', authCheck, async (req, res) => {
    const uniqueId = req.params.uniqueId;

    if (!uniqueId) {
        return res.status(400).json({ success: false, error: 'Trade ID required' });
    }

    try {
        const deleteResult = await pool.query(
            `DELETE FROM trades WHERE unique_id = $1 AND user_id = $2 RETURNING "ID", unique_id, symbol`,
            [uniqueId, req.userId]
        );

        if (deleteResult.rowCount > 0) {
            const deletedTrade = deleteResult.rows[0];
            return res.json({
                success: true,
                message: 'Trade deleted successfully',
                deletedId: deletedTrade.ID,
                unique_id: deletedTrade.unique_id,
                symbol: deletedTrade.symbol
            });
        }

        const numericId = parseTradeId(uniqueId);
        if (numericId === null) {
            return res.status(404).json({ success: false, error: 'Trade not found or unauthorized' });
        }

        const fallbackResult = await pool.query(
            `DELETE FROM trades WHERE "ID" = $1 AND user_id = $2 RETURNING "ID", unique_id, symbol`,
            [numericId, req.userId]
        );

        if (fallbackResult.rowCount === 0) {
            return res.status(404).json({ success: false, error: 'Trade not found or unauthorized' });
        }

        const deletedTrade = fallbackResult.rows[0];
        return res.json({
            success: true,
            message: 'Trade deleted successfully',
            deletedId: deletedTrade.ID,
            unique_id: deletedTrade.unique_id,
            symbol: deletedTrade.symbol
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.delete('/api-trades/:id', authCheck, async (req, res) => {
    const tradeId = req.params.id;

    if (!tradeId) {
        return res.status(400).json({ success: false, error: 'Trade ID required' });
    }

    try {
        const deleteResult = await pool.query(
            `DELETE FROM api_trades WHERE "ID" = $1 AND user_id = $2 RETURNING "ID", symbol`,
            [tradeId, req.userId]
        );

        if (deleteResult.rowCount === 0) {
            return res.status(404).json({ success: false, error: 'Trade not found or unauthorized' });
        }

        const deletedTrade = deleteResult.rows[0];
        res.json({
            success: true,
            message: 'API Trade deleted successfully',
            deletedId: deletedTrade.ID,
            symbol: deletedTrade.symbol
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/update-trade-note', authCheck, async (req, res) => {
    const { tradeId, notes } = req.body;

    if (!tradeId) {
        return res.status(400).json({ success: false, error: 'Trade ID required' });
    }

    try {
        const updateResult = await pool.query(
            `UPDATE trades SET notes = $1 WHERE "ID" = $2 AND user_id = $3 RETURNING "ID", symbol`,
            [notes, tradeId, req.userId]
        );

        if (updateResult.rowCount === 0) {
            return res.status(404).json({ success: false, error: 'Trade not found or unauthorized' });
        }

        const updatedTrade = updateResult.rows[0];
        res.json({
            success: true,
            message: 'Trade notes updated!',
            tradeId: updatedTrade.ID,
            symbol: updatedTrade.symbol
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/trade-with-screenshots/:tradeId', authCheck, async (req, res) => {
    const tradeId = req.params.tradeId;

    if (!tradeId) {
        return res.status(400).json({ success: false, error: 'Trade ID required' });
    }

    try {
        const result = await pool.query(
            `SELECT * FROM trades WHERE "ID" = $1 AND user_id = $2`,
            [tradeId, req.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Trade not found or unauthorized' });
        }

        const trade = result.rows[0];
        let screenshots = [];
        if (trade.screenshots) {
            try {
                screenshots = Array.isArray(trade.screenshots)
                    ? trade.screenshots
                    : JSON.parse(trade.screenshots);
            } catch (_error) {
                screenshots = [];
            }
        }

        res.json({
            success: true,
            trade: {
                ...trade,
                screenshots,
                screenshotCount: screenshots.length
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/save-mt5-credentials', authCheck, async (req, res) => {
    try {
        const { broker_name, account_id, server_name, investor_password } = req.body;

        if (!broker_name || !account_id || !server_name || !investor_password) {
            return res.status(400).json({ success: false, error: 'All fields required' });
        }

        const encryptedPassword = encryptMT5Password(investor_password);

        await pool.query(
            `INSERT INTO mt5_accounts
             (user_id, broker_name, account_id, server_name, investor_password, connection_status)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [req.userId, broker_name, account_id, server_name, encryptedPassword, 'disconnected']
        );

        res.json({ success: true, message: 'MT5 credentials saved successfully!' });
    } catch (error) {
        if (error.message.includes('duplicate') || error.message.includes('unique')) {
            return res.status(409).json({ success: false, error: 'This MT5 account already exists' });
        }

        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/test-mt5-connection', authCheck, async (req, res) => {
    try {
        const { account_id, investor_password } = req.body;

        if (!account_id || !investor_password) {
            return res.status(400).json({ success: false, error: 'Required fields missing' });
        }

        const result = await pool.query(
            `SELECT * FROM mt5_accounts WHERE user_id = $1 AND account_id = $2`,
            [req.userId, account_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'MT5 account not found. Save credentials first.' });
        }

        const storedAccount = result.rows[0];

        if (!verifyMT5Password(investor_password, storedAccount.investor_password)) {
            return res.status(401).json({ success: false, error: 'Invalid investor password' });
        }

        await pool.query(
            `UPDATE mt5_accounts SET connection_status = $1, last_connected = $2 WHERE id = $3`,
            ['connected', new Date(), storedAccount.id]
        );

        res.json({ success: true, message: 'Connected to MT5 successfully!' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
