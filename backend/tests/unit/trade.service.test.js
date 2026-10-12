const assert = require('assert');
const { calculatePnl, calculateRiskReward, calculatePercentChange } = require('../../src/domains/trading/trade.calculator');
const { normalizeTradeSide, normalizeTradeStatus } = require('../../src/domains/trading/trade.normalization');
const { createTradeSchema } = require('../../src/domains/trading/trade.schema');

function testTradeCalculator() {
  const pnlLong = calculatePnl('BUY', 100, 150, 2);
  assert.strictEqual(pnlLong, 100);

  const pnlShort = calculatePnl('SELL', 100, 80, 2);
  assert.strictEqual(pnlShort, 40);

  const rr = calculateRiskReward(100, 90, 120);
  assert.strictEqual(rr, 2);

  const pct = calculatePercentChange(100, 110, 'BUY');
  assert.strictEqual(pct, 10);
}

function testTradeNormalization() {
  assert.strictEqual(normalizeTradeSide('buy'), 'long');
  assert.strictEqual(normalizeTradeSide('SELL'), 'short');
  assert.strictEqual(normalizeTradeStatus(null, '2026-09-14T12:00:00Z'), 'closed');
  assert.strictEqual(normalizeTradeStatus(null, null), 'open');
}

function testTradeSchema() {
  const valid = createTradeSchema.safeParse({
    symbol: 'BTCUSDT',
    side: 'BUY',
    quantity: 1,
    entryPrice: 50000,
    entryTimestamp: '2026-09-14T10:00:00Z'
  });
  assert.strictEqual(valid.success, true);

  const invalid = createTradeSchema.safeParse({
    symbol: 'BTCUSDT',
    side: 'BUY',
    quantity: -1,
    entryPrice: 50000,
    entryTimestamp: '2026-09-14T10:00:00Z'
  });
  assert.strictEqual(invalid.success, false);
}

function run() {
  testTradeCalculator();
  testTradeNormalization();
  testTradeSchema();
}

run();
