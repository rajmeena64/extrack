import { getCurrentCandle, nextIndex, previousIndex } from './candleReplay';
import { calculatePnL } from './riskCalculator';
import {
  checkStopLossTakeProfit,
  closePosition,
  createOrderRecord,
  openPosition,
  updateUnrealizedPnL,
} from './tradeSimulator';

export const INITIAL_BACKTEST_STATE = {
  sessionId: '',
  sessionName: '',
  symbol: 'USDJPY',
  timeframe: '1m',
  sessionDate: new Date().toISOString().split('T')[0],
  sessionStartTime: '',
  sessionEndTime: '',
  candles: [],
  currentIndex: 80,
  isPlaying: false,
  playbackSpeed: 1,
  strictReplay: true,
  balance: 10000,
  initialBalance: 10000,
  selectedOrderSide: 'buy',
  orderType: 'market',
  entryPrice: 0,
  stopLoss: 0,
  takeProfit: 0,
  riskPercent: 1,
  riskAmount: 100,
  positionSize: 0,
  openPositions: [],
  closedPositions: [],
  orders: [],
  journalDrafts: [],
};

export function loadCandles(state, candles) {
  const nextCandles = Array.isArray(candles) ? candles : [];
  const nextIndex = Math.min(Math.max(state.currentIndex, 0), Math.max(nextCandles.length - 1, 0));
  const currentCandle = getCurrentCandle(nextCandles, nextIndex);

  return {
    ...state,
    candles: nextCandles,
    currentIndex: nextIndex,
    entryPrice: currentCandle?.close || state.entryPrice,
    stopLoss: state.stopLoss || (currentCandle?.close ? currentCandle.close * 0.992 : state.stopLoss),
    takeProfit: state.takeProfit || (currentCandle?.close ? currentCandle.close * 1.016 : state.takeProfit),
  };
}

export function startBacktestSessionState(state, session, candles) {
  const nextCandles = Array.isArray(candles) ? candles : [];
  const nextIndex = Math.max(nextCandles.length - 1, 0);
  const currentCandle = getCurrentCandle(nextCandles, nextIndex);
  const initialBalance = Number(session.initialBalance) || state.initialBalance;

  return {
    ...state,
    sessionId: session.sessionId || session.id || '',
    sessionName: session.sessionName || '',
    symbol: session.symbol || state.symbol,
    timeframe: session.timeframe || state.timeframe,
    sessionDate: session.startTime ? session.startTime.slice(0, 10) : state.sessionDate,
    sessionStartTime: session.startTime || '',
    sessionEndTime: session.endTime || '',
    candles: nextCandles,
    currentIndex: nextIndex,
    balance: initialBalance,
    initialBalance,
    entryPrice: currentCandle?.close || 0,
    stopLoss: currentCandle?.close ? currentCandle.close * 0.992 : 0,
    takeProfit: currentCandle?.close ? currentCandle.close * 1.016 : 0,
    openPositions: [],
    closedPositions: [],
    orders: [],
    journalDrafts: [],
    isPlaying: false,
  };
}

export function resumeBacktestSessionState(state, session, candles) {
  const baseState = startBacktestSessionState(state, session, candles);
  const currentTime = Number(session.currentTime || 0);
  const restoredIndex = currentTime
    ? Math.max(candles.findIndex((candle) => candle.time >= currentTime), 0)
    : Number(session.currentIndex);
  const safeIndex = Number.isFinite(restoredIndex)
    ? Math.min(Math.max(restoredIndex, 0), Math.max(candles.length - 1, 0))
    : baseState.currentIndex;
  const currentCandle = getCurrentCandle(candles, safeIndex);

  return {
    ...baseState,
    currentIndex: safeIndex,
    balance: Number(session.balance) || baseState.balance,
    selectedOrderSide: session.selectedOrderSide || baseState.selectedOrderSide,
    orderType: session.orderType || baseState.orderType,
    entryPrice: currentCandle?.close || Number(session.entryPrice) || baseState.entryPrice,
    stopLoss: Number(session.stopLoss) || baseState.stopLoss,
    takeProfit: Number(session.takeProfit) || baseState.takeProfit,
    riskPercent: Number(session.riskPercent) || baseState.riskPercent,
    riskAmount: Number(session.riskAmount) || baseState.riskAmount,
    positionSize: Number(session.positionSize) || baseState.positionSize,
    openPositions: Array.isArray(session.openPositions) ? session.openPositions : [],
    closedPositions: Array.isArray(session.closedPositions) ? session.closedPositions : [],
    orders: Array.isArray(session.orders) ? session.orders : [],
    journalDrafts: Array.isArray(session.journalDrafts) ? session.journalDrafts : [],
    isPlaying: false,
  };
}

