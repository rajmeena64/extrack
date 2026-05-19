import React, { useEffect, useRef, useMemo } from "react";
import Chart from "../../utils/chartSetup";
import "./Radar.css";
import { useTheme } from "../../context/ThemeContext";
import { getTradeDisplayDate } from "../../utils/tradeTime";

export default function Radar({ trades = [] }) {
  const radarRef    = useRef(null);
  const chartRef    = useRef(null);
  const { darkMode = false } = useTheme() || {};

  // =============================================
  // REAL METRIC CALCULATIONS
  // =============================================
  const metrics = useMemo(() => {
    if (!trades || trades.length === 0)
      return { win: 0, profit: 0, avg: 0, recovery: 0, drawdown: 0, consistency: 0 };

    const closed = trades.filter((t) => t.pnl !== null && t.pnl !== undefined);
    if (closed.length === 0)
      return { win: 0, profit: 0, avg: 0, recovery: 0, drawdown: 0, consistency: 0 };

    const pnls    = closed.map((t) => Number(t.pnl) || 0);
    const winners = pnls.filter((p) => p > 0);
    const losers  = pnls.filter((p) => p < 0);

    const winRate     = (winners.length / closed.length) * 100;
    const grossProfit = winners.reduce((s, p) => s + p, 0);
    const grossLoss   = Math.abs(losers.reduce((s, p) => s + p, 0));
    const rawPF       = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 3 : 0;
    const profitFactor = Math.min((rawPF / 3) * 100, 100);

    const avgWin   = winners.length > 0 ? grossProfit / winners.length : 0;
    const avgLoss  = losers.length  > 0 ? grossLoss   / losers.length  : 1;
    const avgRatio = Math.min(((avgWin / (avgLoss || 1)) / 2) * 100, 100);

    const netPnL = pnls.reduce((s, p) => s + p, 0);
    let peak = 0, maxDD = 0, running = 0;
    for (const p of pnls) {
      running += p;
      if (running > peak) peak = running;
      const dd = peak - running;
      if (dd > maxDD) maxDD = dd;
    }
    const rawRF    = maxDD > 0 ? netPnL / maxDD : netPnL > 0 ? 3 : 0;
    const recovery = Math.min(Math.max((rawRF / 3) * 100, 0), 100);
    const drawdown = Math.max(100 - (peak > 0 ? (maxDD / peak) * 100 : 0), 0);

    const weekMap = {};
    closed.forEach((t) => {
      const d = getTradeDisplayDate(t);
      if (!d) return;
      const jan1 = new Date(d.getFullYear(), 0, 1);
      const week = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
      const key  = `${d.getFullYear()}-W${week}`;
      weekMap[key] = (weekMap[key] || 0) + (Number(t.pnl) || 0);
    });
    const weeks       = Object.values(weekMap);
    const consistency = weeks.length > 0
      ? (weeks.filter((w) => w > 0).length / weeks.length) * 100
      : 0;

    return {
      win:         Math.round(winRate),
      profit:      Math.round(profitFactor),
      avg:         Math.round(avgRatio),
      recovery:    Math.round(recovery),
      drawdown:    Math.round(drawdown),
      consistency: Math.round(consistency),
    };
  }, [trades]);

  const overallScore = useMemo(() => {
    const vals = Object.values(metrics);
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }, [metrics]);

  const grade = useMemo(() => {
    if (overallScore >= 75) return { label: "Excellent",  cls: "grade-excellent" };
    if (overallScore >= 55) return { label: "Good",       cls: "grade-good"      };
    if (overallScore >= 35) return { label: "Average",    cls: "grade-average"   };
    return                         { label: "Needs Work", cls: "grade-poor"      };
  }, [overallScore]);

  // ── Rebuild chart whenever metrics OR dark mode changes
  useEffect(() => {
    if (!radarRef.current) return;
    if (chartRef.current) chartRef.current.destroy();

    const labels = ["Win %", "Profit Factor", "Avg W/L", "Recovery", "Low DD", "Consistency"];
    const chartLabels = labels.map((label) => (
      label === "Profit Factor" ? ["Profit", "Factor"] : label
    ));

    const isDark = Boolean(darkMode);
    const labelColor = isDark ? "#f8fafc" : "#0f172a";
    const gridColor  = isDark ? "rgba(148,163,184,0.18)" : "rgba(15,23,42,0.12)";
    const angleColor = isDark ? "rgba(148,163,184,0.16)" : "rgba(15,23,42,0.1)";
    const fillColor = isDark ? "rgba(96,165,250,0.18)" : "rgba(37,99,235,0.12)";
    const borderColor = isDark ? "#93c5fd" : "#1d4ed8";
    const pointColor = isDark ? "#bfdbfe" : "#2563eb";
    const tooltipBg = isDark ? "#0b0b0b" : "#ffffff";
    const tooltipText = isDark ? "#f8fafc" : "#0f172a";
    const tooltipBorder = isDark ? "#2a2a2a" : "#cbd5e1";

    chartRef.current = new Chart(radarRef.current, {
      type: "radar",
      data: {
        labels: chartLabels,
        datasets: [{
          data:                 Object.values(metrics),
          fill:                 true,
          backgroundColor:      fillColor,
          borderColor:          borderColor,
          borderWidth:          2,
          pointRadius:          3.5,
          pointHoverRadius:     5,
          pointBackgroundColor: pointColor,
          pointBorderColor:     isDark ? "#050505" : "#ffffff",
          pointBorderWidth:     2,
        }],
      },
      options: {
        responsive:          true,
        maintainAspectRatio: false,
        layout: {
          padding: {
            top: 0,
            right: 8,
            bottom: 12,
            left: 8,
          },
        },
        plugins: {
          legend:  { display: false },
          tooltip: {
            backgroundColor: tooltipBg,
            titleColor: tooltipText,
            bodyColor: tooltipText,
            borderColor: tooltipBorder,
            borderWidth: 1,
            displayColors: false,
            padding: 10,
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${ctx.parsed.r}`,
            },
          },
        },
        scales: {
          r: {
            min:  0,
            max:  100,
            beginAtZero: true,
            ticks:       { display: false, stepSize: 25 },
            grid:        { color: gridColor  },
            angleLines:  { color: angleColor },
            pointLabels: {
              color: labelColor,
              centerPointLabels: true,
              padding: 6,
              font:  { size: 10, weight: "700", lineHeight: 1.15 },
            },
          },
        },
      },
    });

    return () => chartRef.current?.destroy();
  }, [metrics, darkMode]);

  const metricRows = [
    { label: "Win %",        value: metrics.win         },
    { label: "Prof. Factor", value: metrics.profit      },
    { label: "Avg W/L",      value: metrics.avg         },
    { label: "Recovery",     value: metrics.recovery    },
    { label: "Low DD",       value: metrics.drawdown    },
    { label: "Consistency",  value: metrics.consistency },
  ];

  if (!trades || trades.length === 0) {
    return (
      <div className="radar-card">
        <div className="radar-header">
          <span className="radar-title-text dashboard-card-title">Score</span>
          <strong className="radar-score-empty">—</strong>
        </div>
        <div className="radar-empty">No trade data yet</div>
      </div>
    );
  }

  return (
    <div className="radar-card">

      {/* HEADER */}
      <div className="radar-header">
        <span className="radar-title-text dashboard-card-title">Score</span>
        <strong className={`radar-score ${grade.cls}`}>{overallScore}</strong>
      </div>

      {/* BODY */}
      <div className="radar-body">

        {/* LEFT: CHART */}
        <div className="radar-chart">
          <canvas ref={radarRef} />
        </div>

        {/* RIGHT: SCORE + BREAKDOWN */}
        <div className="radar-overall">

          <span className="radar-overall-label">Overall score</span>

          <div className="radar-bar">
            <div className="radar-bar-fill" style={{ width: `${overallScore}%` }} />
          </div>

          <div className="radar-scale">
            <span className="radar-scale-num">0</span>
            <span className={`radar-grade ${grade.cls}`}>{grade.label}</span>
            <span className="radar-scale-num">100</span>
          </div>

          {/* METRIC BREAKDOWN */}
          <div className="radar-metrics-list">
            {metricRows.map(({ label, value }) => (
              <div key={label} className="radar-metric-row">
                <span className="radar-metric-label">{label}</span>
                <span className={`radar-metric-value ${
                  value >= 65 ? "val-good" : value >= 40 ? "val-mid" : "val-poor"
                }`}>
                  {value}
                </span>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
