const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authCheck } = require('./auth');
const { requireIngestSecret } = require('../utils/security');
const {
    encryptMT5Password,
    verifyMT5Password,
} = require('../utils/mt5Credentials');
const { normalizeStoredSymbol } = require('../utils/symbols');

let apiTradeMetadataColumnsReady = false;

function normalizeText(value) {
    return String(value || '').trim();
}

function normalizeSymbolCategory(value) {
    const normalized = normalizeText(value).toLowerCase();

    if (!normalized) return null;
    if (/(crypto|coin|token|digital)/.test(normalized)) return 'crypto';
    if (/(forex|fx|currency|currencies)/.test(normalized)) return 'forex';
    if (/(metal|metals|gold|silver|xau|xag)/.test(normalized)) return 'metal';
    if (/(indice|indices|index|indexes|cash index|stock index)/.test(normalized)) return 'index';
    if (/(stock|equity|shares?)/.test(normalized)) return 'stock';
    if (/(commodit|energy|oil|gas|wti|brent)/.test(normalized)) return 'commodity';

    return normalized.replace(/[^a-z0-9_-]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') || null;
}

function inferSymbolCategory({ symbol, symbolPath, symbolDescription, category, assetClass }) {
    const explicitCategory = normalizeSymbolCategory(category || assetClass);
    if (explicitCategory) return explicitCategory;

    const combined = [
        symbolPath,
        symbolDescription,
        symbol,
    ].map(normalizeText).join(' ').toLowerCase();

    const inferredCategory = normalizeSymbolCategory(combined);
    if (inferredCategory) return inferredCategory;

    const cleanSymbol = normalizeStoredSymbol(symbol);
    if (/^X(AU|AG)USD$/.test(cleanSymbol)) return 'metal';
    if (/^[A-Z]{6}$/.test(cleanSymbol)) return 'forex';
    if (/(BTC|ETH|USDT|USDC|BNB|SOL|XRP|DOGE|ADA)/.test(cleanSymbol)) return 'crypto';
    if (/\d/.test(cleanSymbol)) return 'index';

    return null;
}

async function ensureApiTradeMetadataColumns() {
    if (apiTradeMetadataColumnsReady) return;

    await pool.query(`
        ALTER TABLE api_trades
        ADD COLUMN IF NOT EXISTS category TEXT,
        ADD COLUMN IF NOT EXISTS symbol_path TEXT,
        ADD COLUMN IF NOT EXISTS symbol_description TEXT
    `);

    apiTradeMetadataColumnsReady = true;
}

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

function isClosedTradePayload(trade) {
    const volume = Number(trade?.volume);
    const entryPrice = Number(trade?.entry_price);
    const exitPrice = Number(trade?.exit_price);
    const tradeType = String(trade?.type || '').toLowerCase();

    return Boolean(
        trade?.symbol &&
        tradeType &&
        (tradeType === 'buy' || tradeType === 'sell') &&
        Number.isFinite(volume) &&
        volume > 0 &&
        Number.isFinite(entryPrice) &&
        entryPrice > 0 &&
        Number.isFinite(exitPrice) &&
        exitPrice > 0
    );
}

function toFiniteNumber(value) {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : null;
}

function parseRequiredNumber(value, { min = -Infinity } = {}) {
    const numericValue = toFiniteNumber(value);
    if (numericValue === null || numericValue < min) return null;
    return numericValue;
}

function roundToScale(value, scale = 5) {
    const numericValue = toFiniteNumber(value);
    if (numericValue === null) return null;
    return Number(numericValue.toFixed(scale));
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
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
        const normalizedSymbol = normalizeStoredSymbol(symbol);

        if (!normalizedSymbol) {
            return res.status(400).json({ success: false, error: 'Invalid symbol' });
        }

        const normalizedQuantity = parseRequiredNumber(quantity, { min: 0.0000001 });
        const normalizedPrice = parseRequiredNumber(price, { min: 0.0000001 });
        const normalizedExitPrice = parseRequiredNumber(exit_price, { min: 0.0000001 });
        const normalizedPnl = parseRequiredNumber(pnl);

        if (
            normalizedQuantity === null
            || normalizedPrice === null
            || normalizedExitPrice === null
            || normalizedPnl === null
        ) {
            return res.status(400).json({ success: false, error: 'Invalid numeric trade values' });
        }

        await pool.query(
            `INSERT INTO trades
             (user_id, symbol, trade_type, category, quantity, price, exit_price, pnl, strategy, timestamp, notes, screenshots)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
            [req.userId, normalizedSymbol, trade_type, category, normalizedQuantity, normalizedPrice, normalizedExitPrice, normalizedPnl, strategy, timestamp, notes, screenshotsJson]
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
            const tradeTimestamp = trade.open_timestamp || trade.opening_time_utc || trade.timestamp;
            const tradePNL = trade.pnl || trade.profit_usd || 0;
            const screenshotsJson = normalizeScreenshots(trade.screenshots || null);
            const normalizedSymbol = normalizeStoredSymbol(trade.symbol);
            const normalizedQuantity = parseRequiredNumber(tradeQuantity, { min: 0.0000001 });
            const normalizedEntryPrice = parseRequiredNumber(entryPrice, { min: 0.0000001 });
            const normalizedExitPrice = parseRequiredNumber(exitPrice, { min: 0.0000001 });
            const normalizedPNL = parseRequiredNumber(tradePNL) ?? 0;

            if (!normalizedSymbol) {
                results.push({ success: false, trade: 'Unknown', error: 'Missing symbol' });
                errorCount++;
                continue;
            }
            if (!tradeType) {
                results.push({ success: false, trade: trade.symbol, error: 'Missing trade_type' });
                errorCount++;
                continue;
            }
            if (normalizedQuantity === null) {
                results.push({ success: false, trade: trade.symbol, error: 'Invalid quantity' });
                errorCount++;
                continue;
            }
            if (normalizedEntryPrice === null) {
                results.push({ success: false, trade: trade.symbol, error: 'Invalid price' });
                errorCount++;
                continue;
            }
            if (normalizedExitPrice === null) {
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
                    normalizedSymbol,
                    normalizedTradeType,
                    trade.category || 'forex',
                    normalizedQuantity,
                    normalizedEntryPrice,
                    normalizedExitPrice,
                    normalizedPNL,
                    trade.strategy || null,
                    tradeTimestamp,
                    trade.notes || null,
                    screenshotsJson
                ]
            );

            results.push({ success: true, trade: normalizedSymbol });
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

async function ingestApiTrades(req, res) {
    try {
        await ensureApiTradeMetadataColumns();

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
                    open_timestamp,
                    close_timestamp,
                    timestamp,
                    balance,
                    account_currency,
                    symbol_category,
                    category,
                    asset_class,
                    symbol_path,
                    symbol_description,
                    description
                } = trade;

                const normalizedQuantity = roundToScale(volume, 5);
                const normalizedEntryPrice = roundToScale(entry_price, 5);
                const normalizedExitPrice = roundToScale(exit_price, 5);
                const normalizedProfit = roundToScale(profit ?? 0, 5);
                const normalizedBalance = roundToScale(balance, 5);
                const normalizedSymbol = normalizeStoredSymbol(symbol);
                const normalizedSymbolPath = normalizeText(symbol_path || trade.path);
                const normalizedSymbolDescription = normalizeText(symbol_description || description);
                const normalizedCategory = inferSymbolCategory({
                    symbol,
                    symbolPath: normalizedSymbolPath,
                    symbolDescription: normalizedSymbolDescription,
                    category: symbol_category || category,
                    assetClass: asset_class,
                });

                if (!account_id || !ticket || balance === undefined) {
                    errorCount++;
                    results.push({ success: false, ticket, error: 'missing required fields' });
                    continue;
                }

                if (!open_timestamp || !close_timestamp) {
                    errorCount++;
                    results.push({ success: false, ticket, error: 'missing open_timestamp or close_timestamp' });
                    continue;
                }

                if (!normalizedSymbol || !isClosedTradePayload({ ...trade, symbol: normalizedSymbol })) {
                    skippedCount++;
                    results.push({ success: false, ticket, error: 'non-trade or incomplete trade payload skipped' });
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
                    const rawBalanceChangePercent = oldBalance > 0
                        ? ((normalizedBalance - oldBalance) / oldBalance) * 100
                        : 0;
                    const balanceChangePercent = roundToScale(
                        clamp(rawBalanceChangePercent, -9999.9999, 9999.9999),
                        4
                    );

                    await pool.query(
                        `UPDATE mt5_accounts
                         SET balance = $1,
                             balance_change = $2,
                             default_currency = $3,
                             temporary_currency = COALESCE(temporary_currency, $3),
                             last_connected = NOW()
                         WHERE account_id = $4`,
                        [normalizedBalance, balanceChangePercent, account_currency, account_id]
                    );
                }

                values.push(
                    `($${i++},$${i++},'mt5',$${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++})`
                );

                params.push(
                    userId,
                    account_id,
                    normalizedSymbol,
                    type.toLowerCase(),
                    normalizedQuantity,
                    normalizedEntryPrice,
                    normalizedExitPrice,
                    normalizedProfit,
                    timestamp || null,
                    open_timestamp,
                    close_timestamp,
                    ticket,
                    normalizedCategory,
                    normalizedSymbolPath || null,
                    normalizedSymbolDescription || null
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
                    ticket,
                    category,
                    symbol_path,
                    symbol_description
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
}

router.post('/save-api-trade', requireIngestSecret, ingestApiTrades);
router.post('/mt5/receive-trades', requireIngestSecret, ingestApiTrades);

router.get('/user-trades/:userid?', authCheck, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT *, timestamp AS open_timestamp, timestamp AS close_timestamp
             FROM trades
             WHERE user_id = $1
             ORDER BY timestamp DESC`,
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
            `SELECT * FROM api_trades WHERE user_id = $1 ORDER BY close_timestamp DESC NULLS LAST, open_timestamp DESC NULLS LAST`,
            [req.userId]
        );

        res.json({ success: true, trades: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.patch('/trades/breakeven-day', authCheck, async (req, res) => {
    const { date, is_breakeven } = req.body;

    if (!date) {
        return res.status(400).json({ success: false, error: 'date required' });
    }

    const isBreakeven = Boolean(is_breakeven);

    try {
        const manualResult = await pool.query(
            `UPDATE trades
             SET is_breakeven = $1
             WHERE user_id = $2
               AND timestamp >= $3::date
               AND timestamp < ($3::date + INTERVAL '1 day')`,
            [isBreakeven, req.userId, date]
        );

        const apiResult = await pool.query(
            `UPDATE api_trades
             SET is_breakeven = $1
             WHERE user_id = $2
               AND timestamp >= $3::date
               AND timestamp < ($3::date + INTERVAL '1 day')`,
            [isBreakeven, req.userId, date]
        );

        res.json({
            success: true,
            date,
            is_breakeven: isBreakeven,
            manualCount: manualResult.rowCount,
            apiCount: apiResult.rowCount
        });
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
module.exports.ensureApiTradeMetadataColumns = ensureApiTradeMetadataColumns;
