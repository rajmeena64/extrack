const fs = require('fs');
const { Pool } = require('pg');

function booleanEnv(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).toLowerCase() === 'true';
}

function buildPoolConfig() {
  const sslEnabled = booleanEnv(process.env.DB_SSL_ENABLED, false);
  const rejectUnauthorized = booleanEnv(process.env.DB_SSL_REJECT_UNAUTHORIZED, false);

  let ca;
  if (process.env.DB_SSL_CA_BASE64) {
    ca = Buffer.from(process.env.DB_SSL_CA_BASE64, 'base64').toString('utf8');
  } else if (process.env.DB_SSL_CA) {
    ca = process.env.DB_SSL_CA.includes('BEGIN CERTIFICATE')
      ? process.env.DB_SSL_CA.replace(/\\n/g, '\n')
      : fs.readFileSync(process.env.DB_SSL_CA, 'utf8');
  }

  const ssl = sslEnabled
    ? { rejectUnauthorized, ...(ca ? { ca } : {}) }
    : false;

  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl,
      max: Number(process.env.DB_POOL_MAX || 5),
      idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS || 30000),
      connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS || 10000),
    };
  }

  return {
    host: process.env.DB_HOST || process.env.PGHOST,
    port: Number(process.env.DB_PORT || process.env.PGPORT || 5432),
    database: process.env.DB_NAME || process.env.PGDATABASE,
    user: process.env.DB_USER || process.env.PGUSER,
    password: process.env.DB_PASSWORD || process.env.PGPASSWORD,
    ssl,
    max: Number(process.env.DB_POOL_MAX || 5),
    idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS || 30000),
    connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS || 10000),
  };
}

const pool = new Pool(buildPoolConfig());

pool.on('error', (error) => {
  console.error('db.pool.error', error.message);
});

module.exports = pool;
