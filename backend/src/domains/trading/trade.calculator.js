function calculatePnl(side, entryPrice, exitPrice, quantity, multiplier = 1) {
  if (!entryPrice || !exitPrice || !quantity) return 0;
  const isBuy = String(side).toUpperCase() === 'BUY' || String(side).toUpperCase() === 'LONG';
  const diff = isBuy ? exitPrice - entryPrice : entryPrice - exitPrice;
  return Number((diff * quantity * multiplier).toFixed(4));
}

function calculateRiskReward(entryPrice, stopLoss, takeProfit) {
  if (!entryPrice || !stopLoss || !takeProfit) return null;
  const risk = Math.abs(entryPrice - stopLoss);
  const reward = Math.abs(takeProfit - entryPrice);
  if (risk === 0) return null;
  return Number((reward / risk).toFixed(2));
}

function calculatePercentChange(entryPrice, exitPrice, side) {
  if (!entryPrice || !exitPrice) return 0;
  const isBuy = String(side).toUpperCase() === 'BUY' || String(side).toUpperCase() === 'LONG';
  const pct = ((exitPrice - entryPrice) / entryPrice) * 100;
  return Number((isBuy ? pct : -pct).toFixed(2));
}

module.exports = {
  calculatePnl,
  calculateRiskReward,
  calculatePercentChange
};
