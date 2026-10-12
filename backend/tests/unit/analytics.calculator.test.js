const assert = require('assert');
const { computeStats, computeRadar } = require('../../src/domains/analytics/analytics.calculator');

function testComputeStats() {
  const mockTrades = [
    { pnl: 100, date: '2026-09-01' },
    { pnl: -50, date: '2026-09-01' },
    { pnl: 200, date: '2026-09-02' }
  ];

  const stats = computeStats(mockTrades);
  assert.strictEqual(stats.totalTrades, 3);
  assert.strictEqual(stats.winningTrades, 2);
  assert.strictEqual(stats.losingTrades, 1);
  assert.strictEqual(stats.totalPnL, 250);
  assert.strictEqual(stats.profitFactor, 6);
  assert.strictEqual(stats.winRate, 66.67);
}

function testComputeRadar() {
  const mockTrades = [
    { pnl: 50 },
    { pnl: 100 },
    { pnl: -20 }
  ];

  const radar = computeRadar(mockTrades);
  assert.strictEqual(typeof radar.overallScore, 'number');
  assert.strictEqual(radar.win, 67);
  assert.strictEqual(typeof radar.profit, 'number');
}

function run() {
  testComputeStats();
  testComputeRadar();
}

run();
