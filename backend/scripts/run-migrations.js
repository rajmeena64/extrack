const fs = require('fs');
const path = require('path');
const pool = require('../infra/db/database');

async function ensureMigrationsTable() {
  await pool.query(`
    CREATE SCHEMA IF NOT EXISTS system;

    CREATE TABLE IF NOT EXISTS system.schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function run() {
  const migrationsDir = path.join(__dirname, '..', 'migrations');
  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  await ensureMigrationsTable();

  for (const file of files) {
    const applied = await pool.query('SELECT id FROM system.schema_migrations WHERE id = $1', [file]);
    if (applied.rowCount > 0) {
      console.log(`skip ${file}`);
      continue;
    }

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO system.schema_migrations (id) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`applied ${file}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

run()
  .then(() => pool.end())
  .catch((error) => {
    console.error(error.message);
    pool.end().finally(() => process.exit(1));
  });
