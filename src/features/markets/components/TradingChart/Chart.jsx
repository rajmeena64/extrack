import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import BacktestPlaybackControls from "@/features/markets/components/Backtesting/components/BacktestPlaybackControls";
import {
  DEFAULT_LAYOUTS,
  TradingChartFooter,
  TradingChartHeader,
  TradingChartLegend,
} from "./TradingChartChrome";
import { normalizeStoredSymbol } from "@/utils/trading/symbols";
import { readDraggedSymbol } from "@/features/markets/components/MarketTerminal/utils/terminalHelpers";
import { getDatabaseInstrumentDigits } from "@/features/markets/components/MarketTerminal/utils/instrumentDigits";

import { useChartInstance } from "./engine/useChartInstance";
import { useChartDataEngine } from "./engine/useChartDataEngine";
import { useChartReplayEngine } from "./engine/useChartReplayEngine";
import { useChartOverlays } from "./engine/useChartOverlays";
import { useChartDrawing } from "./drawing/useChartDrawing";
import TradingChartToolbar from "./drawing/TradingChartToolbar";
import { DrawingActionBar } from "./drawing/DrawingActionBar";
import { useCrosshair } from "./crosshair";
import { createDefaultDatafeed } from "./datafeeds/defaultDatafeed";
import {
  INTERVAL_MS,
  TIMEFRAMES,
} from "./utils/chartHelpers";

