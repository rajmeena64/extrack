import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  LineStyle,
  createChart,
  createSeriesMarkers,
} from 'lightweight-charts';

const getThemeColor = (name, fallback) => {
  if (typeof window === 'undefined') return fallback;
  return getComputedStyle(document.body).getPropertyValue(name).trim() || fallback;
};

export const RIGHT_EMPTY_BARS = 28;

const markerForTrade = (trade) => {
  const isSell = trade.side === 'sell';
  const isStop = trade.closeReason === 'stop_loss';
  const isTarget = trade.closeReason === 'take_profit';

  return {
    time: trade.exitTime || trade.entryTime,
    position: isSell ? 'belowBar' : 'aboveBar',
    color: isStop ? '#ef4444' : isTarget ? '#22c55e' : '#3b82f6',
    shape: isSell ? 'arrowUp' : 'arrowDown',
    text: isStop ? 'SL hit' : isTarget ? 'TP hit' : 'Exit',
  };
};

export function createChartInstance(container, options = {}) {
  const chart = createChart(container, {
    autoSize: true,
    layout: {
      background: { type: ColorType.Solid, color: getThemeColor('--bg-card', '#ffffff') },
      textColor: getThemeColor('--text-muted', '#64748b'),
      fontSize: 11,
    },
    grid: {
      vertLines: { color: getThemeColor('--border-light', '#e2e8f0') },
      horzLines: { color: getThemeColor('--border-light', '#e2e8f0') },
    },
    rightPriceScale: {
      borderColor: getThemeColor('--border-medium', '#cbd5e1'),
      entireTextOnly: true,
    },
    timeScale: {
      borderColor: getThemeColor('--border-medium', '#cbd5e1'),
      timeVisible: true,
      secondsVisible: false,
      rightOffset: RIGHT_EMPTY_BARS,
      fixRightEdge: false,
      rightBarStaysOnScroll: false,
    },
    crosshair: {
      mode: CrosshairMode.Normal,
    },
    ...options,
  });

  const candleSeries = chart.addSeries(CandlestickSeries, {
    upColor: getThemeColor('--accent-success', '#22c55e'),
    downColor: getThemeColor('--accent-danger', '#ef4444'),
    wickUpColor: getThemeColor('--accent-success', '#22c55e'),
    wickDownColor: getThemeColor('--accent-danger', '#ef4444'),
    borderVisible: false,
  });

  const overlay = document.createElement('div');
  overlay.className = 'backtest-chart-risk-overlay';
  container.appendChild(overlay);

  return {
    chart,
    candleSeries,
    markersApi: null,
    priceLines: {},
    overlay,
    latestRiskReward: null,
  };
}

export function applyTheme(instance) {
  if (!instance?.chart || !instance?.candleSeries) return;
  instance.chart.applyOptions({
    layout: {
      background: { type: ColorType.Solid, color: getThemeColor('--bg-card', '#ffffff') },
      textColor: getThemeColor('--text-muted', '#64748b'),
    },
    grid: {
      vertLines: { color: getThemeColor('--border-light', '#e2e8f0') },
      horzLines: { color: getThemeColor('--border-light', '#e2e8f0') },
    },
    rightPriceScale: {
      borderColor: getThemeColor('--border-medium', '#cbd5e1'),
    },
    timeScale: {
      borderColor: getThemeColor('--border-medium', '#cbd5e1'),
    },
  });
  instance.candleSeries.applyOptions({
    upColor: getThemeColor('--accent-success', '#22c55e'),
    downColor: getThemeColor('--accent-danger', '#ef4444'),
    wickUpColor: getThemeColor('--accent-success', '#22c55e'),
    wickDownColor: getThemeColor('--accent-danger', '#ef4444'),
  });
}

export function setCandles(instance, candles) {
  if (!instance?.candleSeries) return;
  instance.candleSeries.setData(candles || []);
}

