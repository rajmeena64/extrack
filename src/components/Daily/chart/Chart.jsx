
import React, { useEffect, useRef, useState, useCallback } from "react";
import { createChart, CandlestickSeries, createSeriesMarkers } from "lightweight-charts";
import { CrosshairMode } from "lightweight-charts";
import "./chart.css";
import {API_URL} from "../../../utils/constants";
import { normalizeStoredSymbol } from "../../../utils/symbols";

const TF_MAP = { "1m": "1m", "5m": "5m", "15m": "15m", "1h": "1h" };
const INTERVAL_MS = { "1m": 60*1000, "5m": 5*60*1000, "15m": 15*60*1000, "1h": 60*60*1000 };


function Chart({ darkMode, symbol = "BTCUSDT", tradeDate, tradeTime, showFullDay = false, trades = [], totalCandles = 2000 }) {
  const BULLISH_CANDLE_COLOR = "#2563eb";
  const BEARISH_CANDLE_COLOR = "#ef4444";
  const chartRef = useRef(null);
  const chartApiRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const markersRef = useRef(null);

  const [tf, setTf] = useState("1m");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cssVariables, setCssVariables] = useState({
    bgCard: "",
    textMuted: "",
    borderLight: "",
    borderMedium: "",
    pnlPositive: BULLISH_CANDLE_COLOR,
    pnlNegative: BEARISH_CANDLE_COLOR
  });

  const cleanedSymbol = normalizeStoredSymbol(symbol) || "BTCUSDT";

  const normalizeMarkerTime = useCallback((value) => {
    if (!value) return null;
    const numeric = Number(value);
    const timestampMs = Number.isFinite(numeric) ? numeric : new Date(value).getTime();
    if (!Number.isFinite(timestampMs)) return null;
    return timestampMs > 1e12 ? Math.floor(timestampMs / 1000) : Math.floor(timestampMs);
  }, []);



  const getDateRange = useCallback(() => {
    if (!tradeDate) return null;
    const startDate = new Date(tradeDate); startDate.setHours(0,0,0,0);
    const endDate = new Date(tradeDate); endDate.setHours(23,59,59,999);
    return { startTime: startDate.getTime(), endTime: endDate.getTime() };
  }, [tradeDate]);

  // CSS Variables
  useEffect(() => {
    const updateCssVariables = () => {
      const getVar = name => getComputedStyle(document.body).getPropertyValue(name).trim();
      setCssVariables({
        bgCard: getVar("--bg-card"),
        textMuted: getVar("--text-muted"),
        borderLight: getVar("--border-light"),
        borderMedium: getVar("--border-medium"),
        pnlPositive: getVar("--pnl-positive") || BULLISH_CANDLE_COLOR,
        pnlNegative: getVar("--pnl-negative") || BEARISH_CANDLE_COLOR
      });
    };
    updateCssVariables();
    const observer = new MutationObserver(updateCssVariables);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      const getVar = name => getComputedStyle(document.body).getPropertyValue(name).trim();
      setCssVariables({
        bgCard: getVar("--bg-card"),
        textMuted: getVar("--text-muted"),
        borderLight: getVar("--border-light"),
        borderMedium: getVar("--border-medium"),
        pnlPositive: getVar("--pnl-positive") || BULLISH_CANDLE_COLOR,
        pnlNegative: getVar("--pnl-negative") || BEARISH_CANDLE_COLOR
      });
    }, 50);
    return () => clearTimeout(timer);
  }, [darkMode]);

  // Chart Init
  useEffect(() => {
    if (!chartRef.current) return;

    const getVar = name => getComputedStyle(document.body).getPropertyValue(name).trim();
    const initialCss = {
      bgCard: getVar("--bg-card"),
      textMuted: getVar("--text-muted"),
      borderLight: getVar("--border-light"),
      borderMedium: getVar("--border-medium"),
      pnlPositive: getVar("--pnl-positive") || BULLISH_CANDLE_COLOR,
      pnlNegative: getVar("--pnl-negative") || BEARISH_CANDLE_COLOR
    };

    const chart = createChart(chartRef.current, {
      width: chartRef.current.clientWidth,
      height: chartRef.current.clientHeight || 400,
      layout: { background: { color: initialCss.bgCard }, textColor: initialCss.textMuted },
      grid: { vertLines: { color: initialCss.borderLight }, horzLines: { color: initialCss.borderLight } },
      rightPriceScale: { borderColor: initialCss.borderMedium },
      timeScale: { borderColor: initialCss.borderMedium, timeVisible: true },
  
  // ✅ ADD THIS
  crosshair: { mode: CrosshairMode.Normal}, // 👈 IMPORTANT (no snapping)


    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: initialCss.pnlPositive, downColor: initialCss.pnlNegative,
      borderUpColor: initialCss.pnlPositive, borderDownColor: initialCss.pnlNegative,
      wickUpColor: initialCss.pnlPositive, wickDownColor: initialCss.pnlNegative
    });

    chartApiRef.current = chart;
    candleSeriesRef.current = candleSeries;

    const handleResize = () => {
      if (chartRef.current && chartApiRef.current) {
        chartApiRef.current.applyOptions({ width: chartRef.current.clientWidth, height: chartRef.current.clientHeight || 400 });
      }
    };
    window.addEventListener("resize", handleResize);
    return () => { window.removeEventListener("resize", handleResize); chart.remove(); };
  }, []);

  // Update chart on CSS variables change
  useEffect(() => {
    if (!chartApiRef.current || !candleSeriesRef.current) return;
    chartApiRef.current.applyOptions({
      layout: { background: { color: cssVariables.bgCard }, textColor: cssVariables.textMuted },
      grid: { vertLines: { color: cssVariables.borderLight }, horzLines: { color: cssVariables.borderLight } },
      rightPriceScale: { borderColor: cssVariables.borderMedium },
      timeScale: { borderColor: cssVariables.borderMedium },
    });
    candleSeriesRef.current.applyOptions({
      upColor: cssVariables.pnlPositive, downColor: cssVariables.pnlNegative,
      borderUpColor: cssVariables.pnlPositive, borderDownColor: cssVariables.pnlNegative,
      wickUpColor: cssVariables.pnlPositive, wickDownColor: cssVariables.pnlNegative
    });
  }, [cssVariables]);

  // Fetch Historical Candles
  useEffect(() => {
    if (!candleSeriesRef.current) return;
    setLoading(true); setError(null);

    const fetchCandles = async (symbol, interval, totalCandles = 2000) => {
      const limit = 1000;
      const requestsNeeded = Math.ceil(totalCandles / limit);
      let allCandles = [];
      const range = showFullDay && tradeDate ? getDateRange() : null;
      const rangeStartTime = range?.startTime;
      let endTime = range?.endTime || Date.now();

      for (let i=0; i<requestsNeeded; i++) {
        if (rangeStartTime && endTime < rangeStartTime) {
          break;
        }

        const params = new URLSearchParams({
          symbol,
          interval,
          limit: String(limit),
          endTime: String(endTime),
        });

        if (rangeStartTime) {
          params.set("startTime", String(rangeStartTime));
        }

        const url = `${API_URL}/api/klines?${params.toString()}`;
        const res = await fetch(url);
        const data = await res.json();

        if (!res.ok) {
          const message = data?.msg || data?.error || data?.details || `Chart API error (${res.status})`;
          throw new Error(message);
        }

        if (!Array.isArray(data) || data.length === 0) {
          break;
        }
        allCandles = [...data, ...allCandles];
        endTime = data[0][0] - INTERVAL_MS[interval];
      }

      return allCandles.map(d => ({
        time: d[0]/1000, open: +d[1], high: +d[2], low: +d[3], close: +d[4], volume: +d[5]
      }));
    };

    const loadData = async () => {
      try {
        const candles = await fetchCandles(cleanedSymbol, TF_MAP[tf], totalCandles);

        if (candles.length === 0) {
          setError(`No chart data found for ${cleanedSymbol}.`);
          candleSeriesRef.current.setData([]);
          return;
        }
        candleSeriesRef.current.setData(candles);

        // Markers
// Markers
const markers = [];

trades.forEach(t => {
  const side = String(t.side || "").toLowerCase();
  const isSell = side === "sell";
  const entryTime = normalizeMarkerTime(t.entryTime);
  const exitTime = normalizeMarkerTime(t.exitTime);

  if (entryTime && t.entryPrice) {
      markers.push({
        time: entryTime,
        position: isSell ? "aboveBar" : "belowBar",
      color: isSell ? "red" : "green",
      shape:  isSell ? "arrowDown" :"arrowUp",
      text: `@${isSell ? "Sell" : "Buy"} ${t.entryPrice}`
      
    });
  }


  if (exitTime && t.exitPrice) {
    markers.push({
      time: exitTime,
      // position: "aboveBar",
      position: isSell ? "belowBar" : "aboveBar",
      color: "blue",
      shape:  isSell ? "arrowUp" :"arrowDown",
      text: `@Exit ${t.exitPrice}`
    });
  }
});

        if (!markersRef.current) markersRef.current = createSeriesMarkers(candleSeriesRef.current, markers);
        else markersRef.current.setMarkers(markers);

        // Zoom/scroll to trade window (60-70%)
        if (trades.length > 0) {
          const entryTimes = trades.map(t => normalizeMarkerTime(t.entryTime)).filter(Boolean);
          const exitTimes = trades.map(t => normalizeMarkerTime(t.exitTime)).filter(Boolean);
          if (entryTimes.length === 0 && exitTimes.length === 0) {
            chartApiRef.current.timeScale().fitContent();
            return;
          }
          const minTime = Math.min(...entryTimes, ...exitTimes);
          const maxTime = Math.max(...entryTimes, ...exitTimes);
          const duration = Math.max(maxTime - minTime, INTERVAL_MS[tf] / 1000);
          const zoomFrom = minTime - duration * 4;
          const zoomTo = maxTime + duration * 4;
          chartApiRef.current.timeScale().setVisibleRange({ from: zoomFrom, to: zoomTo });
        } else {
          chartApiRef.current.timeScale().fitContent();
        }

      } catch(err) {
        setError(`Error: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [tf, cleanedSymbol, tradeDate, showFullDay, trades, getDateRange, totalCandles, normalizeMarkerTime]);

  const loaderCandles = [
    ["green", "c0"], ["red", "c1"], ["green", "c2"], ["green", "c3"],
    ["red", "c4"], ["red", "c5"], ["green", "c6"], ["green", "c7"],
    ["red", "c8"], ["green", "c9"], ["green", "c10"],
  ];

  return (
    <div
      className={`chart ${loading ? "chart--loading" : ""}`}
      style={{
        "--chart-loader-up": cssVariables.pnlPositive || BULLISH_CANDLE_COLOR,
        "--chart-loader-down": cssVariables.pnlNegative || BEARISH_CANDLE_COLOR,
      }}
    >
      <div className="chart-header">
        <h3 className="markets-title">
          {cleanedSymbol}{tradeDate && ` · ${new Date(tradeDate).toLocaleDateString()}`}{tradeTime && ` · ${tradeTime}`}
        </h3>
        <div className="timeframes">
          {["1m","5m","15m","1h"].map(t => (
            <button key={t} className={`timeframe-btn ${tf===t?"active":""}`} onClick={()=>setTf(t)}>{t}</button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="chart-loading" role="status" aria-live="polite">
          <div className="chart-loading__ghost chart-loading__ghost--left" aria-hidden="true">
            <span className="chart-loading__ghost-candle g1" />
            <span className="chart-loading__ghost-candle chart-loading__ghost-candle--down g2" />
            <span className="chart-loading__ghost-candle g3" />
          </div>

          <div className="chart-loading__ghost chart-loading__ghost--right" aria-hidden="true">
            <span className="chart-loading__ghost-candle chart-loading__ghost-candle--down g4" />
            <span className="chart-loading__ghost-candle g5" />
          </div>

          <section className="chart-loading__wrap" aria-label={`Loading ${cleanedSymbol} chart data`}>
            <div className="chart-loading__base" />
            <div className="chart-loading__path" aria-hidden="true">
              <svg viewBox="0 0 720 260" preserveAspectRatio="none">
                <path d="M110 138 C150 160, 180 112, 230 126 S300 70, 350 96 S430 118, 470 72 S550 38, 610 62" />
              </svg>
            </div>

            <div className="chart-loading__candles" aria-hidden="true">
              {loaderCandles.map(([direction, className]) => (
                <div key={className} className={`chart-loading__candle chart-loading__candle--${direction} ${className}`}>
                  <div className="chart-loading__body" />
                </div>
              ))}
            </div>
          </section>

          <span className="chart-loading__label">Loading {cleanedSymbol} data...</span>
        </div>
      )}
      {error && !loading && <div className="chart-error">{error}</div>}

      <div className="chart-wrapper" ref={chartRef}></div>
    </div>
  );
}

export default Chart;

