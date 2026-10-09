import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Camera, BadgeCheck, ChevronDown, ChevronLeft, ChevronRight, DoubleChevronLeftIcon, Settings } from '@/icons/lucideIcons';
import { formatCompactCurrency } from '@/utils/user/Currency';
import api from '@/utils/common/serve';
import { getTradeDisplayDate } from '@/utils/trading/tradeTime';
import { loadCachedUserSettings, saveUserSettings } from '@/utils/user/userSettings';
import { Card, CardHeader, CardTitle, DropdownSelect as CustomSelect, InfoTooltip } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useBreakpoint } from "@/hooks/use-breakpoint";

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAY_NAMES_SUN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAY_NAMES_MON = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DEFAULT_CALENDAR_SETTINGS = {
  weekStartsOn: 'sun', showPnl: true, showTradeCount: true, showWinRate: true, autoBreakevenEnabled: false, breakevenThreshold: 0, manualBreakevenOverrides: {}
};

const normalizeCalendarSettings = (settings = {}) => ({
  ...DEFAULT_CALENDAR_SETTINGS,
  ...settings,
  autoBreakevenEnabled: Boolean(settings.autoBreakevenEnabled),
  breakevenThreshold: Number.isFinite(Number(settings.breakevenThreshold)) ? Number(settings.breakevenThreshold) : DEFAULT_CALENDAR_SETTINGS.breakevenThreshold,
  manualBreakevenOverrides: settings.manualBreakevenOverrides && typeof settings.manualBreakevenOverrides === 'object' ? settings.manualBreakevenOverrides : {}
});

const getCachedCalendarSettings = () => normalizeCalendarSettings(loadCachedUserSettings()?.pnlCalendar);
const getOrderedWeekdays = (w) => (w === 'mon' ? WEEKDAY_NAMES_MON : WEEKDAY_NAMES_SUN);
const getFirstWeekdayOffset = (d, w) => (w === 'mon' ? (d + 6) % 7 : d);

