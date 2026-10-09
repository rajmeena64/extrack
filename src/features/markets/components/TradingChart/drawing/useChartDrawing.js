import { useState, useEffect, useRef, useCallback } from "react";
import { DrawingController, EventBus } from "@getcandlekit/charts";
import { renderFibRetracement } from "./fibonacci/fibRetracement";
import { renderFibExtension } from "./fibonacci/fibExtension";
import { renderLongPosition } from "./prediction_measurement/longPosition";
import { renderShortPosition } from "./prediction_measurement/shortPosition";
import { INTERVAL_MS, chartTimeToSeconds } from "../utils/chartHelpers";

export function useChartDrawing({ chartApiRef, candleSeriesRef, symbol, chartDataRef, timeframe }) {
  const [activeTool, setActiveTool] = useState(null);
  const [drawingsCount, setDrawingsCount] = useState(0);
  const [selectedDrawing, setSelectedDrawing] = useState(null);
  const [selectedPosition, setSelectedPosition] = useState(null);
  const controllerRef = useRef(null);

  useEffect(() => {
    const chart = chartApiRef?.current;
    const series = candleSeriesRef?.current;
    if (!chart || !series || !symbol) return;

    const controller = new DrawingController({
      storageKey: `trading_drawings_${symbol}`,
      hitTolerance: 12,
    });
    controllerRef.current = controller;

    controller.init({
      chart,
      series,
      bus: new EventBus(),
    });

    const ts = chart.timeScale();
    const el = chart.chartElement();

    const timeToLogical = (time) => {
      if (time == null) return null;
      const candles = chartDataRef?.current;
      const intervalSec = Math.max((INTERVAL_MS[timeframe] || INTERVAL_MS["1m"]) / 1000, 1);
      if (!candles || candles.length === 0) return 0;
      const N = candles.length;
      const lastTime = chartTimeToSeconds(candles[N - 1].time);
      const firstTime = chartTimeToSeconds(candles[0].time);
      if (time >= lastTime) return (N - 1) + (time - lastTime) / intervalSec;
      if (time <= firstTime) return 0 - (firstTime - time) / intervalSec;
      let low = 0, high = N - 1;
      while (low <= high) {
        const mid = (low + high) >> 1;
        const t = chartTimeToSeconds(candles[mid].time);
        if (t === time) return mid;
        if (t < time) low = mid + 1;
        else high = mid - 1;
      }
      if (high < 0) return 0;
      if (low >= N) return N - 1;
      const tLow = chartTimeToSeconds(candles[high].time);
      const tHigh = chartTimeToSeconds(candles[low].time);
      const span = tHigh - tLow;
      return span > 0 ? high + (time - tLow) / span : high;
    };

    const logicalToTime = (logical) => {
      if (logical == null) return null;
      const candles = chartDataRef?.current;
      const intervalSec = Math.max((INTERVAL_MS[timeframe] || INTERVAL_MS["1m"]) / 1000, 1);
      if (!candles || candles.length === 0) return Math.round(Date.now() / 1000);
      const N = candles.length;
      const lastTime = chartTimeToSeconds(candles[N - 1].time);
      const firstTime = chartTimeToSeconds(candles[0].time);
      if (logical >= N - 1) return Math.round(lastTime + (logical - (N - 1)) * intervalSec);
      if (logical <= 0) return Math.round(firstTime + logical * intervalSec);
      const i0 = Math.floor(logical);
      const frac = logical - i0;
      const t0 = chartTimeToSeconds(candles[i0].time);
      if (frac === 0) return t0;
      const t1 = chartTimeToSeconds(candles[i0 + 1]?.time ?? (t0 + intervalSec));
      return Math.round(t0 + frac * (t1 - t0));
    };

    const project = (p) => {
      if (!chart || !series || !p) return { x: null, y: null };
      let x = null;
      const targetLogical = p.logical != null && Number.isFinite(p.logical) ? p.logical : (p.time != null ? timeToLogical(p.time) : null);
      if (targetLogical != null && Number.isFinite(targetLogical)) {
        const i0 = Math.floor(targetLogical);
        const i1 = Math.ceil(targetLogical);
        const c0 = ts.logicalToCoordinate(i0);
        const c1 = ts.logicalToCoordinate(i1);
        if (c0 != null && c1 != null && i1 !== i0) {
          x = c0 + (targetLogical - i0) * (c1 - c0);
        } else if (c0 != null) {
          x = c0;
        } else {
          x = ts.logicalToCoordinate(Math.round(targetLogical));
        }
      }
      if (x == null && p.time != null) {
        x = ts.timeToCoordinate(p.time);
      }
      let y = series.priceToCoordinate(p.price);
      if (y == null && p.price != null && Number.isFinite(p.price)) {
        const p0 = series.coordinateToPrice(10);
        const p100 = series.coordinateToPrice(110);
        if (p0 != null && p100 != null && p100 !== p0) {
          y = 10 + (p.price - p0) / ((p100 - p0) / 100);
        }
      }
      return { x: x == null ? null : x, y: y == null ? null : y };
    };

    const getCoords = (e) => {
      const cv = el?.querySelector("canvas");
      const rc = cv ? cv.getBoundingClientRect() : el?.getBoundingClientRect();
      if (!rc) return { x: e.offsetX ?? 0, y: e.offsetY ?? 0 };
      return { x: (e.clientX ?? 0) - rc.left, y: (e.clientY ?? 0) - rc.top };
    };

    const wrapEvent = (e) => {
      const { x, y } = getCoords(e);
      return new Proxy(e, {
        get(t, p) {
          if (p === "offsetX") return x;
          if (p === "offsetY") return y;
          const v = t[p];
          return typeof v === "function" ? v.bind(t) : v;
        },
      });
    };

    const unproject = (x, y) => {
      if (!chart || !series) return null;
      const cv = el?.querySelector("canvas");
      const ps = chart.paneSize ? chart.paneSize() : null;
      const pw = ps?.width ?? cv?.clientWidth ?? (ts.width ? ts.width() : 600);
      const ph = ps?.height ?? cv?.clientHeight ?? (el?.clientHeight ? el.clientHeight - 26 : 400);
      const clampedX = Math.max(4, Math.min(pw - 4, x));
      const clampedY = Math.max(4, Math.min(ph - 4, y));
      let logical = ts.coordinateToLogical(clampedX);
      if (logical == null) {
        const lr = ts.getVisibleLogicalRange();
        if (lr) {
          const ratio = Math.max(0, Math.min(1, clampedX / pw));
          logical = lr.from + ratio * (lr.to - lr.from);
        }
      }
      if (logical == null) return null;
      const time = logicalToTime(logical);
      let price = series.coordinateToPrice(clampedY);
      if (price == null) {
        const p10 = series.coordinateToPrice(10);
        const p50 = series.coordinateToPrice(50);
        if (p10 != null && p50 != null && p50 !== p10) {
          price = p10 + (clampedY - 10) * ((p50 - p10) / 40);
        }
      }
      if (price == null) return null;
      return { time, price, logical };
    };

    controller.project = project;
    controller.unproject = unproject;
    if (controller.primitive?.view) {
      controller.primitive.project = project;
      const origUpdateAllViews = controller.primitive.updateAllViews?.bind(controller.primitive);
      if (origUpdateAllViews) {
        controller.primitive.updateAllViews = () => {
          origUpdateAllViews();
          controller.primitive.shapes?.forEach((s) => {
            s.hovered = s.drawing?.id === controller.hoveredId;
          });
        };
      }
      const baseRenderer = controller.primitive.view.renderer.bind(controller.primitive.view);
      controller.primitive.view.renderer = () => {
        const orig = baseRenderer();
        const shapes = controller.primitive.shapes || [];
        const customTools = new Set(["FibRetracement", "FibExtension", "LongPosition", "ShortPosition"]);
        const standard = shapes.filter((s) => !customTools.has(s.drawing.tool));
        const customs = shapes.filter((s) => customTools.has(s.drawing.tool));
        orig.shapes = standard;
        return {
          draw(target) {
            orig.draw(target);
            if (customs.length > 0) {
              target.useBitmapCoordinateSpace((scope) => {
                customs.forEach((s) => {
                  if (controller.hoveredId && s.drawing?.id === controller.hoveredId) s.hovered = true;
                  if (s.drawing.tool === "FibRetracement") {
                    renderFibRetracement(scope, s, series);
                  } else if (s.drawing.tool === "FibExtension") {
                    renderFibExtension(scope, s, series);
                  } else if (s.drawing.tool === "LongPosition") {
                    renderLongPosition(scope, s, series);
                  } else if (s.drawing.tool === "ShortPosition") {
                    renderShortPosition(scope, s, series);
                  }
                });
              });
            }
          },
        };
      };
    }

    const origOnDown = controller.onDown.bind(controller);
    controller.onDown = (e) => {
      const we = wrapEvent(e);
      const tool = controller.engine.getActiveTool();
      if (tool === "LongPosition" || tool === "ShortPosition") {
        const dp = controller.unproject(we.offsetX, we.offsetY);
        if (!dp) return;
        we.preventDefault();
        we.stopPropagation();
        const startLogical = dp.logical != null ? dp.logical : timeToLogical(dp.time);
        const endLogical = startLogical + 20;
        const timeEnd = logicalToTime(endLogical);
        const cv = el?.querySelector("canvas");
        const ps = chart.paneSize ? chart.paneSize() : null;
        const h = ps?.height ?? cv?.clientHeight ?? 400;
        const clickY = we.offsetY;
        const isLong = tool === "LongPosition";
        const targetY = isLong ? Math.max(15, clickY - 0.20 * h) : Math.min(h - 15, clickY + 0.20 * h);
        const stopY = isLong ? Math.min(h - 15, clickY + 0.10 * h) : Math.max(15, clickY - 0.10 * h);
        const entryPrice = dp.price;
        const targetPrice = series.coordinateToPrice(targetY) ?? (isLong ? entryPrice * 1.02 : entryPrice * 0.98);
        const stopPrice = series.coordinateToPrice(stopY) ?? (isLong ? entryPrice * 0.99 : entryPrice * 1.01);
        const topPrice = isLong ? targetPrice : stopPrice;
        const bottomPrice = isLong ? stopPrice : targetPrice;
        const id = controller.engine.newDrawingId();
        const points = [
          { logical: startLogical, time: dp.time, price: topPrice },
          { logical: endLogical, time: timeEnd, price: topPrice },
          { logical: startLogical, time: dp.time, price: entryPrice },
          { logical: endLogical, time: timeEnd, price: entryPrice },
          { logical: startLogical, time: dp.time, price: bottomPrice },
          { logical: endLogical, time: timeEnd, price: bottomPrice },
        ];
        controller.engine.commit({
          id,
          tool,
          points,
          style: controller.engine.getDefaultStyle(),
        });
        controller.engine.select(id);
        controller.engine.stopTool();
        setActiveTool(null);
        controller.suppressPan(false);
        return;
      }
      origOnDown(we);
    };

    const origBodyHit = controller.bodyHit.bind(controller);
    controller.bodyHit = (d, p) => {
      if (d.tool === "LongPosition" || d.tool === "ShortPosition") {
        const p0 = controller.project(d.points[0]);
        const p1 = controller.project(d.points[1]);
        if (!p0 || !p1) return false;
        const allYs = d.points.map((pt) => controller.project(pt)?.y).filter((y) => y != null);
        const leftX = Math.min(p0.x, p1.x);
        const rightX = Math.max(p0.x, p1.x);
        const minY = Math.min(...allYs);
        const maxY = Math.max(...allYs);
        return p.x >= leftX - 4 && p.x <= rightX + 4 && p.y >= minY - 4 && p.y <= maxY + 4;
      }
      if (d.tool === "FibRetracement") {
        const a = controller.project(d.points[0]);
        const b = controller.project(d.points[1]);
        if (!a || !b || a.x == null || a.y == null || b.x == null || b.y == null) return false;
        const leftX = Math.min(a.x, b.x);
        const rightX = Math.max(a.x, b.x);
        const t = (controller.tol ?? 12) + 4;
        if (p.x < leftX - t || p.x > rightX + t) return false;
        const fibLevels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
        const isNearLevel = fibLevels.some((lvl) => Math.abs(p.y - (a.y + (b.y - a.y) * lvl)) <= t);
        const dx = b.x - a.x, dy = b.y - a.y, len2 = dx * dx + dy * dy;
        const distDiag = len2 === 0 ? Math.hypot(p.x - a.x, p.y - a.y) : Math.hypot(p.x - (a.x + Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2)) * dx), p.y - (a.y + Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2)) * dy));
        return isNearLevel || distDiag <= t;
      }
      if (d.tool === "FibExtension") {
        const a = controller.project(d.points[0]);
        const b = controller.project(d.points[1]);
        const c = d.points[2] ? controller.project(d.points[2]) : null;
        if (!a || !b || a.x == null || a.y == null || b.x == null || b.y == null) return false;
        const t = (controller.tol ?? 12) + 4;
        const distSeg = (pt, p1, p2) => {
          const dx = p2.x - p1.x, dy = p2.y - p1.y, len2 = dx * dx + dy * dy;
          if (len2 === 0) return Math.hypot(pt.x - p1.x, pt.y - p1.y);
          const tr = Math.max(0, Math.min(1, ((pt.x - p1.x) * dx + (pt.y - p1.y) * dy) / len2));
          return Math.hypot(pt.x - (p1.x + tr * dx), pt.y - (p1.y + tr * dy));
        };
        if (distSeg(p, a, b) <= t) return true;
        if (c && c.x != null && c.y != null) {
          if (distSeg(p, b, c) <= t) return true;
          const spanX = Math.max(20, Math.abs(b.x - a.x));
          const leftX = Math.min(c.x, c.x + (b.x >= a.x ? spanX : -spanX));
          const rightX = Math.max(c.x, c.x + (b.x >= a.x ? spanX : -spanX));
          if (p.x < leftX - t || p.x > rightX + t) return false;
          const extLevels = [0, 0.618, 1, 1.272, 1.618, 2, 2.618];
          const legY = b.y - a.y;
          return extLevels.some((lvl) => Math.abs(p.y - (c.y + legY * lvl)) <= t);
        }
        return false;
      }
      return origBodyHit(d, p);
    };

    const origHitTest = controller.hitTest.bind(controller);
    controller.hitTest = (px, py) => {
      const drawings = controller.engine.getDrawings();
      const tol = (controller.tol ?? 12) + 4;
      for (let j = drawings.length - 1; j >= 0; j--) {
        const d = drawings[j];
        if (d.points?.length) {
          const isPos6 = (d.tool === "LongPosition" || d.tool === "ShortPosition") && d.points.length >= 6;
          for (let i = 0; i < d.points.length; i++) {
            if (isPos6 && i !== 0 && i !== 2 && i !== 3 && i !== 4) continue;
            const pt = controller.project(d.points[i]);
            if (pt && Math.hypot(pt.x - px, pt.y - py) <= tol) {
              return { id: d.id, kind: "anchor", anchorIndex: i };
            }
          }
        }
      }
      return origHitTest(px, py);
    };

    const setCursor = (cursor) => {
      if (!el) return;
      el.style.cursor = cursor;
      el.querySelectorAll("canvas").forEach((c) => { c.style.cursor = cursor; });
    };

    const getAnchorCursor = (d, idx) => {
      if (!d) return "ew-resize";
      const t = d.tool;
      if (t === "VerticalLine" || t === "DateRange") return "ew-resize";
      if (t === "HorizontalLine" || t === "PriceRange") return "ns-resize";
      if (t === "FibRetracement" || t === "FibExtension") return "pointer";
      if (t === "LongPosition" || t === "ShortPosition") {
        if (idx === 3) return "ew-resize";
        if (idx === 2) return "move";
        return "ns-resize";
      }
      const [c0, c1] = (d.points || []).map((p) => controller.project(p));
      return (c0?.x != null && c1?.x != null && c0?.y != null && c1?.y != null)
        ? (Math.abs(c1.x - c0.x) >= Math.abs(c1.y - c0.y) ? "ew-resize" : "ns-resize")
        : "ew-resize";
    };

    controller.onMove = (e) => {
      const we = wrapEvent(e);
      const dp = controller.unproject(we.offsetX, we.offsetY);
      if (!dp) return;
      if (controller.engine.getActiveTool() && controller.engine.getDraft()) {
        controller.engine.updateDraftEnd(dp);
        return;
      }
      if (!controller.drag) {
        const hit = controller.hitTest(we.offsetX, we.offsetY);
        const nextHovered = hit ? hit.id : null;
        if (controller.hoveredId !== nextHovered) {
          controller.hoveredId = nextHovered;
          controller.primitive?.updateAllViews?.();
          controller.primitive?.redraw?.();
        }
        controller.lastX = we.offsetX;
        controller.lastY = we.offsetY;
        if (hit?.kind === "anchor") {
          const d = controller.engine.getById(hit.id);
          setCursor(getAnchorCursor(d, hit.anchorIndex));
        } else if (hit?.kind === "move") {
          setCursor("grab");
        } else {
          setCursor("");
        }
        return;
      }
      controller.lastX = we.offsetX;
      controller.lastY = we.offsetY;
      if (controller.drag.kind === "anchor") {
        const cd = controller.engine.getById(controller.drag.id);
        if (cd && (cd.tool === "LongPosition" || cd.tool === "ShortPosition")) {
          setCursor(getAnchorCursor(cd, controller.drag.anchorIndex));
        } else if (controller.drag.lastX != null && controller.drag.lastY != null) {
          const dx = Math.abs(we.offsetX - controller.drag.lastX);
          const dy = Math.abs(we.offsetY - controller.drag.lastY);
          if (dx > 2 || dy > 2) setCursor(dx >= dy ? "ew-resize" : "ns-resize");
        }
        controller.drag.lastX = we.offsetX;
        controller.drag.lastY = we.offsetY;
      } else {
        setCursor("grabbing");
      }
      const d = controller.engine.getById(controller.drag.id);
      if (!d) return;
      if (controller.drag.kind === "anchor") {
        const points = d.points.slice();
        if ((d.tool === "LongPosition" || d.tool === "ShortPosition") && points.length >= 6) {
          const idx = controller.drag.anchorIndex;
          if (idx === 0 || idx === 1) {
            const pEntry = controller.project(points[2]);
            const targetY = pEntry && pEntry.y != null ? Math.min(pEntry.y - 4, we.offsetY) : we.offsetY;
            const price = Math.max(points[2].price + 0.0001, series.coordinateToPrice(targetY) ?? dp.price);
            points[0] = { ...points[0], price };
            points[1] = { ...points[1], price };
          } else if (idx === 4 || idx === 5) {
            const pEntry = controller.project(points[2]);
            const targetY = pEntry && pEntry.y != null ? Math.max(pEntry.y + 4, we.offsetY) : we.offsetY;
            const price = Math.min(points[2].price - 0.0001, series.coordinateToPrice(targetY) ?? dp.price);
            points[4] = { ...points[4], price };
            points[5] = { ...points[5], price };
          } else if (idx === 2) {
            const pTop = controller.project(points[0]);
            const pBottom = controller.project(points[4]);
            let price;
            if (pTop && pBottom && pTop.y != null && pBottom.y != null) {
              const minY = Math.min(pTop.y, pBottom.y);
              const maxY = Math.max(pTop.y, pBottom.y);
              if (maxY - minY > 8) {
                const clampedY = Math.min(maxY - 4, Math.max(minY + 4, we.offsetY));
                price = series.coordinateToPrice(clampedY);
              }
            }
            if (price == null) {
              const minP = Math.min(points[0].price, points[4].price);
              const maxP = Math.max(points[0].price, points[4].price);
              price = Math.max(minP + 0.0001, Math.min(maxP - 0.0001, dp.price));
            }
            const intervalSec = Math.max((INTERVAL_MS[timeframe] || INTERVAL_MS["1m"]) / 1000, 1);
            const maxTime = points[3].time - intervalSec;
            const targetTime = Math.min(maxTime, dp.time);
            const targetLogical = timeToLogical(targetTime);
            points[0] = { ...points[0], time: targetTime, logical: targetLogical };
            points[2] = { ...points[2], price, time: targetTime, logical: targetLogical };
            points[3] = { ...points[3], price };
            points[4] = { ...points[4], time: targetTime, logical: targetLogical };
          } else if (idx === 3) {
            const intervalSec = Math.max((INTERVAL_MS[timeframe] || INTERVAL_MS["1m"]) / 1000, 1);
            const minTime = points[2].time + intervalSec;
            const targetTime = Math.max(minTime, dp.time);
            const targetLogical = timeToLogical(targetTime);
            points[1] = { ...points[1], time: targetTime, logical: targetLogical };
            points[3] = { ...points[3], time: targetTime, logical: targetLogical };
            points[5] = { ...points[5], time: targetTime, logical: targetLogical };
          }
        } else if ((d.tool === "LongPosition" || d.tool === "ShortPosition") && points.length >= 4) {
          const idx = controller.drag.anchorIndex;
          if (idx === 0) {
            points[0] = { ...points[0], price: dp.price };
          } else if (idx === 1) {
            const dpr = dp.price - points[1].price;
            points[1] = { ...points[1], price: dp.price };
            points[3] = { ...points[3], price: dp.price };
            points[0] = { ...points[0], price: points[0].price + dpr };
            points[2] = { ...points[2], price: points[2].price + dpr };
          } else if (idx === 2) {
            points[2] = { ...points[2], price: dp.price };
          } else if (idx === 3) {
            points[3] = { ...points[3], time: dp.time, logical: dp.logical };
          }
        } else {
          points[controller.drag.anchorIndex] = dp;
        }
        controller.engine.setPoints(controller.drag.id, points);
      } else {
        const lastLog = controller.drag.last.logical ?? timeToLogical(controller.drag.last.time);
        const currLog = dp.logical ?? timeToLogical(dp.time);
        const dLogical = (currLog != null && lastLog != null) ? currLog - lastLog : 0;
        const dpr = dp.price - controller.drag.last.price;
        const points = d.points.map((p) => {
          const baseLog = p.logical != null ? p.logical : timeToLogical(p.time);
          const nextLogical = baseLog != null ? baseLog + dLogical : null;
          const nextPrice = p.price + dpr;
          const nextTime = nextLogical != null ? logicalToTime(nextLogical) : (p.time != null ? p.time + (dp.time - controller.drag.last.time) : null);
          return {
            ...p,
            logical: nextLogical,
            price: nextPrice,
            time: nextTime,
          };
        });
        controller.engine.setPoints(controller.drag.id, points);
      }
      controller.drag.last = dp;
    };

    const origOnUp = controller.onUp.bind(controller);
    controller.onUp = () => {
      origOnUp();
      if (controller.lastX != null && controller.lastY != null) {
        const hit = controller.hitTest(controller.lastX, controller.lastY);
        if (hit?.kind === "anchor") {
          const d = controller.engine.getById(hit.id);
          setCursor(getAnchorCursor(d, hit.anchorIndex));
        } else if (hit?.kind === "move") {
          setCursor("grab");
        } else {
          setCursor("");
        }
      } else if (!controller.hoveredId) {
        setCursor("");
      }
    };

    const onCanvasLeave = () => {
      if (controller.hoveredId) {
        controller.hoveredId = null;
        controller.primitive?.updateAllViews?.();
        controller.primitive?.redraw?.();
      }
      if (!controller.drag) setCursor("");
    };
    el?.addEventListener("mouseleave", onCanvasLeave);

    const onWindowMove = (e) => {
      if (controller.drag && (!e.target || !el?.contains(e.target))) {
        controller.onMove(e);
      }
    };
    window.addEventListener("mousemove", onWindowMove);

    const updatePos = (d) => {
      if (!d?.points?.length) return setSelectedPosition(null);
      const coords = d.points.map((p) => controller.project(p)).filter((c) => c && c.x != null && c.y != null);
      if (!coords.length) return setSelectedPosition(null);
      const xs = coords.map((c) => c.x);
      const ys = coords.map((c) => c.y);
      setSelectedPosition({
        x: (Math.min(...xs) + Math.max(...xs)) / 2,
        y: Math.min(...ys),
        minY: Math.min(...ys),
        maxY: Math.max(...ys),
      });
    };

    const syncState = () => {
      const current = controller.engine.getActiveTool();
      setActiveTool((prev) => (prev === "eraser" ? "eraser" : current));
      setDrawingsCount(controller.engine.getDrawings().length);
      const selId = controller.engine.getSelectedId();
      const sel = selId ? controller.engine.getById(selId) || null : null;
      setSelectedDrawing(sel);
      updatePos(sel);
    };

    const handleRangeChange = () => {
      const selId = controller.engine.getSelectedId();
      if (selId) updatePos(controller.engine.getById(selId));
    };

    chart.timeScale().subscribeVisibleLogicalRangeChange(handleRangeChange);
    const offChange = controller.engine.onChange(syncState);
    syncState();

    return () => {
      window.removeEventListener("mousemove", onWindowMove);
      el?.removeEventListener("mouseleave", onCanvasLeave);
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(handleRangeChange);
      offChange();
      controller.destroy();
      controllerRef.current = null;
    };
  }, [chartApiRef, candleSeriesRef, symbol, timeframe, chartDataRef]);

  useEffect(() => {
    if (activeTool === "eraser" && selectedDrawing?.id) {
      controllerRef.current?.engine.remove(selectedDrawing.id);
      setSelectedDrawing(null);
      setSelectedPosition(null);
    }
  }, [activeTool, selectedDrawing?.id]);

  const selectTool = useCallback((tool) => {
    if (!controllerRef.current) return;
    if (!tool || tool === "cursor") {
      setActiveTool(null);
      controllerRef.current.engine.stopTool();
    } else if (tool === "eraser") {
      setActiveTool("eraser");
      controllerRef.current.engine.stopTool();
    } else {
      setActiveTool(tool);
      controllerRef.current.engine.startTool(tool);
    }
  }, []);

  const updateSelectedStyle = useCallback((patch) => {
    if (!controllerRef.current || !selectedDrawing?.id) return;
    controllerRef.current.engine.setStyle(selectedDrawing.id, patch);
  }, [selectedDrawing?.id]);

  const deleteSelected = useCallback(() => {
    controllerRef.current?.engine.removeSelected();
  }, []);

  const clearAll = useCallback(() => {
    controllerRef.current?.engine.removeAll();
  }, []);

  const undo = useCallback(() => {
    if (!controllerRef.current) return;
    const list = controllerRef.current.engine.getDrawings();
    if (list.length > 0) {
      controllerRef.current.engine.remove(list[list.length - 1].id);
    }
  }, []);

  return {
    activeTool,
    setActiveTool: selectTool,
    clearAll,
    undo,
    drawingsCount,
    selectedDrawing,
    selectedPosition,
    updateSelectedStyle,
    deleteSelected,
  };
}
