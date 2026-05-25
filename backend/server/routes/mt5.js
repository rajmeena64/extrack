const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const pool = require('../config/database');
const { authCheck } = require('./auth');
const { decryptMT5Password, encryptMT5Password } = require('../services/mt5Credentials');
const { secretsMatch, requireIngestSecret } = require('../utils/security');
const { trimString } = require('../validators/common');

const REQUEST_STATUSES = new Set([
    'creating_terminal',
    'launching_terminal',
    'applying_ea',
]);

function sanitizeAgentMessage(value) {
    const message = trimString(value, { max: 500 });
    if (!message) return null;

    return message
        .replace(/password\s*[:=]\s*\S+/gi, 'password=[redacted]')
        .replace(/token\s*[:=]\s*\S+/gi, 'token=[redacted]')
        .replace(/authorization\s*[:=]\s*\S+/gi, 'authorization=[redacted]');
}

function createInstanceKey() {
    return `mt5_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
}

function requireVpsAgent(req, res, next) {
    const expectedToken = process.env.VPS_AGENT_TOKEN;
    const authorization = String(req.headers.authorization || '');
    const providedToken = authorization.startsWith('Bearer ')
        ? authorization.slice('Bearer '.length)
        : '';

    if (!expectedToken) {
        return res.status(503).json({
            success: false,
            error: 'VPS agent is not configured',
        });
    }

    if (!secretsMatch(providedToken, expectedToken)) {
        return res.status(401).json({
            success: false,
            error: 'Unauthorized VPS agent request',
        });
    }

    next();
}

// ----------------------------
// User MT5 Connection Request
// ----------------------------
router.post("/mt5/connect", authCheck, async (req, res) => {
    const loginId = trimString(req.body.login, { max: 64, required: true });
    const password = trimString(req.body.password, { max: 200, required: true });
    const brokerServer = trimString(req.body.broker_server, { max: 120, required: true });

    if (!loginId || !password || !brokerServer) {
        return res.status(400).json({
            success: false,
            error: 'MT5 login, password, and broker server are required',
        });
    }

    const client = await pool.connect();

    try {
        const encryptedPassword = encryptMT5Password(password);
        const instanceKey = createInstanceKey();

        await client.query('BEGIN');

        const requestResult = await client.query(
            `INSERT INTO mt5_connection_requests
             (user_id, login_id, broker_server, encrypted_password, status)
             VALUES ($1, $2, $3, $4, 'pending')
             RETURNING id, status`,
            [req.userId, loginId, brokerServer, encryptedPassword]
        );

        await client.query(
            `INSERT INTO mt5_vps_jobs
             (request_id, job_type, status, instance_key)
             VALUES ($1, 'CREATE_MT5_INSTANCE', 'pending', $2)`,
            [requestResult.rows[0].id, instanceKey]
        );

        await client.query('COMMIT');

        res.status(202).json({
            success: true,
            request_id: requestResult.rows[0].id,
            status: requestResult.rows[0].status,
        });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({
            success: false,
            error: error.message,
        });
    } finally {
        client.release();
    }
});

router.get("/mt5/connect/:request_id/status", authCheck, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, status, error_message
             FROM mt5_connection_requests
             WHERE id = $1 AND user_id = $2`,
            [req.params.request_id, req.userId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'Connection request not found',
            });
        }

        res.json({
            success: true,
            request_id: result.rows[0].id,
            status: result.rows[0].status,
            error_message: result.rows[0].error_message,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

// ----------------------------
// Trusted VPS Agent Endpoints
// ----------------------------
router.post("/vps/jobs/claim", requireVpsAgent, async (req, res) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const jobResult = await client.query(
            `SELECT
                j.id AS job_id,
                j.request_id,
                j.job_type,
                j.instance_key,
                r.login_id,
                r.broker_server,
                r.encrypted_password
             FROM mt5_vps_jobs j
             JOIN mt5_connection_requests r ON r.id = j.request_id
             WHERE j.status = 'pending'
             ORDER BY j.created_at ASC
             LIMIT 1
             FOR UPDATE SKIP LOCKED`
        );

        if (jobResult.rowCount === 0) {
            await client.query('COMMIT');
            return res.json({
                success: true,
                job: null,
            });
        }

        const job = jobResult.rows[0];

        await client.query(
            `UPDATE mt5_vps_jobs
             SET status = 'claimed', updated_at = NOW()
             WHERE id = $1`,
            [job.job_id]
        );

        await client.query(
            `UPDATE mt5_connection_requests
             SET status = 'connecting', error_message = NULL, updated_at = NOW()
             WHERE id = $1`,
            [job.request_id]
        );

        await client.query('COMMIT');

        res.json({
            success: true,
            job: {
                job_id: job.job_id,
                request_id: job.request_id,
                job_type: job.job_type,
                instance_key: job.instance_key,
                login: job.login_id,
                password: decryptMT5Password(job.encrypted_password),
                broker_server: job.broker_server,
            },
        });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({
            success: false,
            error: error.message,
        });
    } finally {
        client.release();
    }
});

