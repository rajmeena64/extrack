import { useState, useMemo } from "react";
import { DayPicker } from "react-day-picker";
import { format, startOfMonth, endOfMonth } from "date-fns";
import "./DateRangePicker.css";
import { Calendar, ChevronLeft, ChevronRight } from "../Common/icons";

export default function DateRangePicker({
  value,
  onChange,
  showLabel = true,
  numberOfMonths = 2,
  defaultRangeEnabled = true,
}) {
  const getDefaultRange = () => ({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const fallbackRange = useMemo(() => getDefaultRange(), []);
  const controlledRange = value?.from && value?.to ? value : null;
  const [range, setRange] = useState(controlledRange || (defaultRangeEnabled ? fallbackRange : undefined));
  const [month, setMonth] = useState(
    (controlledRange && controlledRange.from) || fallbackRange.from
  );
  const selectedRange = controlledRange || range;

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

    setRange(selectedRange);

    if (selectedRange.from) {
      setMonth(selectedRange.from);
    }

    onChange?.(selectedRange);
  };

  const label = useMemo(() => {
    if (selectedRange?.from && selectedRange?.to) {
      return `${format(selectedRange.from, "MMM dd, yyyy")} - ${format(
        selectedRange.to,
        "MMM dd, yyyy"
      )}`;
    }

    if (!defaultRangeEnabled) {
      return "Select date range";
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
        </div>
      )}

      <DayPicker
        mode="range"
          selected={selectedRange}
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
