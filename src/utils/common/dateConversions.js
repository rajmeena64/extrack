import { CalendarDate, getLocalTimeZone } from '@internationalized/date';

export function jsDateToCalendarDate(date) {
  if (!date) return null;
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return new CalendarDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

export function calendarDateToJsDate(calendarDate) {
  if (!calendarDate) return null;
  return new Date(calendarDate.year, calendarDate.month - 1, calendarDate.day);
}

export function jsDateRangeToCalendarRange(range) {
  if (!range) return null;
  const start = jsDateToCalendarDate(range.from);
  const end = jsDateToCalendarDate(range.to);
  if (!start && !end) return null;
  return { start, end };
}

export function calendarRangeToJsDateRange(range) {
  if (!range) return { from: null, to: null };
  return {
    from: calendarDateToJsDate(range.start),
    to: calendarDateToJsDate(range.end),
  };
}
