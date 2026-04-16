import React, { useMemo } from 'react';
import { Info } from 'lucide-react';
import './ProgressTracker.css';

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function buildHeatmap(trades = []) {
  const columns = 11;
  const cells = Array.from({ length: WEEKDAY_LABELS.length }, () =>
    Array.from({ length: columns }, () => 0)
  );

  if (!Array.isArray(trades) || trades.length === 0) {
    return cells;
  }

  const sortedTrades = [...trades]
    .filter((trade) => trade?.timestamp)
    .sort((left, right) => new Date(left.timestamp) - new Date(right.timestamp));

  const firstTradeDate = new Date(sortedTrades[0].timestamp);
  const startMonday = new Date(firstTradeDate);
  const firstDay = startMonday.getDay();
  const offset = firstDay === 0 ? -6 : 1 - firstDay;
  startMonday.setDate(startMonday.getDate() + offset);
  startMonday.setHours(0, 0, 0, 0);

  sortedTrades.forEach((trade) => {
    const timestamp = new Date(trade.timestamp);
    if (Number.isNaN(timestamp.getTime())) return;

    const diffDays = Math.floor((timestamp - startMonday) / 86400000);
    if (diffDays < 0) return;

    const column = Math.floor(diffDays / 7);
    if (column < 0 || column >= columns) return;

    const jsDay = timestamp.getDay();
    const row = jsDay === 0 ? 6 : jsDay - 1;
    cells[row][column] += Math.abs(Number(trade.pnl) || 0) > 0 ? 1 : 0.6;
  });

  return cells;
}

function ProgressTracker({ trades }) {
  const heatmap = useMemo(() => buildHeatmap(trades), [trades]);
  const monthMarkers = ['Aug', 'Sep'];

  return (
    <div className="progress-card">
      <div className="progress-card__header">
        <div className="progress-card__title-wrap">
          <h3>Progress Tracker</h3>
          <Info size={15} />
        </div>
        <span className="progress-card__badge">BETA</span>
      </div>

      <div className="progress-card__body">
        <div className="progress-card__months">
          <span className="progress-card__month progress-card__month--first">Aug</span>
          <span className="progress-card__month progress-card__month--second">Sep</span>
        </div>

        <div className="progress-card__grid-wrap">
          <div className="progress-card__labels">
            {WEEKDAY_LABELS.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>

          <div className="progress-card__grid">
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
