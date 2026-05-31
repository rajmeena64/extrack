const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const pool = require('../config/database');
const { TABLES } = require('../config/tables');
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
            `INSERT INTO ${TABLES.mt5ConnectionRequests}
             (user_id, login_id, broker_server, encrypted_password, status)
             VALUES ($1, $2, $3, $4, 'pending')
             RETURNING id, status`,
            [req.userId, loginId, brokerServer, encryptedPassword]
        );

        await client.query(
            `INSERT INTO ${TABLES.mt5VpsJobs}
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
             FROM ${TABLES.mt5ConnectionRequests}
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

        const staleJobs = await client.query(
            `UPDATE ${TABLES.mt5VpsJobs}
             SET status = 'failed',
                 error_message = 'VPS agent did not finish job before timeout',
                 updated_at = NOW()
             WHERE status IN ('claimed', 'running')
               AND updated_at < NOW() - INTERVAL '3 minutes'
             RETURNING request_id`
        );

        if (staleJobs.rowCount > 0) {
            await client.query(
                `UPDATE ${TABLES.mt5ConnectionRequests}
                 SET status = 'failed',
                     error_message = 'VPS agent did not finish job before timeout',
                     updated_at = NOW()
                 WHERE id = ANY($1::bigint[])`,
                [staleJobs.rows.map((row) => row.request_id)]
            );
        }

        const jobResult = await client.query(
            `SELECT
                j.id AS job_id,
                j.request_id,
                j.job_type,
                j.instance_key,
                r.login_id,
                r.broker_server,
                r.encrypted_password
             FROM ${TABLES.mt5VpsJobs} j
             JOIN ${TABLES.mt5ConnectionRequests} r ON r.id = j.request_id
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
            `UPDATE ${TABLES.mt5VpsJobs}
             SET status = 'claimed', updated_at = NOW()
             WHERE id = $1`,
            [job.job_id]
        );

        await client.query(
            `UPDATE ${TABLES.mt5ConnectionRequests}
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
            `UPDATE ${TABLES.mt5ConnectionRequests} r
             SET status = $1, updated_at = NOW()
             FROM ${TABLES.mt5VpsJobs} j
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
            `UPDATE ${TABLES.mt5VpsJobs}
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
    const verifiedRunning = req.body?.verified_running === true;
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
             FROM ${TABLES.mt5VpsJobs} j
             JOIN ${TABLES.mt5ConnectionRequests} r ON r.id = j.request_id
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

        if (!verifiedRunning) {
            const errorMessage = 'MT5 terminal was not verified running by VPS agent';

            await client.query(
                `UPDATE ${TABLES.mt5ConnectionRequests}
                 SET status = 'failed', error_message = $1, updated_at = NOW()
                 WHERE id = $2`,
                [errorMessage, job.request_id]
            );

            await client.query(
                `UPDATE ${TABLES.mt5VpsJobs}
                 SET status = 'failed', error_message = $1, updated_at = NOW()
                 WHERE id = $2`,
                [errorMessage, job.job_id]
            );

            await client.query('COMMIT');
            return res.status(400).json({
                success: false,
                error: errorMessage,
            });
        }

        const existingAccount = await client.query(
            `SELECT id
             FROM ${TABLES.mt5Accounts}
             WHERE instance_key = $1
                OR (
                    user_id = $2
                    AND (
                        login_id = $3
                        OR account_id::text = $3
                    )
                    AND (
                        broker_server = $4
                        OR server_name = $4
                    )
                )
             ORDER BY CASE WHEN instance_key = $1 THEN 0 ELSE 1 END, id DESC
             LIMIT 1`,
            [job.instance_key, job.user_id, job.login_id, job.broker_server]
        );

        if (existingAccount.rowCount > 0) {
            await client.query(
                `UPDATE ${TABLES.mt5Accounts}
                 SET status = 'connected',
                     connection_status = 'connected',
                     login_id = $2::text,
                     broker_server = $3::text,
                     instance_key = $4::text,
                     broker_name = $5::text,
                     account_id = $6::bigint,
                     server_name = $7::text,
                     connected_at = NOW(),
                     last_connected = NOW(),
                     updated_at = NOW()
                 WHERE id = $1`,
                [
                    existingAccount.rows[0].id,
                    job.login_id,
                    job.broker_server,
                    job.instance_key,
                    job.broker_server,
                    job.login_id,
                    job.broker_server,
                ]
            );
        } else {
            await client.query(
                `INSERT INTO ${TABLES.mt5Accounts}
                 (user_id, login_id, broker_server, instance_key, status, connected_at,
                  broker_name, account_id, server_name, connection_status, last_connected)
                 VALUES ($1, $2, $3, $4, 'connected', NOW(), $5, $6, $7, 'connected', NOW())`,
                [
                    job.user_id,
                    job.login_id,
                    job.broker_server,
                    job.instance_key,
                    job.broker_server,
                    job.login_id,
                    job.broker_server,
                ]
            );
        }

        await client.query(
            `UPDATE ${TABLES.mt5ConnectionRequests}
             SET status = 'connected', error_message = NULL, updated_at = NOW()
             WHERE id = $1`,
            [job.request_id]
        );

        await client.query(
            `UPDATE ${TABLES.mt5VpsJobs}
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
             FROM ${TABLES.mt5VpsJobs}
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
            `UPDATE ${TABLES.mt5ConnectionRequests}
             SET status = 'failed', error_message = $1, updated_at = NOW()
             WHERE id = $2`,
            [errorMessage, jobResult.rows[0].request_id]
        );

        await client.query(
            `UPDATE ${TABLES.mt5VpsJobs}
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

router.post("/vps/accounts/:account_id/health", requireVpsAgent, async (req, res) => {
    const running = req.body?.running === true;
    const errorMessage = sanitizeAgentMessage(req.body?.error_message);
    const accountStatus = running ? 'connected' : 'disconnected';

    try {
        const result = await pool.query(
            `UPDATE ${TABLES.mt5Accounts}
             SET status = $1::text,
                 connection_status = $2::text,
                 last_connected = CASE WHEN $3::boolean THEN NOW() ELSE last_connected END,
                 updated_at = NOW()
             WHERE id = $4
             RETURNING id, instance_key, status, connection_status, last_connected, updated_at`,
            [accountStatus, accountStatus, running, req.params.account_id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'MT5 account not found',
            });
        }

        res.json({
            success: true,
            account: result.rows[0],
            error_message: running ? null : errorMessage,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

router.get("/vps/accounts/health-targets", requireVpsAgent, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, instance_key, status, connection_status
             FROM ${TABLES.mt5Accounts}
             WHERE instance_key IS NOT NULL
               AND status IN ('connected', 'disconnected')
             ORDER BY updated_at ASC, id ASC`
        );

        res.json({
            success: true,
            accounts: result.rows,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
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

