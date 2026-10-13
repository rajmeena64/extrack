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
import { Skeleton } from "@/components/ui/skeleton";

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
}) {
  const queryClient = useQueryClient();
  const targetSymbol = chart?.symbol ?? directSymbol;
  const targetTimeframe = toTvInterval(chart?.interval ?? directTimeframe ?? "15");
  const normalizedSymbol = useMemo(() => normalizeStoredSymbol(targetSymbol), [targetSymbol]);

  const [tf, setTf] = useState(() => targetTimeframe);
  const [isDragTarget, setIsDragTarget] = useState(false);
  const [plusMenu, setPlusMenu] = useState(null);
  const [chartReady, setChartReady] = useState(false);
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
  const chartShellRef = useRef(null);

  const rawId = String(uniqueId ?? chart?.id ?? "main").replace(/[^a-zA-Z0-9_]/g, "_");
  const containerId = `tv_chart_${rawId}`;

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
    const symbolAlerts = alerts.filter((a) => a.status === "ACTIVE" && normalizeStoredSymbol(a.symbol) === currentSym);
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

  useEffect(() => {
    let timer = null;
    let destroyed = false;

    const initWidget = () => {
      if (destroyed || !containerRef.current || !window.TradingView?.widget) return;
      try {
        setChartReady(false);
        if (widgetRef.current) {
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
            "bottom_widgetbar",
            "footer_widget",
            "trading_account_manager",
            "chart_event_hint",
            "study_market_minimized",
          ],
          enabled_features: [
            "header_symbol_search",
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
          },
        });

        widget.onChartReady(() => {
          if (destroyed) return;
          readyRef.current = true;
          const chartInstance = widget.chart();
          try {
            chartInstance.dataReady(() => setChartReady(true));
            chartInstance.onDataLoaded().subscribe(null, () => setChartReady(true));
          } catch {
            setChartReady(true);
          }
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

          syncAlertLines(chartInstance);
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
      setChartReady(false);
      try {
        widgetRef.current.setSymbol(normalizedSymbol, tvTf, () => {
          try {
            chartInstance.dataReady(() => setChartReady(true));
          } catch {
            setChartReady(true);
          }
        });
      } catch {
        setChartReady(true);
      }
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
    const t = setTimeout(() => setChartReady(true), 4000);
    return () => clearTimeout(t);
  }, [normalizedSymbol, tf]);

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
      {!chartReady && (
        <div className="absolute inset-0 z-20 flex flex-col p-4 bg-[var(--bg-card)] pointer-events-none">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-light)]">
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-14" />
              <Skeleton className="h-5 w-16" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-16" />
            </div>
          </div>
          <div className="flex-1 flex items-end gap-2 pt-6 pb-4">
            {Array.from({ length: 16 }).map((_, i) => (
              <Skeleton key={i} className="flex-1" style={{ height: `${20 + ((i * 37) % 65)}%` }} />
            ))}
          </div>
        </div>
      )}
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