function PnLCalendar({ calendarSummary = null, currencyCode = 'USD' }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userSettingsQuery = useUserSettings();
  const isCompactWeeks = !useBreakpoint('lg');
  const calendarShellRef = useRef(null);
  const calendarSettingsVersion = useRef(0);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isWeeklyOpen, setIsWeeklyOpen] = useState(false);
  const [breakevenMenu, setBreakevenMenu] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const [calendarSettings, setCalendarSettings] = useState(getCachedCalendarSettings);
  const [pendingBreakevenDays, setPendingBreakevenDays] = useState({});
  const [isSnapshotting, setIsSnapshotting] = useState(false);

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
    if (!actionsMenuOpen) return undefined;
    const closeActionsMenu = () => setActionsMenuOpen(false);
    window.addEventListener('click', closeActionsMenu);
    return () => window.removeEventListener('click', closeActionsMenu);
  }, [actionsMenuOpen]);

  const dailySummary = useMemo(() => {
    const summary = {};
    if (Array.isArray(calendarSummary)) {
      calendarSummary.forEach((day) => { summary[day.dateKey] = day; });
    }
    return summary;
  }, [calendarSummary]);

  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstWeekday = getFirstWeekdayOffset(firstDay.getDay(), calendarSettings.weekStartsOn);
    const daysInMonth = lastDay.getDate();
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    const today = new Date();
    const weeks = [];
    let currentWeek = [];

    for (let i = firstWeekday - 1; i >= 0; i -= 1) {
      const prevDay = prevMonthLastDay - i;
      const prevDate = new Date(year, month - 1, prevDay);
      const dateKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(prevDay).padStart(2, '0')}`;
      const stats = dailySummary[dateKey] ? dailySummary[dateKey] : { pnl: 0, trades: 0, wins: 0, hasBadge: false, isBreakeven: false };
      currentWeek.push({
        day: prevDay, dateKey, pnl: stats.pnl, trades: stats.trades,
        winRate: stats.trades > 0 ? (stats.wins / stats.trades) * 100 : 0,
        hasBadge: stats.hasBadge, isBreakeven: stats.isBreakeven, isToday: false, isOtherMonth: true
      });
    }

    for (let dayCounter = 1; dayCounter <= daysInMonth; dayCounter += 1) {
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayCounter).padStart(2, '0')}`;
      const stats = dailySummary[dateKey] ? dailySummary[dateKey] : { pnl: 0, trades: 0, wins: 0, hasBadge: false, isBreakeven: false };
      const shouldAutoMarkBreakeven = calendarSettings.autoBreakevenEnabled && stats.trades > 0 && stats.pnl <= Number(calendarSettings.breakevenThreshold);
      const manualOverride = calendarSettings.manualBreakevenOverrides?.[dateKey];
      const hasTrades = stats.trades > 0;
      const isBreakeven = hasTrades && (
        pendingBreakevenDays[dateKey] !== undefined ? pendingBreakevenDays[dateKey] : (typeof manualOverride === 'boolean' ? manualOverride : (stats.isBreakeven || shouldAutoMarkBreakeven))
      );

      currentWeek.push({
        day: dayCounter, dateKey, pnl: stats.pnl, trades: stats.trades,
        winRate: stats.trades > 0 ? (stats.wins / stats.trades) * 100 : 0,
        hasBadge: stats.hasBadge, isBreakeven,
        isToday: today.getFullYear() === year && today.getMonth() === month && today.getDate() === dayCounter,
        isOtherMonth: false
      });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    let nextDayCounter = 1;
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        const nextDate = new Date(year, month + 1, nextDayCounter);
        const nextDay = nextDate.getDate();
        const dateKey = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDay).padStart(2, '0')}`;
        const stats = dailySummary[dateKey] ? dailySummary[dateKey] : { pnl: 0, trades: 0, wins: 0, hasBadge: false, isBreakeven: false };
        currentWeek.push({
          day: nextDay, dateKey, pnl: stats.pnl, trades: stats.trades,
          winRate: stats.trades > 0 ? (stats.wins / stats.trades) * 100 : 0,
          hasBadge: stats.hasBadge, isBreakeven: stats.isBreakeven, isToday: false, isOtherMonth: true
        });
        nextDayCounter += 1;
      }
      weeks.push(currentWeek);
      currentWeek = [];
    }

    const allCurrentMonthCells = weeks.flat().filter((cell) => !cell.isOtherMonth);
    const monthlyPnL = allCurrentMonthCells.reduce((sum, cell) => sum + cell.pnl, 0);
    const tradingDays = allCurrentMonthCells.filter((cell) => cell.trades > 0).length;
    const weeklyStats = weeks.map((week, index) => {
      const activeDays = week.filter((cell) => !cell.isOtherMonth && cell.trades > 0);
      return {
        label: `Week ${index + 1}`,
        pnl: activeDays.reduce((sum, cell) => sum + cell.pnl, 0),
        days: activeDays.length,
        isCurrentWeek: week.some((cell) => cell.isToday)
      };
    });

    return {
      monthLabel: `${MONTH_NAMES[month]}, ${year}`,
      weeks, monthlyPnL, tradingDays, weeklyStats
    };
  }, [
    calendarSettings.autoBreakevenEnabled, calendarSettings.breakevenThreshold,
    calendarSettings.manualBreakevenOverrides, calendarSettings.weekStartsOn,
    currentDate, dailySummary, pendingBreakevenDays
  ]);

  const weekdayLabels = useMemo(() => getOrderedWeekdays(calendarSettings.weekStartsOn), [calendarSettings.weekStartsOn]);

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
      const { weeks, monthLabel, monthlyPnL, tradingDays } = calendarData;
      const width = 1400, toolbarHeight = 78, padding = 28, gap = 10, weekPanelWidth = 150;
      const calendarWidth = width - (padding * 2) - weekPanelWidth - 16;
      const weekdayHeight = 38, rows = Math.max(5, weeks.length);
      const cellWidth = (calendarWidth - gap * 6) / 7, cellHeight = 118;
      const height = toolbarHeight + padding + weekdayHeight + gap + rows * cellHeight + (rows - 1) * gap + padding;
      const canvas = document.createElement('canvas');
      const scale = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext('2d');
      ctx.scale(scale, scale);

      const rRect = (x, y, w, h, r, fill, stroke) => {
        const rad = Math.min(r, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + rad, y);
        ctx.arcTo(x + w, y, x + w, y + h, rad);
        ctx.arcTo(x + w, y + h, x, y + h, rad);
        ctx.arcTo(x, y + h, x, y, rad);
        ctx.arcTo(x, y, x + w, y, rad);
        ctx.closePath();
        if (fill) { ctx.fillStyle = fill; ctx.fill(); }
        if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
      };

      const dText = (text, x, y, { color = '#0f172a', size = 14, weight = 600, align = 'left', maxW } = {}) => {
        ctx.fillStyle = color;
        ctx.font = `${weight} ${size}px Inter, Segoe UI, Arial, sans-serif`;
        ctx.textAlign = align;
        ctx.fillText(String(text), x, y, maxW);
      };

      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, toolbarHeight);
      ctx.strokeStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.moveTo(0, toolbarHeight - 0.5);
      ctx.lineTo(width, toolbarHeight - 0.5);
      ctx.stroke();

      dText(monthLabel, padding, 48, { size: 22, weight: 800 });
      dText('Monthly stats:', width - 430, 48, { size: 14, weight: 800 });

      const monthlyTone = monthlyPnL > 0 ? '#16a34a' : monthlyPnL < 0 ? '#dc2626' : '#0f172a';
      rRect(width - 310, 27, 92, 28, 14, monthlyPnL < 0 ? '#fee2e2' : monthlyPnL > 0 ? '#dcfce7' : '#e2e8f0');
      dText(formatCompactCurrency(monthlyPnL, currencyCode), width - 264, 45, { size: 13, weight: 800, color: monthlyTone, align: 'center' });

      rRect(width - 208, 27, 86, 28, 14, '#dbeafe');
      dText(`${tradingDays} days`, width - 165, 45, { size: 13, weight: 800, color: '#0f172a', align: 'center' });

      let y = toolbarHeight + padding;
      weekdayLabels.forEach((weekday, idx) => {
        const x = padding + idx * (cellWidth + gap);
        rRect(x, y, cellWidth, weekdayHeight, 8, '#fafafa', '#e2e8f0');
        dText(weekday.toUpperCase(), x + cellWidth / 2, y + 24, { size: 13, weight: 700, color: '#94a3b8', align: 'center' });
      });

      y += weekdayHeight + gap;
      weeks.forEach((week, weekIdx) => {
        week.forEach((cell, dayIdx) => {
          const x = padding + dayIdx * (cellWidth + gap);
          const cellY = y + weekIdx * (cellHeight + gap);
          const isOther = cell.isOtherMonth;
          const isProfit = !isOther && cell.trades > 0 && cell.pnl > 0;
          const isLoss = !isOther && cell.trades > 0 && cell.pnl < 0;
          const isBE = !isOther && cell.isBreakeven;

          const bg = isOther ? '#f8f8f8' : isBE ? '#eef2ff' : isProfit ? '#f0fdf4' : isLoss ? '#fef2f2' : '#ffffff';
          const border = isOther ? '#e2e8f0' : isBE ? '#c7d2fe' : isProfit ? '#bbf7d0' : isLoss ? '#fecaca' : '#e2e8f0';
          rRect(x, cellY, cellWidth, cellHeight, 8, bg, border);
          dText(cell.day, x + 10, cellY + 20, { size: 13, weight: 700, color: isOther ? '#94a3b8' : '#0f172a' });

          if (isBE) {
            rRect(x + cellWidth - 36, cellY + 8, 28, 16, 4, '#e0e7ff');
            dText('BE', x + cellWidth - 22, cellY + 20, { size: 10, weight: 700, color: '#4338ca', align: 'center' });
          }

          if (!isOther && cell.trades > 0) {
            let bY = cellY + 34;
            if (calendarSettings.showPnl) {
              const pnlText = isProfit ? `+${formatCompactCurrency(cell.pnl, currencyCode)}` : formatCompactCurrency(cell.pnl, currencyCode);
              dText(pnlText, x + 10, bY + 12, { size: 13, weight: 700, color: isBE ? '#4338ca' : isProfit ? '#15803d' : isLoss ? '#b91c1c' : '#475569' });
              bY += 22;
            }
            if (calendarSettings.showTradeCount) {
              rRect(x + 10, bY, 56, 16, 3, '#fef3c7', '#fde68a');
              dText(`${cell.trades} trd`, x + 38, bY + 12, { size: 9, weight: 700, color: '#9a3412', align: 'center' });
              bY += 18;
            }
            if (calendarSettings.showWinRate) {
              rRect(x + 10, bY, 64, 16, 3, '#e0f2fe', '#bae6fd');
              dText(`${cell.winRate.toFixed(0)}% win`, x + 42, bY + 12, { size: 9, weight: 700, color: '#0369a1', align: 'center' });
            }
          }
        });

        const weekStats = calendarData.weeklyStats[weekIdx];
        if (weekStats) {
          const wX = padding + 7 * cellWidth + 6 * gap + 16;
          const wY = y + weekIdx * (cellHeight + gap);
          rRect(wX, wY, weekPanelWidth, cellHeight, 8, '#ffffff', weekStats.isCurrentWeek ? '#3b82f6' : '#e2e8f0');
          dText(weekStats.label, wX + 12, wY + 24, { size: 12, weight: 800, color: weekStats.isCurrentWeek ? '#2563eb' : '#64748b' });
          dText(`${weekStats.days} active days`, wX + 12, wY + 44, { size: 11, weight: 600, color: '#94a3b8' });
          const tone = weekStats.pnl > 0 ? '#15803d' : weekStats.pnl < 0 ? '#b91c1c' : '#0f172a';
          dText(formatCompactCurrency(weekStats.pnl, currencyCode), wX + 12, wY + 70, { size: 14, weight: 800, color: tone });
        }
      });

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png', 1));
      if (!blob) throw new Error('Calendar image export failed');
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `pnl-calendar-${monthLabel.replaceAll(',', '').replaceAll(' ', '-').toLowerCase()}.png`;
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
    setCurrentDate((previous) => new Date(previous.getFullYear(), previous.getMonth() + direction, 1));
  };

  const toggleBreakevenDay = async (dateKey, currentValue) => {
    const dayStats = dailySummary[dateKey];
    if (!dayStats || dayStats.trades <= 0) return;
    const nextValue = !currentValue;
    const nextManualOverrides = { ...calendarSettings.manualBreakevenOverrides, [dateKey]: nextValue };
    setPendingBreakevenDays((previous) => ({ ...previous, [dateKey]: nextValue }));
    updateCalendarSettings({ manualBreakevenOverrides: nextManualOverrides });
    setBreakevenMenu((previous) => (previous?.dateKey === dateKey ? { ...previous, isBreakeven: nextValue } : previous));

    if (user?.ID) {
      queryClient.setQueriesData({ queryKey: ['trades', user.ID] }, (previousTrades) => (
        Array.isArray(previousTrades)
          ? previousTrades.map((trade) => {
              const tradeDate = getTradeDisplayDate(trade);
              if (!tradeDate) return trade;
              const tradeDateKey = `${tradeDate.getFullYear()}-${String(tradeDate.getMonth() + 1).padStart(2, '0')}-${String(tradeDate.getDate()).padStart(2, '0')}`;
              return tradeDateKey === dateKey ? { ...trade, is_breakeven: nextValue } : trade;
            })
          : previousTrades
      ));
    }

    try {
      const { data } = await api.patch('/trades/breakeven-day', { date: dateKey, is_breakeven: nextValue });
      if (!data?.success) throw new Error(data?.error || 'Breakeven update failed');
      if (user?.ID) await queryClient.invalidateQueries({ queryKey: ['trades', user.ID] });
    } catch {
      setPendingBreakevenDays((previous) => ({ ...previous, [dateKey]: currentValue }));
      setBreakevenMenu((previous) => (previous?.dateKey === dateKey ? { ...previous, isBreakeven: currentValue } : previous));
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
      dateKey: cell.dateKey, day: cell.day, isBreakeven: cell.isBreakeven,
      x: Math.max(8, Math.min(localX + 8, maxX)), y: Math.max(8, Math.min(localY + 28, maxY))
    });
  };

  const openDayReview = (cell) => {
    if (!cell?.dateKey || cell.trades <= 0) return;
    navigate(`/day-review/${cell.dateKey}`);
  };

  const is6Rows = calendarData.weeks.length >= 6;
  const showWeeklyCards = !isCompactWeeks || isWeeklyOpen;

  return (
    <Card as="section" className="relative flex flex-col h-full min-h-0 overflow-hidden max-lg:h-auto max-lg:overflow-visible" padding="none" ref={calendarShellRef}>
      <CardHeader className="flex items-center justify-between gap-2 sm:gap-3 p-2.5 sm:px-3 pb-2.5 border-b border-[var(--divider-strong)] flex-nowrap shrink-0">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap shrink-0 relative">
          <div className="flex items-center gap-0.5 sm:gap-1">
            <button className="w-6 h-6 inline-flex items-center justify-center border-none rounded-[8px] bg-transparent text-[var(--text-primary)] hover:bg-[var(--bg-hover)] hover:text-[var(--accent-ink)] cursor-pointer transition-colors" onClick={() => changeMonth(-1)} type="button" aria-label="Previous month">
              <ChevronLeft size={16} />
            </button>
            <CardTitle className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] min-w-[90px] sm:min-w-[100px] text-center select-none whitespace-nowrap">
              {calendarData.monthLabel}
            </CardTitle>
            <button className="w-6 h-6 inline-flex items-center justify-center border-none rounded-[8px] bg-transparent text-[var(--text-primary)] hover:bg-[var(--bg-hover)] hover:text-[var(--accent-ink)] cursor-pointer transition-colors" onClick={() => changeMonth(1)} type="button" aria-label="Next month">
              <ChevronRight size={16} />
            </button>
          </div>
          <button className="hidden md:inline-flex border border-slate-300/80 dark:border-slate-700/80 rounded-[8px] text-[var(--text-primary)] px-2.5 py-1 text-xs sm:text-[13px] font-semibold bg-transparent cursor-pointer hover:bg-[var(--bg-hover)] hover:text-[var(--accent-ink)] transition-all whitespace-nowrap" type="button" onClick={() => setCurrentDate(new Date())}>
            This month
          </button>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap shrink-0 relative">
          <span className="text-xs sm:text-[13px] font-bold text-[var(--text-primary)] hidden md:inline">Monthly stats:</span>
          <span className={`inline-flex items-center justify-center min-w-[50px] sm:min-w-[58px] px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-bold ${calendarData.monthlyPnL > 0 ? 'bg-[#DCFCE7] text-[#15803d] dark:bg-[#15803d]/25 dark:text-[#4ade80]' : calendarData.monthlyPnL < 0 ? 'bg-[#FEE2E2] text-[#b91c1c] dark:bg-[#dc2626]/25 dark:text-[#f87171]' : 'bg-slate-100 dark:bg-slate-800 text-[var(--text-primary)]'}`}>
            {formatCompactCurrency(calendarData.monthlyPnL, currencyCode)}
          </span>
          <span className="inline-flex items-center justify-center min-w-[45px] sm:min-w-[58px] px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#E0F2FE] text-[#0369a1] dark:bg-[#0369a1]/25 dark:text-[#7dd3fc]">
            {calendarData.tradingDays} days
          </span>
          <div className="hidden md:flex items-center gap-1">
            <button className={`w-6 h-6 inline-flex items-center justify-center border-none rounded-[8px] bg-transparent text-[var(--text-primary)] hover:bg-[var(--bg-hover)] hover:text-[var(--accent-ink)] cursor-pointer transition-colors ${settingsOpen ? 'bg-[var(--bg-hover)] text-[var(--accent-ink)]' : ''}`} type="button" aria-label="Calendar settings" onClick={(e) => { e.stopPropagation(); setSettingsOpen((p) => !p); }}>
              <Settings size={15} />
            </button>
            <button className={`w-6 h-6 inline-flex items-center justify-center border-none rounded-[8px] bg-transparent text-[var(--text-primary)] hover:bg-[var(--bg-hover)] hover:text-[var(--accent-ink)] cursor-pointer transition-colors ${isSnapshotting ? 'bg-[var(--bg-hover)] text-[var(--accent-ink)] opacity-60 cursor-not-allowed' : ''}`} type="button" aria-label="Download calendar snapshot" title="Download calendar image" disabled={isSnapshotting} onClick={downloadCalendarSnapshot}>
              <Camera size={15} />
            </button>
            <InfoTooltip text="Shows daily P&L, trade count, win rate, breakeven days, and opens day review when you click a trading day." size={13} side="bottom" />
          </div>

          <div className="md:hidden relative inline-flex items-center">
            <button className={`w-6 h-6 inline-flex items-center justify-center border-none rounded-[8px] bg-transparent text-[var(--text-primary)] hover:bg-[var(--bg-hover)] hover:text-[var(--accent-ink)] cursor-pointer transition-colors ${actionsMenuOpen ? 'bg-[var(--bg-hover)] text-[var(--accent-ink)]' : ''}`} type="button" aria-label="More calendar options" onClick={(e) => { e.stopPropagation(); setActionsMenuOpen((p) => !p); }}>
              <DoubleChevronLeftIcon size={18} />
            </button>
            {actionsMenuOpen && (
              <div className="absolute top-[calc(100%+8px)] right-0 z-30 w-44 p-1.5 border border-[var(--border-light)] dark:border-[#242424] rounded-xl bg-[var(--bg-card)] dark:bg-[#090909] shadow-xl dark:shadow-2xl flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
                <button type="button" className="flex items-center gap-2 px-2.5 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-hover)] hover:text-[var(--accent-ink)] rounded-lg transition-colors text-left border-none bg-transparent cursor-pointer" onClick={() => { setCurrentDate(new Date()); setActionsMenuOpen(false); }}>
                  <span>📅</span> This month
                </button>
                <button type="button" className="flex items-center gap-2 px-2.5 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-hover)] hover:text-[var(--accent-ink)] rounded-lg transition-colors text-left border-none bg-transparent cursor-pointer" onClick={() => { setSettingsOpen(true); setActionsMenuOpen(false); }}>
                  <Settings size={14} /> Settings
                </button>
                <button type="button" disabled={isSnapshotting} className="flex items-center gap-2 px-2.5 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-hover)] hover:text-[var(--accent-ink)] rounded-lg transition-colors text-left border-none bg-transparent cursor-pointer disabled:opacity-50" onClick={() => { downloadCalendarSnapshot(); setActionsMenuOpen(false); }}>
                  <Camera size={14} /> Snapshot
                </button>
              </div>
            )}
          </div>

          {settingsOpen && (
            <div className="absolute top-[calc(100%+8px)] right-0 z-20 w-[min(280px,calc(100vw-32px))] p-3 border border-[var(--border-light)] dark:border-[#242424] rounded-xl bg-[var(--bg-card)] dark:bg-[#090909] shadow-xl dark:shadow-2xl flex flex-col gap-2.5" onClick={(e) => e.stopPropagation()}>
              <span className="text-[13px] font-extrabold text-[var(--heading)]">Calendar settings</span>
              <div className="flex items-center justify-between gap-2.5 text-[var(--text-secondary)] text-[13px] font-semibold">
                <span>Week starts on</span>
                <div className="w-[122px]">
                  <CustomSelect value={calendarSettings.weekStartsOn} onChange={(e) => updateCalendarSettings({ weekStartsOn: e.target.value })} options={[{ value: 'sun', label: 'Sunday' }, { value: 'mon', label: 'Monday' }]} />
                </div>
              </div>
              <label className="flex items-center justify-start gap-2.5 text-[var(--text-secondary)] text-[13px] font-semibold cursor-pointer">
                <input type="checkbox" className="w-3.5 h-3.5 accent-[var(--checkbox-accent)] cursor-pointer" checked={calendarSettings.showPnl} onChange={(e) => updateCalendarSettings({ showPnl: e.target.checked })} />
                Show P&L in day cells
              </label>
              <label className="flex items-center justify-start gap-2.5 text-[var(--text-secondary)] text-[13px] font-semibold cursor-pointer">
                <input type="checkbox" className="w-3.5 h-3.5 accent-[var(--checkbox-accent)] cursor-pointer" checked={calendarSettings.showTradeCount} onChange={(e) => updateCalendarSettings({ showTradeCount: e.target.checked })} />
                Show number of trades
              </label>
              <label className="flex items-center justify-start gap-2.5 text-[var(--text-secondary)] text-[13px] font-semibold cursor-pointer">
                <input type="checkbox" className="w-3.5 h-3.5 accent-[var(--checkbox-accent)] cursor-pointer" checked={calendarSettings.showWinRate} onChange={(e) => updateCalendarSettings({ showWinRate: e.target.checked })} />
                Show win rate
              </label>
              <label className="flex items-center justify-start gap-2.5 text-[var(--text-secondary)] text-[13px] font-semibold cursor-pointer">
                <input type="checkbox" className="w-3.5 h-3.5 accent-[var(--checkbox-accent)] cursor-pointer" checked={calendarSettings.autoBreakevenEnabled} onChange={(e) => updateCalendarSettings({ autoBreakevenEnabled: e.target.checked })} />
                Auto breakeven below P&L
              </label>
              <label className="flex items-center justify-between gap-2.5 text-[var(--text-secondary)] text-[13px] font-semibold">
                <span>Breakeven below</span>
                <input className="w-[84px] min-h-[30px] border border-[var(--border-light)] dark:border-[#333] rounded-lg px-2 py-1 bg-[var(--bg-card)] dark:bg-[#141416] text-[var(--text-primary)] text-[13px] font-bold outline-none focus:border-[var(--accent-ink)]" type="number" inputMode="decimal" value={calendarSettings.breakevenThreshold} onChange={(e) => updateCalendarSettings({ autoBreakevenEnabled: true, breakevenThreshold: e.target.value })} />
              </label>
            </div>
          )}
        </div>
      </CardHeader>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_min(118px,13%)] gap-1 sm:gap-1.5 p-1.5 sm:p-2.5 flex-1 min-h-0 lg:overflow-hidden max-lg:flex max-lg:flex-col max-lg:h-auto max-lg:flex-none">
        <div className="flex flex-col min-w-0 gap-1 sm:gap-1.5 h-full min-h-0 flex-1 lg:overflow-hidden max-lg:h-auto max-lg:flex-none">
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5 shrink-0">
            {weekdayLabels.map((weekday, idx) => (
              <div key={weekday} className={`flex items-center justify-center min-h-[24px] sm:min-h-[28px] border border-slate-200 dark:border-[var(--divider-strong)] text-[10px] sm:text-xs font-bold text-[#969696] dark:text-slate-400 bg-[#FAFAFA] dark:bg-[var(--surface-muted-strong)] tracking-wider select-none ${idx === 0 ? 'rounded-tl-lg' : ''} ${idx === 6 ? 'max-lg:rounded-tr-lg' : ''}`}>
                {weekday.toUpperCase()}
              </div>
            ))}
          </div>

          <div className={`grid grid-cols-7 gap-1 sm:gap-1.5 flex-1 min-h-0 lg:h-full lg:overflow-hidden max-lg:grid-rows-none max-lg:auto-rows-[104px] max-sm:auto-rows-[92px] max-lg:flex-none ${is6Rows ? 'lg:grid-rows-6' : 'lg:grid-rows-5'}`}>
            {calendarData.weeks.flat().map((cell, index) => {
              const isOtherMonth = cell.isOtherMonth;
              const hasTrades = cell.trades > 0;
              const isBreakeven = cell.isBreakeven;
              const isProfit = !isOtherMonth && hasTrades && cell.pnl > 0;
              const isLoss = !isOtherMonth && hasTrades && cell.pnl < 0;
              const shellToneClass = isOtherMonth
                ? 'bg-[#F8F8F8] dark:bg-[#12151c]/40 border-slate-200/60 dark:border-[#222733]/50 opacity-40 cursor-default'
                : isBreakeven
                  ? 'bg-[#EEF2FF] dark:bg-[#171b2d] border-[#C7D2FE] dark:border-[#3730a3] hover:border-indigo-400 dark:hover:border-indigo-500 shadow-[0px_1px_2px_rgba(79,70,229,0.06)]'
                  : isProfit
                    ? 'bg-[#F0FDF4] dark:bg-[#0c2217] border-[#BBF7D0] dark:border-[#1e5238] hover:border-emerald-400 dark:hover:border-emerald-500 shadow-[0px_1px_2px_rgba(220,38,38,0.06)]'
                    : isLoss
                      ? 'bg-[#FEF2F2] dark:bg-[#271217] border-[#FECACA] dark:border-[#5c1d24] hover:border-red-400 dark:hover:border-red-500 shadow-[0px_1px_2px_rgba(220,38,38,0.06)]'
                      : 'bg-white dark:bg-[#11141c] border-slate-200/90 dark:border-[#242a38] shadow-[0px_1px_2px_rgba(0,0,0,0.04)]';

              return (
                <div
                  key={`${cell.dateKey}-${index}`}
                  className={`@container/cell group relative flex flex-col justify-evenly min-h-0 h-full w-full border rounded-lg overflow-hidden transition-all select-none p-[clamp(3px,1.2cqh+1.2cqi,7px)] ${shellToneClass} ${!isOtherMonth && hasTrades ? 'hover:shadow-md cursor-pointer' : !isOtherMonth ? 'cursor-default' : ''} ${cell.isToday ? 'ring-2 ring-blue-500 dark:ring-blue-400 border-transparent shadow-xs' : ''}`}
                  onClick={() => { if (!isOtherMonth && hasTrades) openDayReview(cell); }}
                  onContextMenu={(e) => { if (!isOtherMonth && hasTrades) openBreakevenMenu(e, cell); }}
                  role={!isOtherMonth && hasTrades ? 'button' : undefined}
                  tabIndex={!isOtherMonth && hasTrades ? 0 : -1}
                  onKeyDown={(e) => {
                    if (isOtherMonth || !hasTrades) return;
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDayReview(cell); }
                  }}
                  title={!isOtherMonth && hasTrades ? 'Open day review. Right-click for day options' : isOtherMonth ? 'Previous/next month day' : 'No trades on this day'}
                >
                  <div className="absolute top-[clamp(2px,2.5cqh,5px)] right-[clamp(2px,2.5cqi,5px)] flex items-center gap-[clamp(2px,1.5cqi,4px)] pointer-events-none z-10">
                    {!isOtherMonth && isBreakeven && (
                      <span className="inline-flex items-center px-[clamp(2px,2cqi,4px)] py-[clamp(0.5px,0.8cqh,1.5px)] rounded-[3px] text-[clamp(7px,10cqh,8.5px)] font-bold bg-[#E0E7FF] text-[#4338CA] dark:bg-[#3730A3]/40 dark:text-[#A5B4FC] border border-[#C7D2FE] dark:border-[#3730A3]" title="Breakeven Day">
                        BE
                      </span>
                    )}
                    {!isOtherMonth && cell.hasBadge && !isBreakeven && (
                      <BadgeCheck size={12} className="text-blue-500 stroke-[2.4] w-[clamp(10px,13cqh,13px)] h-[clamp(10px,13cqh,13px)]" />
                    )}
                    {cell.isToday ? (
                      <span className="inline-flex items-center justify-center min-w-[clamp(15px,1.2vw,19px)] h-[clamp(15px,1.2vw,19px)] px-1 rounded-full bg-blue-600 text-white text-fluid-xs font-bold shadow-xs">
                        {cell.day}
                      </span>
                    ) : (
                      <span className={`font-bold tracking-tight text-fluid-xs ${isOtherMonth ? 'text-slate-400 dark:text-slate-600' : 'text-slate-800 dark:text-slate-200'}`}>
                        {cell.day}
                      </span>
                    )}
                  </div>

                  {!isOtherMonth && hasTrades ? (
                    <div className="flex-1 flex flex-col justify-evenly w-full min-h-0 pointer-events-none overflow-hidden py-[clamp(1px,1.2cqh,3px)]">
                      {calendarSettings.showPnl && (
                        <div className="w-full min-w-0 leading-none truncate">
                          <span className={`font-extrabold tracking-tight truncate block text-[clamp(9.5px,15.5cqi,15.5px)] ${isBreakeven ? 'text-[#4338CA] dark:text-[#A5B4FC]' : isProfit ? 'text-[#15803d] dark:text-[#4ade80]' : isLoss ? 'text-[#b91c1c] dark:text-[#f87171]' : 'text-slate-700 dark:text-slate-300'}`}>
                            {cell.pnl > 0 ? `+${formatCompactCurrency(cell.pnl, currencyCode)}` : formatCompactCurrency(cell.pnl, currencyCode)}
                          </span>
                        </div>
                      )}
                      {calendarSettings.showTradeCount && (
                        <span className="inline-flex items-center w-fit max-w-full px-[clamp(3px,4cqi,6px)] py-[clamp(1px,1.5cqh,2.5px)] text-[clamp(7px,10cqi,10px)] rounded-[clamp(2px,3cqi,4px)] font-semibold leading-none truncate bg-amber-100/80 text-[#9a3412] dark:bg-amber-950/50 dark:text-[#fdba74] border border-amber-300/60 dark:border-amber-800/50 shrink-0">
                          {cell.trades} {cell.trades === 1 ? 'trade' : 'trades'}
                        </span>
                      )}
                      {calendarSettings.showWinRate && (
                        <span className="inline-flex items-center w-fit max-w-full px-[clamp(3px,4cqi,6px)] py-[clamp(1px,1.5cqh,2.5px)] text-[clamp(7px,10cqi,10px)] rounded-[clamp(2px,3cqi,4px)] font-semibold leading-none truncate bg-sky-100/80 text-[#0369a1] dark:bg-sky-950/50 dark:text-[#7dd3fc] border border-sky-300/60 dark:border-sky-800/50 shrink-0">
                          {cell.winRate.toFixed(0)}% win
                        </span>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <aside className="flex flex-col gap-1 sm:gap-1.5 h-full min-h-0 lg:overflow-hidden max-lg:w-full max-lg:h-auto max-lg:flex-none min-w-0">
          <div className="hidden lg:flex items-center justify-center min-h-[24px] sm:min-h-[28px] border border-slate-200 dark:border-[var(--divider-strong)] text-[10px] sm:text-xs font-bold text-[#969696] dark:text-slate-400 bg-[#FAFAFA] dark:bg-[var(--surface-muted-strong)] tracking-wider select-none rounded-tr-lg shrink-0">
            WEEK
          </div>
          {isCompactWeeks && (
            <button className="inline-flex lg:hidden items-center justify-between gap-2 w-full min-h-[34px] px-3 py-1.5 border border-slate-300/55 dark:border-[var(--divider-strong)] rounded-xl bg-white/80 dark:bg-[var(--surface-muted-strong)] text-[var(--text-primary)] text-xs font-bold cursor-pointer shrink-0" type="button" onClick={() => setIsWeeklyOpen((p) => !p)} aria-expanded={isWeeklyOpen}>
              <span>Weekly cards</span>
              <ChevronDown size={16} className={`transition-transform duration-200 ${isWeeklyOpen ? 'rotate-180' : ''}`} />
            </button>
          )}
          {showWeeklyCards && (
            <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-1 sm:gap-1.5 flex-1 min-h-0 overflow-hidden ${is6Rows ? 'lg:grid-rows-6' : 'lg:grid-rows-5'}`}>
              {calendarData.weeklyStats.map((week) => (
                <article key={week.label} className={`@container/week relative flex flex-col justify-evenly min-h-0 h-full w-full overflow-hidden rounded-lg border border-slate-200 dark:border-[var(--divider-strong)] bg-white dark:bg-[var(--surface-muted-strong)] transition-all p-[clamp(3px,1.2cqh+1.2cqi,7px)] ${week.isCurrentWeek ? 'ring-1.5 ring-blue-500/70 dark:ring-blue-400/80' : ''}`}>
                  <div className="w-full min-w-0 leading-none">
                    {week.isCurrentWeek ? (
                      <span className="bg-[#2563eb] text-white px-[clamp(3px,3cqi,6px)] py-[clamp(0.5px,0.8cqh,1.5px)] rounded-[3px] w-fit text-[clamp(8px,11cqi,11.5px)] font-bold shadow-xs leading-none truncate inline-block">
                        {week.label}
                      </span>
                    ) : (
                      <span className="text-[clamp(8px,11cqi,11.5px)] font-bold text-[var(--text-secondary)] leading-none truncate block">
                        {week.label}
                      </span>
                    )}
                  </div>
                  <div className="w-full min-w-0 leading-none">
                    <span className="px-[clamp(3px,3cqi,6px)] py-[clamp(0.5px,0.8cqh,1.5px)] rounded-full bg-slate-100/90 dark:bg-slate-800 text-[var(--text-secondary)] text-[clamp(7px,10cqi,10px)] font-bold leading-none inline-block truncate">
                      {week.days} {week.days === 1 ? 'day' : 'days'}
                    </span>
                  </div>
                  <div className="w-full min-w-0 leading-none">
                    <strong className={`font-extrabold leading-none truncate block text-[clamp(9.5px,14.5cqi,14.5px)] ${week.pnl > 0 ? 'text-[#15803d] dark:text-[#4ade80]' : week.pnl < 0 ? 'text-[#b91c1c] dark:text-[#f87171]' : 'text-[var(--text-primary)] dark:text-[#f6f8ff]'}`}>
                      {formatCompactCurrency(week.pnl, currencyCode)}
                    </strong>
                  </div>
                </article>
              ))}
            </div>
          )}
        </aside>
      </div>

      {breakevenMenu && (
        <div className="absolute z-50 min-w-[190px] p-2.5 border border-indigo-400/40 dark:border-[#6f86ff] rounded-[10px] bg-white/95 dark:bg-[#151923] shadow-2xl flex flex-col" style={{ left: breakevenMenu.x, top: breakevenMenu.y }} onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
          <span className="block mb-2 text-[var(--text-secondary)] text-xs font-bold uppercase tracking-wider">Day {breakevenMenu.day}</span>
          <label className="flex items-center gap-2 text-[var(--text-primary)] text-[13px] font-bold cursor-pointer" onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleBreakevenDay(breakevenMenu.dateKey, breakevenMenu.isBreakeven); }}>
            <input type="checkbox" className="w-3.5 h-3.5 accent-[var(--checkbox-accent)] cursor-pointer" checked={breakevenMenu.isBreakeven} readOnly onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleBreakevenDay(breakevenMenu.dateKey, breakevenMenu.isBreakeven); }} />
            <span>Is this a breakeven day?</span>
          </label>
        </div>
      )}
    </Card>
  );
}

export default PnLCalendar;
