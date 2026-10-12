import { ColorType, CrosshairMode } from 'lightweight-charts';

const themeColor = (name, fallback) => {
  if (typeof window === 'undefined') return fallback;
  return getComputedStyle(document.body).getPropertyValue(name).trim() || fallback;
};

export const getTradeDetailChartTheme = () => ({
  bgCard: themeColor('--bg-card', '#ffffff'),
  textMuted: themeColor('--text-muted', '#64748b'),
  borderLight: themeColor('--border-light', '#e2e8f0'),
  borderMedium: themeColor('--border-medium', '#cbd5e1'),
  pnlPositive: themeColor('--bull-candle', '#089981'),
  pnlNegative: themeColor('--bear-candle', '#f23645'),
});

export const getTradeDetailChartOptions = (theme, { isMobile = false, timeFormatter } = {}) => ({
  layout: {
    background: { type: ColorType.Solid, color: theme.bgCard },
    textColor: theme.textMuted,
    fontSize: isMobile ? 10 : 11,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif",
  },
  ...(timeFormatter ? { localization: { timeFormatter } } : {}),
  grid: {
    vertLines: { color: theme.borderLight },
    horzLines: { color: theme.borderLight },
  },
  rightPriceScale: {
    visible: true,
    borderColor: theme.borderMedium,
    entireTextOnly: true,
    borderVisible: !isMobile,
    minimumWidth: isMobile ? 48 : 62,
    autoScale: true,
    scaleMargins: { top: 0.12, bottom: 0.12 },
  },
  timeScale: {
    borderColor: theme.borderMedium,
    timeVisible: true,
    secondsVisible: false,
    rightOffset: 12,
    barSpacing: isMobile ? 6 : 9,
    minBarSpacing: 0.5,
    rightBarStaysOnScroll: false,
    shiftVisibleRangeOnNewBar: false,
    ticksVisible: true,
    ...(timeFormatter ? { tickMarkFormatter: timeFormatter } : {}),
  },
  kineticScroll: {
    touch: false,
    mouse: false,
  },
  handleScroll: {
    mouseWheel: true,
    pressedMouseMove: true,
    horzTouchDrag: true,
    vertTouchDrag: true,
  },
  handleScale: {
    mouseWheel: true,
    pinch: true,
    axisPressedMouseMove: true,
  },
  crosshair: {
    mode: CrosshairMode.Normal,
  },
});

export const getTradeDetailCandleOptions = (theme) => ({
  upColor: theme.pnlPositive,
  downColor: theme.pnlNegative,
  borderUpColor: theme.pnlPositive,
  borderDownColor: theme.pnlNegative,
  wickUpColor: theme.pnlPositive,
  wickDownColor: theme.pnlNegative,
});

export const getTradeDetailChartThemeOptions = (theme) => ({
  layout: {
    background: { type: ColorType.Solid, color: theme.bgCard },
    textColor: theme.textMuted,
  },
  grid: {
    vertLines: { color: theme.borderLight },
    horzLines: { color: theme.borderLight },
  },
  rightPriceScale: {
    borderColor: theme.borderMedium,
  },
  timeScale: {
    borderColor: theme.borderMedium,
  },
});
