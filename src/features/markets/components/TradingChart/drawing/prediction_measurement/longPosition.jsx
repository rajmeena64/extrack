import React from "react";

function drawPill(ctx, text, x, y, bg, hpr, align = "center") {
  ctx.font = `600 ${10 * hpr}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  const tw = ctx.measureText(text).width;
  const bw = tw + 16 * hpr;
  const bh = 20 * hpr;
  const bx = align === "left" ? x : x - bw / 2;
  const by = y - bh / 2;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(bx, by, bw, bh, 4 * hpr);
  else ctx.rect(bx, by, bw, bh);
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = align === "left" ? "left" : "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, align === "left" ? bx + 8 * hpr : x, y);
}

export function renderLongPosition(scope, s) {
  const { context: ctx, horizontalPixelRatio: hpr, verticalPixelRatio: vpr } = scope;
  const p0 = s.anchors[0];
  const p1 = s.anchors[1];
  const p2 = s.anchors[2];
  const p3 = s.anchors[3];
  const p4 = s.anchors[4];
  const p5 = s.anchors[5];
  if (!p0 || !p1 || p0.x == null || p0.y == null || p1.x == null || p1.y == null) return;
  const is6Pt = Boolean(p4 && p5 && p4.x != null && p4.y != null && p5.x != null && p5.y != null);
  const is4Pt = !is6Pt && Boolean(p2 && p3 && p2.x != null && p2.y != null && p3.x != null && p3.y != null);
  const leftX = is6Pt ? Math.min(p2.x * hpr, p3.x * hpr) : is4Pt ? Math.min(p1.x * hpr, p3.x * hpr) : Math.min(p0.x * hpr, p1.x * hpr);
  const rightX = is6Pt ? Math.max(p2.x * hpr, p3.x * hpr) : is4Pt ? Math.max(p1.x * hpr, p3.x * hpr) : Math.max(p0.x * hpr, p1.x * hpr);
  const width = Math.max(2 * hpr, rightX - leftX);
  const entryY = (is6Pt ? p2.y : is4Pt ? p1.y : p0.y) * vpr;
  const topY = Math.min(p0.y * vpr, entryY);
  const bottomY = is6Pt ? Math.max(entryY, p4.y * vpr) : is4Pt ? Math.max(entryY, p2.y * vpr) : entryY + Math.abs(entryY - topY) / 2;
  const centerX = (leftX + rightX) / 2;
  const entryPrice = Number(is6Pt ? s.drawing.points[2]?.price : is4Pt ? s.drawing.points[1]?.price : (s.drawing.points[0]?.price ?? 0));
  const targetPrice = Number(is6Pt ? s.drawing.points[0]?.price : is4Pt ? s.drawing.points[0]?.price : (s.drawing.points[1]?.price ?? 0));
  const stopPrice = Number(is6Pt ? s.drawing.points[4]?.price : is4Pt ? s.drawing.points[2]?.price : entryPrice - Math.abs(targetPrice - entryPrice) / 2);
  const rewardDiff = Math.abs(targetPrice - entryPrice);
  const riskDiff = Math.abs(entryPrice - stopPrice);
  const ratio = riskDiff > 0 ? rewardDiff / riskDiff : 0;
  const targetPct = entryPrice > 0 ? ((rewardDiff / entryPrice) * 100).toFixed(2) : "0.00";
  const stopPct = entryPrice > 0 ? ((riskDiff / entryPrice) * 100).toFixed(2) : "0.00";

  ctx.save();
  ctx.fillStyle = "rgba(76, 175, 80, 0.22)";
  ctx.fillRect(leftX, topY, width, entryY - topY);

  ctx.fillStyle = "rgba(244, 67, 54, 0.22)";
  ctx.fillRect(leftX, entryY, width, bottomY - entryY);

  ctx.strokeStyle = "rgba(120, 123, 134, 0.8)";
  ctx.lineWidth = 1 * hpr;
  ctx.beginPath();
  ctx.moveTo(leftX, entryY);
  ctx.lineTo(rightX, entryY);
  ctx.stroke();

  const isHovered = Boolean(s.hovered);
  const isSelected = Boolean(s.selected);
  if (isHovered || isSelected) {
    const targetSpace = entryY - topY;
    const midY = targetSpace >= 28 * vpr ? entryY - 12 * vpr : entryY + 12 * vpr;
    drawPill(ctx, `Target: ${rewardDiff.toFixed(2)} (${targetPct}%)`, centerX, topY - 11 * hpr, "#089981", hpr, "center");
    drawPill(ctx, `Risk/reward ratio: ${ratio.toFixed(2)}`, centerX, midY, "#f01a64", hpr, "center");
    drawPill(ctx, `Stop: ${riskDiff.toFixed(2)} (${stopPct}%)`, centerX, bottomY + 11 * hpr, "#f01a64", hpr, "center");
  }

  if (isSelected || isHovered) {
    const sz = 10 * hpr;
    const hLeft = (is6Pt ? p2.x : is4Pt ? p1.x : p0.x) * hpr;
    const hRight = (is6Pt ? p3.x : is4Pt ? p3.x : p1.x) * hpr;
    const handles = [[hLeft, topY], [hLeft, entryY], [hLeft, bottomY], [hRight, entryY]];
    handles.forEach(([x, y]) => {
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#2962ff";
      ctx.lineWidth = 1.8 * hpr;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x - sz / 2, y - sz / 2, sz, sz, 2 * hpr);
      else ctx.rect(x - sz / 2, y - sz / 2, sz, sz);
      ctx.fill();
      ctx.stroke();
    });
  }
  ctx.restore();
}

export const longPositionTool = {
  id: "LongPosition",
  label: "Long Position",
  category: "prediction_measurement",
  pointsNeeded: 1,
  icon: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="3" width="16" height="9" fill="rgba(8,153,129,0.35)" stroke="#089981" />
      <rect x="4" y="12" width="16" height="9" fill="rgba(242,54,69,0.35)" stroke="#f23645" />
      <line x1="4" y1="12" x2="20" y2="12" stroke="#ffffff" />
    </svg>
  ),
};