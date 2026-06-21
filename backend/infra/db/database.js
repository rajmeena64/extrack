// require("dotenv").config();
// const { Pool } = require("pg");

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: false, // Important for local database connections.
// });

// module.exports = pool;

const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env"), quiet: true });
const { Pool } = require("pg");

const sslEnabled = String(process.env.DB_SSL_ENABLED || "true") === "true";
const rejectUnauthorized = String(process.env.DB_SSL_REJECT_UNAUTHORIZED || "true") === "true";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: sslEnabled ? { rejectUnauthorized } : false
});

module.exports = pool;
