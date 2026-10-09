import React from "react";

const FIB_LEVELS = [
  { lvl: 0, color: "#787b86", label: "0" },
  { lvl: 0.236, color: "#f23645", label: "0.236" },
  { lvl: 0.382, color: "#ff9800", label: "0.382" },
  { lvl: 0.5, color: "#4caf50", label: "0.5" },
  { lvl: 0.618, color: "#089981", label: "0.618" },
  { lvl: 0.786, color: "#00bcd4", label: "0.786" },
  { lvl: 1, color: "#2962ff", label: "1" },
];

const hexToRgba = (hex, alpha) => {
  const num = parseInt(hex.replace("#", ""), 16);
  return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
};

export function renderFibRetracement(scope, s, series) {
  const { context: ctx, horizontalPixelRatio: hpr, verticalPixelRatio: vpr } = scope;
  const a = s.anchors[0];
  const b = s.anchors[1];
  if (!a || !b || a.x == null || a.y == null || b.x == null || b.y == null) return;
  const ax = a.x * hpr;
  const ay = a.y * vpr;
  const bx = b.x * hpr;
  const by = b.y * vpr;
  const leftX = Math.min(ax, bx);
  const rightX = Math.max(ax, bx);

  ctx.save();
  for (let i = 0; i < FIB_LEVELS.length - 1; i++) {
    const y1 = ay + (by - ay) * FIB_LEVELS[i].lvl;
    const y2 = ay + (by - ay) * FIB_LEVELS[i + 1].lvl;
    ctx.fillStyle = hexToRgba(FIB_LEVELS[i + 1].color, 0.12);
    ctx.fillRect(leftX, Math.min(y1, y2), rightX - leftX, Math.abs(y2 - y1));
  }

  ctx.setLineDash([4 * hpr, 4 * hpr]);
  ctx.strokeStyle = "rgba(148, 163, 184, 0.5)";
  ctx.lineWidth = 1 * hpr;
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.stroke();

  ctx.setLineDash([]);
  ctx.font = `600 ${10 * hpr}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  for (const item of FIB_LEVELS) {
    const y = ay + (by - ay) * item.lvl;
    ctx.strokeStyle = item.color;
    ctx.lineWidth = 1 * hpr;
    ctx.beginPath();
    ctx.moveTo(leftX, y);
    ctx.lineTo(rightX, y);
    ctx.stroke();

    const price = series?.coordinateToPrice ? series.coordinateToPrice(y / vpr) : null;
    const priceTxt = price != null ? ` (${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })})` : "";
    ctx.fillStyle = item.color;
    ctx.fillText(`${item.label}${priceTxt}`, leftX + 6 * hpr, y - 4 * hpr);
  }

  if (s.selected) {
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#2962ff";
    ctx.lineWidth = 1.5 * hpr;
    [a, b].forEach((pt) => {
      ctx.beginPath();
      ctx.arc(pt.x * hpr, pt.y * vpr, 4 * hpr, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
  }
  ctx.restore();
}

export const fibRetracementTool = {
  id: "FibRetracement",
  label: "Fib Retracement",
  category: "fibonacci",
  pointsNeeded: 2,
  icon: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="3" y1="4" x2="21" y2="4" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="3" y1="16" x2="21" y2="16" />
      <line x1="3" y1="20" x2="21" y2="20" />
    </svg>
  ),
};
