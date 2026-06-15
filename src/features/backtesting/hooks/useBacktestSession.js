import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import api from '../../../utils/serve';
import { useAuth } from '../../../context/AuthContext';
import { generateMockCandles } from '../data/mockCandles';
import {
  INITIAL_BACKTEST_STATE,
  closePositionById,
  getBacktestStats,
  loadCandles,
  mapBacktestTradeToJournalTrade,
  placeMarketOrder,
  stepReplay,
} from '../engine/backtestEngine';
import { getCurrentCandle } from '../engine/candleReplay';
import {
  calculatePositionSize,
  round,
} from '../engine/riskCalculator';
import { useBacktestReplay } from './useBacktestReplay';

const INTERVAL_MAP = {
  '1m': '1m',
  '5m': '5m',
  '15m': '15m',
  '30m': '30m',
  '1h': '1h',
  '4h': '4h',
  '1D': '1d',
};

function reducer(state, action) {
  switch (action.type) {
    case 'patch':
      return { ...state, ...action.patch };
    case 'candles':
      return loadCandles(state, action.candles);
    case 'step':
      return stepReplay(state, action.direction);
    case 'placeOrder':
      return placeMarketOrder(state, action.order);
    case 'closePosition':
      return closePositionById(state, action.positionId);
    case 'journalDraft':
      return { ...state, journalDrafts: [action.trade, ...state.journalDrafts] };
    default:
      return state;
  }
}

const normalizeKline = (item) => ({
  time: Number(item[0]) / 1000,
  open: Number(item[1]),
  high: Number(item[2]),
  low: Number(item[3]),
  close: Number(item[4]),
  volume: Number(item[5] || 0),
});

export function useBacktestSession() {
  const [state, dispatch] = useReducer(reducer, INITIAL_BACKTEST_STATE);
  const [loadStatus, setLoadStatus] = useState('idle');
  const [journalStatus, setJournalStatus] = useState('');
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const currentCandle = getCurrentCandle(state.candles, state.currentIndex);
  const positionSize = useMemo(
    () => calculatePositionSize(state.entryPrice, state.stopLoss, state.riskAmount),
    [state.entryPrice, state.riskAmount, state.stopLoss]
  );

  useEffect(() => {
    dispatch({
      type: 'patch',
      patch: {
        positionSize,
      },
    });
  }, [positionSize]);

  // const loadMarketData = useCallback(async () => {
  //   setLoadStatus('loading');
  //   try {
  //     const startTime = state.sessionDate ? new Date(state.sessionDate).getTime() : undefined;
  //     const { data } = await api.get('/klines', {
  //       params: {
  //         symbol: state.symbol,
  //         interval: INTERVAL_MAP[state.timeframe] || '1m',
  //         limit: 5000,
  //         category: 'crypto',
  //         startTime,
  //       },
  //     });
  //     const candles = Array.isArray(data) && data.length
  //       ? data.map(normalizeKline).filter((candle) => Number.isFinite(candle.time))
  //       : generateMockCandles(state.timeframe);
  //     dispatch({ type: 'candles', candles });
  //     setLoadStatus('live');
  //   } catch {
  //     dispatch({ type: 'candles', candles: generateMockCandles(state.timeframe) });
  //     setLoadStatus('mock');
  //   }
  // }, [state.sessionDate, state.symbol, state.timeframe]);

const loadMarketData = useCallback(async () => {
  setLoadStatus('loading');

  try {
        const startDate = new Date("2023-01-10");

        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 3);

        const start = startDate.toISOString().split("T")[0];
        const end = endDate.toISOString().split("T")[0];

        console.log(start, end);

    console.log("Requesting:", { start, end });

    const { data } = await api.get('/ohlcv', {
      params: {
        symbol: state.symbol,
        start,
        end,
      },
    });

    console.log("🔥 Backend Response:", data);

    const candles = data.data.map((item) => ({
      time: new Date(item.timestamp).getTime() / 1000,
      open: Number(item.open),
      high: Number(item.high),
      low: Number(item.low),
      close: Number(item.close),
      volume: Number(item.volume),
    }));

    dispatch({ type: 'candles', candles });
    setLoadStatus('live');

  } catch (err) {
    console.log("❌ Error:", err);

    dispatch({
      type: 'candles',
      candles: generateMockCandles(state.timeframe),
    });

    setLoadStatus('mock');
  }
}, [state.symbol, state.sessionDate]);



  useEffect(() => {
    loadMarketData();
  }, [loadMarketData]);

  const step = useCallback((direction = 1) => {
    dispatch({ type: 'step', direction });
  }, []);

  useBacktestReplay({
    isPlaying: state.isPlaying,
    playbackSpeed: state.playbackSpeed,
    onStep: step,
  });

  const setField = useCallback((field, value) => {
    dispatch({ type: 'patch', patch: { [field]: value } });
  }, []);

  const placeOrder = useCallback((order) => {
    dispatch({ type: 'placeOrder', order });
  }, []);

  const closePosition = useCallback((positionId) => {
    dispatch({ type: 'closePosition', positionId });
  }, []);

  const saveTradeToJournal = useCallback(async (trade) => {
    const journalTrade = mapBacktestTradeToJournalTrade(trade, state.symbol);
    if (!trade.exitPrice || trade.status !== 'closed') {
      dispatch({ type: 'journalDraft', trade: journalTrade });
      setJournalStatus('Saved as local journal draft until the trade is closed.');
      return;
    }

    try {
      const { data } = await api.post('/save-trade', journalTrade);
      if (!data?.success) throw new Error(data?.error || 'Save failed');
      await queryClient.invalidateQueries({ queryKey: ['trades', user?.ID] });
      setJournalStatus('Backtest trade saved to journal.');
    } catch {
      dispatch({ type: 'journalDraft', trade: journalTrade });
      setJournalStatus('Journal API was unavailable, so this was kept as a local draft.');
    }
  }, [queryClient, state.symbol, user?.ID]);

  const stats = useMemo(() => getBacktestStats(state), [state]);

  return {
    state: {
      ...state,
      entryPrice: round(state.entryPrice || currentCandle?.close || 0, 5),
      positionSize,
    },
    currentCandle,
    stats,
    loadStatus,
    journalStatus,
    setField,
    step,
    placeOrder,
    closePosition,
    saveTradeToJournal,
    reloadCandles: loadMarketData,
  };
}
