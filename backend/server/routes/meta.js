// File: meta.js
const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authCheck } = require('./auth');
const { encryptMT5Password } = require('../utils/mt5Credentials');

// ======= UTILITY FUNCTIONS =======
function maskPassword(password) {
    if (!password || password.length === 0) return '';
    return password[0] + '•'.repeat(password.length - 1);
}

// ======= GET ALL MT5 ACCOUNTS =======
router.get('/get-mt5-accounts', authCheck, async (req, res) => {
    const userId = req.userId;

    try {
        const result = await pool.query(
            `SELECT id, broker_name, account_id, server_name, balance, default_currency, temporary_currency, investor_password
             FROM mt5_accounts 
             WHERE user_id = $1 
             ORDER BY created_at DESC`,
            [userId]
        );

        // Mask investor password
        const accounts = result.rows.map(acc => ({
            id: acc.id,
            broker_name: acc.broker_name,
            account_id: acc.account_id,
            server_name: acc.server_name,
            balance: acc.balance,
            default_currency: acc.default_currency,
            temporary_currency: acc.temporary_currency,
            investor_password: maskPassword(acc.investor_password)
        }));

        res.json({ success: true, accounts });

    } catch (error) {
        console.error("Failed to load MT5 accounts:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/update-dashboard-currency', authCheck, async (req, res) => {
    const { currency } = req.body;

    if (!currency) {
        return res.status(400).json({ success: false, error: 'currency required' });
    }

    const normalizedCurrency = String(currency).trim().toUpperCase();

    try {
        const result = await pool.query(
            `UPDATE mt5_accounts
             SET temporary_currency = $1,
                 updated_at = NOW()
             WHERE user_id = $2
             RETURNING id, default_currency, temporary_currency`,
            [normalizedCurrency, req.userId]
        );

        res.json({
            success: true,
            currency: normalizedCurrency,
            updatedCount: result.rowCount,
            accounts: result.rows
        });
    } catch (error) {
        console.error("Failed to update dashboard currency:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ======= UPDATE MT5 PASSWORD =======
router.post('/update-mt5-password', authCheck, async (req, res) => {
    try {
        const { account_id, new_password } = req.body;
        const userId = req.userId;

        if (!account_id || !new_password) {
            return res.status(400).json({ success: false, error: "Account ID and new password required" });
        }

        // Check if account belongs to user
        const result = await pool.query(
            `SELECT id FROM mt5_accounts WHERE account_id = $1 AND user_id = $2`,
            [account_id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: "MT5 account not found or not authorized" });
        }

        // Update investor password
        const encryptedPassword = encryptMT5Password(new_password);

        await pool.query(
            `UPDATE mt5_accounts 
             SET investor_password = $1, updated_at = NOW() 
             WHERE account_id = $2 AND user_id = $3`,
            [encryptedPassword, account_id, userId]
        );

        console.log(`MT5 password updated for account ${account_id} by user ${userId}`);

        res.json({ success: true, message: "MT5 password updated successfully" });

    } catch (error) {
        console.error("Failed to update MT5 password:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ======= SAVE MT5 ACCOUNT =======
router.post('/save-mt5-account', authCheck, async (req, res) => {
    const { broker_name, account_id, server_name, investor_password } = req.body;

    try {
        const check = await pool.query(
            `SELECT id FROM mt5_accounts WHERE user_id = $1 AND account_id = $2`,
            [req.userId, account_id]
        );

        if (check.rows.length > 0) {
            // Update existing account
            const encryptedPassword = encryptMT5Password(investor_password);

            await pool.query(
                `UPDATE mt5_accounts 
                 SET broker_name = $1, server_name = $2, investor_password = $3 
                 WHERE user_id = $4 AND account_id = $5`,
                [broker_name, server_name, encryptedPassword, req.userId, account_id]
            );
        } else {
            // Insert new account
            const encryptedPassword = encryptMT5Password(investor_password);
            await pool.query(
                `INSERT INTO mt5_accounts 
                 (user_id, broker_name, account_id, server_name, investor_password) 
                 VALUES ($1, $2, $3, $4, $5)`,
                [req.userId, broker_name, account_id, server_name, encryptedPassword]
            );
        }

        res.json({ success: true, message: 'Account saved successfully' });

    } catch (error) {
        console.error("Failed to save MT5 account:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ======= DELETE MT5 ACCOUNT (WITH API_TRADES) =======
router.delete('/delete-mt5-account/:id', authCheck, async (req, res) => {
    const accountId = req.params.id;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1️⃣ Get MT5 account number
        const accountResult = await client.query(
            `SELECT account_id FROM mt5_accounts WHERE id = $1 AND user_id = $2`,
            [accountId, req.userId]
        );

        if (accountResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, error: 'Account not found' });
        }

        const mt5AccountNumber = accountResult.rows[0].account_id;

        // 2️⃣ Delete related trades
        await client.query(
            `DELETE FROM api_trades WHERE account_id = $1::bigint AND user_id = $2`,
            [mt5AccountNumber, req.userId]
        );

        // 3️⃣ Delete MT5 account
        const deleteResult = await client.query(
            `DELETE FROM mt5_accounts WHERE id = $1 AND user_id = $2 RETURNING broker_name, account_id`,
            [accountId, req.userId]
        );

        await client.query('COMMIT');

        res.json({
            success: true,
            message: `Account ${deleteResult.rows[0].account_id} deleted with all its API trades`
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Failed to delete MT5 account:", error.message);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        client.release();
    }
});

module.exports = router;





