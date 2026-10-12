const assert = require('assert');
const { calculationSnapshot } = require('../../src/domains/instruments/instrument.registry');

function testCalculationSnapshot() {
  const mockInstrument = {
    id: 42,
    symbol: 'BTCUSDT',
    assetClass: 'crypto',
    productType: 'spot',
    contractSize: '1',
    tickSize: '0.01',
    pipSize: '0.01',
    profitCurrency: 'USDT'
  };

  const snapshot = calculationSnapshot(mockInstrument);
  assert.strictEqual(snapshot.instrumentId, 42);
  assert.strictEqual(snapshot.symbol, 'BTCUSDT');
  assert.strictEqual(snapshot.profitCurrency, 'USDT');
  assert.strictEqual(snapshot.tickSize, '0.01');

  const nullSnapshot = calculationSnapshot(null);
  assert.strictEqual(nullSnapshot, null);
}

testCalculationSnapshot();
