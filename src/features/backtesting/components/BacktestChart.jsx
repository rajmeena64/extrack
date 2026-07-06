import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../../context/ThemeContext';
import { getVisibleCandles } from '../engine/candleReplay';
import {
  DEFAULT_OHLCV_CHUNK_LIMIT,
  backtestSessionKey,
  candleCursor,
  fetchOhlcvChunk,
  mergeCandles,
  ohlcvChunkQueryKey,
} from '../data/ohlcvChunks';
import BacktestPlaybackControls from './BacktestPlaybackControls';
import {
  applyTheme,
  createChartInstance,
  destroyChart,
  drawEntryLine,
  drawRiskRewardBox,
  drawStopLossLine,
  drawTargetLine,
  RIGHT_EMPTY_BARS,
  setCandles,
  setMarkers,
} from '../engine/chartAdapter';

function formatPrice(value) {
  return Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 5 });
}

function _formatTime(value) {
  if (!value) return '-';
  return new Date(Number(value) * 1000).toLocaleString();
}

const TIMEFRAMES = ['1m', '5m', '15m', '30m', '1h', '4h', '1D'];

function getActivePositionLines(openPositions = []) {
  const position = openPositions.length ? openPositions[openPositions.length - 1] : null;
  return {
    entryPrice: position?.entryPrice || 0,
    stopLoss: position?.stopLoss || 0,
    takeProfit: position?.takeProfit || 0,
  };
}

function drawPositionLines(instance, lines) {
  drawEntryLine(instance, lines.entryPrice);
  drawStopLossLine(instance, lines.stopLoss);
  drawTargetLine(instance, lines.takeProfit);
  drawRiskRewardBox(instance, lines);
}