export function updateCandles(instance, candle) {
  if (!instance?.candleSeries || !candle) return;
  instance.candleSeries.update(candle);
}

export function setMarkers(instance, openPositions = [], closedPositions = []) {
  if (!instance?.candleSeries) return;
  const entryMarkers = openPositions.map((position) => ({
    time: position.entryTime,
    position: position.side === 'sell' ? 'aboveBar' : 'belowBar',
    color: position.side === 'sell' ? '#ef4444' : '#22c55e',
    shape: position.side === 'sell' ? 'arrowDown' : 'arrowUp',
    text: `${position.side === 'sell' ? 'Sell' : 'Buy'} ${position.quantity}`,
  }));
  const closedMarkers = closedPositions.flatMap((trade) => ([
    {
      time: trade.entryTime,
      position: trade.side === 'sell' ? 'aboveBar' : 'belowBar',
      color: trade.side === 'sell' ? '#ef4444' : '#22c55e',
      shape: trade.side === 'sell' ? 'arrowDown' : 'arrowUp',
      text: 'Entry',
    },
    markerForTrade(trade),
  ]));
  const markers = [...entryMarkers, ...closedMarkers]
    .filter((marker) => marker.time)
    .sort((a, b) => a.time - b.time);

  if (!instance.markersApi) {
    instance.markersApi = createSeriesMarkers(instance.candleSeries, markers);
  } else {
    instance.markersApi.setMarkers(markers);
  }
}

function setPriceLine(instance, key, price, title, color) {
  if (!instance?.candleSeries) return;
  if (instance.priceLines[key]) {
    instance.candleSeries.removePriceLine(instance.priceLines[key]);
    instance.priceLines[key] = null;
  }
  if (!price || Number(price) <= 0) return;
  instance.priceLines[key] = instance.candleSeries.createPriceLine({
    price: Number(price),
    color,
    lineWidth: 2,
    lineStyle: LineStyle.Dashed,
    axisLabelVisible: true,
    title,
  });
}

export function drawEntryLine(instance, price) {
  setPriceLine(instance, 'entry', price, 'Entry', getThemeColor('--primary', '#2563eb'));
}

export function drawStopLossLine(instance, price) {
  setPriceLine(instance, 'stopLoss', price, 'Stop', getThemeColor('--accent-danger', '#ef4444'));
}

export function drawTargetLine(instance, price) {
  setPriceLine(instance, 'target', price, 'Target', getThemeColor('--accent-success', '#22c55e'));
}

export function drawRiskRewardBox(instance, { entryPrice, stopLoss, takeProfit }) {
  if (!instance?.overlay || !instance?.candleSeries) return;
  instance.latestRiskReward = { entryPrice, stopLoss, takeProfit };
  const entryY = instance.candleSeries.priceToCoordinate(Number(entryPrice));
  const stopY = instance.candleSeries.priceToCoordinate(Number(stopLoss));
  const targetY = instance.candleSeries.priceToCoordinate(Number(takeProfit));

  instance.overlay.innerHTML = '';
  if (![entryY, stopY, targetY].every((value) => Number.isFinite(value))) return;

  const rewardTop = Math.min(entryY, targetY);
  const rewardHeight = Math.abs(targetY - entryY);
  const riskTop = Math.min(entryY, stopY);
  const riskHeight = Math.abs(stopY - entryY);

  const reward = document.createElement('div');
  reward.className = 'backtest-chart-risk-box backtest-chart-risk-box--reward';
  reward.style.top = `${rewardTop}px`;
  reward.style.height = `${Math.max(rewardHeight, 2)}px`;

  const risk = document.createElement('div');
  risk.className = 'backtest-chart-risk-box backtest-chart-risk-box--risk';
  risk.style.top = `${riskTop}px`;
  risk.style.height = `${Math.max(riskHeight, 2)}px`;

  instance.overlay.append(reward, risk);
}

export function destroyChart(instance) {
  if (!instance?.chart) return;
  instance.chart.remove();
}
