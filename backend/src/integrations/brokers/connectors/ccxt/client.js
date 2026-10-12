const ccxt = require('ccxt');
const ALIASES = { 'gate-io': 'gate', 'woo-x': 'woo', 'delta-exchange': 'delta', 'crypto-com': 'cryptocom', 'backpack-exchange': 'backpack' };
function getClient(slug, creds = {}) {
  const resolved = ALIASES[slug] || slug;
  const Cls = ccxt[resolved];
  if (!Cls) throw new Error(`Unsupported exchange: ${slug}`);
  const client = new Cls({
    apiKey: creds.apiKey,
    secret: creds.secretKey,
    password: creds.passphrase,
    enableRateLimit: true,
    options: { adjustForTimeDifference: true, recvWindow: 10000 },
  });
  if (creds.environment === 'demo') {
    if (typeof client.enableDemoTrading === 'function') client.enableDemoTrading(true);
    else if (typeof client.setSandboxMode === 'function') client.setSandboxMode(true);
  }
  return client;
}
const supportedSlugs = new Set(ccxt.exchanges);
const isSupported = (slug) => supportedSlugs.has(ALIASES[slug] || slug);
module.exports = { getClient, ALIASES, isSupported };
