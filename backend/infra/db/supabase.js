const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

require('dotenv').config({
  path: path.join(__dirname, '..', '..', '.env'),
  quiet: true,
});

const sslEnabled = String(process.env.DB_SSL_ENABLED || 'true') === 'true';
const rejectUnauthorized = String(process.env.DB_SSL_REJECT_UNAUTHORIZED || 'true') === 'true';

let sslCa;
if (process.env.DB_SSL_CA_BASE64) {
  sslCa = Buffer.from(process.env.DB_SSL_CA_BASE64, 'base64').toString('utf8');
} else if (process.env.DB_SSL_CA) {
  sslCa = process.env.DB_SSL_CA.includes('BEGIN CERTIFICATE')
    ? process.env.DB_SSL_CA.replace(/\\n/g, '\n')
    : fs.readFileSync(process.env.DB_SSL_CA, 'utf8');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: sslEnabled ? { rejectUnauthorized, ...(sslCa ? { ca: sslCa } : {}) } : false,
  max: Number(process.env.DB_POOL_MAX || 5),
  idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS || 600000),
  connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS || 10000),
  keepAlive: true,
});

pool.warmPool = () => pool.query('SELECT 1');
setInterval(() => pool.query('SELECT 1').catch(() => {}), 4 * 60 * 1000).unref();

module.exports = pool;
