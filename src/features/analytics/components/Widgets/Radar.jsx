import React, { useEffect, useRef, useMemo } from "react";
import Chart from "./chartSetup";
import { useTheme } from "@/context/ThemeContext";
import { Card, CardHeader, CardTitle, InfoTooltip } from '@/components/ui';

const defaultMetrics = { win: 0, profit: 0, avg: 0, recovery: 0, drawdown: 0, consistency: 0 };

export default function Radar({ metrics: incomingMetrics = null, className = "" }) {
  const radarRef = useRef(null);
  const chartRef = useRef(null);
  const { darkMode = false } = useTheme() || {};

  const metrics = incomingMetrics && typeof incomingMetrics === 'object' ? incomingMetrics : defaultMetrics;
  const hasData = Boolean(incomingMetrics);
  const overallScore = incomingMetrics?.overallScore ?? null;

  const grade = useMemo(() => {
    if (overallScore === null) return { label: "N/A", cls: "text-[var(--text-secondary)]" };
    if (overallScore >= 80)    return { label: "Excellent", cls: "text-emerald-500" };
    if (overallScore >= 65)    return { label: "Good",      cls: "text-blue-500" };
    if (overallScore >= 45)    return { label: "Average",   cls: "text-amber-500" };
    return                            { label: "Poor",      cls: "text-rose-500" };
  }, [overallScore]);

  useEffect(() => {
    if (!hasData || !radarRef.current) return;

    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    const ctx = radarRef.current.getContext("2d");
    const isDark = Boolean(darkMode);

    const tickColor  = isDark ? "#475569" : "#cbd5e1";
    const gridColor  = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
    const labelColor = isDark ? "#94a3b8" : "#64748b";
    const fillColor  = isDark ? "rgba(37,99,235,0.22)"   : "rgba(37,99,235,0.14)";
    const borderColor= isDark ? "#3b82f6"                : "#2563eb";

    chartRef.current = new Chart(ctx, {
      type: "radar",
      data: {
        labels: ["Win Rate", "Profit Factor", "Avg Win/Loss", "Recovery", "Drawdown", "Consistency"],
        datasets: [
          {
            data: [
              metrics.win,
              metrics.profit,
              metrics.avg,
              metrics.recovery,
              metrics.drawdown,
              metrics.consistency,
            ],
            fill: true,
            backgroundColor: fillColor,
            borderColor: borderColor,
            borderWidth: 1.5,
            pointBackgroundColor: borderColor,
            pointBorderColor: isDark ? "#0f172a" : "#ffffff",
            pointHoverBackgroundColor: "#ffffff",
            pointHoverBorderColor: borderColor,
            pointRadius: 2.5,
            pointHoverRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 400 },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: isDark ? "#0f172a" : "#ffffff",
            titleColor: isDark ? "#f8fafc" : "#0f172a",
            bodyColor: isDark ? "#94a3b8" : "#475569",
            borderColor: isDark ? "#334155" : "#e2e8f0",
            borderWidth: 1,
            padding: 8,
            cornerRadius: 6,
            callbacks: {
              label: (item) => ` ${item.label}: ${item.raw}/100`,
            },
          },
        },
        scales: {
          r: {
            min: 0,
            max: 100,
            ticks: {
              stepSize: 25,
              display: false,
              backdropColor: "transparent",
              color: tickColor,
            },
            grid: { color: gridColor },
            angleLines: { color: gridColor },
            pointLabels: {
              color: labelColor,
              font: { size: 9, weight: "600" },
              padding: 4,
            },
          },
        },
      },
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [metrics, hasData, darkMode]);

  if (!hasData) {
    return (
      <Card className={`w-full h-full min-h-0 flex flex-col overflow-hidden ${className}`.trim()} padding="none">
        <CardHeader className="flex items-center gap-2 p-3.5 pb-2 mb-0 border-b border-[var(--divider-strong)] min-h-[var(--title-card-row-height)] flex-nowrap shrink-0">
          <div className="inline-flex items-center gap-2 flex-nowrap min-w-0">
            <CardTitle className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">Score</CardTitle>
            <InfoTooltip
              text="Scores your trading quality from win rate, profit factor, drawdown, recovery, and consistency."
              size={13}
              side="bottom-left"
            />
          </div>
        </CardHeader>
        <div className="flex flex-col items-center justify-center p-6 text-center text-[var(--text-secondary)] flex-1">
          <strong className="text-[var(--heading)] font-semibold mb-1">No trades yet</strong>
          <span className="text-xs">Trading score will calculate once trades match the current filter.</span>
        </div>
      </Card>
    );
  }

  const metricRows = [
    { label: "Win rate",     value: metrics.win },
    { label: "Profit factor",value: metrics.profit },
    { label: "Win / Loss",   value: metrics.avg },
    { label: "Recovery",     value: metrics.recovery },
    { label: "Drawdown",     value: metrics.drawdown },
    { label: "Consistency",  value: metrics.consistency },
  ];

  return (
    <Card className={`w-full h-full min-h-0 flex flex-col overflow-hidden ${className}`.trim()} padding="none">
      <CardHeader className="flex items-center justify-between gap-2 p-3.5 pb-2 mb-0 border-b border-[var(--divider-strong)] min-h-[var(--title-card-row-height)] flex-nowrap shrink-0">
        <div className="inline-flex items-center gap-2 flex-nowrap min-w-0">
          <CardTitle className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">Score</CardTitle>
          <InfoTooltip
            text="Scores your trading quality from win rate, profit factor, drawdown, recovery, and consistency."
            size={13}
            side="bottom-left"
          />
        </div>
        <strong className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-solid/10 ${grade.cls}`}>
          {overallScore}
        </strong>
      </CardHeader>

      <div className="flex flex-row items-center gap-3 p-3 flex-1 min-h-0 min-w-0">
        <div className="flex-1 min-h-0 min-w-0 h-full flex items-center justify-center relative">
          <canvas ref={radarRef} className="max-w-full max-h-full block" />
        </div>

        <div className="w-[125px] sm:w-[135px] shrink-0 flex flex-col gap-1 justify-center min-h-0">
          <span className="text-fluid-2xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Overall score</span>

          <div className="h-1.5 w-full bg-[var(--surface-subtle)] border border-[var(--divider-strong)] rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-brand-solid" style={{ width: `${overallScore}%` }} />
          </div>

          <div className="flex justify-between items-center text-fluid-2xs">
            <span className="text-[var(--text-secondary)] font-medium">0</span>
            <span className={`font-bold ${grade.cls}`}>{grade.label}</span>
            <span className="text-[var(--text-secondary)] font-medium">100</span>
          </div>

          <div className="flex flex-col border-t border-[var(--divider-strong)] pt-1 mt-0.5 divide-y divide-transparent">
            {metricRows.map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center py-0.5 text-fluid-xs">
                <span className="text-[var(--text-secondary)] truncate">{label}</span>
                <span className={`font-bold ${
                  value >= 65 ? "text-emerald-500" : value >= 40 ? "text-blue-500" : "text-rose-500"
                }`}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
