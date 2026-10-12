const assert = require('assert');

function calculatePnl(side, entryPrice, exitPrice, quantity) {
  if (!entryPrice || !exitPrice || !quantity) return 0;
  const isBuy = String(side).toUpperCase() === 'BUY' || String(side).toUpperCase() === 'LONG';
  const diff = isBuy ? exitPrice - entryPrice : entryPrice - exitPrice;
  return Number((diff * quantity).toFixed(4));
}

function calculateRiskReward(entryPrice, stopLoss, takeProfit) {
  if (!entryPrice || !stopLoss || !takeProfit) return 0;
  const risk = Math.abs(entryPrice - stopLoss);
  const reward = Math.abs(takeProfit - entryPrice);
  if (risk === 0) return 0;
  return Number((reward / risk).toFixed(2));
}

function runTests() {
  const pnlLong = calculatePnl('BUY', 100, 110, 2);
  assert.strictEqual(pnlLong, 20);

  const pnlShort = calculatePnl('SHORT', 100, 90, 2);
  assert.strictEqual(pnlShort, 20);

  const rr = calculateRiskReward(100, 95, 110);
  assert.strictEqual(rr, 2);
}

runTests();
