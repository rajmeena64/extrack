import { useEffect, useRef, useState } from "react";
import { createChart, CandlestickSeries } from "lightweight-charts";
import { TradeMarkerPrimitive } from "../TradeMarkerPrimitive";
import { formatChartLocalDateTime } from "../utils/chartHelpers";
import {
  getTradeDetailCandleOptions,
  getTradeDetailChartOptions,
  getTradeDetailChartTheme,
  getTradeDetailChartThemeOptions,
} from "../utils/tradeDetailChartDesign";

export function useChartInstance({ darkMode, pricePrecision, symbol = "CHART" }) {
  const chartRef = useRef(null);
  const chartShellRef = useRef(null);
  const chartApiRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const tradeMarkerPrimitiveRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [latestCandle, setLatestCandle] = useState(null);
  const [cssVariables, setCssVariables] = useState(getTradeDetailChartTheme);
  const [isChartReady, setIsChartReady] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === chartShellRef.current);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    const updateCssVariables = () => {
      setCssVariables(getTradeDetailChartTheme());
    };
    updateCssVariables();
    const observer = new MutationObserver(updateCssVariables);
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCssVariables(getTradeDetailChartTheme());
    }, 50);
    return () => clearTimeout(timer);
  }, [darkMode]);

  useEffect(() => {
    if (!chartRef.current) return;

    const isMobile = window.innerWidth < 480;
    const initialCss = getTradeDetailChartTheme();

    const chart = createChart(chartRef.current, {
      ...getTradeDetailChartOptions(initialCss, { isMobile, timeFormatter: formatChartLocalDateTime }),
      width: chartRef.current.clientWidth,
      height: chartRef.current.clientHeight || 400,
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      ...getTradeDetailCandleOptions(initialCss),
    });

    const markerPrimitive = new TradeMarkerPrimitive();
    candleSeries.attachPrimitive(markerPrimitive);
    tradeMarkerPrimitiveRef.current = markerPrimitive;

    chartApiRef.current = chart;
    candleSeriesRef.current = candleSeries;
    setIsChartReady(true);

    const handleCrosshairMove = (param) => {
      const candle = param?.seriesData?.get(candleSeries);
      if (candle?.open !== undefined) {
        setLatestCandle((current) => (current?.time === candle?.time ? current : candle));
      }
    };

    chart.subscribeCrosshairMove(handleCrosshairMove);

    let lastWidth = 0;
    const handleResize = () => {
      if (chartRef.current && chartApiRef.current) {
        const clientWidth = chartRef.current.clientWidth;
        const clientHeight = chartRef.current.clientHeight || 400;
        if (clientWidth > 0) {
          chartApiRef.current.resize(clientWidth, clientHeight);
          if (lastWidth === 0) {
            try {
              chartApiRef.current.priceScale('right')?.applyOptions({ autoScale: true });
            } catch {
            }
          }
          lastWidth = clientWidth;
        }
      }
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(chartRef.current);
    window.addEventListener("resize", handleResize);

    return () => {
      setIsChartReady(false);
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleResize);
      chart.unsubscribeCrosshairMove(handleCrosshairMove);
      chart.remove();
      chartApiRef.current = null;
      candleSeriesRef.current = null;
      tradeMarkerPrimitiveRef.current = null;
    };
  }, []);

  useEffect(() => {
    setLatestCandle(null);
  }, [symbol]);

  useEffect(() => {
    const precision = Number(pricePrecision);
    if (!Number.isInteger(precision) || precision < 0 || precision > 8) return;
    const priceFormat = {
      type: "price",
      precision,
      minMove: 10 ** -precision,
    };
    candleSeriesRef.current?.applyOptions({ priceFormat });
  }, [pricePrecision]);

  useEffect(() => {
    if (!chartApiRef.current || !candleSeriesRef.current) return;
    const currentRange = chartApiRef.current.timeScale?.()?.getVisibleLogicalRange?.();
    chartApiRef.current.applyOptions(getTradeDetailChartThemeOptions(cssVariables));
    candleSeriesRef.current.applyOptions(getTradeDetailCandleOptions(cssVariables));
    if (currentRange) {
      chartApiRef.current.timeScale?.()?.setVisibleLogicalRange?.(currentRange);
    }
  }, [cssVariables]);

  const toggleFullscreen = async () => {
    if (!chartShellRef.current) return;
    if (document.fullscreenElement) await document.exitFullscreen();
    else await chartShellRef.current.requestFullscreen();
  };

  const saveSnapshot = (timeframe = "1m") => {
    const canvas = chartApiRef.current?.takeScreenshot?.();
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `${symbol}-${timeframe}-chart.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return {
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
  };
}
