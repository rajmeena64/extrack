import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { normalizeStoredSymbol } from "@/utils/trading/symbols";
import { readDraggedSymbol } from "@/features/markets/components/MarketTerminal/utils/terminalHelpers";
import { createTvDatafeed } from "./datafeeds/tvDatafeed";
import chartDrawingsApi from "@/utils/api/chartDrawingsApi";
import { useUserSettings } from "@/hooks/useUserSettings";
import { saveUserSettings } from "@/utils/user/userSettings";
import { useTheme } from "@/context/ThemeContext";
import { API_URL } from "@/utils/common/constants";
import { Bell, ArrowUpRight, ArrowDownRight, ChartLine } from "@/icons/lucideIcons";
import { formatTradePrice } from "@/utils/trading/tradeCalculations";
import { createTvBrokerAdapter } from "./brokerAdapter";

const readCssVar = (name) => {
  if (typeof window === "undefined") return "";
  return getComputedStyle(document.body).getPropertyValue(name).trim();
};

const toTvInterval = (tf) => {
  const s = String(tf ?? "15").trim();
  const m = s.match(/^(\d*)([a-zA-Z]+)$/);
  if (!m) return s;
  const val = parseInt(m[1] || "1", 10) || 1;
  const u = m[2];
  if (u === "m" || u.toLowerCase().startsWith("min")) return String(val);
  if (u.toLowerCase().startsWith("h")) return String(val * 60);
  if (u.toLowerCase().startsWith("d")) return `${val}D`;
  if (u.toLowerCase().startsWith("w")) return `${val}W`;
  if (u === "M" || u.toLowerCase().startsWith("mo")) return `${val}M`;
  return s;
};

const sanitizeDrawingState = (st, sym) => {
  if (!st?.charts?.[0]?.panes?.[0]?.sources) return null;
  const clone = JSON.parse(JSON.stringify(st));
  const ms = clone.charts[0].panes[0].sources.find((s) => s?.type === "MainSeries");
  if (ms?.state && sym) {
    ms.state.symbol = sym;
    ms.state.shortName = sym;
  }
  return clone;
};

const readStoredChartState = (sym) => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("entrack_chart_global_layout");
    if (raw) {
      const parsed = JSON.parse(raw);
      return sanitizeDrawingState(parsed?.state ?? parsed, sym);
    }
  } catch {}
  return null;
};

