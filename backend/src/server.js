const http = require('http');
const app = require('./app');
const env = require('./core/config/env');
const logger = require('./core/logger/logger');
const wsManager = require('./core/websocket/wsServer');
const postgres = require('./infra/db/postgres');
const redis = require('./infra/db/redis');

const server = http.createServer(app);
wsManager.init(server);

async function start() {
  try {
    await postgres.warmPool();
    await redis.ping().catch(() => null);
    server.listen(env.port, () => {
      logger.info('server.started', { port: env.port, env: env.env });
    });
  } catch (err) {
    logger.error('server.startup_failed', { error: err.message, stack: err.stack });
    process.exit(1);
  }
}

function shutdown(signal) {
  logger.info('server.shutdown_initiated', { signal });
  server.close(async () => {
    try {
      await postgres.end().catch(() => null);
      redis.disconnect();
      logger.info('server.shutdown_complete');
      process.exit(0);
    } catch (err) {
      logger.error('server.shutdown_error', { error: err.message });
      process.exit(1);
    }
  });

  setTimeout(() => {
    logger.error('server.shutdown_forced_timeout');
    process.exit(1);
  }, 10000).unref();
}

process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('SIGINT', () => shutdown('SIGINT'));

if (require.main === module) {
  start();
}

module.exports = { server, start, shutdown };