export function stepReplay(state, direction = 1) {
  const targetIndex = direction > 0
    ? nextIndex(state.currentIndex, state.candles)
    : previousIndex(state.currentIndex);
  const candle = getCurrentCandle(state.candles, targetIndex);
  if (!candle) return state;

  const closedOnCandle = [];
  const remainingPositions = [];

  state.openPositions.forEach((position) => {
    const closedPosition = checkStopLossTakeProfit(position, candle);
    if (closedPosition) {
      closedOnCandle.push(closedPosition);
    } else {
      remainingPositions.push(position);
    }
  });

  const openPositions = updateUnrealizedPnL(remainingPositions, candle.close);
  const realizedPnL = closedOnCandle.reduce((sum, trade) => sum + trade.pnl, 0);

  return {
    ...state,
    currentIndex: targetIndex,
    entryPrice: candle.close,
    openPositions,
    closedPositions: [...closedOnCandle, ...state.closedPositions],
    balance: state.balance + realizedPnL,
  };
}

export function placeMarketOrder(state, orderInput) {
  const candle = getCurrentCandle(state.candles, state.currentIndex);
  if (!candle) return state;

  const entryPrice = Number(orderInput.entryPrice || candle.close);
  const quantity = Number(orderInput.quantity);
  const side = orderInput.side;
  const position = openPosition({
    side,
    symbol: state.symbol,
    quantity,
    entryPrice,
    stopLoss: orderInput.stopLoss,
    takeProfit: orderInput.takeProfit,
    candle,
    riskAmount: orderInput.riskAmount,
  });
  const order = createOrderRecord({
    side,
    type: orderInput.orderType || 'market',
    symbol: state.symbol,
    quantity,
    price: entryPrice,
    candle,
  });

  return {
    ...state,
    selectedOrderSide: side,
    orderType: orderInput.orderType || state.orderType,
    openPositions: [...state.openPositions, position],
    orders: [order, ...state.orders],
  };
}

export function closePositionById(state, positionId) {
  const candle = getCurrentCandle(state.candles, state.currentIndex);
  if (!candle) return state;

  const position = state.openPositions.find((item) => item.id === positionId);
  if (!position) return state;

  const closedPosition = closePosition(position, candle.close, candle, 'manual');
  return {
    ...state,
    openPositions: state.openPositions.filter((item) => item.id !== positionId),
    closedPositions: [closedPosition, ...state.closedPositions],
    balance: state.balance + closedPosition.pnl,
  };
}

export function getBacktestStats(state) {
  const closed = state.closedPositions || [];
  const wins = closed.filter((trade) => trade.pnl > 0);
  const losses = closed.filter((trade) => trade.pnl < 0);
  const grossProfit = wins.reduce((sum, trade) => sum + trade.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((sum, trade) => sum + trade.pnl, 0));
  const unrealizedPnL = (state.openPositions || []).reduce((sum, position) => sum + (position.unrealizedPnL || 0), 0);
  const realizedPnL = closed.reduce((sum, trade) => sum + trade.pnl, 0);

  return {
    currentBalance: state.balance,
    realizedPnL,
    unrealizedPnL,
    winRate: closed.length ? (wins.length / closed.length) * 100 : 0,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
    totalTrades: closed.length,
    openTrades: state.openPositions.length,
  };
}

export function mapBacktestTradeToJournalTrade(trade, symbol) {
  return {
    symbol: trade.symbol || symbol,
    trade_type: trade.side,
    category: 'backtest',
    quantity: trade.quantity,
    price: trade.entryPrice,
    exit_price: trade.exitPrice || trade.entryPrice,
    pnl: trade.pnl || calculatePnL(trade.entryPrice, trade.exitPrice || trade.entryPrice, trade.quantity, trade.side),
    strategy: 'Backtest Replay',
    timestamp: trade.entryIso || new Date().toISOString(),
    unique_id: `backtest-${trade.id}`,
    notes: `Backtest ${trade.closeReason || 'journal'} trade. R multiple: ${trade.rMultiple ?? 0}.`,
    screenshots: null,
  };
}