function BacktestChart({
  candles,
  symbol,
  sessionDate,
  sessionStartTime,
  sessionEndTime,
  currentIndex,
  strictReplay,
  currentCandle,
  openPositions,
  closedPositions,
  timeframe,
  selectedOrderSide,
  marketPrice,
  isLoading = false,
  chunkLimit = DEFAULT_OHLCV_CHUNK_LIMIT,
  onCandlesLoaded,
  onTimeframeChange,
  onSideChange,
  onOpenOrderPanel,
  onClosePosition,
  // Playback props
  isPlaying,
  playbackSpeed,
  onTogglePlay,
  onStep,
  onSpeedChange,
}) {
  const containerRef = useRef(null);
  const instanceRef = useRef(null);
  const chartDataRef = useRef([]);
  const loadedChunkKeysRef = useRef(new Set());
  const isLoadingPastRef = useRef(false);
  const isLoadingFutureRef = useRef(false);
  const lastRangeCheckRef = useRef(0);
  const loadMoreRef = useRef(null);
  const resetKeyRef = useRef('');
  const hasFitInitialContentRef = useRef(false);
  const { darkMode } = useTheme();
  const queryClient = useQueryClient();
  const [_crosshair, setCrosshair] = useState({ price: null, time: null });
  const [isLoadingPast, setIsLoadingPast] = useState(false);
  const activePositionLines = useMemo(
    () => getActivePositionLines(openPositions),
    [openPositions]
  );
  const activePosition = openPositions.length ? openPositions[openPositions.length - 1] : null;

  const getRenderableCandles = useCallback(() => (
    getVisibleCandles(chartDataRef.current, currentIndex, strictReplay)
  ), [currentIndex, strictReplay]);

  const applyChartData = useCallback(({ preserveRange = false, prependedCount = 0 } = {}) => {
    const instance = instanceRef.current;
    if (!instance) return;

    const oldRange = preserveRange
      ? instance.chart.timeScale().getVisibleLogicalRange()
      : null;
    const renderableCandles = getRenderableCandles();

    setCandles(instance, renderableCandles);

    if (!hasFitInitialContentRef.current && renderableCandles.length > 5) {
      instance.chart.timeScale().fitContent();
      instance.chart.timeScale().applyOptions({ rightOffset: RIGHT_EMPTY_BARS });
      hasFitInitialContentRef.current = true;
    }

    if (oldRange && prependedCount > 0) {
      instance.chart.timeScale().setVisibleLogicalRange({
        from: oldRange.from + prependedCount,
        to: oldRange.to + prependedCount,
      });
    }

    window.setTimeout(() => {
      drawPositionLines(instance, activePositionLines);
    }, 0);
  }, [activePositionLines, getRenderableCandles]);

  const loadChunk = useCallback(async (direction) => {
    const currentData = chartDataRef.current;
    if (!currentData.length) return;
    const requestSessionKey = resetKeyRef.current;

    const cursorCandle = direction === 'past'
      ? currentData[0]
      : currentData[currentData.length - 1];
    const cursor = candleCursor(cursorCandle);
    if (!cursor) return;

    const request = {
      symbol,
      timeframe,
      direction,
      cursor,
      limit: chunkLimit,
    };
    const cacheKey = JSON.stringify(ohlcvChunkQueryKey(request));
    const loadingRef = direction === 'past' ? isLoadingPastRef : isLoadingFutureRef;

    if (loadingRef.current || loadedChunkKeysRef.current.has(cacheKey)) {
      return;
    }

    loadingRef.current = true;
    if (direction === 'past') {
      setIsLoadingPast(true);
    }

    try {
      const oldLength = currentData.length;
      const oldFirstTime = currentData[0]?.time;
      const { candles: fetchedCandles } = await fetchOhlcvChunk(queryClient, request);
      loadedChunkKeysRef.current.add(cacheKey);

      if (resetKeyRef.current !== requestSessionKey) {
        return;
      }

      const maxTime = sessionEndTime ? new Date(sessionEndTime).getTime() / 1000 : Infinity;
      const chunkCandles = direction === 'future'
        ? fetchedCandles.filter((candle) => candle.time <= maxTime)
        : fetchedCandles;

      if (!chunkCandles.length) {
        return;
      }

      chartDataRef.current = mergeCandles(chartDataRef.current, chunkCandles);
      const prependedCount = direction === 'past'
        ? chartDataRef.current.filter((candle) => candle.time < oldFirstTime).length
        : 0;

      applyChartData({
        preserveRange: true,
        prependedCount: direction === 'past'
          ? prependedCount || Math.max(chartDataRef.current.length - oldLength, 0)
          : 0,
      });
      onCandlesLoaded?.(chunkCandles, { sessionKey: requestSessionKey });
    } catch (error) {
      console.warn(`ohlcv.${direction}_chunk_failed`, error);
    } finally {
      loadingRef.current = false;
      if (direction === 'past') {
        setIsLoadingPast(false);
      }
    }
  }, [applyChartData, chunkLimit, onCandlesLoaded, queryClient, sessionEndTime, symbol, timeframe]);

  useEffect(() => {
    loadMoreRef.current = loadChunk;
  }, [loadChunk]);

  useEffect(() => {
    if (!containerRef.current) return undefined;
    const instance = createChartInstance(containerRef.current);
    instanceRef.current = instance;

    const handleCrosshair = (param) => {
      const seriesData = param.seriesData?.get(instance.candleSeries);
      setCrosshair({
        price: seriesData?.close || param.point?.y || null,
        time: param.time || null,
      });
    };

    instance.chart.subscribeCrosshairMove(handleCrosshair);
    const handleVisibleRangeChange = (range) => {
      if (!range) return;

      const now = performance.now();
      if (now - lastRangeCheckRef.current < 120) return;
      lastRangeCheckRef.current = now;

      const totalCandles = chartDataRef.current.length;
      if (range.from < 80) {
        loadMoreRef.current?.('past');
      }
      if (totalCandles > 0 && totalCandles - range.to < 50) {
        loadMoreRef.current?.('future');
      }
    };

    instance.chart.timeScale().subscribeVisibleLogicalRangeChange(handleVisibleRangeChange);
    return () => {
      instance.chart.unsubscribeCrosshairMove(handleCrosshair);
      instance.chart.timeScale().unsubscribeVisibleLogicalRangeChange(handleVisibleRangeChange);
      destroyChart(instance);
      instanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const resetKey = backtestSessionKey({
      symbol,
      timeframe,
      sessionStartTime: sessionStartTime || sessionDate || '',
      sessionEndTime,
    });
    if (resetKeyRef.current !== resetKey) {
      resetKeyRef.current = resetKey;
      chartDataRef.current = [];
      loadedChunkKeysRef.current = new Set();
      isLoadingPastRef.current = false;
      isLoadingFutureRef.current = false;
      hasFitInitialContentRef.current = false;
    }

    chartDataRef.current = mergeCandles(chartDataRef.current, candles);
    applyChartData();
  }, [applyChartData, candles, sessionDate, sessionEndTime, sessionStartTime, symbol, timeframe]);

  useEffect(() => {
    applyChartData();
  }, [applyChartData, currentIndex, strictReplay]);

  useEffect(() => {
    applyTheme(instanceRef.current);
    window.setTimeout(() => {
      drawPositionLines(instanceRef.current, activePositionLines);
    }, 0);
  }, [activePositionLines, darkMode]);

  useEffect(() => {
    const instance = instanceRef.current;
    if (!instance) return;
    drawPositionLines(instance, activePositionLines);
  }, [activePositionLines]);

  useEffect(() => {
    setMarkers(instanceRef.current, openPositions, closedPositions);
  }, [closedPositions, openPositions]);

  return (
    <section className="backtest-chart-panel">
      <div className="backtest-chart-meta">
        <div className="backtest-chart-timeframes">
          {TIMEFRAMES.map((item) => (
            <button
              key={item}
              type="button"
              className={timeframe === item ? 'is-active' : ''}
              onClick={() => onTimeframeChange(item)}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="backtest-chart-price-info">
          <span>O</span><strong>{formatPrice(currentCandle?.open)}</strong>
          <span>H</span><strong>{formatPrice(currentCandle?.high)}</strong>
          <span>L</span><strong>{formatPrice(currentCandle?.low)}</strong>
          <span>C</span><strong>{formatPrice(currentCandle?.close)}</strong>
        </div>

        <div className="backtest-chart-trade-strip" aria-label="Quick trade side">
          <button
            type="button"
            className={selectedOrderSide === 'sell' ? 'is-sell is-active' : 'is-sell'}
            onClick={() => {
              onSideChange('sell');
              onOpenOrderPanel();
            }}
          >
            <span>Sell</span>
            <strong>{formatPrice(marketPrice)}</strong>
          </button>
          <button
            type="button"
            className={selectedOrderSide === 'buy' ? 'is-buy is-active' : 'is-buy'}
            onClick={() => {
              onSideChange('buy');
              onOpenOrderPanel();
            }}
          >
            <span>Buy</span>
            <strong>{formatPrice(marketPrice)}</strong>
          </button>
        </div>
      </div>

      <div className="backtest-chart-canvas" ref={containerRef}>
        {activePosition && (
          <div className="backtest-position-ticket">
            <span className={activePosition.side === 'buy' ? 'is-buy' : 'is-sell'}>
              {activePosition.side === 'buy' ? 'Buy' : 'Sell'}
            </span>
            {activePosition.takeProfit ? <span>TP {formatPrice(activePosition.takeProfit)}</span> : null}
            {activePosition.stopLoss ? <span>SL {formatPrice(activePosition.stopLoss)}</span> : null}
            <strong>{activePosition.quantity}</strong>
            <em className={(activePosition.unrealizedPnL || 0) >= 0 ? 'is-profit' : 'is-negative'}>
              {formatPrice(activePosition.unrealizedPnL || 0)}
            </em>
            <button type="button" onClick={() => onClosePosition?.(activePosition.id)} aria-label="Close position">
              x
            </button>
          </div>
        )}
        {(isLoading || isLoadingPast) && (
          <div className="backtest-chart-loading-pill" role="status" aria-live="polite">
            <span className="backtest-chart-loading-dot" aria-hidden="true" />
            {isLoadingPast ? 'Loading older candles' : 'Loading candles'}
          </div>
        )}
        <BacktestPlaybackControls
          isPlaying={isPlaying}
          speed={playbackSpeed}
          currentCandle={currentCandle}
          onTogglePlay={onTogglePlay}
          onStep={onStep}
          onSpeedChange={onSpeedChange}
        />
      </div>
    </section>
  );
}

export default BacktestChart;
