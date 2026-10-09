import { useEffect, useState } from "react";

export const CROSSHAIR_MODES = {
  CROSS: "cross",
  DOT: "dot",
  ARROW: "arrow",
  ERASER: "eraser",
};

export const applyCrosshair = (chartApi, chartElement, mode) => {
  if (!chartApi) return;
  if (mode === "cross") {
    chartApi.applyOptions({ crosshair: { mode: 0, vertLine: { visible: true, color: "#787b86", width: 1, style: 2, labelVisible: true }, horzLine: { visible: true, color: "#787b86", width: 1, style: 2, labelVisible: true } } });
    if (chartElement) chartElement.style.cursor = "crosshair";
  } else if (mode === "dot") {
    chartApi.applyOptions({ crosshair: { mode: 0, vertLine: { visible: true, color: "#787b86", width: 1, style: 1, labelVisible: true }, horzLine: { visible: true, color: "#787b86", width: 1, style: 1, labelVisible: true } } });
    if (chartElement) chartElement.style.cursor = "crosshair";
  } else if (mode === "arrow") {
    chartApi.applyOptions({ crosshair: { mode: 2, vertLine: { visible: false }, horzLine: { visible: false } } });
    if (chartElement) chartElement.style.cursor = "default";
  } else if (mode === "eraser") {
    chartApi.applyOptions({ crosshair: { mode: 2, vertLine: { visible: false }, horzLine: { visible: false } } });
    if (chartElement) chartElement.style.cursor = "not-allowed";
  }
};

export function useCrosshair({ chartApiRef, chartRef }) {
  const [crosshairMode, setCrosshairMode] = useState("cross");

  useEffect(() => {
    applyCrosshair(chartApiRef?.current, chartRef?.current, crosshairMode);
  }, [crosshairMode, chartApiRef, chartRef]);

  return { crosshairMode, setCrosshairMode, applyCrosshair };
}
