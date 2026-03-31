import React, { useEffect, useRef, useMemo } from "react";
import Chart from "chart.js/auto";
import "./Radar.css";

export default function Radar() {
  const radarRef = useRef(null);
  const chartRef = useRef(null);

  const metrics = {
    win: 72,
    profit: 68,
    avg: 61,
    recovery: 75,
    drawdown: 58,
    consistency: 70,
  };

  const overallScore = useMemo(() => {
    const vals = Object.values(metrics);
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }, []);

  useEffect(() => {
    if (chartRef.current) chartRef.current.destroy();

    chartRef.current = new Chart(radarRef.current, {
      type: "radar",
      data: {
        labels: [
          "Win %",
          "Profit factor",
          "Avg win/loss",
          "Recovery",
          "Max drawdown",
          "Consistency",
        ],
        datasets: [
          {
            data: Object.values(metrics),
            fill: true,
            backgroundColor: "rgba(139,92,246,0.25)",
            borderColor: "#8b5cf6",
            borderWidth: 1.5,
            pointRadius: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false },
        },
        scales: {
          r: {
            min: 0,
            max: 100,
            ticks: { display: false },
            grid: { color: "rgba(148,163,184,0.15)" },
            angleLines: { color: "rgba(148,163,184,0.25)" },
            pointLabels: {
              color: "#9ca3af",
              font: { size: 11, weight: "500" },
            },
          },
        },
      },
    });

    return () => chartRef.current.destroy();
  }, []);

  return (
    <div className="radar-card">
      {/* HEADER */}
      <div className="radar-header">
        <span>Zella score</span>
        <strong>{overallScore}</strong>
      </div>

      {/* BODY */}
      <div className="radar-body">
        {/* LEFT : RADAR */}
        <div className="radar-chart">
          <canvas ref={radarRef} />
        </div>

        {/* RIGHT : OVERALL SCORE */}
        <div className="radar-overall">
          <span className="label">Overall score</span>

          <div className="bar">
            <div
              className="fill"
              style={{ width: `${overallScore}%` }}
            />
          </div>

          <div className="scale">
            <span>0</span>
            <span>100</span>
          </div>
        </div>
      </div>
    </div>
  );
}
