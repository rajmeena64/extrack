export function toNumber(value, fallback = 0) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

export function round(value, precision = 2) {
  const numericValue = toNumber(value);
  const factor = 10 ** precision;
  return Math.round((numericValue + Number.EPSILON) * factor) / factor;
}

export function calculateRiskAmount(balance, riskPercent) {
  const numericBalance = toNumber(balance);
  const numericRiskPercent = toNumber(riskPercent);
  if (numericBalance <= 0 || numericRiskPercent <= 0) return 0;
  return round(numericBalance * (numericRiskPercent / 100), 2);
}

export function calculatePositionSize(entryPrice, stopLoss, riskAmount) {
  const entry = toNumber(entryPrice);
  const stop = toNumber(stopLoss);
  const risk = toNumber(riskAmount);
  const priceRisk = Math.abs(entry - stop);

  if (entry <= 0 || stop <= 0 || risk <= 0 || priceRisk === 0) return 0;
  return round(risk / priceRisk, 6);
}

export function calculateReward(entryPrice, targetPrice, quantity, side) {
  const entry = toNumber(entryPrice);
  const target = toNumber(targetPrice);
  const qty = toNumber(quantity);
  if (entry <= 0 || target <= 0 || qty <= 0) return 0;
  return round((String(side).toLowerCase() === 'sell' ? entry - target : target - entry) * qty, 2);
}

export function calculateRisk(entryPrice, stopLoss, quantity, side) {
  const entry = toNumber(entryPrice);
  const stop = toNumber(stopLoss);
  const qty = toNumber(quantity);
  if (entry <= 0 || stop <= 0 || qty <= 0) return 0;
  return round(Math.abs(String(side).toLowerCase() === 'sell' ? stop - entry : entry - stop) * qty, 2);
}

export function calculateRR(entryPrice, stopLoss, targetPrice, side) {
  const entry = toNumber(entryPrice);
  const stop = toNumber(stopLoss);
  const target = toNumber(targetPrice);
  const riskDistance = Math.abs(entry - stop);
  const rewardDistance = Math.abs(target - entry);

  if (entry <= 0 || stop <= 0 || target <= 0 || riskDistance === 0) return 0;
  if (String(side).toLowerCase() === 'buy' && (stop >= entry || target <= entry)) return 0;
  if (String(side).toLowerCase() === 'sell' && (stop <= entry || target >= entry)) return 0;
  return round(rewardDistance / riskDistance, 2);
}

export function calculatePnL(entryPrice, exitPrice, quantity, side) {
  const entry = toNumber(entryPrice);
  const exit = toNumber(exitPrice);
  const qty = toNumber(quantity);
  if (entry <= 0 || exit <= 0 || qty <= 0) return 0;
  return round((String(side).toLowerCase() === 'sell' ? entry - exit : exit - entry) * qty, 2);
}

export function calculateRMultiple(pnl, riskAmount) {
  const risk = Math.abs(toNumber(riskAmount));
  if (risk === 0) return 0;
  return round(toNumber(pnl) / risk, 2);
}

export function validateOrder({ side, balance, entryPrice, stopLoss, takeProfit, quantity, riskAmount }) {
  const errors = [];
  const normalizedSide = String(side).toLowerCase();
  const entry = toNumber(entryPrice);
  const stop = toNumber(stopLoss);
  const target = toNumber(takeProfit);
  const qty = toNumber(quantity);
  const risk = toNumber(riskAmount);
  const accountBalance = toNumber(balance);

  if (!['buy', 'sell'].includes(normalizedSide)) errors.push('Choose BUY or SELL.');
  if (entry <= 0) errors.push('Entry price must be greater than zero.');
  if (qty <= 0) errors.push('Quantity cannot be negative or zero.');
  if (risk > accountBalance) errors.push('Risk cannot be greater than balance.');

  if (stop > 0) {
    if (stop === entry) errors.push('Stop loss cannot equal entry.');
    if (normalizedSide === 'buy' && stop >= entry) errors.push('For long trades, stop loss should be below entry.');
    if (normalizedSide === 'sell' && stop <= entry) errors.push('For short trades, stop loss should be above entry.');
  }

  if (target > 0) {
    if (normalizedSide === 'buy' && target <= entry) errors.push('For long trades, target should be above entry.');
    if (normalizedSide === 'sell' && target >= entry) errors.push('For short trades, target should be below entry.');
  }

  return errors;
}
