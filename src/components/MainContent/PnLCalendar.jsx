import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Camera,
  BadgeCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Settings,
} from '../../icons/lucideIcons';
import './PnLCalendar.css';
import { formatCompactCurrency } from '../../utils/Currency';
import api from '../../utils/serve';
import { getTradeDisplayDate } from '../../utils/tradeTime';
import { loadCachedUserSettings, saveUserSettings } from '../../utils/userSettings';
import InfoTooltip from '../Common/InfoTooltip';
import CustomSelect from '../Common/CustomSelect';
import { useAuth } from '../../context/AuthContext';
import { useUserSettings } from '../../hooks/useUserSettings';

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
const DEFAULT_CALENDAR_SETTINGS = {
  weekStartsOn: 'sun',
  showPnl: true,
  showTradeCount: true,
  showWinRate: true,
  autoBreakevenEnabled: false,
  breakevenThreshold: 0,
  manualBreakevenOverrides: {},
};

const normalizeCalendarSettings = (settings = {}) => ({
  ...DEFAULT_CALENDAR_SETTINGS,
  ...settings,
  autoBreakevenEnabled: Boolean(settings.autoBreakevenEnabled),
  breakevenThreshold: Number.isFinite(Number(settings.breakevenThreshold))
    ? Number(settings.breakevenThreshold)
    : DEFAULT_CALENDAR_SETTINGS.breakevenThreshold,
  manualBreakevenOverrides:
    settings.manualBreakevenOverrides && typeof settings.manualBreakevenOverrides === 'object'
      ? settings.manualBreakevenOverrides
      : {},
});

const getCachedCalendarSettings = () => normalizeCalendarSettings(loadCachedUserSettings()?.pnlCalendar);

const getOrderedWeekdays = (weekStartsOn) => (
  weekStartsOn === 'mon'
    ? [...WEEKDAY_NAMES.slice(1), WEEKDAY_NAMES[0]]
    : WEEKDAY_NAMES
);

const getFirstWeekdayOffset = (day, weekStartsOn) => (
  weekStartsOn === 'mon' ? (day + 6) % 7 : day
);

