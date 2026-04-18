import React, { useMemo } from 'react';
import { Info } from 'lucide-react';
import './ProgressTracker.css';

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
function buildHeatmap(trades = []) {
  const fallbackColumns = 11;
  const cells = Array.from({ length: WEEKDAY_LABELS.length }, () =>
    Array.from({ length: fallbackColumns }, () => 0)
  );

  if (!Array.isArray(trades) || trades.length === 0) {
    return { cells, monthMarkers: [], columns: fallbackColumns };
  }

  const sortedTrades = [...trades]
    .filter((trade) => trade?.timestamp)
    .sort((left, right) => new Date(left.timestamp) - new Date(right.timestamp));

  if (sortedTrades.length === 0) {
    return { cells, monthMarkers: [], columns: fallbackColumns };
  }

  const firstTradeDate = new Date(sortedTrades[0].timestamp);
  const startMonday = new Date(firstTradeDate);
  const firstDay = startMonday.getDay();
  const offset = firstDay === 0 ? -6 : 1 - firstDay;
  startMonday.setDate(startMonday.getDate() + offset);
  startMonday.setHours(0, 0, 0, 0);

  const lastTradeDate = new Date(sortedTrades[sortedTrades.length - 1].timestamp);
  const endSunday = new Date(lastTradeDate);
  const endDay = endSunday.getDay();
  const endOffset = endDay === 0 ? 0 : 7 - endDay;
  endSunday.setDate(endSunday.getDate() + endOffset);
  endSunday.setHours(23, 59, 59, 999);

  const columns = Math.max(1, Math.min(20, Math.ceil((endSunday - startMonday + 1) / 604800000)));
  const dynamicCells = Array.from({ length: WEEKDAY_LABELS.length }, () =>
    Array.from({ length: columns }, () => 0)
  );

  const monthMarkers = [];
  let lastMarker = '';

  for (let columnIndex = 0; columnIndex < columns; columnIndex += 1) {
    const weekStart = new Date(startMonday);
    weekStart.setDate(startMonday.getDate() + columnIndex * 7);
    const monthLabel = weekStart.toLocaleString('en-US', { month: 'short' });

    if (monthLabel !== lastMarker) {
      monthMarkers.push({
        label: monthLabel,
        column: columnIndex,
      });
      lastMarker = monthLabel;
    }
  }

  sortedTrades.forEach((trade) => {
    const timestamp = new Date(trade.timestamp);
    if (Number.isNaN(timestamp.getTime())) return;

    const diffDays = Math.floor((timestamp - startMonday) / 86400000);
    if (diffDays < 0) return;

    const column = Math.floor(diffDays / 7);
    if (column < 0 || column >= columns) return;

    const jsDay = timestamp.getDay();
    const row = jsDay === 0 ? 6 : jsDay - 1;
    dynamicCells[row][column] += Math.abs(Number(trade.pnl) || 0) > 0 ? 1 : 0.6;
  });

  return { cells: dynamicCells, monthMarkers, columns };
}

function ProgressTracker({ trades }) {
  const { cells: heatmap, monthMarkers, columns } = useMemo(() => buildHeatmap(trades), [trades]);

  return (
    <div className="progress-card">
      <div className="progress-card__header">
        <div className="progress-card__title-wrap">
          <h3 className="dashboard-card-title">Progress Tracker</h3>
          <Info size={15} />
        </div>
        <span className="progress-card__badge">BETA</span>
      </div>

      <div className="progress-card__body">
        <div className="progress-card__months">
          {monthMarkers.map((marker) => (
            <span
              key={`${marker.label}-${marker.column}`}
              className="progress-card__month"
              style={{ left: `${(marker.column / Math.max(columns, 1)) * 100}%` }}
            >
              {marker.label}
            </span>
          ))}
        </div>

        <div className="progress-card__grid-wrap">
          <div className="progress-card__labels">
            {WEEKDAY_LABELS.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>

          <div
            className="progress-card__grid"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {heatmap.map((row, rowIndex) =>
              row.map((value, columnIndex) => {
                const levelClass =
                  value >= 3
                    ? 'level-4'
                    : value >= 2
                      ? 'level-3'
                      : value >= 1
                        ? 'level-2'
                        : value > 0
                          ? 'level-1'
                          : 'level-0';

                return (
                  <div
                    key={`${rowIndex}-${columnIndex}`}
                    className={`progress-card__cell ${levelClass}`}
                  />
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProgressTracker;
