const { createClient } = require('@clickhouse/client');

const url = `${process.env.CLICKHOUSE_URL}:${process.env.CLICKHOUSE_PORT}`;

const clickhouse = createClient({
  url,
  username: process.env.CLICKHOUSE_USER,
  password: process.env.CLICKHOUSE_PASSWORD,
});

module.exports = clickhouse;