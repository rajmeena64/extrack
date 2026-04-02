import React, { useEffect, useRef, useMemo, useState } from "react";
import Chart from "chart.js/auto";
import "./Radar.css";

export default function Radar({ trades = [] }) {
  const radarRef    = useRef(null);
  const chartRef    = useRef(null);

  // ── Track dark mode so chart rebuilds on toggle
  const [isDark, setIsDark] = useState(
    () => document.body.classList.contains("dark-mode")
  );

  useEffect(() => {
    const obs = new MutationObserver(() => {
      setIsDark(document.body.classList.contains("dark-mode"));
    });
    obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

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
      if (!t.timestamp) return;
      const d    = new Date(t.timestamp);
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

    // ✅ Hardcoded per mode — canvas cannot use CSS vars
    const labelColor = isDark ? "#cbd5e1" : "#334155";   // clearly visible both modes
    const gridColor  = isDark ? "rgba(203,213,225,0.12)" : "rgba(51,65,85,0.12)";

    chartRef.current = new Chart(radarRef.current, {
      type: "radar",
      data: {
        labels: ["Win %", "Profit Factor", "Avg W/L", "Recovery", "Low DD", "Consistency"],
        datasets: [{
          data:                 Object.values(metrics),
          fill:                 true,
          backgroundColor:      "rgba(139,92,246,0.18)",
          borderColor:          "#8b5cf6",
          borderWidth:          1.5,
          pointRadius:          3,
          pointBackgroundColor: "#8b5cf6",
        }],
      },
      options: {
        responsive:          true,
        maintainAspectRatio: false,
        plugins: {
          legend:  { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${ctx.parsed.r}`,
            },
          },
        },
        scales: {
          r: {
            min:  0,
            max:  100,
            ticks:       { display: false, stepSize: 25 },
            grid:        { color: gridColor  },
            angleLines:  { color: gridColor  },
            pointLabels: {
              color: labelColor,        // ✅ clearly visible
              font:  { size: 11, weight: "600" },
            },
          },
        },
      },
    });

    return () => chartRef.current?.destroy();
  }, [metrics, isDark]);   // ← rebuilds on dark/light toggle too

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
          <span className="radar-title-text">Zella Score</span>
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
        <span className="radar-title-text">Zella Score</span>
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