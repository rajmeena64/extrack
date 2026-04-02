import React, { useEffect, useRef, useState, useCallback } from "react";
import Chart from "chart.js/auto";
import { API_URL } from "../../utils/constants";
import "./TradePnLCurve.css";

export default function TradePnLCurve({
  symbol,
  entryTime,
  exitTime,
  entryPrice,
  exitPrice,
  quantity,
  side,
}) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);
  const [isDark, setIsDark] = useState(
    () => document.body.classList.contains("dark-mode")
  );

  // watch dark mode toggle
  useEffect(() => {
    const obs = new MutationObserver(() =>
      setIsDark(document.body.classList.contains("dark-mode"))
    );
    obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  // Compute P&L value
  const calcPnL = useCallback(
    (price) => {
      const qty = Number(quantity) || 1;
      const ep = Number(entryPrice) || 0;
      if (String(side).toLowerCase().includes("sell") ||
          String(side).toLowerCase().includes("short")) {
        return (ep - price) * qty;
      }
      return (price - ep) * qty;
    },
    [entryPrice, quantity, side]
  );

  // Fetch candles and build P&L series
  useEffect(() => {
    if (!symbol || !entryTime || !exitTime || !entryPrice) {
      console.log("Missing required props:", { symbol, entryTime, exitTime, entryPrice });
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);

    const fetchAndDraw = async () => {
      try {
        // Convert timestamps to milliseconds if they're in seconds
        let startMs = Number(entryTime);
        let endMs = Number(exitTime);
        
        // If timestamps are in seconds (10 digits), convert to milliseconds
        if (startMs < 10000000000) startMs = startMs * 1000;
        if (endMs < 10000000000) endMs = endMs * 1000;
        
        console.log("Fetching P&L data:", {
          symbol,
          startMs,
          endMs,
          startDate: new Date(startMs).toISOString(),
          endDate: new Date(endMs).toISOString()
        });
        
        const durationMs = endMs - startMs;
        const durationMin = durationMs / 60000;

        // Pick appropriate interval
        let interval = "1m";
        if (durationMin > 500) interval = "5m";
        if (durationMin > 2500) interval = "15m";
        if (durationMin > 7500) interval = "1h";

        const limit = Math.min(
          Math.ceil(durationMin / (interval === "1m" ? 1
                                : interval === "5m" ? 5
                                : interval === "15m" ? 15
                                : 60)) + 2,
          1000
        );

        // ✅ Fixed: Use startMs and endMs directly
        const url = `${API_URL}/api/klines?symbol=${symbol}` +
          `&interval=${interval}` +
          `&startTime=${startMs}` +
          `&endTime=${endMs}` +
          `&limit=${limit}`;

        console.log("Fetching URL:", url);
        
        const res = await fetch(url);
        
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`API Error (${res.status}): ${errorText}`);
        }
        
        const data = await res.json();
        console.log("Received candles:", data?.length || 0);

        if (!Array.isArray(data) || data.length === 0) {
          throw new Error("No candle data returned for this time range");
        }

        // Build PnL series
        const points = [
          { t: startMs, pnl: 0, label: "Entry" },
          ...data.map((c) => ({
            t: c[0], // open time ms
            pnl: calcPnL(Number(c[4])), // close price
          })),
        ];

        // Append exit point
        const finalPnL = calcPnL(Number(exitPrice));
        points.push({ t: endMs, pnl: finalPnL, label: "Exit" });

        // Deduplicate and sort
        const seen = new Set();
        const clean = points.filter((p) => {
          if (seen.has(p.t)) return false;
          seen.add(p.t);
          return true;
        });
        clean.sort((a, b) => a.t - b.t);

        // Summary stats
        const pnls = clean.map((p) => p.pnl);
        setSummary({
          max: Math.max(...pnls),
          min: Math.min(...pnls),
          final: finalPnL,
          duration: Math.round(durationMin),
          interval,
          candles: data.length,
        });

        drawChart(clean, isDark);
      } catch (e) {
        console.error("Error in fetchAndDraw:", e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAndDraw();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, entryTime, exitTime, entryPrice, exitPrice, quantity, side]);

  // Redraw on dark mode change
  useEffect(() => {
    if (!chartRef.current) return;
    const ds = chartRef.current.data.datasets[0];
    if (!ds) return;
    const isProfit = summary?.final >= 0;
    applyColors(ds, isProfit, isDark);
    if (chartRef.current.options.scales?.x) {
      chartRef.current.options.scales.x.ticks.color = isDark ? "#94a3b8" : "#64748b";
      chartRef.current.options.scales.x.grid.color = isDark
        ? "rgba(148,163,184,0.07)" : "rgba(100,116,139,0.08)";
    }
    if (chartRef.current.options.scales?.y) {
      chartRef.current.options.scales.y.ticks.color = isDark ? "#94a3b8" : "#64748b";
      chartRef.current.options.scales.y.grid.color = isDark
        ? "rgba(148,163,184,0.07)" : "rgba(100,116,139,0.08)";
    }
    chartRef.current.update();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDark]);

  const applyColors = (ds, isProfit, dark) => {
    ds.borderColor = isProfit ? "#22c55e" : "#ef4444";
    ds.pointBorderColor = isProfit ? "#22c55e" : "#ef4444";
    ds.backgroundColor = isProfit
      ? (dark ? "rgba(34,197,94,0.08)" : "rgba(34,197,94,0.10)")
      : (dark ? "rgba(239,68,68,0.08)" : "rgba(239,68,68,0.10)");
  };

  const drawChart = (points, dark) => {
    if (!canvasRef.current) return;
    if (chartRef.current) chartRef.current.destroy();

    const isProfit = points[points.length - 1].pnl >= 0;
    const tickColor = dark ? "#94a3b8" : "#64748b";
    const gridColor = dark ? "rgba(148,163,184,0.07)" : "rgba(100,116,139,0.08)";

    const labels = points.map((p) => {
      const d = new Date(p.t);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    });
    const data = points.map((p) => parseFloat(p.pnl.toFixed(2)));

    const entryIdx = 0;
    const exitIdx = points.length - 1;

    const pointBg = data.map((_, i) => {
      if (i === entryIdx) return "#6366f1";
      if (i === exitIdx) return isProfit ? "#22c55e" : "#ef4444";
      return "transparent";
    });
    const pointRadius = data.map((_, i) =>
      i === entryIdx || i === exitIdx ? 5 : 0
    );
    const pointBorder = data.map((_, i) =>
      i === entryIdx || i === exitIdx ? 2 : 0
    );

    chartRef.current = new Chart(canvasRef.current, {
      type: "line",
      data: {
        labels,
        datasets: [{
          data,
          borderWidth: 1.5,
          fill: true,
          tension: 0.35,
          pointRadius,
          pointBackgroundColor: pointBg,
          pointBorderColor: isProfit ? "#22c55e" : "#ef4444",
          pointBorderWidth: pointBorder,
          borderColor: isProfit ? "#22c55e" : "#ef4444",
          backgroundColor: isProfit
            ? (dark ? "rgba(34,197,94,0.08)" : "rgba(34,197,94,0.10)")
            : (dark ? "rgba(239,68,68,0.08)" : "rgba(239,68,68,0.10)"),
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: "index" },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: dark ? "#1e293b" : "#0f172a",
            titleColor: "#94a3b8",
            bodyColor: "#f1f5f9",
            padding: 10,
            cornerRadius: 8,
            displayColors: false,
            callbacks: {
              title: (items) => `Time: ${items[0].label}`,
              label: (item) => {
                const v = item.parsed.y;
                return ` P&L: ${v >= 0 ? "+" : ""}${v.toFixed(2)}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { color: gridColor, drawBorder: false },
            ticks: {
              color: tickColor,
              font: { size: 10 },
              maxTicksLimit: 8,
              autoSkip: true,
            },
          },
          y: {
            grid: { color: gridColor, drawBorder: false },
            ticks: {
              color: tickColor,
              font: { size: 10 },
              callback: (v) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}`,
            },
          },
        },
      },
    });
  };

  const fmt = (v) =>
    v === null || v === undefined
      ? "--"
      : `${v >= 0 ? "+" : ""}${Number(v).toFixed(2)}`;

  const fmtDuration = (min) => {
    if (min < 60) return `${min}m`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  return (
    <div className="pnl-curve-wrapper">
      <div className="pnl-curve-header">
        <div className="pnl-curve-title">
          <span className="pnl-curve-dot" />
          Live P&L Curve
          {summary && (
            <span className="pnl-curve-badge">
              {summary.interval} · {summary.candles} candles
            </span>
          )}
        </div>

        {summary && (
          <div className="pnl-curve-pills">
            <div className="pnl-pill">
              <span className="pill-label">Final</span>
              <span className={`pill-value ${summary.final >= 0 ? "pos" : "neg"}`}>
                {fmt(summary.final)}
              </span>
            </div>
            <div className="pnl-pill">
              <span className="pill-label">Peak</span>
              <span className="pill-value pos">{fmt(summary.max)}</span>
            </div>
            <div className="pnl-pill">
              <span className="pill-label">Trough</span>
              <span className={`pill-value ${summary.min >= 0 ? "pos" : "neg"}`}>
                {fmt(summary.min)}
              </span>
            </div>
            <div className="pnl-pill">
              <span className="pill-label">Duration</span>
              <span className="pill-value neutral">
                {fmtDuration(summary.duration)}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="pnl-curve-chart">
        {loading && (
          <div className="pnl-curve-loading">
            <div className="pnl-spinner" />
            <span>Loading P&L curve…</span>
          </div>
        )}
        {error && !loading && (
          <div className="pnl-curve-error">
            <span>⚠ {error}</span>
          </div>
        )}
        {!loading && !error && (
          <canvas ref={canvasRef} />
        )}
      </div>

      {!loading && !error && (
        <div className="pnl-curve-legend">
          <span className="leg-dot" style={{ background: "#6366f1" }} />
          <span className="leg-label">Entry (P&L = 0)</span>
          <span className="leg-dot"
            style={{ background: summary?.final >= 0 ? "#22c55e" : "#ef4444" }} />
          <span className="leg-label">Exit</span>
        </div>
      )}
    </div>
  );
}