function Chart({
  chart,
  datafeed: customDatafeed,
  darkMode,
  symbol: directSymbol,
  timeframe: directTimeframe,
  interval: directInterval,
  active = false,
  compact = false,
  fitNonce,
  pageActive = true,
  availableSymbols = [],
  prioritySymbols = [],
  initialQuote,
  alerts = [],
  onAddAlert,
  onUpdateAlertPrice,
  onDeleteAlert,
  layout = "1",
  layouts = DEFAULT_LAYOUTS,
  onLayoutChange,
  onSymbolChange,
  onIntervalChange,
  onTimeframeChange,
  onDropSymbol,
  onActivate,
  onQuote,
  live = true,
  priceDigits,
  markers = [],
  lines = [],
  trades = [],
  uniqueId,
  anchorTime: customAnchorTime,
  onCandleData,
  onQuoteChange,
  onReplayChange,
  onReplayTick,
  className = "",
}) {
  const queryClient = useQueryClient();

  const targetSymbol = chart?.symbol || directSymbol || "EURUSD";
  const targetTimeframe = chart?.interval || directInterval || directTimeframe || "15minutes";

  const normalizedSymbol = useMemo(
    () => normalizeStoredSymbol(targetSymbol) || targetSymbol || "EURUSD",
    [targetSymbol]
  );

  const [tf, setTf] = useState(() => targetTimeframe);
  const [isDragTarget, setIsDragTarget] = useState(false);
  const [resolvedDigits, setResolvedDigits] = useState(() => {
    const num = Number(priceDigits);
    return Number.isInteger(num) && num >= 0 && num <= 8 ? num : null;
  });

  useEffect(() => {
    if (targetTimeframe) setTf(targetTimeframe);
  }, [targetTimeframe]);

  useEffect(() => {
    if (!chartApiRef.current) return;
    const isIntraday = !/(day|week|month)/i.test(String(tf || ''));
    try {
      chartApiRef.current.timeScale()?.applyOptions({ timeVisible: isIntraday });
    } catch {}
  }, [tf]);

  useEffect(() => {
    const num = Number(priceDigits);
    if (Number.isInteger(num) && num >= 0 && num <= 8) {
      setResolvedDigits(num);
      return;
    }
    let cancelled = false;
    getDatabaseInstrumentDigits(normalizedSymbol).then((digits) => {
      if (!cancelled && Number.isInteger(digits) && digits >= 0 && digits <= 8) {
        setResolvedDigits(digits);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [normalizedSymbol, priceDigits]);

  const chartPricePrecision = resolvedDigits;

  const datafeed = useMemo(() => {
    if (customDatafeed) return customDatafeed;
    return createDefaultDatafeed({ queryClient, uniqueId });
  }, [customDatafeed, queryClient, uniqueId]);

  const anchorTime = useMemo(() => {
    if (customAnchorTime) return Number(customAnchorTime);
    if (Array.isArray(trades) && trades.length > 0) {
      const tradeTimes = trades
        .flatMap((t) => [t?.entryTime, t?.exitTime])
        .map((val) => {
          if (!val) return null;
          const num = Number(val);
          const ms = Number.isFinite(num) ? num : new Date(val).getTime();
          return Number.isFinite(ms) ? (ms > 1e12 ? Math.floor(ms / 1000) : Math.floor(ms)) : null;
        })
        .filter(Boolean);

      if (tradeTimes.length > 0) return Math.min(...tradeTimes);
    }
    return undefined;
  }, [customAnchorTime, trades]);

  const {
    chartRef,
    chartShellRef,
    chartApiRef,
    candleSeriesRef,
    tradeMarkerPrimitiveRef,
    isChartReady,
    isFullscreen,
    latestCandle,
    setLatestCandle,
    cssVariables,
    toggleFullscreen,
    saveSnapshot,
  } = useChartInstance({
    darkMode,
    pricePrecision: chartPricePrecision,
    symbol: normalizedSymbol,
  });

  const { updateOverlays, clearOverlays } = useChartOverlays({
    chartApiRef,
    candleSeriesRef,
    markerPrimitiveRef: tradeMarkerPrimitiveRef,
    pricePrecision: chartPricePrecision,
  });
  const { crosshairMode, setCrosshairMode } = useCrosshair({ chartApiRef, chartRef });

  const {
    isReplaying,
    isReplayPlaying,
    replaySpeed,
    replayActiveRef,
    startReplay,
    stopReplay,
    togglePlay,
    stepForward,
    stepBackward,
    setSpeed,
  } = useChartReplayEngine({
    chartDataRef: { current: [] },
    candleSeriesRef,
    chartApiRef,
    onReplayChange: (state) => {
      if (state.candle) {
        setLatestCandle(state.candle);
        if (state.active) {
          updateOverlays({
            markers,
            lines,
            trades,
            alerts,
            symbol: normalizedSymbol,
            candles: chartDataRef.current,
            timeframe: tf,
            maxTime: state.candle.time,
          });
        }
      }
      onReplayChange?.(state);
    },
    onTick: (candle, cursorIndex) => {
      onReplayTick?.(candle, cursorIndex);
    },
    onResetFullChart: () => {
      if (chartDataRef.current.length > 0) {
        candleSeriesRef.current?.setData(chartDataRef.current);
        setLatestCandle(chartDataRef.current.at(-1) || null);
        updateOverlays({
          markers,
          lines,
          trades,
          alerts,
          symbol: normalizedSymbol,
          candles: chartDataRef.current,
          timeframe: tf,
        });
      }
    },
  });

  const isLiveEnabled = live && !isReplaying && (!trades || trades.length === 0);

  const { chartDataRef, loading, error, liveQuote } = useChartDataEngine({
    datafeed,
    symbol: normalizedSymbol,
    timeframe: tf,
    anchorTime,
    chartApi: chartApiRef.current,
    candleSeries: candleSeriesRef.current,
    chartReady: isChartReady,
    enableLiveStream: isLiveEnabled,
    isReplayActive: isReplaying,
    priceDigits: chartPricePrecision,
    onCandleData: (candles) => {
      setLatestCandle(candles.at(-1) || null);
      onCandleData?.(candles);
      if (!replayActiveRef.current) {
        updateOverlays({
          markers,
          lines,
          trades,
          alerts,
          symbol: normalizedSymbol,
          candles,
          timeframe: tf,
        });
      }
    },
    onTick: (candle) => {
      if (!replayActiveRef.current && candle) {
        setLatestCandle(candle);
      }
    },
    onLiveQuote: (quote) => {
      onQuoteChange?.(quote);
      onQuote?.(quote?.symbolName || normalizedSymbol, quote);
    },
  });

  const {
    activeTool,
    setActiveTool,
    clearAll,
    undo,
    drawingsCount,
    selectedDrawing,
    selectedPosition,
    updateSelectedStyle,
    deleteSelected,
  } = useChartDrawing({
    chartApiRef,
    candleSeriesRef,
    symbol: normalizedSymbol,
    chartDataRef,
    timeframe: tf,
  });

  useEffect(() => {
    if (!replayActiveRef.current && chartDataRef.current.length > 0) {
      updateOverlays({
        markers,
        lines,
        trades,
        alerts,
        symbol: normalizedSymbol,
        candles: chartDataRef.current,
        timeframe: tf,
      });
    }
  }, [alerts, markers, lines, trades, normalizedSymbol, tf, updateOverlays]);

  const goToActiveTrade = useCallback(() => {
    const chartApi = chartApiRef.current;
    const candles = chartDataRef.current;
    if (!chartApi || !candles || candles.length === 0) return;

    const targetTimes = [
      ...(Array.isArray(trades)
        ? trades.flatMap((t) => [t?.entryTime, t?.exitTime])
        : []),
      ...(anchorTime ? [anchorTime] : []),
    ]
      .map((v) => {
        if (!v) return null;
        const num = Number(v);
        return Number.isFinite(num) ? (num > 1e12 ? Math.floor(num / 1000) : Math.floor(num)) : null;
      })
      .filter(Boolean);

    if (targetTimes.length > 0) {
      const minTime = Math.min(...targetTimes);
      const maxTime = Math.max(...targetTimes);

      const startIdx = candles.findIndex((c) => c.time >= minTime);
      const resolvedStartIdx = startIdx >= 0 ? startIdx : 0;

      let endIdx = candles.findIndex((c) => c.time >= maxTime);
      if (endIdx < 0) endIdx = candles.length - 1;

      const centerIdx = Math.floor((resolvedStartIdx + endIdx) / 2);
      const spanBars = Math.max(endIdx - resolvedStartIdx + 30, 60);

      try {
        chartApi.priceScale('right')?.applyOptions({ autoScale: true });
        chartApi.timeScale().setVisibleLogicalRange({
          from: Math.max(0, centerIdx - Math.floor(spanBars / 2)),
          to: Math.min(candles.length + 10, centerIdx + Math.ceil(spanBars / 2)),
        });
      } catch {
      }
    }
  }, [anchorTime, chartApiRef, trades]);

  const lastFitNonceRef = useRef(fitNonce);
  useEffect(() => {
    if (fitNonce && fitNonce !== lastFitNonceRef.current && chartApiRef.current) {
      lastFitNonceRef.current = fitNonce;
      try {
        chartApiRef.current.priceScale('right')?.applyOptions({ autoScale: true });
        if (anchorTime || (Array.isArray(trades) && trades.length > 0)) {
          goToActiveTrade();
        } else {
          const candles = chartDataRef.current;
          if (candles && candles.length > 0) {
            const total = candles.length;
            const visibleSpan = 90;
            chartApiRef.current.timeScale().setVisibleLogicalRange({
              from: Math.max(0, total - visibleSpan),
              to: total + 6,
            });
          }
        }
      } catch {
      }
    }
  }, [anchorTime, fitNonce, goToActiveTrade, trades]);

  const handleToggleReplay = useCallback(() => {
    if (isReplaying) {
      stopReplay();
      return;
    }
    const candles = chartDataRef.current;
    if (!candles || candles.length === 0) return;

    clearOverlays();
    const entryTime = anchorTime || (Array.isArray(trades) && trades[0]?.entryTime ? Number(trades[0].entryTime) : null);
    const entryIdx = entryTime ? candles.findIndex((c) => c.time >= entryTime) : -1;
    const startIndex = entryIdx >= 0 ? Math.max(0, entryIdx - 10) : Math.max(0, candles.length - 50);
    startReplay({ startIndex, customData: candles });
  }, [anchorTime, clearOverlays, isReplaying, startReplay, stopReplay, trades]);

  const fitContent = useCallback(() => {
    if (chartApiRef.current) {
      try {
        chartApiRef.current.priceScale('right')?.applyOptions({ autoScale: true });
        if (anchorTime || (Array.isArray(trades) && trades.length > 0)) {
          goToActiveTrade();
        } else {
          chartApiRef.current.timeScale().fitContent();
        }
      } catch {
      }
    }
  }, [anchorTime, chartApiRef, goToActiveTrade, trades]);

  const handleTimeframeChange = useCallback(
    (newTf) => {
      setTf(newTf);
      onIntervalChange?.(newTf);
      onTimeframeChange?.(newTf);
    },
    [onIntervalChange, onTimeframeChange]
  );

  const handleSelectSymbol = useCallback(
    (newSym) => {
      onSymbolChange?.(newSym);
    },
    [onSymbolChange]
  );

  const handleDragOver = useCallback((event) => {
    if (!readDraggedSymbol(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setIsDragTarget(true);
  }, []);

  const handleDragLeave = useCallback((event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsDragTarget(false);
    }
  }, []);

  const handleDrop = useCallback(
    (event) => {
      setIsDragTarget(false);
      const droppedSymbol = readDraggedSymbol(event);
      if (droppedSymbol) {
        event.preventDefault();
        onDropSymbol?.(droppedSymbol);
        onSymbolChange?.(droppedSymbol);
      }
    },
    [onDropSymbol, onSymbolChange]
  );

  return (
    <div
      className={`relative w-full h-full flex flex-col gap-1.5 bg-transparent overflow-hidden transition-all select-none ${
        isDragTarget ? "ring-2 ring-inset ring-[var(--primary,#2563eb)] opacity-90" : ""
      } ${isFullscreen ? "fixed inset-0 z-[9999] bg-[var(--bg-card,#131722)]" : ""} ${className}`}
      ref={chartShellRef}
      onClick={() => onActivate?.()}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        "--chart-loader-up": cssVariables?.pnlPositive || "#16a34a",
        "--chart-loader-down": cssVariables?.pnlNegative || "#b91c1c",
      }}
    >
      <TradingChartHeader
        title={targetSymbol}
        activeSymbol={targetSymbol}
        timeframe={tf}
        timeframes={TIMEFRAMES}
        onTimeframeChange={handleTimeframeChange}
        availableSymbols={availableSymbols}
        onSelectSymbol={handleSelectSymbol}
        layout={layout}
        layouts={layouts}
        onLayoutChange={onLayoutChange}
        candle={latestCandle}
        quote={liveQuote || initialQuote}
        priceDigits={chartPricePrecision}
        replayActive={isReplaying}
        replayDisabled={loading || chartDataRef.current.length === 0}
        onReplay={trades?.length > 0 ? handleToggleReplay : undefined}
        onFullscreen={toggleFullscreen}
        onSnapshot={() => saveSnapshot(tf)}
        isFullscreen={isFullscreen}
      />

      {error && !loading && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-3.5 z-10 bg-[var(--bg-card,#ffffff)] p-6 rounded-xl border border-[var(--loss-color,#ef4444)] shadow-sm min-w-[250px] text-center text-sm text-[var(--loss-color,#ef4444)]">
          <span>{error}</span>
        </div>
      )}

      <div className="relative w-full flex-1 min-h-0 flex flex-row gap-1.5 overflow-hidden">
        <TradingChartToolbar
          activeTool={activeTool}
          onSelectTool={setActiveTool}
          crosshairMode={crosshairMode}
          onSelectCrosshairMode={setCrosshairMode}
          onUndo={undo}
          onClearAll={clearAll}
          drawingsCount={drawingsCount}
        />
        <div className="relative flex-1 min-h-0 h-full flex flex-col rounded-md bg-[var(--bg-card,#ffffff)] dark:bg-[var(--bg-card,#131722)] overflow-hidden">
          <div className="relative flex-1 min-h-0 w-full overflow-hidden">
            <DrawingActionBar
              selectedDrawing={selectedDrawing}
              position={selectedPosition}
              onUpdateStyle={updateSelectedStyle}
              onDelete={deleteSelected}
            />
            <TradingChartLegend
              symbolTitle={targetSymbol}
              timeframe={tf}
              candle={latestCandle}
              quote={liveQuote || initialQuote}
              priceDigits={chartPricePrecision}
            />
            {loading && (
              <div
                className="absolute top-0 left-0 right-0 z-20 h-0.5 bg-gradient-to-r from-transparent via-[var(--primary,#2563eb)] to-transparent animate-pulse pointer-events-none"
                role="status"
                aria-label="Loading chart data"
              />
            )}
            <div className="w-full h-full min-h-0" ref={chartRef} />
          </div>
          {isReplaying && (
            <BacktestPlaybackControls
              isPlaying={isReplayPlaying}
              speed={replaySpeed}
              onTogglePlay={togglePlay}
              onStep={stepForward}
              onSpeedChange={setSpeed}
            />
          )}
          <TradingChartFooter
            chartApi={chartApiRef.current}
            timeframe={tf}
            timeframes={TIMEFRAMES}
            onTimeframeChange={handleTimeframeChange}
            onFit={fitContent}
            onGoToTrade={trades?.length > 0 ? goToActiveTrade : undefined}
          />
        </div>
      </div>
    </div>
  );
}

export default Chart;
