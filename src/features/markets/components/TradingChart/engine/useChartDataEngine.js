import { useCallback, useEffect, useRef, useState } from "react";
import { mergeCandles } from "@/features/markets/components/Backtesting/data/ohlcvChunks";
import { buildStreamCandle } from "@/features/markets/components/MarketTerminal/marketCandles";
import { chartTimeToSeconds, INTERVAL_MS, TF_MAP } from "../utils/chartHelpers";
import {
  INITIAL_FAST_BARS,
  INITIAL_CHUNK_BARS,
  SCROLL_CHUNK_BARS,
  EDGE_LOAD_THRESHOLD_BARS,
  hydrateBackgroundCandles,
  getCachedCandles,
  setCachedCandles,
} from "../optimizations";

export function useChartDataEngine({
  datafeed,
  symbol,
  timeframe = "1minute",
  anchorTime,
  chartApi,
  candleSeries,
  chartReady = true,
  enableLiveStream = true,
  isReplayActive = false,
  priceDigits = 2,
  onCandleData,
  onLiveQuote,
  onTick,
}) {
  const chartDataRef = useRef([]);
  const isLoadingPastRef = useRef(false);
  const isLoadingFutureRef = useRef(false);
  const noMorePastDataRef = useRef(false);
  const noMoreFutureDataRef = useRef(false);
  const loadMoreRef = useRef(null);
  const resetKeyRef = useRef("");
  const lastLogicalRangeCheckRef = useRef(0);
  const lastTimeRangeCheckRef = useRef(0);
  const timeframeRef = useRef(timeframe);
  const loadingTimerRef = useRef(null);

  const onCandleDataRef = useRef(onCandleData);
  const onLiveQuoteRef = useRef(onLiveQuote);
  const onTickRef = useRef(onTick);
  const datafeedRef = useRef(datafeed);
  const chartApiRef = useRef(chartApi);
  const candleSeriesRef = useRef(candleSeries);

  useEffect(() => {
    onCandleDataRef.current = onCandleData;
  }, [onCandleData]);

  useEffect(() => {
    onLiveQuoteRef.current = onLiveQuote;
  }, [onLiveQuote]);

  useEffect(() => {
    onTickRef.current = onTick;
  }, [onTick]);

  useEffect(() => {
    datafeedRef.current = datafeed;
  }, [datafeed]);

  useEffect(() => {
    chartApiRef.current = chartApi;
  }, [chartApi]);

  useEffect(() => {
    candleSeriesRef.current = candleSeries;
  }, [candleSeries]);

  useEffect(() => {
    timeframeRef.current = timeframe;
  }, [timeframe]);

  useEffect(() => {
    return () => {
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }
    };
  }, []);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [liveQuote, setLiveQuote] = useState(null);

  const applyCandles = useCallback(
    ({ preserveRange = false, prependedCount = 0 } = {}) => {
      const activeChartApi = chartApiRef.current;
      const activeSeries = candleSeriesRef.current;
      if (!activeChartApi || !activeSeries) return;

      try {
        const candles = chartDataRef.current;
        const oldRange = preserveRange ? activeChartApi.timeScale().getVisibleLogicalRange() : null;

        activeSeries.setData(candles);
        onCandleDataRef.current?.(candles);

        if (oldRange) {
          activeChartApi.timeScale().setVisibleLogicalRange({
            from: oldRange.from + prependedCount,
            to: oldRange.to + prependedCount,
          });
        }
      } catch {
      }
    },
    []
  );

  const loadChunk = useCallback(
    async (direction, requestedCountBack) => {
      const activeDatafeed = datafeedRef.current;
      if (isReplayActive || !activeDatafeed?.getBars) return false;
      const currentData = chartDataRef.current;
      if (!currentData.length) return false;

      if (direction === "past" && noMorePastDataRef.current) return false;
      if (direction === "future" && (noMoreFutureDataRef.current || !anchorTime)) return false;

      const loadingRef = direction === "past" ? isLoadingPastRef : isLoadingFutureRef;
      if (loadingRef.current) return false;
      loadingRef.current = true;

      const requestResetKey = resetKeyRef.current;
      const activeTf = timeframeRef.current;
      const intervalMs = INTERVAL_MS[activeTf] || INTERVAL_MS["1minute"];
      const intervalSec = intervalMs / 1000;
      const dynamicLimit = Number.isFinite(Number(requestedCountBack)) && Number(requestedCountBack) > 0
        ? Math.min(Math.floor(Number(requestedCountBack)), 1000)
        : 1000;

      try {
        const oldestTime = currentData[0].time;
        const newestTime = currentData[currentData.length - 1].time;

        let from, to;
        if (direction === "past") {
          to = (oldestTime - 1) * 1000;
          from = undefined; // TradingView Standard: use 'to' + dynamic 'countBack'
        } else {
          from = (newestTime + 1) * 1000;
          to = (newestTime + dynamicLimit * intervalSec) * 1000;
        }

        const result = await activeDatafeed.getBars({
          symbol,
          timeframe: TF_MAP[activeTf] || activeTf,
          from,
          to,
          countBack: dynamicLimit,
          firstDataRequest: false,
        });

        const newCandles = Array.isArray(result) ? result : result?.candles || [];
        const isNoData = Boolean(result?.noData) || newCandles.length === 0;

        if (isNoData) {
          if (direction === "past") noMorePastDataRef.current = true;
          if (direction === "future") noMoreFutureDataRef.current = true;
          return false;
        }

        if (resetKeyRef.current !== requestResetKey || isReplayActive) {
          return false;
        }

        const oldFirstTime = currentData[0]?.time;
        chartDataRef.current = mergeCandles(chartDataRef.current, newCandles);
        const prependedCount =
          direction === "past"
            ? chartDataRef.current.filter((c) => c.time < oldFirstTime).length
            : 0;

        applyCandles({ preserveRange: true, prependedCount });
        return true;
      } catch (err) {
        console.warn(`useChartDataEngine.${direction}_chunk_error`, err);
        return false;
      } finally {
        loadingRef.current = false;
      }
    },
    [anchorTime, applyCandles, isReplayActive, symbol]
  );

  useEffect(() => {
    loadMoreRef.current = loadChunk;
  }, [loadChunk]);

  useEffect(() => {
    if (!chartApi) return;

    const handleVisibleLogicalRangeChange = (range) => {
      if (!range) return;
      const now = performance.now();
      if (now - lastLogicalRangeCheckRef.current < 50) return;
      lastLogicalRangeCheckRef.current = now;

      const totalCandles = chartDataRef.current.length;
      if (totalCandles === 0) return;

      const visibleBars = Math.ceil(range.to - range.from);
      const dynamicCountBack = Math.max(3000, Math.min(5000, Math.ceil(visibleBars * 4)));

      if (range.from < 2500) {
        loadMoreRef.current?.("past", dynamicCountBack);
      }
      if (anchorTime && totalCandles - range.to < 2500) {
        loadMoreRef.current?.("future", dynamicCountBack);
      }
    };

    chartApi.timeScale().subscribeVisibleLogicalRangeChange(handleVisibleLogicalRangeChange);

    return () => {
      try {
        chartApi.timeScale().unsubscribeVisibleLogicalRangeChange(handleVisibleLogicalRangeChange);
      } catch {
      }
    };
  }, [chartApi, anchorTime]);

  useEffect(() => {
    const activeSeries = candleSeriesRef.current;
    const activeDatafeed = datafeedRef.current;
    if (!chartReady || !activeSeries || !activeDatafeed?.getBars) return;

    const normalizedTf = TF_MAP[timeframe] || timeframe;
    const resolvedAnchor = anchorTime ? String(anchorTime) : "";
    const resetKey = `${symbol}:${normalizedTf}:${resolvedAnchor}`;
    if (resetKeyRef.current === resetKey && chartDataRef.current.length > 0) return;

    resetKeyRef.current = resetKey;
    noMorePastDataRef.current = false;
    noMoreFutureDataRef.current = false;
    isLoadingPastRef.current = false;
    isLoadingFutureRef.current = false;

    const cached = !anchorTime ? getCachedCandles(symbol, normalizedTf) : null;
    if (cached && cached.length > 0) {
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }
      chartDataRef.current = cached;
      try {
        activeSeries.setData(cached);
      } catch {
      }
      onCandleDataRef.current?.(cached);
      setLoading(false);
      setError(null);
      setLiveQuote(null);
      if (chartApiRef.current && cached.length > 0) {
        try {
          chartApiRef.current.priceScale('right')?.applyOptions({ autoScale: true });
          const total = cached.length;
          const visibleSpan = 90;
          chartApiRef.current.timeScale().setVisibleLogicalRange({
            from: Math.max(0, total - visibleSpan),
            to: total + 6,
          });
        } catch {
        }
      }

      if (cached.length < INITIAL_CHUNK_BARS) {
        hydrateBackgroundCandles({
          symbol,
          timeframe,
          currentCandles: cached,
          activeDatafeed,
          isCancelled: () => resetKeyRef.current !== resetKey || isReplayActive,
          onHydrated: (bgCandles) => {
            const oldFirstTime = chartDataRef.current[0]?.time;
            chartDataRef.current = mergeCandles(chartDataRef.current, bgCandles);
            setCachedCandles(symbol, normalizedTf, chartDataRef.current);
            const prependedCount = chartDataRef.current.filter((c) => c.time < oldFirstTime).length;
            applyCandles({ preserveRange: true, prependedCount });
          },
        });
      }
      return;
    }

    chartDataRef.current = [];
    try {
      activeSeries.setData([]);
    } catch {
    }
    onCandleDataRef.current?.([]);

    if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
    loadingTimerRef.current = setTimeout(() => {
      if (resetKeyRef.current === resetKey) {
        setLoading(true);
      }
    }, 250);
    setError(null);
    setLiveQuote(null);

    const loadInitialData = async () => {
      const requestResetKey = resetKey;
      try {
        let from = undefined;
        let to = undefined;

        if (anchorTime) {
          const resolvedAnchorTime = Number(anchorTime);
          const intervalSec = Math.max((INTERVAL_MS[timeframe] || INTERVAL_MS["1minute"]) / 1000, 1);
          const halfSpan = 300;
          from = (resolvedAnchorTime - halfSpan * intervalSec) * 1000;
          to = (resolvedAnchorTime + halfSpan * intervalSec) * 1000;
        }

        const initialLimit = anchorTime ? INITIAL_CHUNK_BARS : INITIAL_FAST_BARS;

        const result = await activeDatafeed.getBars({
          symbol,
          timeframe: normalizedTf,
          from,
          to,
          countBack: initialLimit,
          firstDataRequest: true,
        });

        const candles = Array.isArray(result) ? result : result?.candles || [];

        if (resetKeyRef.current !== requestResetKey) return;

        if (candles.length === 0) {
          setError('No chart data available for this range.');
          chartDataRef.current = [];
          try {
            activeSeries.setData([]);
          } catch {
          }
          onCandleDataRef.current?.([]);
          return;
        }

        chartDataRef.current = candles;
        if (!anchorTime) {
          setCachedCandles(symbol, normalizedTf, candles);
        }
        applyCandles();

        const focusChartViewport = () => {
          if (!chartApiRef.current || candles.length === 0) return;
          try {
            chartApiRef.current.priceScale('right')?.applyOptions({ autoScale: true });
            if (anchorTime) {
              const resolvedAnchorTime = Number(anchorTime);
              const targetIdx = candles.findIndex((c) => c.time >= resolvedAnchorTime);
              const centerIdx = targetIdx >= 0 ? targetIdx : candles.length - 1;
              const visibleSpan = 60;
              chartApiRef.current.timeScale().setVisibleLogicalRange({
                from: Math.max(0, centerIdx - Math.floor(visibleSpan / 2)),
                to: centerIdx + Math.floor(visibleSpan / 2),
              });
            } else {
              const total = candles.length;
              const visibleSpan = 90;
              chartApiRef.current.timeScale().setVisibleLogicalRange({
                from: Math.max(0, total - visibleSpan),
                to: total + 6,
              });
            }
          } catch {
          }
        };

        focusChartViewport();
        requestAnimationFrame(() => {
          if (resetKeyRef.current === requestResetKey) {
            focusChartViewport();
          }
        });

        if (!anchorTime && candles.length > 0) {
          hydrateBackgroundCandles({
            symbol,
            timeframe,
            currentCandles: candles,
            activeDatafeed,
            isCancelled: () => resetKeyRef.current !== requestResetKey || isReplayActive,
            onHydrated: (bgCandles) => {
              const oldFirstTime = chartDataRef.current[0]?.time;
              chartDataRef.current = mergeCandles(chartDataRef.current, bgCandles);
              setCachedCandles(symbol, normalizedTf, chartDataRef.current);
              const prependedCount = chartDataRef.current.filter((c) => c.time < oldFirstTime).length;
              applyCandles({ preserveRange: true, prependedCount });
            },
          });
        }
      } catch (err) {
        if (resetKeyRef.current === requestResetKey) {
          setError(err?.response?.data?.error || err?.message || 'Unable to load data right now. Please try again.');
        }
      } finally {
        if (resetKeyRef.current === requestResetKey) {
          if (loadingTimerRef.current) {
            clearTimeout(loadingTimerRef.current);
            loadingTimerRef.current = null;
          }
          setLoading(false);
        }
      }
    };

    loadInitialData();
  }, [anchorTime, applyCandles, chartReady, isReplayActive, symbol, timeframe]);

  useEffect(() => {
    const activeDatafeed = datafeedRef.current;
    if (!enableLiveStream || isReplayActive || !activeDatafeed?.subscribeBars) {
      return undefined;
    }

    const unsubscribe = activeDatafeed.subscribeBars({
      symbol,
      timeframe,
      priceDigits,
      onQuote: (quote) => {
        setLiveQuote(quote);
        onLiveQuoteRef.current?.(quote);
      },
      onTick: ({ price, timestamp }) => {
        const activeSeries = candleSeriesRef.current;
        if (!price || !chartDataRef.current.length || !activeSeries) return;

        const liveCandle = buildStreamCandle({
          price,
          priceDigits,
          timestamp,
          interval: timeframe,
          existingCandles: chartDataRef.current,
        });

        if (liveCandle) {
          activeSeries.update(liveCandle);
          const lastIdx = chartDataRef.current.length - 1;
          if (chartDataRef.current[lastIdx]?.time === liveCandle.time) {
            chartDataRef.current[lastIdx] = liveCandle;
          } else if (chartDataRef.current[lastIdx]?.time < liveCandle.time) {
            chartDataRef.current.push(liveCandle);
          }
          onTickRef.current?.(liveCandle);
        }
      },
    });

    return () => {
      unsubscribe?.();
    };
  }, [enableLiveStream, isReplayActive, priceDigits, symbol, timeframe]);

  return {
    chartDataRef,
    loading,
    error,
    liveQuote,
    applyCandles,
    loadChunk,
  };
}
