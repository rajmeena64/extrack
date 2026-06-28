const path = require("path");
const { Pool } = require("pg");

require("dotenv").config({
  path: path.join(__dirname, "..", "..", ".env"),
  quiet: true,
});

const sslEnabled = String(process.env.DB_SSL_ENABLED || "true") === "true";
const rejectUnauthorized =
  String(process.env.DB_SSL_REJECT_UNAUTHORIZED || "true") === "true";

const DB_POOL_MAX = Number(process.env.DB_POOL_MAX || 5);
const DB_IDLE_TIMEOUT_MS = Number(process.env.DB_IDLE_TIMEOUT_MS || 600000);
const DB_CONNECTION_TIMEOUT_MS = Number(process.env.DB_CONNECTION_TIMEOUT_MS || 10000);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: sslEnabled ? { rejectUnauthorized } : false,

  max: DB_POOL_MAX,
  idleTimeoutMillis: DB_IDLE_TIMEOUT_MS,
  connectionTimeoutMillis: DB_CONNECTION_TIMEOUT_MS,
  keepAlive: true,
});

async function warmPool() {
  const clients = [];

  try {
    for (let i = 0; i < DB_POOL_MAX; i += 1) {
      const client = await pool.connect();
      clients.push(client);
    }

    await Promise.all(clients.map((client) => client.query("SELECT 1")));
  } finally {
    clients.forEach((client) => client.release());
  }
}

pool.warmPool = warmPool;

module.exports = pool;