const test = require('node:test');
const assert = require('node:assert/strict');
const registry = require('../../src/integrations/brokers/registry');
const { encryptAesGcm, decryptAesGcm } = require('../../src/core/utils/security');
const { createConnectionSchema } = require('../../src/domains/brokers/broker.schema');
const { normalizeMetaTraderTrade } = require('../../src/integrations/brokers/connectors/metatrader/parser');

test('Broker Registry: registers all 5 core connectors', () => {
  const supported = registry.getAllConnectors().map((c) => c.slug);
  assert.ok(supported.includes('binance'));
  assert.ok(supported.includes('ctrader'));
  assert.ok(supported.includes('angel-one'));
  assert.ok(supported.includes('metatrader'));
  assert.ok(supported.includes('ccxt'));
});

test('Broker Registry: resolves direct connectors and CCXT fallbacks', () => {
  assert.equal(registry.getConnector('binance')?.slug, 'binance');
  assert.equal(registry.getConnector('metatrader')?.slug, 'metatrader');
  assert.equal(registry.getConnector('gate-io')?.slug, 'ccxt');
  assert.equal(registry.getConnector('unknown-exchange-xyz'), null);
});

test('Generic Security: encryptAesGcm and decryptAesGcm authenticated roundtrip', () => {
  const secret = '32-byte-long-test-secret-key-123456';
  const aad = 'user:123';
  const text = JSON.stringify({ apiKey: 'my-key', secret: 'my-secret' });
  const cipher = encryptAesGcm(text, secret, aad);
  assert.ok(cipher.startsWith('enc:v1:'));
  const decrypted = decryptAesGcm(cipher, secret, aad);
  assert.equal(decrypted, text);
  assert.throws(() => decryptAesGcm(cipher, secret, 'user:999'));
});

test('Broker Schema: validates createConnectionSchema', () => {
  const valid = createConnectionSchema.safeParse({
    integrationId: '123e4567-e89b-12d3-a456-426614174000',
    accountName: 'My MT5 Account'
  });
  assert.equal(valid.success, true);

  const invalid = createConnectionSchema.safeParse({
    integrationId: 'invalid-uuid',
    accountName: ''
  });
  assert.equal(invalid.success, false);
});

test('MetaTrader Parser: normalizes MT5 deal payload to canonical trade', () => {
  const raw = {
    trade_key: 123456,
    symbol: 'EURUSD.pro',
    side: 'short',
    quantity: 0.5,
    entry_price: 1.085,
    exit_price: 1.081,
    entry_timestamp: 1700000000,
    exit_timestamp: 1700003600,
    gross_pnl: 200,
    net_pnl: 195,
    charges: 5
  };
  const normalized = normalizeMetaTraderTrade(raw, 10, 'conn-uuid', 'USD');
  assert.equal(normalized.unique_id, 'mt5-123456');
  assert.equal(normalized.symbol, 'EURUSD');
  assert.equal(normalized.side, 'short');
  assert.equal(normalized.quantity, 0.5);
  assert.equal(normalized.net_pnl, 195);
  assert.equal(normalized.total_charges, 5);
  assert.equal(normalized.pnl_currency, 'USD');
  assert.equal(normalized.status, 'closed');
});
