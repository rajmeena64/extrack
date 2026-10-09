import { useCallback, useEffect, useRef, useState } from "react";

export function useChartReplayEngine({
  chartDataRef,
  candleSeriesRef,
  chartApiRef,
  onReplayChange,
  onTick,
  onResetFullChart,
}) {
  const replayTimerRef = useRef(null);
  const replayFinishTimerRef = useRef(null);
  const replayActiveRef = useRef(false);
  const replayStateRef = useRef(null);

  const [isReplaying, setIsReplaying] = useState(false);
  const [isReplayPlaying, setIsReplayPlaying] = useState(false);
  const [replaySpeed, setReplaySpeed] = useState(1);

  const stopReplay = useCallback(() => {
    window.clearInterval(replayTimerRef.current);
    window.clearTimeout(replayFinishTimerRef.current);
    replayTimerRef.current = null;
    replayFinishTimerRef.current = null;
    replayActiveRef.current = false;
    replayStateRef.current = null;
    setIsReplaying(false);
    setIsReplayPlaying(false);
    onReplayChange?.({ active: false, candle: null });
    onResetFullChart?.();
  }, [onReplayChange, onResetFullChart]);

  const startReplay = useCallback(
    ({ startIndex, endIndex, customData }) => {
      const candles = customData || chartDataRef.current;
      const candleSeries = candleSeriesRef.current;
      const chartApi = chartApiRef.current;
      if (!candleSeries || !chartApi || !candles || candles.length === 0) return;

      const safeStartIndex = Math.max(0, Math.min(candles.length - 1, startIndex ?? 0));
      const safeEndIndex = Math.max(safeStartIndex, Math.min(candles.length - 1, endIndex ?? candles.length - 1));
      const visibleRange = chartApi.timeScale().getVisibleLogicalRange();
      const visibleBars = Math.max(100, visibleRange ? visibleRange.to - visibleRange.from : 100);

      replayActiveRef.current = true;
      replayStateRef.current = {
        candles,
        cursor: safeStartIndex,
        endIndex: safeEndIndex,
      };

      setIsReplaying(true);
      setIsReplayPlaying(false);
      candleSeries.setData(candles.slice(0, safeStartIndex + 1));

      const activeCandle = candles[safeStartIndex] || null;
      onReplayChange?.({ active: true, candle: activeCandle });
      onTick?.(activeCandle, safeStartIndex);

      chartApi.timeScale().setVisibleLogicalRange({
        from: Math.max(0, safeStartIndex - visibleBars * 0.8),
        to: safeStartIndex + visibleBars * 0.2,
      });
    },
    [candleSeriesRef, chartApiRef, chartDataRef, onReplayChange, onTick]
  );

  const step = useCallback(
    (direction = 1) => {
      const replay = replayStateRef.current;
      const candleSeries = candleSeriesRef.current;
      if (!replayActiveRef.current || !replay || !candleSeries) return;

      const nextCursor = Math.max(0, Math.min(replay.endIndex, replay.cursor + direction));
      if (nextCursor === replay.cursor && direction > 0) {
        setIsReplayPlaying(false);
        replayFinishTimerRef.current = window.setTimeout(stopReplay, 500);
        return;
      }
      if (nextCursor === replay.cursor) return;

      replay.cursor = nextCursor;
      const currentCandle = replay.candles[nextCursor];

      if (direction < 0) {
        candleSeries.setData(replay.candles.slice(0, nextCursor + 1));
      } else {
        candleSeries.update(currentCandle);
      }

      onReplayChange?.({ active: true, candle: currentCandle || null });
      onTick?.(currentCandle, nextCursor);

      if (nextCursor >= replay.endIndex) {
        setIsReplayPlaying(false);
        replayFinishTimerRef.current = window.setTimeout(stopReplay, 500);
      }
    },
    [candleSeriesRef, onReplayChange, onTick, stopReplay]
  );

  useEffect(() => {
    if (!isReplaying || !isReplayPlaying) return undefined;
    const intervalMs = Math.max(1200 / Number(replaySpeed || 1), 100);
    replayTimerRef.current = window.setInterval(() => step(1), intervalMs);
    return () => window.clearInterval(replayTimerRef.current);
  }, [isReplayPlaying, isReplaying, replaySpeed, step]);

  const togglePlay = useCallback(() => {
    setIsReplayPlaying((prev) => !prev);
  }, []);

  return {
    isReplaying,
    isReplayPlaying,
    replaySpeed,
    replayActiveRef,
    startReplay,
    stopReplay,
    togglePlay,
    stepForward: () => step(1),
    stepBackward: () => step(-1),
    setSpeed: setReplaySpeed,
  };
}
