const { createClient } = require('@clickhouse/client');

function getClickhouseUrl() {
  const baseUrl = process.env.CLICKHOUSE_URL;
  if (!baseUrl) {
    return null;
  }

  if (process.env.CLICKHOUSE_PORT) {
    return `${baseUrl}:${process.env.CLICKHOUSE_PORT}`;
  }

  return baseUrl;
}

function createUnavailableClient(reason) {
  return {
    async query() {
      throw new Error(`ClickHouse is not configured: ${reason}`);
    },
  };
}

const url = getClickhouseUrl();
let clickhouse;

try {
  clickhouse = url
    ? createClient({
        url,
        username: process.env.CLICKHOUSE_USER,
        password: process.env.CLICKHOUSE_PASSWORD,
      })
    : createUnavailableClient('CLICKHOUSE_URL is missing');
} catch (error) {
  clickhouse = createUnavailableClient(error.message);
}

module.exports = clickhouse;
