
import React, { useEffect, useRef, useState, useCallback } from "react";
import { createChart, CandlestickSeries, createSeriesMarkers } from "lightweight-charts";
import { CrosshairMode } from "lightweight-charts";
import "./chart.css";
import {API_URL} from "../../../utils/constants";

const TF_MAP = { "1m": "1m", "5m": "5m", "15m": "15m", "1h": "1h" };
const INTERVAL_MS = { "1m": 60*1000, "5m": 5*60*1000, "15m": 15*60*1000, "1h": 60*60*1000 };
const FOREX_SYMBOL_RE = /^[A-Z]{6}$/;
const METAL_SYMBOL_RE = /^X(AU|AG)USD$/;
const FOREX_CURRENCIES = new Set(["USD", "EUR", "GBP", "JPY", "AUD", "NZD", "CAD", "CHF"]);
const BINANCE_QUOTES = ["USDT", "USDC", "BUSD"];
const BROKER_SUFFIXES = ["ECN", "RAW", "PRO", "MINI", "MICRO", "CASH"];
const METAL_ALIASES = {
  GOLD: "XAUUSDT",
  XAU: "XAUUSDT",
  XAUUSD: "XAUUSDT",
  XAUUSDC: "XAUUSDT",
  SILVER: "XAGUSDT",
  XAG: "XAGUSDT",
  XAGUSD: "XAGUSDT",
  XAGUSDC: "XAGUSDT",
};


function Chart({ darkMode, symbol = "BTCUSDT", tradeDate, tradeTime, showFullDay = false, trades = [], totalCandles = 2000 }) {
  const BULLISH_CANDLE_COLOR = "#2563eb";
  const BEARISH_CANDLE_COLOR = "#ef4444";
  const chartRef = useRef(null);
  const chartApiRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const markersRef = useRef(null);
  const hasLoadedOnceRef = useRef(false);

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

  const cleanSymbol = useCallback((sym) => {
    const rawValue = String(sym || "BTCUSDT").trim();
    let normalized = rawValue.toUpperCase();

    if (normalized.includes(":")) {
      normalized = normalized.split(":").pop();
    }

    normalized = normalized
      .replace(/\s+/g, "")
      .replace(/[._-](PERP|P|M|R|C|ECN|RAW|PRO|MINI|MICRO|CASH)$/i, "")
      .replace(/(PERP|SWAP|FUTURES)$/i, "")
      .replace(/[^A-Z0-9]/g, "");

    for (const suffix of BROKER_SUFFIXES) {
      if (normalized.endsWith(suffix) && normalized.length > suffix.length + 3) {
        normalized = normalized.slice(0, -suffix.length);
      }
    }

    for (const quote of [...BINANCE_QUOTES, "USD"]) {
      const quoteIndex = normalized.indexOf(quote);
      if (quoteIndex > 0) {
        return normalized.slice(0, quoteIndex + quote.length);
      }
    }

    return normalized || "BTCUSDT";
  }, []);

  const isForexPair = useCallback((sym) => (
    FOREX_SYMBOL_RE.test(sym) &&
    FOREX_CURRENCIES.has(sym.slice(0, 3)) &&
    FOREX_CURRENCIES.has(sym.slice(3, 6))
  ), []);

  const mapToBinanceSymbol = useCallback((sym) => {
    const s = sym?.toUpperCase();

    if (!s) return "BTCUSDT";
    if (METAL_ALIASES[s]) return METAL_ALIASES[s];
    if (s.endsWith("USDC") || s.endsWith("BUSD")) return `${s.slice(0, -4)}USDT`;
    if (s.endsWith("USDT")) return s;
    if (s.endsWith("USD") && !METAL_SYMBOL_RE.test(s) && !isForexPair(s)) return `${s.slice(0, -3)}USDT`;

    return s;
  }, [isForexPair]);

  const cleanedSymbol = mapToBinanceSymbol(cleanSymbol(symbol));
  const isForexOrMetalSymbol = isForexPair(cleanedSymbol);
  const isBinanceSymbolShape = BINANCE_QUOTES.some((quote) => cleanedSymbol.endsWith(quote));

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

    const fetchBinanceCandles = async (symbol, interval, totalCandles = 2000) => {
      const limit = 1000;
      const requestsNeeded = Math.ceil(totalCandles / limit);
      let allCandles = [];
      let endTime = showFullDay && tradeDate ? getDateRange().endTime : Date.now();

      for (let i=0; i<requestsNeeded; i++) {
        const url = `${API_URL}/api/klines?symbol=${symbol}&interval=${interval}&limit=${limit}&endTime=${endTime}`;
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

    const fetchForexCandles = async (symbol, interval, totalCandles = 2000) => {
      const range = showFullDay && tradeDate ? getDateRange() : null;
      const params = new URLSearchParams({
        symbol,
        period: interval,
        limit: String(Math.min(totalCandles, 1000)),
      });

      if (range?.startTime) params.set("from", String(Math.floor(range.startTime / 1000)));
      if (range?.endTime) params.set("to", String(Math.floor(range.endTime / 1000)));

      const res = await fetch(`${API_URL}/api/forex-ohlc?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || data?.success === false) {
        const message = data?.message || data?.error || `Forex chart API error (${res.status})`;
        throw new Error(message);
      }

      return (data?.data || []).map((d) => ({
        time: Number(d.time),
        open: Number(d.open),
        high: Number(d.high),
        low: Number(d.low),
        close: Number(d.close),
        volume: Number(d.volume || 0),
      })).filter((d) =>
        Number.isFinite(d.time) &&
        Number.isFinite(d.open) &&
        Number.isFinite(d.high) &&
        Number.isFinite(d.low) &&
        Number.isFinite(d.close)
      );
    };

    const loadData = async () => {
      try {
        let candles = [];
        let binanceError = null;

        if (!isForexOrMetalSymbol && !isBinanceSymbolShape) {
          setError(`No supported tick data source found for ${cleanedSymbol}.`);
          candleSeriesRef.current.setData([]);
          return;
        }

        if (!isForexOrMetalSymbol) {
          try {
            candles = await fetchBinanceCandles(cleanedSymbol, TF_MAP[tf], totalCandles);
          } catch (err) {
            binanceError = err;
          }
        }

        if (candles.length === 0 && isForexOrMetalSymbol) {
          candles = await fetchForexCandles(cleanedSymbol, TF_MAP[tf], totalCandles);
        } else if (binanceError) {
          throw binanceError;
        }

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
        hasLoadedOnceRef.current = true;
      }
    };

    loadData();
  }, [tf, cleanedSymbol, tradeDate, showFullDay, trades, getDateRange, totalCandles, isForexOrMetalSymbol, isBinanceSymbolShape, normalizeMarkerTime]);

  return (
    <div className="chart">
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

      {loading && !hasLoadedOnceRef.current && <div className="chart-loading">Loading {cleanedSymbol} data...</div>}
      {error && <div className="chart-error">{error}</div>}

      <div className="chart-wrapper" ref={chartRef}></div>
    </div>
  );
}

export default Chart;