function PnLCalendar({ trades, currencyCode = 'USD' }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userSettingsQuery = useUserSettings();
  const calendarShellRef = useRef(null);
  const calendarSettingsVersion = useRef(0);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isWeeklyOpen, setIsWeeklyOpen] = useState(false);
  const [breakevenMenu, setBreakevenMenu] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [calendarSettings, setCalendarSettings] = useState(getCachedCalendarSettings);
  const [pendingBreakevenDays, setPendingBreakevenDays] = useState({});
  const [isSnapshotting, setIsSnapshotting] = useState(false);
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
    if (!userSettingsQuery.data || calendarSettingsVersion.current > 0) return;
    setCalendarSettings(normalizeCalendarSettings(userSettingsQuery.data?.pnlCalendar));
  }, [userSettingsQuery.data]);

  useEffect(() => {
    if (!settingsOpen) return undefined;

    const closeSettings = () => setSettingsOpen(false);
    window.addEventListener('click', closeSettings);

    return () => window.removeEventListener('click', closeSettings);
  }, [settingsOpen]);

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
    const firstWeekday = getFirstWeekdayOffset(firstDay.getDay(), calendarSettings.weekStartsOn);
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
        const shouldAutoMarkBreakeven =
          calendarSettings.autoBreakevenEnabled &&
          stats.trades > 0 &&
          stats.pnl <= Number(calendarSettings.breakevenThreshold);
        const manualOverride = calendarSettings.manualBreakevenOverrides?.[dateKey];
        const hasTrades = stats.trades > 0;
        const isBreakeven = hasTrades && (
          pendingBreakevenDays[dateKey] ?? (
            typeof manualOverride === 'boolean'
              ? manualOverride
              : stats.isBreakeven || shouldAutoMarkBreakeven
          )
        );

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
      const isCurrentWeek = week.some((cell) => cell.isToday);
      return {
        label: `Week ${index + 1}`,
        pnl: activeDays.reduce((sum, cell) => sum + cell.pnl, 0),
        days: activeDays.length,
        isCurrentWeek,
      };
    });

    return {
      monthLabel: `${MONTH_NAMES[month]} ${year}`,
      weeks,
      monthlyPnL,
      tradingDays,
      weeklyStats,
    };
  }, [
    calendarSettings.autoBreakevenEnabled,
    calendarSettings.breakevenThreshold,
    calendarSettings.manualBreakevenOverrides,
    calendarSettings.weekStartsOn,
    currentDate,
    dailySummary,
    pendingBreakevenDays,
  ]);

  const weekdayLabels = useMemo(
    () => getOrderedWeekdays(calendarSettings.weekStartsOn),
    [calendarSettings.weekStartsOn]
  );

  const updateCalendarSettings = (updates) => {
    calendarSettingsVersion.current += 1;
    setCalendarSettings((previous) => {
      const nextSettings = normalizeCalendarSettings({ ...previous, ...updates });
      saveUserSettings({ pnlCalendar: nextSettings }).catch(() => null);
      return nextSettings;
    });
  };

  const downloadCalendarSnapshot = async () => {
    if (isSnapshotting) return;

    setIsSnapshotting(true);
    setSettingsOpen(false);

    try {
      const weeks = calendarData.weeks;
      const width = 1400;
      const toolbarHeight = 78;
      const padding = 28;
      const gap = 10;
      const weekPanelWidth = 150;
      const calendarWidth = width - (padding * 2) - weekPanelWidth - 16;
      const weekdayHeight = 38;
      const rows = Math.max(5, weeks.length);
      const cellWidth = (calendarWidth - gap * 6) / 7;
      const cellHeight = 112;
      const height = toolbarHeight + padding + weekdayHeight + gap + rows * cellHeight + (rows - 1) * gap + padding;
      const canvas = document.createElement('canvas');
      const scale = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
      canvas.width = width * scale;
      canvas.height = height * scale;
      const context = canvas.getContext('2d');
      context.scale(scale, scale);

      const roundedRect = (x, y, rectWidth, rectHeight, radius) => {
        const nextRadius = Math.min(radius, rectWidth / 2, rectHeight / 2);
        context.beginPath();
        context.moveTo(x + nextRadius, y);
        context.arcTo(x + rectWidth, y, x + rectWidth, y + rectHeight, nextRadius);
        context.arcTo(x + rectWidth, y + rectHeight, x, y + rectHeight, nextRadius);
        context.arcTo(x, y + rectHeight, x, y, nextRadius);
        context.arcTo(x, y, x + rectWidth, y, nextRadius);
        context.closePath();
      };

      const drawText = (text, x, y, options = {}) => {
        context.fillStyle = options.color || '#0f172a';
        context.font = `${options.weight || 600} ${options.size || 14}px Segoe UI, Arial, sans-serif`;
        context.textAlign = options.align || 'left';
        context.textBaseline = options.baseline || 'alphabetic';
        context.fillText(String(text), x, y, options.maxWidth);
      };

      context.fillStyle = '#f6f8fb';
      context.fillRect(0, 0, width, height);

      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, width, toolbarHeight);
      context.strokeStyle = '#e2e8f0';
      context.beginPath();
      context.moveTo(0, toolbarHeight - 0.5);
      context.lineTo(width, toolbarHeight - 0.5);
      context.stroke();

      drawText(calendarData.monthLabel, padding, 48, { size: 22, weight: 800 });
      drawText('Monthly stats:', width - 430, 48, { size: 14, weight: 800 });

      const monthlyTone = calendarData.monthlyPnL > 0 ? '#16a34a' : calendarData.monthlyPnL < 0 ? '#dc2626' : '#0f172a';
      context.fillStyle = calendarData.monthlyPnL < 0 ? '#fee2e2' : calendarData.monthlyPnL > 0 ? '#dcfce7' : '#e2e8f0';
      roundedRect(width - 310, 27, 92, 28, 14);
      context.fill();
      drawText(formatCompactCurrency(calendarData.monthlyPnL, currencyCode), width - 264, 45, {
        size: 13,
        weight: 800,
        color: monthlyTone,
        align: 'center',
      });

      context.fillStyle = '#dbeafe';
      roundedRect(width - 208, 27, 86, 28, 14);
      context.fill();
      drawText(`${calendarData.tradingDays} days`, width - 165, 45, {
        size: 13,
        weight: 800,
        color: '#0f172a',
        align: 'center',
      });

      const startX = padding;
      let y = toolbarHeight + padding;
      weekdayLabels.forEach((weekday, index) => {
        const x = startX + index * (cellWidth + gap);
        context.fillStyle = '#ffffff';
        roundedRect(x, y, cellWidth, weekdayHeight, 9);
        context.fill();
        context.strokeStyle = '#cbd5e1';
        context.stroke();
        drawText(weekday, x + cellWidth / 2, y + 24, { size: 14, weight: 800, align: 'center' });
      });

      y += weekdayHeight + gap;
      weeks.forEach((week, weekIndex) => {
        week.forEach((cell, dayIndex) => {
          const x = startX + dayIndex * (cellWidth + gap);
          const cellY = y + weekIndex * (cellHeight + gap);

          if (!cell.day) return;

          const fill =
            cell.isBreakeven
              ? '#dfe5ff'
              : cell.trades === 0
              ? '#eef0f5'
              : cell.pnl > 0
                ? '#d6f6de'
                : cell.pnl < 0
                  ? '#ffd8d8'
                  : '#dfe5ff';
          const stroke =
            cell.isBreakeven
              ? '#7b8cff'
              : cell.trades === 0
              ? '#e5e7ef'
              : cell.pnl > 0
                ? '#5ad79a'
                : cell.pnl < 0
                  ? '#ff857d'
                  : '#6e84ff';

          context.fillStyle = fill;
          roundedRect(x, cellY, cellWidth, cellHeight, 10);
          context.fill();
          context.strokeStyle = stroke;
          context.stroke();

          drawText(cell.day, x + cellWidth - 12, cellY + 20, {
            size: 12,
            weight: 800,
            color: '#27314f',
            align: 'right',
          });

          if (cell.isBreakeven) {
            drawText('BE', x + 12, cellY + 20, { size: 11, weight: 800, color: '#27314f' });
          }

          if (cell.trades > 0) {
            const centerX = x + cellWidth / 2;
            let contentY = cellY + 54;
            if (calendarSettings.showPnl) {
              drawText(formatCompactCurrency(cell.pnl, currencyCode), centerX, contentY, {
                size: 16,
                weight: 800,
                color: '#27314f',
                align: 'center',
              });
              contentY += 22;
            }
            if (calendarSettings.showTradeCount) {
              drawText(`${cell.trades} trade${cell.trades > 1 ? 's' : ''}`, centerX, contentY, {
                size: 11,
                weight: 700,
                color: '#5a6a91',
                align: 'center',
              });
              contentY += 18;
            }
            if (calendarSettings.showWinRate) {
              drawText(`${cell.winRate.toFixed(1)}%`, centerX, contentY, {
                size: 11,
                weight: 700,
                color: '#5a6a91',
                align: 'center',
              });
            }
          }
        });
      });

      const weekX = padding + calendarWidth + 16;
      weeks.forEach((week, index) => {
        const activeDays = week.filter((cell) => cell.day && cell.trades > 0);
        const weekPnl = activeDays.reduce((sum, cell) => sum + cell.pnl, 0);
        const weekY = y + index * (cellHeight + gap);
        context.fillStyle = '#ffffff';
        roundedRect(weekX, weekY, weekPanelWidth, cellHeight, 10);
        context.fill();
        context.strokeStyle = '#cbd5e1';
        context.stroke();
        drawText(`Week ${index + 1}`, weekX + 14, weekY + 26, { size: 13, weight: 700, color: '#475569' });
        drawText(formatCompactCurrency(weekPnl, currencyCode), weekX + 14, weekY + 58, {
          size: 18,
          weight: 800,
          color: weekPnl > 0 ? '#16a34a' : weekPnl < 0 ? '#dc2626' : '#0f172a',
        });
        context.fillStyle = '#dbeafe';
        roundedRect(weekX + 14, weekY + 76, 66, 24, 12);
        context.fill();
        drawText(`${activeDays.length} days`, weekX + 47, weekY + 92, {
          size: 11,
          weight: 800,
          color: '#0f172a',
          align: 'center',
        });
      });

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png', 1));
      if (!blob) throw new Error('Calendar image export failed');

      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `pnl-calendar-${calendarData.monthLabel.replaceAll(' ', '-').toLowerCase()}.png`;
      link.href = downloadUrl;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    } catch (error) {
      console.error('Calendar image export failed', error);
      window.alert('Calendar image could not be downloaded. Please try again.');
    } finally {
      setIsSnapshotting(false);
    }
  };

  const changeMonth = (direction) => {
    setCurrentDate((previous) => {
      const next = new Date(previous);
      next.setMonth(next.getMonth() + direction);
      return next;
    });
  };

  const toggleBreakevenDay = async (dateKey, currentValue) => {
    const dayStats = dailySummary[dateKey];
    if (!dayStats || dayStats.trades <= 0) return;

    const nextValue = !currentValue;
    const nextManualOverrides = {
      ...calendarSettings.manualBreakevenOverrides,
      [dateKey]: nextValue,
    };

    setPendingBreakevenDays((previous) => ({
      ...previous,
      [dateKey]: nextValue,
    }));
    updateCalendarSettings({ manualBreakevenOverrides: nextManualOverrides });
    setBreakevenMenu((previous) => (
      previous?.dateKey === dateKey
        ? { ...previous, isBreakeven: nextValue }
        : previous
    ));
    if (user?.ID) {
      queryClient.setQueriesData({ queryKey: ['trades', user.ID] }, (previousTrades) => (
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
    }

    try {
      const { data } = await api.patch('/trades/breakeven-day', {
        date: dateKey,
        is_breakeven: nextValue,
      });
      if (!data?.success) {
        throw new Error(data?.error || 'Breakeven update failed');
      }
      if (user?.ID) {
        await queryClient.invalidateQueries({ queryKey: ['trades', user.ID] });
      }
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
    if (!cell?.dateKey || cell.trades <= 0) return;

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
          <div className="calendar-shell__nav-group">
            <button className="calendar-shell__nav" onClick={() => changeMonth(-1)} type="button">
              <ChevronLeft size={16} />
            </button>
            <h3 className="calendar-shell__month">
              {calendarData.monthLabel}
            </h3>
            <button className="calendar-shell__nav" onClick={() => changeMonth(1)} type="button">
              <ChevronRight size={16} />
            </button>
          </div>
          <button 
            className="calendar-shell__range" 
            type="button"
            onClick={() => setCurrentDate(new Date())}
          >
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
          <button
            className={`calendar-shell__icon ${settingsOpen ? 'is-active' : ''}`}
            type="button"
            aria-label="Calendar settings"
            onClick={(event) => {
              event.stopPropagation();
              setSettingsOpen((previous) => !previous);
            }}
          >
            <Settings size={15} />
          </button>
          <button
            className={`calendar-shell__icon ${isSnapshotting ? 'is-active' : ''}`}
            type="button"
            aria-label="Download calendar snapshot"
            title="Download calendar image"
            disabled={isSnapshotting}
            onClick={downloadCalendarSnapshot}
          >
            <Camera size={15} />
          </button>
          <InfoTooltip
            text="Shows daily P&L, trade count, win rate, breakeven days, and opens day review when you click a trading day."
            size={13}
            side="bottom"
          />

          {settingsOpen && (
            <div
              className="calendar-settings-menu"
              onClick={(event) => event.stopPropagation()}
            >
              <span className="calendar-settings-menu__title">Calendar settings</span>

              <div className="calendar-settings-menu__row">
                <span>Week starts on</span>
                <CustomSelect
                  value={calendarSettings.weekStartsOn}
                  onChange={(event) => updateCalendarSettings({ weekStartsOn: event.target.value })}
                  options={[
                    { value: 'sun', label: 'Sunday' },
                    { value: 'mon', label: 'Monday' },
                  ]}
                />
              </div>

              <label className="calendar-settings-menu__option">
                <input
                  type="checkbox"
                  checked={calendarSettings.showPnl}
                  onChange={(event) => updateCalendarSettings({ showPnl: event.target.checked })}
                />
                Show P&L in day cells
              </label>

              <label className="calendar-settings-menu__option">
                <input
                  type="checkbox"
                  checked={calendarSettings.showTradeCount}
                  onChange={(event) => updateCalendarSettings({ showTradeCount: event.target.checked })}
                />
                Show number of trades
              </label>

              <label className="calendar-settings-menu__option">
                <input
                  type="checkbox"
                  checked={calendarSettings.showWinRate}
                  onChange={(event) => updateCalendarSettings({ showWinRate: event.target.checked })}
                />
                Show win rate
              </label>

              <label className="calendar-settings-menu__option">
                <input
                  type="checkbox"
                  checked={calendarSettings.autoBreakevenEnabled}
                  onChange={(event) => updateCalendarSettings({ autoBreakevenEnabled: event.target.checked })}
                />
                Auto breakeven below P&L
              </label>

              <label className="calendar-settings-menu__row">
                <span>Breakeven below</span>
                <input
                  className="calendar-settings-menu__number"
                  type="number"
                  inputMode="decimal"
                  value={calendarSettings.breakevenThreshold}
                  onChange={(event) => updateCalendarSettings({
                    autoBreakevenEnabled: true,
                    breakevenThreshold: event.target.value,
                  })}
                />
              </label>
            </div>
          )}
        </div>
      </header>

      <div className={`calendar-shell__body ${calendarData.weeks.length >= 6 ? 'calendar-shell__body--6-rows' : ''}`}>
        <div className="calendar-shell__main">
          <div className="calendar-shell__weekdays">
            {weekdayLabels.map((weekday) => (
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
                      <strong className={`calendar-day-card__pnl ${calendarSettings.showPnl ? '' : 'calendar-day-card__metric--hidden'}`}>
                        {formatCompactCurrency(cell.pnl, currencyCode)}
                      </strong>
                      <span className={`calendar-day-card__trades ${calendarSettings.showTradeCount ? '' : 'calendar-day-card__metric--hidden'}`}>
                        {cell.trades} trade{cell.trades > 1 ? 's' : ''}
                      </span>
                      <span className={`calendar-day-card__rate ${calendarSettings.showWinRate ? '' : 'calendar-day-card__metric--hidden'}`}>
                        {cell.winRate.toFixed(1)}%
                      </span>
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
                  } ${week.isCurrentWeek ? 'calendar-week-card--current' : ''}`}
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
