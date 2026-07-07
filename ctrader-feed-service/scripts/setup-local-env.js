const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const serviceRoot = path.resolve(__dirname, '..');
const backendRoot = path.resolve(serviceRoot, '..', 'backend');
const backendEnvPath = path.join(backendRoot, '.env');
const serviceEnvPath = path.join(serviceRoot, '.env');

if (!fs.existsSync(backendEnvPath)) {
  throw new Error(`Backend env not found: ${backendEnvPath}`);
}

const backendEnvText = fs.readFileSync(backendEnvPath, 'utf8');
const backendEnv = dotenv.parse(backendEnvText);
const required = ['CTRADER_CLIENT_ID', 'CTRADER_CLIENT_SECRET', 'DATABASE_URL', 'MT5_CREDENTIALS_KEY'];
const missing = required.filter((key) => !backendEnv[key]);
if (missing.length) {
  throw new Error(`Missing backend env values: ${missing.join(', ')}`);
}

const serviceEnv = [
  `CTRADER_CLIENT_ID=${backendEnv.CTRADER_CLIENT_ID}`,
  `CTRADER_CLIENT_SECRET=${backendEnv.CTRADER_CLIENT_SECRET}`,
  'CTRADER_TOKEN_SOURCE=database',
  'CTRADER_ADMIN_INTEGRATIONS_TABLE=system.admin_integrations',
  `DATABASE_URL=${backendEnv.DATABASE_URL}`,
  `DB_SSL_ENABLED=${backendEnv.DB_SSL_ENABLED || 'true'}`,
  `DB_SSL_REJECT_UNAUTHORIZED=${backendEnv.DB_SSL_REJECT_UNAUTHORIZED || 'true'}`,
  `MT5_CREDENTIALS_KEY=${backendEnv.MT5_CREDENTIALS_KEY}`,
  'FEED_HOST=0.0.0.0',
  'FEED_PORT=8020',
  'CTRADER_PRESUBSCRIBED_SYMBOLS=ALL',
  'CTRADER_SUBSCRIBE_BATCH_SIZE=50',
  'FEED_RECONCILE_INTERVAL_MS=15000',
  'FEED_RETENTION_MS=900000',
  'FEED_MAX_TICKS_PER_SYMBOL=500',
  'FEED_BOOTSTRAP_CANDLES=false',
  'FEED_KEY_ROTATION_MS=86400000',
  'FEED_KEY_GRACE_MS=600000',
  'FEED_KEY_REFRESH_MS=60000',
  'FEED_ALLOWED_CLIENT_IDS=newapp-backend',
  'FEED_ALLOWED_ORIGINS=https://entrack.in,https://www.entrack.in,https://api.entrack.in,https://extrack-backend-9xk0.onrender.com,http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173',
  'FEED_SIGNATURE_MAX_AGE_MS=30000',
  'FEED_MAX_NONCES=20000',
  'FEED_REQUIRE_HTTPS=false',
  'FEED_PRINT_TICKS=false',
  'NODE_ENV=production',
  '',
].join('\n');

function upsertEnv(text, key, value) {
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, 'm');
  if (pattern.test(text)) return text.replace(pattern, line);
  return `${text.replace(/\s*$/, '')}\n${line}\n`;
}

function removeEnv(text, key) {
  return text.replace(new RegExp(`^${key}=.*(?:\\r?\\n|$)`, 'm'), '');
}

fs.writeFileSync(serviceEnvPath, serviceEnv, { encoding: 'utf8', mode: 0o600 });

let nextBackendEnv = backendEnvText;
nextBackendEnv = upsertEnv(nextBackendEnv, 'MARKET_FEED_URL', 'http://127.0.0.1:8020');
nextBackendEnv = upsertEnv(nextBackendEnv, 'MARKET_FEED_TIMEOUT_MS', '5000');
nextBackendEnv = upsertEnv(nextBackendEnv, 'FEED_KEY_CACHE_MS', '60000');
nextBackendEnv = upsertEnv(nextBackendEnv, 'FEED_CLIENT_ID', 'newapp-backend');
nextBackendEnv = upsertEnv(nextBackendEnv, 'ALLOW_INSECURE_MARKET_FEED_HTTP', 'true');
nextBackendEnv = removeEnv(nextBackendEnv, 'FEED_INTERNAL_API_KEY');
fs.writeFileSync(backendEnvPath, nextBackendEnv, 'utf8');

console.log('Local feed env configured. Secrets were not printed.');
