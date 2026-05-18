import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Camera,
  BadgeCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Info,
  Settings,
} from 'lucide-react';
import './PnLCalendar.css';
import { formatCompactCurrency } from '../../utils/Currency';
import api from '../../utils/serve';
import { getTradeDisplayDate } from '../../utils/tradeTime';

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

function PnLCalendar({ trades, currencyCode = 'USD' }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const calendarShellRef = useRef(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isWeeklyOpen, setIsWeeklyOpen] = useState(false);
  const [breakevenMenu, setBreakevenMenu] = useState(null);
  const [pendingBreakevenDays, setPendingBreakevenDays] = useState({});
  const [isCompactWeeks, setIsCompactWeeks] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.innerWidth <= 768;
  });

  useEffect(() => {
    if (!breakevenMenu) return undefined;

    const closeMenu = () => setBreakevenMenu(null);
    window.addEventListener('click', closeMenu);
    window.addEventListener('keydown', closeMenu);

    return () => {
      window.removeEventListener('click', closeMenu);
      window.removeEventListener('keydown', closeMenu);
    };
  }, [breakevenMenu]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const mediaQuery = window.matchMedia('(max-width: 768px)');
    const syncCompactWeeks = (event) => {
      setIsCompactWeeks(event.matches);
    };

    setIsCompactWeeks(mediaQuery.matches);

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', syncCompactWeeks);
      return () => mediaQuery.removeEventListener('change', syncCompactWeeks);
    }

    mediaQuery.addListener(syncCompactWeeks);
    return () => mediaQuery.removeListener(syncCompactWeeks);
  }, []);

  const dailySummary = useMemo(() => {
    const summary = {};

    (trades || []).forEach((trade) => {
      if (trade?.pnl === undefined || trade?.pnl === null) return;

      const date = getTradeDisplayDate(trade);
      if (!date) return;

      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
        date.getDate()
      ).padStart(2, '0')}`;

      if (!summary[dateKey]) {
        summary[dateKey] = {
          pnl: 0,
          trades: 0,
          wins: 0,
          hasBadge: false,
          isBreakeven: false,
        };
      }

      const pnl = Number(trade.pnl) || 0;
      summary[dateKey].pnl += pnl;
      summary[dateKey].trades += 1;
      if (pnl > 0) summary[dateKey].wins += 1;
      if (trade.note || trade.notes || trade.strategy) summary[dateKey].hasBadge = true;
      if (trade.is_breakeven) summary[dateKey].isBreakeven = true;
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
          isBreakeven: false,
        };
        const isBreakeven = pendingBreakevenDays[dateKey] ?? stats.isBreakeven;

        week.push({
          day: dayCounter,
          dateKey,
          pnl: stats.pnl,
          trades: stats.trades,
          winRate: stats.trades > 0 ? (stats.wins / stats.trades) * 100 : 0,
          hasBadge: stats.hasBadge,
          isBreakeven,
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
  }, [currentDate, dailySummary, pendingBreakevenDays]);

  const changeMonth = (direction) => {
    setCurrentDate((previous) => {
      const next = new Date(previous);
      next.setMonth(next.getMonth() + direction);
      return next;
    });
  };

  const toggleBreakevenDay = async (dateKey, currentValue) => {
    const nextValue = !currentValue;

    setPendingBreakevenDays((previous) => ({
      ...previous,
      [dateKey]: nextValue,
    }));
    setBreakevenMenu((previous) => (
      previous?.dateKey === dateKey
        ? { ...previous, isBreakeven: nextValue }
        : previous
    ));
    queryClient.setQueriesData({ queryKey: ['trades'] }, (previousTrades) => (
      Array.isArray(previousTrades)
        ? previousTrades.map((trade) => {
            const tradeDate = getTradeDisplayDate(trade);
            if (!tradeDate) return trade;

            const tradeDateKey = `${tradeDate.getFullYear()}-${String(tradeDate.getMonth() + 1).padStart(2, '0')}-${String(
              tradeDate.getDate()
            ).padStart(2, '0')}`;

            return tradeDateKey === dateKey
              ? { ...trade, is_breakeven: nextValue }
              : trade;
          })
        : previousTrades
    ));

    try {
      const { data } = await api.patch('/trades/breakeven-day', {
        date: dateKey,
        is_breakeven: nextValue,
      });
      if (!data?.success) {
        throw new Error(data?.error || 'Breakeven update failed');
      }
      await queryClient.invalidateQueries({ queryKey: ['trades'] });
    } catch {
      setPendingBreakevenDays((previous) => ({
        ...previous,
        [dateKey]: currentValue,
      }));
      setBreakevenMenu((previous) => (
        previous?.dateKey === dateKey
          ? { ...previous, isBreakeven: currentValue }
          : previous
      ));
    }
  };

  const openBreakevenMenu = (event, cell) => {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const shellRect = calendarShellRef.current?.getBoundingClientRect();
    const localX = shellRect ? rect.left - shellRect.left : rect.left;
    const localY = shellRect ? rect.top - shellRect.top : rect.top;
    const maxX = shellRect ? shellRect.width - 210 : window.innerWidth - 210;
    const maxY = shellRect ? shellRect.height - 92 : window.innerHeight - 92;

    setBreakevenMenu({
      dateKey: cell.dateKey,
      day: cell.day,
      isBreakeven: cell.isBreakeven,
      x: Math.max(8, Math.min(localX + 8, maxX)),
      y: Math.max(8, Math.min(localY + 28, maxY)),
    });
  };

  const openDayReview = (cell) => {
    if (!cell?.dateKey || cell.trades <= 0) return;
    navigate(`/day-review/${cell.dateKey}`);
  };

  const showWeeklyCards = !isCompactWeeks || isWeeklyOpen;

  return (
    <section className="calendar-shell" ref={calendarShellRef}>
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
          <span
            className={`calendar-shell__pill ${
              calendarData.monthlyPnL > 0
                ? 'calendar-shell__pill--profit'
                : calendarData.monthlyPnL < 0
                  ? 'calendar-shell__pill--loss'
                  : 'calendar-shell__pill--neutral'
            }`}
          >
            {formatCompactCurrency(calendarData.monthlyPnL, currencyCode)}
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

              const isBreakeven = cell.isBreakeven;
              const toneClass =
                isBreakeven
                  ? 'calendar-day-card--breakeven'
                  : cell.trades === 0
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
                  onClick={() => openDayReview(cell)}
                  onContextMenu={(event) => openBreakevenMenu(event, cell)}
                  role="button"
                  tabIndex={cell.trades > 0 ? 0 : -1}
                  onKeyDown={(event) => {
                    if (cell.trades <= 0) return;
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      openDayReview(cell);
                    }
                  }}
                  title={cell.trades > 0 ? 'Open day review. Right-click for day options' : 'No trades on this day'}
                >
                  <span className="calendar-day-card__date">{cell.day}</span>
                  {(cell.hasBadge || isBreakeven) && (
                    <span className="calendar-day-card__icon">
                      <BadgeCheck size={14} />
                    </span>
                  )}

                  {cell.trades > 0 && (
                    <div className="calendar-day-card__content">
                      <strong className="calendar-day-card__pnl">{formatCompactCurrency(cell.pnl, currencyCode)}</strong>
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

        <aside
          className={`calendar-shell__weeks-panel ${isCompactWeeks ? 'calendar-shell__weeks-panel--compact' : 'calendar-shell__weeks-panel--desktop'} ${isWeeklyOpen ? 'is-open' : ''}`}
        >
          {isCompactWeeks && (
            <button
              className="calendar-shell__weeks-toggle"
              type="button"
              onClick={() => setIsWeeklyOpen((previous) => !previous)}
              aria-expanded={isWeeklyOpen}
            >
              <span>Weekly cards</span>
              <ChevronDown size={16} />
            </button>
          )}

          {showWeeklyCards && (
            <div className="calendar-shell__weeks">
              {calendarData.weeklyStats.map((week) => (
                <article
                  key={week.label}
                  className={`calendar-week-card ${
                    week.pnl > 0
                      ? 'calendar-week-card--profit'
                      : week.pnl < 0
                        ? 'calendar-week-card--loss'
                        : 'calendar-week-card--neutral'
                  }`}
                >
                  <span className="calendar-week-card__label">{week.label}</span>
                  <strong
                    className={`calendar-week-card__value ${
                      week.pnl > 0
                        ? 'calendar-week-card__value--profit'
                        : week.pnl < 0
                          ? 'calendar-week-card__value--loss'
                          : 'calendar-week-card__value--neutral'
                    }`}
                  >
                    {formatCompactCurrency(week.pnl, currencyCode)}
                  </strong>
                  <span className="calendar-week-card__days">
                    {week.days} day{week.days !== 1 ? 's' : ''}
                  </span>
                </article>
              ))}
            </div>
          )}
        </aside>
      </div>

      {breakevenMenu && (
        <div
          className="calendar-context-menu"
          style={{ left: breakevenMenu.x, top: breakevenMenu.y }}
          onClick={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <span className="calendar-context-menu__eyebrow">Day {breakevenMenu.day}</span>
          <label
            className="calendar-context-menu__option"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              toggleBreakevenDay(breakevenMenu.dateKey, breakevenMenu.isBreakeven);
            }}
          >
            <input
              type="checkbox"
              checked={breakevenMenu.isBreakeven}
              readOnly
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                toggleBreakevenDay(breakevenMenu.dateKey, breakevenMenu.isBreakeven);
              }}
            />
            <span>Is this a breakeven day?</span>
          </label>
        </div>
      )}
    </section>
  );
}

export default PnLCalendar;
