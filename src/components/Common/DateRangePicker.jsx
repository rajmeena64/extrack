import { useState, useMemo } from "react";
import { DayPicker } from "react-day-picker";
import { format, startOfMonth, endOfMonth } from "date-fns";
import "./DateRangePicker.css";
import { Calendar, ChevronLeft, ChevronRight } from "../../icons/lucideIcons";

const PICKER_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const toPickerDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const normalizePickerMonth = (value) => {
  const date = toPickerDate(value) || new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

const addPickerMonths = (value, amount) => {
  const date = normalizePickerMonth(value);
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
};

const normalizeRange = (value) => {
  const from = toPickerDate(value?.from);
  const to = toPickerDate(value?.to);
  return from && to ? { from, to } : null;
};

export function CalendarMonthControls({ month, onMonthChange, align = "start", label = "calendar" }) {
  const [monthMenuOpen, setMonthMenuOpen] = useState(false);
  const [yearMenuOpen, setYearMenuOpen] = useState(false);
  const [yearPageStart, setYearPageStart] = useState(() => normalizePickerMonth(month).getFullYear() - 5);
  const normalizedMonth = normalizePickerMonth(month);
  const yearOptions = Array.from({ length: 12 }, (_, index) => yearPageStart + index);
  const openMonthMenu = () => {
    setYearMenuOpen(false);
    setMonthMenuOpen((current) => !current);
  };
  const openYearMenu = () => {
    setMonthMenuOpen(false);
    setYearPageStart(normalizedMonth.getFullYear() - 5);
    setYearMenuOpen((current) => !current);
  };

  return (
    <div className={`calendar-month-controls calendar-month-controls--${align}`}>
      <button
        type="button"
        className="calendar-month-controls__nav"
        onClick={() => onMonthChange(addPickerMonths(normalizedMonth, -1))}
        aria-label={`Previous ${label} month`}
      >
        <ChevronLeft size={15} aria-hidden="true" />
      </button>

      <div className="calendar-month-controls__center">
        <button
          type="button"
          className="calendar-template-header__month-button"
          onClick={openMonthMenu}
          aria-expanded={monthMenuOpen}
          aria-label={`Select ${label} month`}
        >
          {PICKER_MONTHS[normalizedMonth.getMonth()]}
        </button>

        <button
          type="button"
          className="calendar-template-header__year"
          onClick={openYearMenu}
          aria-expanded={yearMenuOpen}
          aria-label={`Select ${label} year`}
        >
          {normalizedMonth.getFullYear()}
        </button>
      </div>

      {monthMenuOpen && (
        <div className="calendar-template-header__month-menu">
          {PICKER_MONTHS.map((monthName, index) => (
            <button
              key={monthName}
              type="button"
              className={index === normalizedMonth.getMonth() ? "is-active" : ""}
              onClick={() => {
                onMonthChange(new Date(normalizedMonth.getFullYear(), index, 1));
                setMonthMenuOpen(false);
              }}
            >
              {monthName}
            </button>
          ))}
        </div>
      )}

      {yearMenuOpen && (
        <div className="calendar-template-header__year-menu">
          <div className="calendar-template-header__year-menu-nav">
            <button type="button" onClick={() => setYearPageStart((year) => year - 12)} aria-label="Previous years">
              <ChevronLeft size={13} aria-hidden="true" />
            </button>
            <span>{yearPageStart}-{yearPageStart + 11}</span>
            <button type="button" onClick={() => setYearPageStart((year) => year + 12)} aria-label="Next years">
              <ChevronRight size={13} aria-hidden="true" />
            </button>
          </div>
          <div className="calendar-template-header__year-grid">
            {yearOptions.map((year) => (
              <button
                key={year}
                type="button"
                className={year === normalizedMonth.getFullYear() ? "is-active" : ""}
                onClick={() => {
                  onMonthChange(new Date(year, normalizedMonth.getMonth(), 1));
                  setYearMenuOpen(false);
                }}
              >
                {year}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        className="calendar-month-controls__nav"
        onClick={() => onMonthChange(addPickerMonths(normalizedMonth, 1))}
        aria-label={`Next ${label} month`}
      >
        <ChevronRight size={15} aria-hidden="true" />
      </button>
    </div>
  );
}

export default function DateRangePicker({
  value,
  onChange,
  showLabel = true,
  numberOfMonths = 2,
  defaultRangeEnabled = false,
}) {
  const getDefaultRange = () => ({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const fallbackRange = useMemo(() => getDefaultRange(), []);
  const isControlled = value !== undefined;
  const controlledRange = normalizeRange(value);
  const [range, setRange] = useState(controlledRange || (defaultRangeEnabled ? fallbackRange : undefined));
  const [month, setMonth] = useState(
    (controlledRange && controlledRange.from) || fallbackRange.from
  );
  const [endMonth, setEndMonth] = useState(
    addPickerMonths((controlledRange && controlledRange.to) || fallbackRange.from, 1)
  );
  const selectedRange = isControlled
    ? controlledRange || (defaultRangeEnabled ? fallbackRange : undefined)
    : range;

  const handleSelect = (selectedRange) => {
    if (!selectedRange) {
      if (defaultRangeEnabled) {
        const defaultRange = getDefaultRange();
        setRange(defaultRange);
        setMonth(defaultRange.from);
        onChange?.(defaultRange);
      } else {
        setRange(undefined);
        onChange?.({ from: null, to: null });
      }
      return;
    }

    if (!isControlled) {
      setRange(selectedRange);
    }

    onChange?.(selectedRange);
  };

  const resetRange = () => {
    setRange(undefined);
    setMonth(fallbackRange.from);
    setEndMonth(addPickerMonths(fallbackRange.from, 1));
    onChange?.({ from: null, to: null });
  };

  const label = useMemo(() => {
    if (selectedRange?.from && selectedRange?.to) {
      return `${format(selectedRange.from, "MMM dd, yyyy")} - ${format(
        selectedRange.to,
        "MMM dd, yyyy"
      )}`;
    }

    if (!defaultRangeEnabled) {
      return "All dates";
    }

    return `${format(fallbackRange.from, "MMM dd, yyyy")} - ${format(
      fallbackRange.to,
      "MMM dd, yyyy"
    )}`;
  }, [defaultRangeEnabled, fallbackRange, selectedRange]);

  return (
    <div className="trade-date-picker">
      {showLabel && (
        <div className="trade-date-picker__label">
          <Calendar className="trade-date-picker__label-icon" />
          <span>{label}</span>
          <button
            className="trade-date-picker__reset"
            type="button"
            onClick={resetRange}
            aria-label="Reset filters to all dates"
          >
            Reset filters
          </button>
        </div>
      )}

      <div className={numberOfMonths > 1 ? "trade-calendar-template trade-calendar-template--range" : "trade-calendar-template"}>
        <div className="trade-calendar-pane">
          <CalendarMonthControls month={month} onMonthChange={setMonth} label="start" />
          <DayPicker
            mode="range"
            selected={selectedRange}
            onSelect={handleSelect}
            month={month}
            onMonthChange={setMonth}
            fixedWeeks
            showOutsideDays
            className="trade-rdp trade-calendar-template__rdp"
          />
        </div>

        {numberOfMonths > 1 && (
          <div className="trade-calendar-pane">
            <CalendarMonthControls month={endMonth} onMonthChange={setEndMonth} align="end" label="end" />
            <DayPicker
              mode="range"
              selected={selectedRange}
              onSelect={handleSelect}
              month={endMonth}
              onMonthChange={setEndMonth}
              fixedWeeks
              showOutsideDays
              className="trade-rdp trade-calendar-template__rdp"
            />
          </div>
        )}
      </div>
    </div>
  );
}
