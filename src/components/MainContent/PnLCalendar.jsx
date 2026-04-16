import React, { useMemo, useState } from 'react';
import { Camera, CalendarDays, ChevronLeft, ChevronRight, Info, Settings } from 'lucide-react';
import './PnLCalendar.css';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatCellCurrency(value) {
  const absolute = Math.abs(value);
  if (absolute >= 1000) {
    return `${value < 0 ? '-' : ''}$${(absolute / 1000).toFixed(2)}K`;
  }
  return `${value < 0 ? '-' : ''}$${absolute.toFixed(0)}`;
}

function PnLCalendar({ trades }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const dailySummary = useMemo(() => {
    const summary = {};

    (trades || []).forEach((trade) => {
      if (!trade?.timestamp || trade?.pnl === undefined || trade?.pnl === null) return;

      const date = new Date(trade.timestamp);
      if (Number.isNaN(date.getTime())) return;

      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
        date.getDate()
      ).padStart(2, '0')}`;

      if (!summary[dateKey]) {
        summary[dateKey] = {
          pnl: 0,
          trades: 0,
          wins: 0,
          hasBadge: false,
        };
      }

      const pnl = Number(trade.pnl) || 0;
      summary[dateKey].pnl += pnl;
      summary[dateKey].trades += 1;
      if (pnl > 0) summary[dateKey].wins += 1;
      if (trade.note || trade.notes || trade.strategy) summary[dateKey].hasBadge = true;
    });

    return summary;
  }, [trades]);

  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstWeekday = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const today = new Date();

    const weeks = [];
    let dayCounter = 1;

    while (dayCounter <= daysInMonth) {
      const week = [];

      for (let weekday = 0; weekday < 7; weekday += 1) {
        if ((weeks.length === 0 && weekday < firstWeekday) || dayCounter > daysInMonth) {
          week.push({ day: null });
          continue;
        }

        const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayCounter).padStart(2, '0')}`;
        const stats = dailySummary[dateKey] || {
          pnl: 0,
          trades: 0,
          wins: 0,
          hasBadge: false,
        };

        week.push({
          day: dayCounter,
          dateKey,
          pnl: stats.pnl,
          trades: stats.trades,
          winRate: stats.trades > 0 ? (stats.wins / stats.trades) * 100 : 0,
          hasBadge: stats.hasBadge,
          isToday:
            today.getFullYear() === year &&
            today.getMonth() === month &&
            today.getDate() === dayCounter,
        });

        dayCounter += 1;
      }

      weeks.push(week);
    }

    const allCells = weeks.flat().filter((cell) => cell.day);
    const monthlyPnL = allCells.reduce((sum, cell) => sum + cell.pnl, 0);
    const tradingDays = allCells.filter((cell) => cell.trades > 0).length;

    const weeklyStats = weeks.map((week, index) => {
      const activeDays = week.filter((cell) => cell.day && cell.trades > 0);
      return {
        label: `Week ${index + 1}`,
        pnl: activeDays.reduce((sum, cell) => sum + cell.pnl, 0),
        days: activeDays.length,
      };
    });

    return {
      monthLabel: `${MONTH_NAMES[month]} ${year}`,
      weeks,
      monthlyPnL,
      tradingDays,
      weeklyStats,
    };
  }, [currentDate, dailySummary]);

  const changeMonth = (direction) => {
    setCurrentDate((previous) => {
      const next = new Date(previous);
      next.setMonth(next.getMonth() + direction);
      return next;
    });
  };

  return (
    <section className="calendar-shell">
      <header className="calendar-shell__toolbar">
        <div className="calendar-shell__toolbar-left">
          <button className="calendar-shell__nav" onClick={() => changeMonth(-1)} type="button">
            <ChevronLeft size={16} />
          </button>
          <h3 className="calendar-shell__month">{calendarData.monthLabel}</h3>
          <button className="calendar-shell__nav" onClick={() => changeMonth(1)} type="button">
            <ChevronRight size={16} />
          </button>
          <button className="calendar-shell__range" type="button">
            This month
          </button>
        </div>

        <div className="calendar-shell__toolbar-right">
          <span className="calendar-shell__label">Monthly stats:</span>
          <span className="calendar-shell__pill calendar-shell__pill--green">
            {formatCellCurrency(calendarData.monthlyPnL)}
          </span>
          <span className="calendar-shell__pill calendar-shell__pill--purple">
            {calendarData.tradingDays} days
          </span>
          <button className="calendar-shell__icon" type="button" aria-label="Settings">
            <Settings size={15} />
          </button>
          <button className="calendar-shell__icon" type="button" aria-label="Snapshot">
            <Camera size={15} />
          </button>
          <button className="calendar-shell__icon" type="button" aria-label="Info">
            <Info size={15} />
          </button>
        </div>
      </header>

      <div className="calendar-shell__body">
        <div className="calendar-shell__main">
          <div className="calendar-shell__weekdays">
            {WEEKDAY_NAMES.map((weekday) => (
              <div key={weekday} className="calendar-shell__weekday">
                {weekday}
              </div>
            ))}
          </div>

          <div className="calendar-shell__grid">
            {calendarData.weeks.flat().map((cell, index) => {
              if (!cell.day) {
                return (
                  <div
                    key={`empty-${index}`}
                    className="calendar-day-card calendar-day-card--empty"
                  />
                );
              }

              const toneClass =
                cell.trades === 0
                  ? 'calendar-day-card--muted'
                  : cell.pnl > 0
                    ? 'calendar-day-card--positive'
                    : cell.pnl < 0
                      ? 'calendar-day-card--negative'
                      : 'calendar-day-card--flat';

              return (
                <div
                  key={cell.dateKey}
                  className={`calendar-day-card ${toneClass} ${cell.isToday ? 'calendar-day-card--today' : ''}`}
                >
                  <span className="calendar-day-card__date">{cell.day}</span>
                  {cell.hasBadge && (
                    <span className="calendar-day-card__icon">
                      <CalendarDays size={14} />
                    </span>
                  )}

                  {cell.trades > 0 && (
                    <div className="calendar-day-card__content">
                      <strong className="calendar-day-card__pnl">{formatCellCurrency(cell.pnl)}</strong>
                      <span className="calendar-day-card__trades">
                        {cell.trades} trade{cell.trades > 1 ? 's' : ''}
                      </span>
                      <span className="calendar-day-card__rate">{cell.winRate.toFixed(1)}%</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <aside className="calendar-shell__weeks">
          {calendarData.weeklyStats.map((week) => (
            <article key={week.label} className="calendar-week-card">
              <span className="calendar-week-card__label">{week.label}</span>
              <strong
                className={`calendar-week-card__value ${
                  week.pnl > 0 ? 'profit' : week.pnl < 0 ? 'loss' : 'neutral'
                }`}
              >
                {formatCellCurrency(week.pnl)}
              </strong>
              <span className="calendar-week-card__days">
                {week.days} day{week.days !== 1 ? 's' : ''}
              </span>
            </article>
          ))}
        </aside>
      </div>
    </section>
  );
}

export default PnLCalendar;
