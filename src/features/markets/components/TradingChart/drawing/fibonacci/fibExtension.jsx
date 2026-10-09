import React from "react";

const FIB_EXT_LEVELS = [
  { lvl: 0, color: "#787b86", label: "0" },
  { lvl: 0.618, color: "#089981", label: "0.618" },
  { lvl: 1, color: "#2962ff", label: "1" },
  { lvl: 1.272, color: "#ff9800", label: "1.272" },
  { lvl: 1.618, color: "#f23645", label: "1.618" },
  { lvl: 2, color: "#9c27b0", label: "2" },
  { lvl: 2.618, color: "#673ab7", label: "2.618" },
];

const hexToRgba = (hex, alpha) => {
  const num = parseInt(hex.replace("#", ""), 16);
  return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
};

export function renderFibExtension(scope, s, series) {
  const { context: ctx, horizontalPixelRatio: hpr, verticalPixelRatio: vpr } = scope;
  const a = s.anchors[0];
  const b = s.anchors[1];
  const c = s.anchors[2];
  if (!a || !b || a.x == null || a.y == null || b.x == null || b.y == null) return;
  const ax = a.x * hpr;
  const ay = a.y * vpr;
  const bx = b.x * hpr;
  const by = b.y * vpr;

  ctx.save();
  ctx.strokeStyle = "rgba(148, 163, 184, 0.7)";
  ctx.lineWidth = 1 * hpr;
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.stroke();

  if (c && c.x != null && c.y != null) {
    const cx = c.x * hpr;
    const cy = c.y * vpr;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(cx, cy);
    ctx.stroke();

    const legY = by - ay;
    const spanX = Math.max(20 * hpr, Math.abs(bx - ax));
    const leftX = Math.min(cx, cx + (bx >= ax ? spanX : -spanX));
    const rightX = Math.max(cx, cx + (bx >= ax ? spanX : -spanX));

    for (let i = 0; i < FIB_EXT_LEVELS.length - 1; i++) {
      const y1 = cy + legY * FIB_EXT_LEVELS[i].lvl;
      const y2 = cy + legY * FIB_EXT_LEVELS[i + 1].lvl;
      ctx.fillStyle = hexToRgba(FIB_EXT_LEVELS[i + 1].color, 0.12);
      ctx.fillRect(leftX, Math.min(y1, y2), rightX - leftX, Math.abs(y2 - y1));
    }

    ctx.font = `600 ${10 * hpr}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    for (const item of FIB_EXT_LEVELS) {
      const y = cy + legY * item.lvl;
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
  }

  if (s.selected) {
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#2962ff";
    ctx.lineWidth = 1.5 * hpr;
    [a, b, c].filter(Boolean).forEach((pt) => {
      if (pt.x == null || pt.y == null) return;
      ctx.beginPath();
      ctx.arc(pt.x * hpr, pt.y * vpr, 4 * hpr, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
  }
  ctx.restore();
}

export const fibExtensionTool = {
  id: "FibExtension",
  label: "Trend-Based Fib Extension",
  category: "fibonacci",
  pointsNeeded: 3,
  icon: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 18 10 6 17 14" />
      <line x1="3" y1="6" x2="21" y2="6" strokeDasharray="2 2" />
      <line x1="3" y1="12" x2="21" y2="12" strokeDasharray="2 2" />
    </svg>
  ),
};
