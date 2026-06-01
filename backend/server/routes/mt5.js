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

const SYNC_PROGRESS_STATUSES = new Set([
    'queued',
    'launching_terminal',
    'fetching_trades',
    'saving_data',
    'synced',
    'failed',
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

function getWorkerCapacity(req) {
    const requestedCapacity = Number.parseInt(req.body?.capacity, 10);
    if (Number.isFinite(requestedCapacity) && requestedCapacity > 0) {
        return Math.min(requestedCapacity, 20);
    }

    const envCapacity = Number.parseInt(process.env.MT5_WORKER_CAPACITY || '1', 10);
    return Number.isFinite(envCapacity) && envCapacity > 0 ? Math.min(envCapacity, 20) : 1;
}

function getWorkerId(req) {
    return trimString(req.body?.worker_id, { max: 120 }) || 'default-worker';
}

function getWorkerActiveCount(req) {
    const activeCount = Number.parseInt(req.body?.active_count, 10);
    return Number.isFinite(activeCount) && activeCount > 0 ? activeCount : 0;
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

router.post("/mt5/accounts/:accountId/sync", authCheck, async (req, res) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const accountResult = await client.query(
            `SELECT id, user_id, instance_key, status
             FROM ${TABLES.mt5Accounts}
             WHERE id = $1 AND user_id = $2
             FOR UPDATE`,
            [req.params.accountId, req.userId]
        );

        if (accountResult.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                error: 'MT5 account not found',
            });
        }

        const account = accountResult.rows[0];
        if (!account.instance_key) {
            await client.query('ROLLBACK');
            return res.status(409).json({
                success: false,
                error: 'This MT5 account does not have a saved VPS instance yet',
            });
        }

        const activeJob = await client.query(
            `SELECT id, status, progress_status, error_message, created_at, started_at, completed_at
             FROM ${TABLES.mt5SyncJobs}
             WHERE mt5_account_id = $1
               AND status IN ('queued', 'running')
             ORDER BY created_at DESC
             LIMIT 1`,
            [account.id]
        );

        if (activeJob.rowCount > 0) {
            await client.query('COMMIT');
            return res.status(409).json({
                success: false,
                error: 'MT5 account is already syncing',
                job: activeJob.rows[0],
                job_id: activeJob.rows[0].id,
            });
        }

        const jobResult = await client.query(
            `INSERT INTO ${TABLES.mt5SyncJobs}
             (user_id, mt5_account_id, status, requested_by, progress_status)
             VALUES ($1, $2, 'queued', 'manual', 'queued')
             RETURNING id, status, progress_status, created_at`,
            [req.userId, account.id]
        );

        await client.query(
            `UPDATE ${TABLES.mt5Accounts}
             SET last_sync_status = 'queued',
                 last_sync_error = NULL,
                 updated_at = NOW()
             WHERE id = $1`,
            [account.id]
        );

        await client.query('COMMIT');

        res.status(202).json({
            success: true,
            job_id: jobResult.rows[0].id,
            job: jobResult.rows[0],
        });
    } catch (error) {
        await client.query('ROLLBACK');
        if (error.code === '23505') {
            return res.status(409).json({
                success: false,
                error: 'MT5 account is already syncing',
            });
        }

        res.status(500).json({
            success: false,
            error: error.message,
        });
    } finally {
        client.release();
    }
});

