import { useState, useEffect, useMemo } from "react";
import { DayPicker } from "react-day-picker";
import { format, startOfMonth, endOfMonth } from "date-fns";
import "./DateRangePicker.css";
import { Calendar, ChevronLeft, ChevronRight } from "../Common/icons";

export default function DateRangePicker({
  value,
  onChange,
  showLabel = true,
  numberOfMonths = 2,
}) {
  const getDefaultRange = () => ({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const [range, setRange] = useState(value || getDefaultRange());
  const [month, setMonth] = useState((value && value.from) || new Date());

  useEffect(() => {
    if (!value?.from || !value?.to) {
      const defaultRange = getDefaultRange();
      setRange(defaultRange);
      setMonth(defaultRange.from);
      return;
    }

    setRange(value);
    setMonth(value.from);
  }, [value]);

  const handleSelect = (selectedRange) => {
    if (!selectedRange) {
      const defaultRange = getDefaultRange();
      setRange(defaultRange);
      setMonth(defaultRange.from);
      onChange?.(defaultRange);
      return;
    }

    setRange(selectedRange);

    if (selectedRange.from) {
      setMonth(selectedRange.from);
    }

    onChange?.(selectedRange);
  };

  const label = useMemo(() => {
    if (range?.from && range?.to) {
      return `${format(range.from, "MMM dd, yyyy")} - ${format(
        range.to,
        "MMM dd, yyyy"
      )}`;
    }

    const fallback = getDefaultRange();
    return `${format(fallback.from, "MMM dd, yyyy")} - ${format(
      fallback.to,
      "MMM dd, yyyy"
    )}`;
  }, [range]);

  return (
    <div className="trade-date-picker">
      {showLabel && (
        <div className="trade-date-picker__label">
          <Calendar className="trade-date-picker__label-icon" />
          <span>{label}</span>
        </div>
      )}

      <DayPicker
        mode="range"
        selected={range}
        onSelect={handleSelect}
        month={month}
        onMonthChange={setMonth}
        numberOfMonths={numberOfMonths}
        pagedNavigation
        fixedWeeks
        showOutsideDays
        className="trade-rdp"
        components={{
          Chevron: ({ orientation }) =>
            orientation === "left" ? (
              <ChevronLeft className="trade-rdp__nav-icon" />
            ) : (
              <ChevronRight className="trade-rdp__nav-icon" />
            ),
        }}
      />
    </div>
  );
}