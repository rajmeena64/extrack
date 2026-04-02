





import React, { useEffect, useRef, useState, useCallback } from "react";
import { createChart, CandlestickSeries, createSeriesMarkers } from "lightweight-charts";
import { CrosshairMode } from "lightweight-charts";
import "./Markets.css";
import "../../utils/constants"
import { API_URL } from "../../utils/constants";

const TF_MAP = { "1m": "1m", "5m": "5m", "15m": "15m", "1h": "1h" };
const INTERVAL_MS = { "1m": 60*1000, "5m": 5*60*1000, "15m": 15*60*1000, "1h": 60*60*1000 };


function Chart({ darkMode, symbol = "BTCUSDT", tradeDate, tradeTime, showFullDay = false, trades = [], totalCandles = 2000 }) {
  const chartRef = useRef(null);
  const chartApiRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const markersRef = useRef(null);
  const hasLoadedOnceRef = useRef(false);

  const [tf, setTf] = useState("1m");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cssVariables, setCssVariables] = useState({
    bgCard: "", textMuted: "", borderLight: "", borderMedium: "", pnlPositive: "", pnlNegative: ""
  });

  const cleanSymbol = useCallback(sym => (sym ? sym.replace(/[a-z]+$/g, '').toUpperCase() : "BTCUSDT"), []);

const mapToBinanceSymbol = (sym) => {
  const s = sym?.toUpperCase();

  if (s === "XAUUSDC" || s === "GOLD") {
    return "XAUUSDT";
  }

  if (s === "XAGUSDC" || s === "SILVER") {
    return "XAGUSDT";
  }

  return s || "BTCUSDT";
};


const cleanedSymbol = mapToBinanceSymbol(cleanSymbol(symbol));



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
        pnlPositive: getVar("--pnl-positive"),
        pnlNegative: getVar("--pnl-negative")
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
        pnlPositive: getVar("--pnl-positive"),
        pnlNegative: getVar("--pnl-negative")
      });
    }, 50);
    return () => clearTimeout(timer);
  }, [darkMode]);

  // Chart Init
  useEffect(() => {
    if (!chartRef.current) return;

    const chart = createChart(chartRef.current, {
      width: chartRef.current.clientWidth,
      height: chartRef.current.clientHeight || 400,
      layout: { background: { color: cssVariables.bgCard }, textColor: cssVariables.textMuted },
      grid: { vertLines: { color: cssVariables.borderLight }, horzLines: { color: cssVariables.borderLight } },
      rightPriceScale: { borderColor: cssVariables.borderMedium },
      timeScale: { borderColor: cssVariables.borderMedium, timeVisible: true },
  
  // ✅ ADD THIS
  crosshair: { mode: CrosshairMode.Normal}, // 👈 IMPORTANT (no snapping)


    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: cssVariables.pnlPositive, downColor: cssVariables.pnlNegative,
      borderUpColor: cssVariables.pnlPositive, borderDownColor: cssVariables.pnlNegative,
      wickUpColor: cssVariables.pnlPositive, wickDownColor: cssVariables.pnlNegative
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
      let endTime = showFullDay && tradeDate ? getDateRange().endTime : Date.now();

      for (let i=0; i<requestsNeeded; i++) {
        const url = `${API_URL}/api/klines?symbol=${symbol}&interval=${interval}&limit=${limit}&endTime=${endTime}`;
        const res = await fetch(url);
        const data = await res.json();
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
        candleSeriesRef.current.setData(candles);

        // Markers
// Markers
const markers = [];

trades.forEach(t => {
  const isSell = String(t.side).toLowerCase() === "sell";
  if (t.entryTime && t.entryPrice) {
    markers.push({
      time: Number(t.entryTime) ,
      position: "belowBar",
       position: isSell ? "aboveBar" : "belowBar",
      color: t.side === "sell" ? "red" : "green",
      shape:  isSell ? "arrowDown" :"arrowUp",
      text: `@${t.side === "sell" ? "Sell" : "Buy"} ${t.entryPrice}`
      
    });
  }
  console.log(t.side)

  if (t.exitTime && t.exitPrice) {
    markers.push({
      time: Number(t.exitTime) ,
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
          const entryTimes = trades.map(t => t.entryTime).filter(Boolean);
          const exitTimes = trades.map(t => t.exitTime).filter(Boolean);
          const minTime = Math.min(...entryTimes, ...exitTimes);
          const maxTime = Math.max(...entryTimes, ...exitTimes);
          const zoomFrom = minTime - (maxTime - minTime) * 4; // 30% padding
          const zoomTo = maxTime + (maxTime - minTime) * 4;
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
  }, [tf, cleanedSymbol, tradeDate, showFullDay, trades]);

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