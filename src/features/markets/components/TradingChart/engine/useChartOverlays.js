import { useCallback, useRef } from "react";
import { LineSeries, LineStyle } from "lightweight-charts";
import { INTERVAL_MS } from "../utils/chartHelpers";
import { formatTradePrice } from "@/utils/trading/tradeCalculations";

const getConnectorColor = () => {
  return getComputedStyle(document.body).getPropertyValue("--text-muted").trim() || "#64748b";
};

export function useChartOverlays({
  chartApiRef,
  candleSeriesRef,
  markerPrimitiveRef,
  pricePrecision,
}) {
  const overlayLineSeriesRef = useRef([]);
  const overlayPriceLinesRef = useRef([]);

  const clearOverlays = useCallback(() => {
    if (chartApiRef.current) {
      overlayLineSeriesRef.current.forEach((series) => {
        try {
          chartApiRef.current.removeSeries(series);
        } catch {
        }
      });
    }
    overlayLineSeriesRef.current = [];

    if (candleSeriesRef?.current) {
      overlayPriceLinesRef.current.forEach((priceLine) => {
        try {
          candleSeriesRef.current.removePriceLine(priceLine);
        } catch {
        }
      });
    }
    overlayPriceLinesRef.current = [];
    markerPrimitiveRef.current?.setMarkers([]);
  }, [chartApiRef, candleSeriesRef, markerPrimitiveRef]);

  const updateOverlays = useCallback(
    ({ markers = [], lines = [], trades = [], alerts = [], symbol = "", candles = [], timeframe = "1m", maxTime = null }) => {
      const chartApi = chartApiRef.current;
      if (!chartApi || !candles.length) {
        clearOverlays();
        return;
      }

      const candleTimes = candles.map((c) => c.time);
      const candleTimeSet = new Set(candleTimes);
      const intervalSeconds = Math.max((INTERVAL_MS[timeframe] || INTERVAL_MS["1m"]) / 1000, 1);

      const resolveTime = (value) => {
        if (!value) return null;
        const num = Number(value);
        const tsMs = Number.isFinite(num) ? num : new Date(value).getTime();
        if (!Number.isFinite(tsMs)) return null;
        const tsSec = tsMs > 1e12 ? Math.floor(tsMs / 1000) : Math.floor(tsMs);
        const snappedTime = Math.floor(tsSec / intervalSeconds) * intervalSeconds;

        if (candleTimeSet.has(snappedTime)) return snappedTime;

        let nearestTime = null;
        let nearestDistance = Infinity;
        for (const candleTime of candleTimes) {
          const distance = Math.abs(candleTime - snappedTime);
          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestTime = candleTime;
          }
        }
        return nearestDistance <= intervalSeconds ? nearestTime : snappedTime;
      };

      clearOverlays();
      const allMarkers = maxTime ? markers.filter((m) => !m?.time || resolveTime(m.time) <= maxTime) : [...markers];

      if (Array.isArray(trades) && trades.length > 0) {
        trades.forEach((t, i) => {
          const isShort = t.tradeType === "short";
          const entryTime = resolveTime(t.entryTime);
          const exitTime = resolveTime(t.exitTime);
          const isSameCandle = entryTime && exitTime && entryTime === exitTime;
          const tradeId = t.id ?? i;

          if (entryTime && t.entryPrice && (!maxTime || entryTime <= maxTime)) {
            allMarkers.push({
              time: entryTime,
              price: Number(t.entryPrice),
              direction: isShort ? "down" : "up",
              color: isShort ? "#f23645" : "#089981",
              offsetX: isSameCandle ? -12 : 0,
              radius: 9,
              tradeId,
              isEntry: true,
              label: `@ ${t.entryPrice}`,
            });
          }

          if (exitTime && t.exitPrice && (!maxTime || exitTime <= maxTime)) {
            allMarkers.push({
              time: exitTime,
              price: Number(t.exitPrice),
              direction: isShort ? "up" : "down",
              color: "#2962ff",
              offsetX: isSameCandle ? 12 : 0,
              radius: 9,
              tradeId,
              isExit: true,
              label: `@ ${t.exitPrice}`,
            });
          }
        });
      }

      if (Array.isArray(lines) && lines.length > 0) {
        const precision = Number(pricePrecision);
        const priceFormat = Number.isInteger(precision) && precision >= 0 && precision <= 8
          ? { type: "price", precision, minMove: 10 ** -precision }
          : undefined;

        lines.forEach((line) => {
          if (!line?.from || !line?.to) return;
          const fromTime = resolveTime(line.from.time);
          const toTime = resolveTime(line.to.time);
          if (maxTime && ((fromTime && fromTime > maxTime) || (toTime && toTime > maxTime))) return;
          const lineSeries = chartApi.addSeries(LineSeries, {
            color: line.color || getConnectorColor(),
            ...(priceFormat ? { priceFormat } : {}),
            lineWidth: line.width || 1,
            lineStyle: line.style === "solid" ? LineStyle.Solid : LineStyle.Dashed,
            lastValueVisible: false,
            priceLineVisible: false,
            crosshairMarkerVisible: false,
          });

          const points = [
            { time: fromTime, value: Number(line.from.price) },
            { time: toTime, value: Number(line.to.price) },
          ].sort((a, b) => Number(a.time) - Number(b.time));

          lineSeries.setData(points);
          overlayLineSeriesRef.current.push(lineSeries);
        });
      }

      if (candleSeriesRef?.current && Array.isArray(alerts) && alerts.length > 0) {
        const isDark =
          document.body.classList.contains("dark-mode") ||
          document.documentElement.classList.contains("dark");
        const alertColor = isDark ? "#f8fafc" : "#0f172a";
        const alertLabelTextColor = isDark ? "#070707" : "#ffffff";
        const normalizedTarget = String(symbol || "").replace(/[^a-z0-9]/gi, "").toUpperCase();

        if (normalizedTarget) {
          alerts
            .filter((a) => {
              if (a.status !== "ACTIVE") return false;
              const aSym = String(a.symbol || "").replace(/[^a-z0-9]/gi, "").toUpperCase();
              return aSym === normalizedTarget;
            })
            .forEach((alert) => {
              const targetPrice = Number(alert.targetPrice);
              if (!Number.isFinite(targetPrice) || targetPrice <= 0) return;
              try {
                const priceLine = candleSeriesRef.current.createPriceLine({
                  price: targetPrice,
                  color: alertColor,
                  lineWidth: 1,
                  lineStyle: LineStyle.Dashed,
                  axisLabelVisible: true,
                  title: `🔔 Alert @ ${formatTradePrice(targetPrice, pricePrecision)}`,
                  axisLabelColor: alertColor,
                  axisLabelTextColor: alertLabelTextColor,
                });
                overlayPriceLinesRef.current.push(priceLine);
              } catch {
              }
            });
        }
      }

      markerPrimitiveRef.current?.setMarkers(allMarkers);
    },
    [chartApiRef, candleSeriesRef, clearOverlays, markerPrimitiveRef, pricePrecision]
  );

  return {
    updateOverlays,
    clearOverlays,
  };
}
