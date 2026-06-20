import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import api from '../../../utils/serve';
import { useAuth } from '../../../context/AuthContext';
import {
  DEFAULT_OHLCV_CHUNK_LIMIT,
  backtestSessionKey,
  fetchOhlcvChunk,
  mergeCandles,
} from '../data/ohlcvChunks';
import {
  INITIAL_BACKTEST_STATE,
  closePositionById,
  getBacktestStats,
  loadCandles,
  mapBacktestTradeToJournalTrade,
  placeMarketOrder,
  resumeBacktestSessionState,
  startBacktestSessionState,
  stepReplay,
} from '../engine/backtestEngine';
import { getCurrentCandle } from '../engine/candleReplay';
import {
  calculatePositionSize,
  round,
} from '../engine/riskCalculator';
import { useBacktestReplay } from './useBacktestReplay';

function reducer(state, action) {
  switch (action.type) {
    case 'patch':
      return { ...state, ...action.patch };
    case 'candles':
      return loadCandles(state, action.candles);
    case 'startSession':
      return startBacktestSessionState(state, action.session, action.candles);
    case 'resumeSession':
      return resumeBacktestSessionState(state, action.session, action.candles);
    case 'mergeCandles': {
      const currentSessionKey = backtestSessionKey({
        symbol: state.symbol,
        timeframe: state.timeframe,
        sessionStartTime: state.sessionStartTime,
        sessionEndTime: state.sessionEndTime,
      });

      if (action.sessionKey && action.sessionKey !== currentSessionKey) {
        return state;
      }

      const currentTime = getCurrentCandle(state.candles, state.currentIndex)?.time;
      const nextCandles = mergeCandles(state.candles, action.candles);
      const nextIndex = currentTime
        ? Math.max(nextCandles.findIndex((candle) => candle.time === currentTime), 0)
        : state.currentIndex;
      return loadCandles({ ...state, currentIndex: nextIndex }, nextCandles);
    }
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

export function useBacktestSession() {
  const [state, dispatch] = useReducer(reducer, INITIAL_BACKTEST_STATE);
  const [hasSession, setHasSession] = useState(false);
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

  const startSession = useCallback(async (sessionInput) => {
    setLoadStatus('loading');

    try {
      const startTime = new Date(sessionInput.startTime).toISOString();
      const endTime = new Date(sessionInput.endTime).toISOString();
      const { candles } = await fetchOhlcvChunk(queryClient, {
        symbol: sessionInput.symbol,
        timeframe: sessionInput.timeframe,
        cursor: startTime,
        direction: 'past',
        limit: DEFAULT_OHLCV_CHUNK_LIMIT,
      });

      if (!candles.length) {
        throw new Error('No candles returned before the selected start time');
      }

      const normalizedSession = {
        ...sessionInput,
        sessionId: sessionInput.sessionId || sessionInput.id || `bt-${Date.now()}`,
        startTime,
        endTime,
      };

      dispatch({
        type: 'startSession',
        session: normalizedSession,
        candles,
      });
      setHasSession(true);
      setLoadStatus('live');
      return normalizedSession;
    } catch (err) {
      console.warn('ohlcv.session_start_failed', err);
      setLoadStatus('idle');
      throw err;
    }
  }, [queryClient]);

  const resumeSession = useCallback(async (sessionInput) => {
    setLoadStatus('loading');

    try {
      const startTime = new Date(sessionInput.startTime || sessionInput.sessionStartTime).toISOString();
      const endTime = new Date(sessionInput.endTime || sessionInput.sessionEndTime).toISOString();
      const currentTime = Number(sessionInput.currentTime || 0);
      const cursor = currentTime > 0 ? new Date(currentTime * 1000).toISOString() : startTime;
      const { candles } = await fetchOhlcvChunk(queryClient, {
        symbol: sessionInput.symbol,
        timeframe: sessionInput.timeframe || '1m',
        cursor,
        direction: 'past',
        limit: DEFAULT_OHLCV_CHUNK_LIMIT,
      });

      if (!candles.length) {
        throw new Error('No candles returned for the selected saved session');
      }

      dispatch({
        type: 'resumeSession',
        session: {
          ...sessionInput,
          sessionId: sessionInput.sessionId || sessionInput.id,
          startTime,
          endTime,
        },
        candles,
      });
      setHasSession(true);
      setLoadStatus('live');
    } catch (err) {
      console.warn('ohlcv.session_resume_failed', err);
      setLoadStatus('idle');
      throw err;
    }
  }, [queryClient]);

  const reloadCandles = useCallback(() => {
    if (!state.sessionStartTime || !state.sessionEndTime) return Promise.resolve();
    return startSession({
      sessionName: state.sessionName,
      symbol: state.symbol,
      timeframe: state.timeframe,
      startTime: state.sessionStartTime,
      endTime: state.sessionEndTime,
      initialBalance: state.initialBalance,
    });
  }, [
    startSession,
    state.initialBalance,
    state.sessionEndTime,
    state.sessionName,
    state.sessionStartTime,
    state.symbol,
    state.timeframe,
  ]);

  const changeTimeframe = useCallback((timeframe) => {
    if (!state.sessionStartTime || !state.sessionEndTime) {
      dispatch({ type: 'patch', patch: { timeframe } });
      return Promise.resolve();
    }

    return startSession({
      sessionName: state.sessionName,
      symbol: state.symbol,
      timeframe,
      startTime: state.sessionStartTime,
      endTime: state.sessionEndTime,
      initialBalance: state.initialBalance,
    });
  }, [
    startSession,
    state.initialBalance,
    state.sessionEndTime,
    state.sessionName,
    state.sessionStartTime,
    state.symbol,
  ]);

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

  const mergeLoadedCandles = useCallback((candles, metadata = {}) => {
    if (!Array.isArray(candles) || candles.length === 0) return;
    dispatch({
      type: 'mergeCandles',
      candles,
      sessionKey: metadata.sessionKey,
    });
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
    hasSession,
    journalStatus,
    setField,
    step,
    placeOrder,
    closePosition,
    saveTradeToJournal,
    startSession,
    resumeSession,
    reloadCandles,
    changeTimeframe,
    mergeLoadedCandles,
  };
}