function Chart({
  chart,
  datafeed: customDatafeed,
  darkMode,
  symbol: directSymbol,
  timeframe: directTimeframe,
  active = false,
  alerts = [],
  priceDigits,
  onAddAlert,
  onUpdateAlertPrice,
  onDeleteAlert,
  onOpenOrderPanel,
  onSymbolChange,
  onIntervalChange,
  onDropSymbol,
  onActivate,
  uniqueId,
  className = "",
  trades = [],
  disableSymbolChange = false,
  showAccountManager = false,
}) {
  const queryClient = useQueryClient();
  const targetSymbol = chart?.symbol ?? directSymbol;
  const targetTimeframe = toTvInterval(chart?.interval ?? directTimeframe ?? "15");
  const normalizedSymbol = useMemo(() => normalizeStoredSymbol(targetSymbol), [targetSymbol]);

  const [tf, setTf] = useState(() => targetTimeframe);
  const [isDragTarget, setIsDragTarget] = useState(false);
  const [plusMenu, setPlusMenu] = useState(null);
  const { darkMode: contextDarkMode } = useTheme() || {};
  const isDark = Boolean(darkMode ?? contextDarkMode ?? (typeof document !== "undefined" && document.documentElement.classList.contains("dark")));

  useEffect(() => {
    if (!plusMenu) return;
    const onKey = (e) => {
      if (e.key === "Escape") setPlusMenu(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [plusMenu]);

  const containerRef = useRef(null);
  const widgetRef = useRef(null);
  const readyRef = useRef(false);
  const orderLinesRef = useRef(new Map());
  const executionsRef = useRef(null);
  const chartShellRef = useRef(null);

  const rawId = String(uniqueId ?? chart?.id ?? "main").replace(/[^a-zA-Z0-9_]/g, "_");
  const containerId = `tv_chart_${rawId}`;
  const alertsRef = useRef(alerts);
  alertsRef.current = alerts;

  const currentSymbolRef = useRef(normalizedSymbol);
  useEffect(() => { currentSymbolRef.current = normalizedSymbol; }, [normalizedSymbol]);
  const { data: userSettings } = useUserSettings();
  const lastLayoutRef = useRef(null);
  const chartSettingsRef = useRef({});
  const settingsTimerRef = useRef(null);
  const pendingSaveRef = useRef(null);
  const saveTimerRef = useRef(null);
  const isLoadingRef = useRef(false);
  const isInternalChangeRef = useRef(false);
  const activeResolutionRef = useRef(targetTimeframe);
  const lastLoadedSymbolRef = useRef(normalizedSymbol);

  useEffect(() => {
    const serverSettings = userSettings?.chart_settings;
    if (serverSettings && typeof serverSettings === "object") {
      chartSettingsRef.current = { ...chartSettingsRef.current, ...serverSettings };
    } else {
      try {
        const local = localStorage.getItem("entrack_chart_settings");
        if (local) chartSettingsRef.current = JSON.parse(local);
      } catch {}
    }
  }, [userSettings]);

  const scheduleSettingsSave = useCallback(() => {
    if (settingsTimerRef.current) clearTimeout(settingsTimerRef.current);
    settingsTimerRef.current = setTimeout(() => {
      saveUserSettings({ chart_settings: chartSettingsRef.current }).catch(() => {});
    }, 1000);
  }, []);

  const flushDrawings = useCallback((st) => {
    if (!st) return;
    try {
      fetch(`${API_URL}/api/v1/chart-drawings/__GLOBAL__?flush=true`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ state: st }),
        keepalive: true,
      }).catch(() => {});
    } catch {}
  }, []);

  useEffect(() => {
    const handleBlur = () => {
      const iframe = containerRef.current?.querySelector("iframe");
      if (iframe && document.activeElement === iframe) onActivate?.();
    };
    window.addEventListener("blur", handleBlur);
    return () => window.removeEventListener("blur", handleBlur);
  }, [onActivate]);

  useEffect(() => {
    const handleUnload = () => {
      if (pendingSaveRef.current?.state) {
        flushDrawings(pendingSaveRef.current.state);
      }
    };
    window.addEventListener("beforeunload", handleUnload);
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") handleUnload();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      document.removeEventListener("visibilitychange", handleVisibility);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [flushDrawings]);

  const syncAlertLines = useCallback((chartInstance) => {
    if (!chartInstance) return;
    const activeMap = orderLinesRef.current;
    const currentSym = normalizeStoredSymbol(currentSymbolRef.current || targetSymbol);
    const sourceAlerts = alertsRef.current || alerts;
    const symbolAlerts = (Array.isArray(sourceAlerts) ? sourceAlerts : []).filter((a) => a.status === "ACTIVE" && normalizeStoredSymbol(a.symbol) === currentSym);
    const validIds = new Set(symbolAlerts.map((a) => String(a.id)));

    for (const [id, line] of activeMap.entries()) {
      if (!validIds.has(id)) {
        try { line.remove(); } catch {}
        activeMap.delete(id);
      }
    }

    symbolAlerts.forEach((alert) => {
      const price = Number(alert.targetPrice);
      if (!Number.isFinite(price) || price <= 0) return;
      const alertId = String(alert.id);
      let line = activeMap.get(alertId);

      if (!line) {
        try {
          line = chartInstance.createOrderLine({ disableUndo: true });
          line
            .setPrice(price)
            .setText(`Alert: ${currentSym}`)
            .setEditable(true)
            .setCancellable(true)
            .setLineColor("#f59e0b")
            .setBodyBorderColor("#f59e0b")
            .setBodyBackgroundColor(readCssVar("--bg-card"))
            .setBodyTextColor("#f59e0b")
            .setCancelButtonBackgroundColor(readCssVar("--bg-card"))
            .setCancelButtonBorderColor("#f59e0b")
            .setCancelButtonIconColor("#f59e0b")
            .setLineStyle(1)
            .setExtendLeft(true)
            .onMove(() => {
              const newPrice = line.getPrice();
              if (Number.isFinite(newPrice) && newPrice > 0) {
                onUpdateAlertPrice?.(alert.id, newPrice);
              }
            })
            .onCancel(() => {
              onDeleteAlert?.(alert.id);
            });
          activeMap.set(alertId, line);
        } catch {}
      } else {
        try {
          line.setPrice(price);
        } catch {}
      }
    });
  }, [alerts, targetSymbol, isDark, onUpdateAlertPrice, onDeleteAlert]);

  const syncAlertLinesRef = useRef(syncAlertLines);
  syncAlertLinesRef.current = syncAlertLines;

  const syncTradeExecutions = useCallback((chartInstance) => {
    if (typeof executionsRef.current === "function") {
      executionsRef.current();
      executionsRef.current = null;
    }
    if (!chartInstance) return;
    const cw = chartInstance._chartWidget;
    const pw = cw?.paneWidgets?.()?.[0];
    const wrapper = pw?._div;
    if (!wrapper || !Array.isArray(trades) || !trades.length) return;

    const doc = wrapper.ownerDocument;
    const win = doc.defaultView || window;
    let canvas = wrapper.querySelector(".entrack-trade-markers");
    if (!canvas) {
      canvas = doc.createElement("canvas");
      canvas.className = "entrack-trade-markers";
      canvas.style.position = "absolute";
      canvas.style.left = "0";
      canvas.style.top = "0";
      canvas.style.pointerEvents = "none";
      canvas.style.zIndex = "5";
      wrapper.appendChild(canvas);
    }

    const model = cw.model();
    const ts = model?.timeScale();
    const ps = model?.mainSeries()?.priceScale();
    const bars = model?.mainSeries()?.bars();
    if (!model || !ts || !ps || !bars) return;

    const toSec = (v) => {
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? (n > 1e11 ? Math.floor(n / 1000) : Math.floor(n)) : null;
    };

    const findBarIndex = (sec) => {
      if (bars.isEmpty?.()) return null;
      let low = bars.firstIndex(), high = bars.lastIndex(), best = null;
      while (low <= high) {
        const mid = (low + high) >> 1;
        const b = bars.valueAt(mid);
        if (!b) break;
        if (b[0] <= sec) { best = mid; low = mid + 1; }
        else { high = mid - 1; }
      }
      return best;
    };

    let minT = Infinity, maxT = -Infinity;
    trades.forEach((t) => {
      const en = toSec(t.entryTime);
      const ex = toSec(t.exitTime);
      if (en) { minT = Math.min(minT, en); maxT = Math.max(maxT, en); }
      if (ex) { minT = Math.min(minT, ex); maxT = Math.max(maxT, ex); }
    });

    if (minT !== Infinity && maxT !== -Infinity && typeof chartInstance.setVisibleRange === "function") {
      const span = Math.max(maxT - minT, 1800);
      try { chartInstance.setVisibleRange({ from: minT - span, to: maxT + span }); } catch {}
    }

    let mousePoint = null;
    const render = () => {
      if (!canvas || !canvas.parentNode) return;
      const rect = wrapper.getBoundingClientRect();
      const dpr = win.devicePixelRatio || 1;
      const targetW = Math.round(rect.width * dpr);
      const targetH = Math.round(rect.height * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
      }
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const activeSym = chartInstance.symbol?.();
      if (activeSym && normalizeStoredSymbol(activeSym) !== normalizedSymbol) return;

      const points = [];
      const pairs = [];
      trades.forEach((t) => {
        const isShort = t.tradeType === "short";
        const enSec = toSec(t.entryTime);
        const enPrice = Number(t.entryPrice);
        const exSec = toSec(t.exitTime);
        const exPrice = Number(t.exitPrice);
        const enIdx = enSec != null ? findBarIndex(enSec) : null;
        const exIdx = exSec != null ? findBarIndex(exSec) : null;
        const sameCandle = enIdx != null && exIdx != null && enIdx === exIdx;

        let entryPt = null, exitPt = null;
        if (enIdx != null && Number.isFinite(enPrice)) {
          const rawX = ts.indexToCoordinate(enIdx);
          const rawY = ps.priceToCoordinate(enPrice);
          if (rawX != null && rawY != null) {
            entryPt = {
              x: rawX + (sameCandle ? -12 : 0),
              y: rawY,
              color: isShort ? "#f23645" : "#089981",
              direction: isShort ? "down" : "up",
              price: enPrice,
            };
            points.push(entryPt);
          }
        }
        if (exIdx != null && Number.isFinite(exPrice)) {
          const rawX = ts.indexToCoordinate(exIdx);
          const rawY = ps.priceToCoordinate(exPrice);
          if (rawX != null && rawY != null) {
            exitPt = {
              x: rawX + (sameCandle ? 12 : 0),
              y: rawY,
              color: "#2962ff",
              direction: isShort ? "up" : "down",
              price: exPrice,
            };
            points.push(exitPt);
          }
        }
        if (entryPt && exitPt) pairs.push({ entry: entryPt, exit: exitPt });
      });

      if (pairs.length > 0) {
        ctx.save();
        ctx.setLineDash([4 * dpr, 3 * dpr]);
        ctx.strokeStyle = "rgba(148, 163, 184, 0.6)";
        ctx.lineWidth = 1.2 * dpr;
        pairs.forEach(({ entry, exit }) => {
          ctx.beginPath();
          ctx.moveTo(entry.x * dpr, entry.y * dpr);
          ctx.lineTo(exit.x * dpr, exit.y * dpr);
          ctx.stroke();
        });
        ctx.restore();
      }

      const r = 9 * dpr;
      let hovered = null;
      points.forEach((p) => {
        const px = p.x * dpr;
        const py = p.y * dpr;
        if (mousePoint && Math.hypot(mousePoint.x * dpr - px, mousePoint.y * dpr - py) <= r + 6 * dpr) {
          hovered = { ...p, px, py };
        }
        ctx.save();
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
        ctx.shadowBlur = 4 * dpr;
        ctx.shadowOffsetY = 1 * dpr;
        ctx.fill();
        ctx.lineWidth = 1.5 * dpr;
        ctx.strokeStyle = "#ffffff";
        ctx.stroke();
        ctx.restore();

        const arrowSize = r * 0.45;
        ctx.beginPath();
        ctx.fillStyle = "#ffffff";
        if (p.direction === "up") {
          ctx.moveTo(px, py - arrowSize);
          ctx.lineTo(px + arrowSize * 0.75, py + arrowSize * 0.55);
          ctx.lineTo(px - arrowSize * 0.75, py + arrowSize * 0.55);
        } else {
          ctx.moveTo(px, py + arrowSize);
          ctx.lineTo(px + arrowSize * 0.75, py - arrowSize * 0.55);
          ctx.lineTo(px - arrowSize * 0.75, py - arrowSize * 0.55);
        }
        ctx.closePath();
        ctx.fill();
      });

      if (hovered && hovered.price != null) {
        const text = `@ ${hovered.price}`;
        ctx.font = `600 ${11 * dpr}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        const textMetrics = ctx.measureText(text);
        const padX = 8 * dpr, padY = 4 * dpr;
        const boxW = textMetrics.width + padX * 2;
        const boxH = 18 * dpr + padY * 2;
        const caretH = 5 * dpr;
        let boxY = hovered.py - r - boxH - caretH - 2 * dpr;
        let caretDown = true;
        if (boxY < 5 * dpr) {
          boxY = hovered.py + r + caretH + 2 * dpr;
          caretDown = false;
        }
        const boxX = Math.max(5 * dpr, Math.min(canvas.width - boxW - 5 * dpr, hovered.px - boxW / 2));
        const caretX = Math.max(boxX + 6 * dpr, Math.min(boxX + boxW - 6 * dpr, hovered.px));

        ctx.save();
        ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
        ctx.shadowBlur = 6 * dpr;
        ctx.shadowOffsetY = 2 * dpr;
        ctx.beginPath();
        if (typeof ctx.roundRect === "function") {
          ctx.roundRect(boxX, boxY, boxW, boxH, 4 * dpr);
        } else {
          ctx.rect(boxX, boxY, boxW, boxH);
        }
        ctx.fillStyle = "#1e222d";
        ctx.fill();
        ctx.shadowColor = "transparent";
        ctx.lineWidth = 1.5 * dpr;
        ctx.strokeStyle = hovered.color;
        ctx.stroke();

        ctx.beginPath();
        ctx.fillStyle = "#1e222d";
        ctx.strokeStyle = hovered.color;
        ctx.lineWidth = 1.5 * dpr;
        if (caretDown) {
          const top = boxY + boxH;
          ctx.moveTo(caretX - 4 * dpr, top - 1 * dpr);
          ctx.lineTo(caretX, top + caretH);
          ctx.lineTo(caretX + 4 * dpr, top - 1 * dpr);
        } else {
          ctx.moveTo(caretX - 4 * dpr, boxY + 1 * dpr);
          ctx.lineTo(caretX, boxY - caretH);
          ctx.lineTo(caretX + 4 * dpr, boxY + 1 * dpr);
        }
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(text, boxX + boxW / 2, boxY + boxH / 2);
        ctx.restore();
      }
    };

    const unsubs = [];
    const sub = (target) => {
      try {
        target?.subscribe?.(null, render);
        unsubs.push(() => { try { target?.unsubscribe?.(null, render); } catch {} });
      } catch {}
    };
    sub(ts?.visibleBarsStrictRangeChanged());
    sub(ts?.barSpacingChanged());
    sub(ts?.rightOffsetChanged());
    sub(ps?.priceRangeChanged());
    sub(chartInstance?.onVisibleRangeChanged());
    sub(chartInstance?.onSymbolChanged?.());

    const onMouseMove = (e) => {
      const rect = wrapper.getBoundingClientRect();
      mousePoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      render();
    };
    const onMouseLeave = () => {
      mousePoint = null;
      render();
    };
    wrapper.addEventListener("mousemove", onMouseMove);
    wrapper.addEventListener("mouseleave", onMouseLeave);

    let ro = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => render());
      ro.observe(wrapper);
    }

    render();

    executionsRef.current = () => {
      unsubs.forEach((u) => u());
      ro?.disconnect();
      wrapper.removeEventListener("mousemove", onMouseMove);
      wrapper.removeEventListener("mouseleave", onMouseLeave);
      canvas.remove();
    };
  }, [trades]);

  const syncTradeExecutionsRef = useRef(syncTradeExecutions);
  syncTradeExecutionsRef.current = syncTradeExecutions;

  useEffect(() => {
    let timer = null;
    let destroyed = false;

    const initWidget = () => {
      if (destroyed || !containerRef.current || !window.TradingView?.widget) return;
      try {
        if (widgetRef.current) {
          if (typeof executionsRef.current === "function") {
            executionsRef.current();
            executionsRef.current = null;
          }
          try { widgetRef.current.remove(); } catch {}
          widgetRef.current = null;
          readyRef.current = false;
          orderLinesRef.current.clear();
        }

        const datafeed = customDatafeed || createTvDatafeed({ queryClient, uniqueId: rawId });
        const initialSavedData = readStoredChartState(normalizedSymbol);
        const widget = new window.TradingView.widget({
          container: containerId,
          symbol: normalizedSymbol,
          interval: toTvInterval(tf),
          library_path: "/charting_library/",
          datafeed,
          theme: isDark ? "Dark" : "Light",
          locale: "en",
          autosize: true,
          auto_save_delay: 2,
          saved_data: initialSavedData || undefined,
          custom_font_family: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          ...(showAccountManager ? { brokerFactory: () => createTvBrokerAdapter() } : {}),
          settings_adapter: {
            initialSettings: chartSettingsRef.current || {},
            setValue: (k, v) => {
              chartSettingsRef.current[k] = v;
              try { localStorage.setItem("entrack_chart_settings", JSON.stringify(chartSettingsRef.current)); } catch {}
              scheduleSettingsSave();
            },
            removeValue: (k) => {
              delete chartSettingsRef.current[k];
              try { localStorage.setItem("entrack_chart_settings", JSON.stringify(chartSettingsRef.current)); } catch {}
              scheduleSettingsSave();
            },
          },
          disabled_features: [
            "widgetbar",
            "right_toolbar",
            ...(!showAccountManager ? ["bottom_widgetbar", "footer_widget", "trading_account_manager"] : []),
            "chart_event_hint",
            "study_market_minimized",
            ...(disableSymbolChange ? ["header_symbol_search", "symbol_search_hot_key", "compare_symbol"] : []),
          ],
          enabled_features: [
            ...(!disableSymbolChange ? ["header_symbol_search"] : []),
            ...(showAccountManager ? ["trading_account_manager", "open_account_manager"] : []),
            "chart_crosshair_menu",
            "side_toolbar_in_fullscreen_mode",
            "items_favoriting",
            "hide_right_toolbar",
            "property_pages",
            "show_chart_property_page",
            "use_localstorage_for_settings",
            "custom_resolutions",
          ],
          overrides: {
            "scalesProperties.fontSize": 12,
            "tradingProperties.showExecutions": true,
            "tradingProperties.showExecutionsLabels": true,
          },
        });

        widget.onChartReady(() => {
          if (destroyed) return;
          readyRef.current = true;
          const chartInstance = widget.chart();
          try {
            chartInstance.applyOverrides({
              "tradingProperties.showExecutions": true,
              "tradingProperties.showExecutionsLabels": true,
            });
          } catch {}
          const target = currentSymbolRef.current ?? normalizedSymbol;
          lastLoadedSymbolRef.current = target;
          const hasLocalLineTools = initialSavedData?.charts?.[0]?.panes?.[0]?.sources?.some((s) => String(s?.type ?? "").startsWith("LineTool"));
          if (!hasLocalLineTools && target) {
            isLoadingRef.current = true;
            chartDrawingsApi.getDrawings("__GLOBAL__").then((res) => {
              if (res?.drawing?.state && (currentSymbolRef.current === target || !currentSymbolRef.current)) {
                const clean = sanitizeDrawingState(res.drawing.state, target);
                if (clean) {
                  try {
                    localStorage.setItem("entrack_chart_global_layout", JSON.stringify({ state: clean, updated_at: Date.now() }));
                    widgetRef.current?.load(clean);
                  } catch {}
                }
              }
            }).catch(() => {}).finally(() => {
              setTimeout(() => { isLoadingRef.current = false; }, 300);
            });
          }
          const rawCurrentTvSymbol = chartInstance.symbol ? chartInstance.symbol() : null;
          const currentTvSymbol = rawCurrentTvSymbol ? normalizeStoredSymbol(rawCurrentTvSymbol.includes(":") ? rawCurrentTvSymbol.split(":")[1] : rawCurrentTvSymbol) : null;

          chartInstance.onSymbolChanged().subscribe(null, (symbolInfo) => {
            const raw = symbolInfo?.name;
            const clean = normalizeStoredSymbol(raw?.includes(":") ? raw.split(":")[1] : raw);
            if (clean && clean !== lastLoadedSymbolRef.current) {
              lastLoadedSymbolRef.current = clean;
              currentSymbolRef.current = clean;
              onSymbolChange?.(clean);
              syncAlertLinesRef.current?.(chartInstance);
              syncTradeExecutionsRef.current?.(chartInstance);
            }
          });

          chartInstance.onIntervalChanged().subscribe(null, (newInterval) => {
            activeResolutionRef.current = newInterval;
            isInternalChangeRef.current = true;
            setTf(newInterval);
            onIntervalChange?.(newInterval);
          });

          if (target && currentTvSymbol && currentTvSymbol !== target) {
            widget.setSymbol(target, toTvInterval(tf));
          }

          const iframeEl = containerRef.current?.querySelector("iframe");
          if (iframeEl) {
            try {
              iframeEl.contentWindow?.addEventListener("pointerdown", () => onActivate?.());
              iframeEl.contentWindow?.addEventListener("mousedown", () => onActivate?.());
              const doc = iframeEl.contentDocument;
              if (doc?.head && !doc.getElementById("entrack-font-fix")) {
                const styleEl = doc.createElement("style");
                styleEl.id = "entrack-font-fix";
                styleEl.textContent = "html, body, .chart-page { -webkit-text-size-adjust: 100% !important; text-size-adjust: 100% !important; }";
                doc.head.appendChild(styleEl);
              }
            } catch {}
          }

          widget.subscribe("onAutoSaveNeeded", () => {
            if (isLoadingRef.current) return;
            try {
              widget.save((state) => {
                if (!state?.charts?.[0]?.panes || isLoadingRef.current) return;
                lastLayoutRef.current = state;
                try {
                  localStorage.setItem("entrack_chart_global_layout", JSON.stringify({ state, updated_at: Date.now() }));
                } catch {}
                pendingSaveRef.current = { state };
                if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
                saveTimerRef.current = setTimeout(() => {
                  if (pendingSaveRef.current?.state) {
                    chartDrawingsApi.saveDrawings("__GLOBAL__", pendingSaveRef.current.state, false).catch(() => {});
                  }
                }, 1000);
              });
            } catch {}
          });

          widget.subscribe("onPlusClick", (e) => {
            const clickPrice = Number(e?.price);
            if (!Number.isFinite(clickPrice) || clickPrice <= 0) return;
            onActivate?.();
            const liveSym = currentSymbolRef.current || normalizedSymbol;
            const iframe = containerRef.current?.querySelector("iframe");
            const chartRect = chartShellRef.current?.getBoundingClientRect();
            const iframeRect = iframe?.getBoundingClientRect();
            const rawX = (iframeRect && chartRect ? iframeRect.left - chartRect.left : 0) + (e?.clientX || 0);
            const rawY = (iframeRect && chartRect ? iframeRect.top - chartRect.top : 0) + (e?.clientY || 0);
            const shellW = chartShellRef.current?.clientWidth || 600;
            const shellH = chartShellRef.current?.clientHeight || 400;
            const menuW = 210;
            const menuH = 140;
            const posX = rawX + menuW > shellW ? Math.max(10, rawX - menuW - 10) : rawX + 10;
            const posY = rawY + menuH > shellH ? Math.max(10, rawY - menuH - 10) : rawY;
            setPlusMenu({ price: clickPrice, symbol: liveSym, x: posX, y: posY });
          });

          const runSyncAlerts = () => {
            try { syncAlertLinesRef.current?.(chartInstance); } catch {}
            try { syncTradeExecutionsRef.current?.(chartInstance); } catch {}
          };
          runSyncAlerts();
          if (typeof chartInstance.dataReady === "function") chartInstance.dataReady(runSyncAlerts);
        });

        widgetRef.current = widget;
      } catch {}
    };

    if (window.TradingView?.widget) {
      initWidget();
    } else {
      timer = setInterval(() => {
        if (window.TradingView?.widget) {
          clearInterval(timer);
          initWidget();
        }
      }, 50);
    }

    return () => {
      destroyed = true;
      if (timer) clearInterval(timer);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (widgetRef.current) {
        if (typeof executionsRef.current === "function") {
          executionsRef.current();
          executionsRef.current = null;
        }
        try { widgetRef.current.remove(); } catch {}
        widgetRef.current = null;
        readyRef.current = false;
        orderLinesRef.current.clear();
      }
    };
  }, [containerId]);

  useEffect(() => {
    if (!readyRef.current || !widgetRef.current) return;
    try {
      if (typeof widgetRef.current.changeTheme === "function") {
        widgetRef.current.changeTheme(isDark ? "Dark" : "Light");
      }
      const chartInstance = widgetRef.current.chart();
      if (chartInstance) {
        syncAlertLines(chartInstance);
      }
    } catch {}
  }, [isDark, syncAlertLines]);

  useEffect(() => {
    if (!readyRef.current || !widgetRef.current) return;
    const tvTf = toTvInterval(tf);
    const chartInstance = widgetRef.current.chart();
    if (lastLoadedSymbolRef.current !== normalizedSymbol) {
      if (pendingSaveRef.current?.state) {
        chartDrawingsApi.saveDrawings("__GLOBAL__", pendingSaveRef.current.state, false).catch(() => {});
        pendingSaveRef.current = null;
      }
      lastLoadedSymbolRef.current = normalizedSymbol;
      currentSymbolRef.current = normalizedSymbol;
      activeResolutionRef.current = tvTf;
      try {
        widgetRef.current.setSymbol(normalizedSymbol, tvTf);
      } catch {}
    } else if (activeResolutionRef.current !== tvTf) {
      if (isInternalChangeRef.current) {
        isInternalChangeRef.current = false;
        return;
      }
      activeResolutionRef.current = tvTf;
      try {
        chartInstance.setResolution(tvTf);
      } catch {}
    }
  }, [normalizedSymbol, tf]);

  useEffect(() => {
    if (!readyRef.current || !widgetRef.current) return;
    try {
      syncAlertLines(widgetRef.current.chart());
    } catch {}
  }, [alerts, syncAlertLines]);

  useEffect(() => {
    if (!readyRef.current || !widgetRef.current) return;
    try {
      syncTradeExecutions(widgetRef.current.chart());
    } catch {}
  }, [trades, syncTradeExecutions]);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    if (!isDragTarget) setIsDragTarget(true);
  };

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragTarget(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragTarget(false);
    const sym = readDraggedSymbol(e);
    if (sym) {
      if (onDropSymbol) onDropSymbol(sym);
      else if (onSymbolChange) onSymbolChange(sym);
    }
  };

  return (
    <div
      ref={chartShellRef}
      className={`relative flex flex-col h-full w-full select-none bg-[var(--bg-card)] ${
        active ? "ring-1 ring-[var(--primary)]" : ""
      } ${isDragTarget ? "ring-2 ring-[var(--primary)] bg-[var(--primary)]/5" : ""} ${className}`}
      onClick={() => onActivate?.()}
      onPointerDown={() => onActivate?.()}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div id={containerId} ref={containerRef} className="w-full h-full min-h-0 relative" />
      {plusMenu && (
        <>
          <div
            className="absolute inset-0 z-40 bg-transparent"
            onClick={() => setPlusMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              setPlusMenu(null);
            }}
          />
          <div
            className="absolute z-50 min-w-[210px] p-1 rounded-lg border shadow-xl bg-[var(--bg-card)] border-[var(--border-light)] text-[var(--text-primary)] animate-in fade-in zoom-in-95 duration-100 select-none"
            style={{ left: plusMenu.x, top: plusMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-2.5 py-1 text-[11px] font-bold text-[var(--text-secondary)] border-b border-[var(--border-light)] mb-1 flex items-center justify-between">
              <span>{plusMenu.symbol}</span>
              <span className="font-mono">{formatTradePrice(plusMenu.price, priceDigits)}</span>
            </div>
            <button
              type="button"
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium hover:bg-[var(--bg-hover)] text-left cursor-pointer transition-colors"
              onClick={() => {
                onAddAlert?.({ symbol: plusMenu.symbol, targetPrice: plusMenu.price });
                setPlusMenu(null);
              }}
            >
              <Bell size={13} className="text-amber-500 shrink-0" />
              <span>Add alert at {formatTradePrice(plusMenu.price, priceDigits)}</span>
            </button>
            <button
              type="button"
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium hover:bg-[var(--bg-hover)] text-left cursor-pointer transition-colors"
              onClick={() => {
                onOpenOrderPanel?.({ price: plusMenu.price, side: "buy", symbol: plusMenu.symbol });
                setPlusMenu(null);
              }}
            >
              <ArrowUpRight size={13} className="text-emerald-500 shrink-0" />
              <span>Buy at {formatTradePrice(plusMenu.price, priceDigits)}</span>
            </button>
            <button
              type="button"
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium hover:bg-[var(--bg-hover)] text-left cursor-pointer transition-colors"
              onClick={() => {
                onOpenOrderPanel?.({ price: plusMenu.price, side: "sell", symbol: plusMenu.symbol });
                setPlusMenu(null);
              }}
            >
              <ArrowDownRight size={13} className="text-red-500 shrink-0" />
              <span>Sell at {formatTradePrice(plusMenu.price, priceDigits)}</span>
            </button>
            <button
              type="button"
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium hover:bg-[var(--bg-hover)] text-left cursor-pointer transition-colors"
              onClick={() => {
                try {
                  widgetRef.current?.chart()?.createShape({ price: plusMenu.price }, { shape: "horizontal_line" });
                } catch {}
                setPlusMenu(null);
              }}
            >
              <ChartLine size={13} className="text-[var(--text-secondary)] shrink-0" />
              <span>Draw horizontal line</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default Chart;
