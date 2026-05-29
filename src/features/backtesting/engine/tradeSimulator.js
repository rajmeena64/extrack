import {
  calculatePnL,
  calculateRMultiple,
  calculateRisk,
  round,
  toNumber,
} from './riskCalculator';

const makeId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export function createOrderRecord({ side, type, symbol, quantity, price, candle, status = 'filled' }) {
  return {
    id: makeId('order'),
    side,
    type,
    symbol,
    quantity: round(quantity, 6),
    price: round(price, 5),
    status,
    timestamp: candle?.time ? new Date(candle.time * 1000).toISOString() : new Date().toISOString(),
  };
}

export function openPosition({ side, symbol, quantity, entryPrice, stopLoss, takeProfit, candle, riskAmount }) {
  return {
    id: makeId('position'),
    side,
    symbol,
    quantity: round(quantity, 6),
    entryPrice: round(entryPrice, 5),
    stopLoss: stopLoss ? round(stopLoss, 5) : null,
    takeProfit: takeProfit ? round(takeProfit, 5) : null,
    entryTime: candle?.time,
    entryIso: candle?.time ? new Date(candle.time * 1000).toISOString() : new Date().toISOString(),
    riskAmount: round(riskAmount || calculateRisk(entryPrice, stopLoss, quantity, side), 2),
    unrealizedPnL: 0,
    status: 'open',
  };
}

export function closePosition(position, exitPrice, candle, reason = 'manual') {
  const pnl = calculatePnL(position.entryPrice, exitPrice, position.quantity, position.side);
  return {
    ...position,
    exitPrice: round(exitPrice, 5),
    exitTime: candle?.time,
    exitIso: candle?.time ? new Date(candle.time * 1000).toISOString() : new Date().toISOString(),
    pnl,
    rMultiple: calculateRMultiple(pnl, position.riskAmount),
    status: 'closed',
    closeReason: reason,
  };
}

export function updateUnrealizedPnL(positions, currentPrice) {
  return positions.map((position) => ({
    ...position,
    unrealizedPnL: calculatePnL(position.entryPrice, currentPrice, position.quantity, position.side),
  }));
}

export function checkStopLossTakeProfit(position, candle) {
  const side = String(position.side).toLowerCase();
  const stopLoss = toNumber(position.stopLoss);
  const takeProfit = toNumber(position.takeProfit);
  const hasStop = stopLoss > 0;
  const hasTarget = takeProfit > 0;
  if (!candle || (!hasStop && !hasTarget)) return null;

  if (side === 'buy') {
    const stopHit = hasStop && candle.low <= stopLoss;
    const targetHit = hasTarget && candle.high >= takeProfit;

    // OHLC candles do not reveal intrabar order. If both levels are touched,
    // conservative replay assumes the stop is hit first.
    if (stopHit) return closePosition(position, stopLoss, candle, 'stop_loss');
    if (targetHit) return closePosition(position, takeProfit, candle, 'take_profit');
    return null;
  }

  const stopHit = hasStop && candle.high >= stopLoss;
  const targetHit = hasTarget && candle.low <= takeProfit;

  // OHLC candles do not reveal intrabar order. If both levels are touched,
  // conservative replay assumes the stop is hit first.
  if (stopHit) return closePosition(position, stopLoss, candle, 'stop_loss');
  if (targetHit) return closePosition(position, takeProfit, candle, 'take_profit');
  return null;
}
