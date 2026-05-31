import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { getVisibleCandles } from '../engine/candleReplay';
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

function formatTime(value) {
  if (!value) return '-';
  return new Date(Number(value) * 1000).toLocaleString();
}

const TIMEFRAMES = ['1m', '5m', '15m', '30m', '1h', '4h', '1D'];

function BacktestChart({
  candles,
  currentIndex,
  strictReplay,
  currentCandle,
  entryPrice,
  stopLoss,
  takeProfit,
  openPositions,
  closedPositions,
  timeframe,
  onTimeframeChange,
}) {
  const containerRef = useRef(null);
  const instanceRef = useRef(null);
  const { darkMode } = useTheme();
  const [crosshair, setCrosshair] = useState({ price: null, time: null });

  const visibleCandles = useMemo(
    () => getVisibleCandles(candles, currentIndex, strictReplay),
    [candles, currentIndex, strictReplay]
  );

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
    return () => {
      instance.chart.unsubscribeCrosshairMove(handleCrosshair);
      destroyChart(instance);
      instanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    applyTheme(instanceRef.current);
    window.setTimeout(() => {
      drawRiskRewardBox(instanceRef.current, { entryPrice, stopLoss, takeProfit });
    }, 0);
  }, [darkMode, entryPrice, stopLoss, takeProfit]);

  useEffect(() => {
    const instance = instanceRef.current;
    if (!instance) return;
    setCandles(instance, visibleCandles);
    if (visibleCandles.length > 5) {
      instance.chart.timeScale().fitContent();
      instance.chart.timeScale().applyOptions({ rightOffset: RIGHT_EMPTY_BARS });
    }
    window.setTimeout(() => {
      drawRiskRewardBox(instance, { entryPrice, stopLoss, takeProfit });
    }, 0);
  }, [entryPrice, stopLoss, takeProfit, visibleCandles]);

  useEffect(() => {
    const instance = instanceRef.current;
    if (!instance) return;
    drawEntryLine(instance, entryPrice);
    drawStopLossLine(instance, stopLoss);
    drawTargetLine(instance, takeProfit);
    drawRiskRewardBox(instance, { entryPrice, stopLoss, takeProfit });
  }, [entryPrice, stopLoss, takeProfit]);

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
      </div>

      <div className="backtest-chart-canvas" ref={containerRef} />
    </section>
  );
}

export default BacktestChart;