router.get("/mt5/sync-jobs/:jobId/status", authCheck, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                j.id,
                j.mt5_account_id,
                j.status,
                j.progress_status,
                j.error_message,
                j.created_at,
                j.started_at,
                j.completed_at,
                a.last_synced_at,
                a.last_sync_status
             FROM ${TABLES.mt5SyncJobs} j
             JOIN ${TABLES.mt5Accounts} a ON a.id = j.mt5_account_id
             WHERE j.id = $1 AND j.user_id = $2`,
            [req.params.jobId, req.userId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'Sync job not found',
            });
        }

        res.json({
            success: true,
            job: result.rows[0],
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
    const workerId = getWorkerId(req);
    const capacity = getWorkerCapacity(req);
    const workerActiveCount = getWorkerActiveCount(req);
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        if (workerActiveCount >= capacity) {
            await client.query('COMMIT');
            return res.json({
                success: true,
                job: null,
                capacity,
            });
        }

        const runningCount = await client.query(
            `SELECT
                (SELECT COUNT(*)::int FROM ${TABLES.mt5VpsJobs} WHERE status IN ('claimed', 'running'))
                +
                (SELECT COUNT(*)::int FROM ${TABLES.mt5SyncJobs} WHERE status = 'running') AS active_count`
        );

        if (Number(runningCount.rows[0]?.active_count || 0) >= capacity) {
            await client.query('COMMIT');
            return res.json({
                success: true,
                job: null,
                capacity,
            });
        }

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
                worker_id: workerId,
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
                     last_synced_at = NOW(),
                     last_sync_status = 'success',
                     last_sync_error = NULL,
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
                  broker_name, account_id, server_name, connection_status, last_connected,
                  last_synced_at, last_sync_status)
                 VALUES ($1, $2, $3, $4, 'connected', NOW(), $5, $6, $7, 'connected', NOW(),
                         NOW(), 'success')`,
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

router.post("/vps/sync-jobs/claim", requireVpsAgent, async (req, res) => {
    const workerId = getWorkerId(req);
    const capacity = getWorkerCapacity(req);
    const workerActiveCount = getWorkerActiveCount(req);
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        if (workerActiveCount >= capacity) {
            await client.query('COMMIT');
            return res.json({
                success: true,
                job: null,
                capacity,
            });
        }

        const staleJobs = await client.query(
            `UPDATE ${TABLES.mt5SyncJobs}
             SET status = 'failed',
                 progress_status = 'failed',
                 error_message = 'VPS agent did not finish sync before timeout',
                 completed_at = NOW(),
                 updated_at = NOW()
             WHERE status = 'running'
               AND updated_at < NOW() - INTERVAL '10 minutes'
             RETURNING mt5_account_id`
        );

        if (staleJobs.rowCount > 0) {
            await client.query(
                `UPDATE ${TABLES.mt5Accounts}
                 SET last_sync_status = 'failed',
                     last_sync_error = 'VPS agent did not finish sync before timeout',
                     updated_at = NOW()
                 WHERE id = ANY($1::int[])`,
                [staleJobs.rows.map((row) => row.mt5_account_id)]
            );
        }

        const runningCount = await client.query(
            `SELECT
                (SELECT COUNT(*)::int FROM ${TABLES.mt5VpsJobs} WHERE status IN ('claimed', 'running'))
                +
                (SELECT COUNT(*)::int FROM ${TABLES.mt5SyncJobs} WHERE status = 'running') AS active_count`
        );

        if (Number(runningCount.rows[0]?.active_count || 0) >= capacity) {
            await client.query('COMMIT');
            return res.json({
                success: true,
                job: null,
                capacity,
            });
        }

        const jobResult = await client.query(
            `SELECT
                j.id AS job_id,
                j.mt5_account_id,
                j.user_id,
                a.account_id,
                a.login_id,
                a.broker_server,
                a.server_name,
                a.instance_key,
                a.investor_password
             FROM ${TABLES.mt5SyncJobs} j
             JOIN ${TABLES.mt5Accounts} a ON a.id = j.mt5_account_id
             WHERE j.status = 'queued'
               AND a.instance_key IS NOT NULL
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
            `UPDATE ${TABLES.mt5SyncJobs}
             SET status = 'running',
                 worker_id = $2,
                 progress_status = 'launching_terminal',
                 started_at = NOW(),
                 updated_at = NOW()
             WHERE id = $1`,
            [job.job_id, workerId]
        );

        await client.query(
            `UPDATE ${TABLES.mt5Accounts}
             SET last_sync_status = 'running',
                 last_sync_error = NULL,
                 updated_at = NOW()
             WHERE id = $1`,
            [job.mt5_account_id]
        );

        await client.query('COMMIT');

        res.json({
            success: true,
            job: {
                job_id: job.job_id,
                job_type: 'SYNC_MT5_ACCOUNT',
                mt5_account_id: job.mt5_account_id,
                user_id: job.user_id,
                account_id: job.account_id,
                login: job.login_id || String(job.account_id),
                broker_server: job.broker_server || job.server_name,
                password: job.investor_password ? decryptMT5Password(job.investor_password) : null,
                instance_key: job.instance_key,
                worker_id: workerId,
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

router.post("/vps/sync-jobs/:job_id/status", requireVpsAgent, async (req, res) => {
    const progressStatus = trimString(req.body.progress_status, { max: 64, required: true });

    if (!SYNC_PROGRESS_STATUSES.has(progressStatus)) {
        return res.status(400).json({
            success: false,
            error: 'Invalid sync progress status',
        });
    }

    try {
        const result = await pool.query(
            `UPDATE ${TABLES.mt5SyncJobs}
             SET progress_status = $1,
                 updated_at = NOW()
             WHERE id = $2
               AND status = 'running'
             RETURNING id`,
            [progressStatus, req.params.job_id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'Sync job not found',
            });
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

router.post("/vps/sync-jobs/:job_id/complete", requireVpsAgent, async (req, res) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const result = await client.query(
            `UPDATE ${TABLES.mt5SyncJobs}
             SET status = 'success',
                 progress_status = 'synced',
                 error_message = NULL,
                 completed_at = NOW(),
                 updated_at = NOW()
             WHERE id = $1
               AND status = 'running'
             RETURNING mt5_account_id`,
            [req.params.job_id]
        );

        if (result.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                error: 'Sync job not found',
            });
        }

        await client.query(
            `UPDATE ${TABLES.mt5Accounts}
             SET last_synced_at = NOW(),
                 last_sync_status = 'success',
                 last_sync_error = NULL,
                 updated_at = NOW()
             WHERE id = $1`,
            [result.rows[0].mt5_account_id]
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

router.post("/vps/sync-jobs/:job_id/fail", requireVpsAgent, async (req, res) => {
    const errorMessage = sanitizeAgentMessage(req.body.error_message) || 'MT5 sync failed';
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const result = await client.query(
            `UPDATE ${TABLES.mt5SyncJobs}
             SET status = 'failed',
                 progress_status = 'failed',
                 error_message = $2,
                 completed_at = NOW(),
                 updated_at = NOW()
             WHERE id = $1
               AND status IN ('queued', 'running')
             RETURNING mt5_account_id`,
            [req.params.job_id, errorMessage]
        );

        if (result.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                error: 'Sync job not found',
            });
        }

        await client.query(
            `UPDATE ${TABLES.mt5Accounts}
             SET last_sync_status = 'failed',
                 last_sync_error = $2,
                 updated_at = NOW()
             WHERE id = $1`,
            [result.rows[0].mt5_account_id, errorMessage]
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