router.post("/vps/jobs/:job_id/status", requireVpsAgent, async (req, res) => {
    const requestStatus = trimString(req.body.request_status, { max: 64, required: true });

    if (!REQUEST_STATUSES.has(requestStatus)) {
        return res.status(400).json({
            success: false,
            error: 'Invalid request status',
        });
    }

    try {
        const result = await pool.query(
            `UPDATE mt5_connection_requests r
             SET status = $1, updated_at = NOW()
             FROM mt5_vps_jobs j
             WHERE j.id = $2 AND j.request_id = r.id
             RETURNING r.id`,
            [requestStatus, req.params.job_id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'VPS job not found',
            });
        }

        await pool.query(
            `UPDATE mt5_vps_jobs
             SET status = 'running', updated_at = NOW()
             WHERE id = $1 AND status IN ('claimed', 'running')`,
            [req.params.job_id]
        );

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

router.post("/vps/jobs/:job_id/complete", requireVpsAgent, async (req, res) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const jobResult = await client.query(
            `SELECT
                j.id AS job_id,
                j.instance_key,
                r.id AS request_id,
                r.user_id,
                r.login_id,
                r.broker_server
             FROM mt5_vps_jobs j
             JOIN mt5_connection_requests r ON r.id = j.request_id
             WHERE j.id = $1
             FOR UPDATE`,
            [req.params.job_id]
        );

        if (jobResult.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                error: 'VPS job not found',
            });
        }

        const job = jobResult.rows[0];

        const existingAccount = await client.query(
            `SELECT id FROM mt5_accounts WHERE instance_key = $1`,
            [job.instance_key]
        );

        if (existingAccount.rowCount > 0) {
            await client.query(
                `UPDATE mt5_accounts
                 SET status = 'connected',
                     connection_status = 'connected',
                     connected_at = NOW(),
                     last_connected = NOW(),
                     updated_at = NOW()
                 WHERE instance_key = $1`,
                [job.instance_key]
            );
        } else {
            await client.query(
                `INSERT INTO mt5_accounts
                 (user_id, login_id, broker_server, instance_key, status, connected_at,
                  broker_name, account_id, server_name, connection_status, last_connected)
                 VALUES ($1, $2, $3, $4, 'connected', NOW(), $3, $2, $3, 'connected', NOW())`,
                [job.user_id, job.login_id, job.broker_server, job.instance_key]
            );
        }

        await client.query(
            `UPDATE mt5_connection_requests
             SET status = 'connected', error_message = NULL, updated_at = NOW()
             WHERE id = $1`,
            [job.request_id]
        );

        await client.query(
            `UPDATE mt5_vps_jobs
             SET status = 'completed', error_message = NULL, updated_at = NOW()
             WHERE id = $1`,
            [job.job_id]
        );

        await client.query('COMMIT');
        res.json({ success: true });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({
            success: false,
            error: error.message,
        });
    } finally {
        client.release();
    }
});

router.post("/vps/jobs/:job_id/fail", requireVpsAgent, async (req, res) => {
    const errorMessage = sanitizeAgentMessage(req.body.error_message) || 'MT5 connection failed';
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const jobResult = await client.query(
            `SELECT id, request_id
             FROM mt5_vps_jobs
             WHERE id = $1
             FOR UPDATE`,
            [req.params.job_id]
        );

        if (jobResult.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                error: 'VPS job not found',
            });
        }

        await client.query(
            `UPDATE mt5_connection_requests
             SET status = 'failed', error_message = $1, updated_at = NOW()
             WHERE id = $2`,
            [errorMessage, jobResult.rows[0].request_id]
        );

        await client.query(
            `UPDATE mt5_vps_jobs
             SET status = 'failed', error_message = $1, updated_at = NOW()
             WHERE id = $2`,
            [errorMessage, jobResult.rows[0].id]
        );

        await client.query('COMMIT');
        res.json({ success: true });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({
            success: false,
            error: error.message,
        });
    } finally {
        client.release();
    }
});

// ----------------------------
// MT5 Trades Receive Endpoint
// ----------------------------
router.post("/mt5/receive-trades", requireIngestSecret, (req, res) => {
    const trades = req.body;

    // Agar database me save karna ho to yaha kar sakte ho
    // Example: saveBulkTrades(trades)

    res.json({
        success: true,
        message: "MT5 trades received successfully",
        count: Array.isArray(trades) ? trades.length : 0
    });
});

module.exports = router;

