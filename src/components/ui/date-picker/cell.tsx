import { getDayOfWeek, getLocalTimeZone, isToday } from "@internationalized/date";
import type { CalendarCellProps as AriaCalendarCellProps } from "react-aria-components";
import { CalendarCell as AriaCalendarCell, RangeCalendarContext, useLocale, useSlottedContext } from "react-aria-components";
import { cx } from "@/utils/cx";

interface CalendarCellProps extends AriaCalendarCellProps {
    isRangeCalendar?: boolean;
    isHighlighted?: boolean;
    showOutOfRangeDates?: boolean;
}

export const CalendarCell = ({ date, isHighlighted, showOutOfRangeDates = false, ...props }: CalendarCellProps) => {
    const { locale } = useLocale();
    const dayOfWeek = getDayOfWeek(date, locale);
    const rangeCalendarContext = useSlottedContext(RangeCalendarContext);

    const isRangeCalendar = !!rangeCalendarContext;

    const start = rangeCalendarContext?.value?.start;
    const end = rangeCalendarContext?.value?.end;

    const isAfterStart = start ? date.compare(start) > 0 : true;
    const isBeforeEnd = end ? date.compare(end) < 0 : true;

    const isAfterOrOnStart = start && date.compare(start) >= 0;
    const isBeforeOrOnEnd = end && date.compare(end) <= 0;
    const isInRange = isAfterOrOnStart && isBeforeOrOnEnd;

    const lastDayOfMonth = new Date(date.year, date.month, 0).getDate();
    const isLastDayOfMonth = date.day === lastDayOfMonth;
    const isFirstDayOfMonth = date.day === 1;

    const isTodayDate = isToday(date, getLocalTimeZone());

    return (
        <AriaCalendarCell
            {...props}
            date={date}
            className={({ isDisabled, isFocusVisible, isSelectionStart, isSelectionEnd, isSelected, isOutsideMonth }) => {
                const isRoundedLeft = isSelectionStart || dayOfWeek === 0;
                const isRoundedRight = isSelectionEnd || dayOfWeek === 6;

                return cx(
                    "relative size-10 focus:outline-hidden",
                    isRoundedLeft && "rounded-l-full",
                    isRoundedRight && "rounded-r-full",
                    isInRange && isDisabled && "bg-secondary",
                    isSelected && isRangeCalendar && "bg-secondary",
                    isDisabled ? "pointer-events-none" : "cursor-pointer",
                    isFocusVisible ? "z-10" : "z-0",
                    isOutsideMonth && "opacity-50",
                    isRangeCalendar && isOutsideMonth && !showOutOfRangeDates && "hidden",

                    isLastDayOfMonth &&
                        isSelected &&
                        isBeforeEnd &&
                        isRangeCalendar &&
                        "after:absolute after:inset-0 after:translate-x-full after:bg-gradient-to-l after:from-transparent after:to-bg-secondary in-[[role=gridcell]:last-child]:after:hidden",

                    isFirstDayOfMonth &&
                        isSelected &&
                        isAfterStart &&
                        isRangeCalendar &&
                        "after:absolute after:inset-0 after:-translate-x-full after:bg-gradient-to-r after:from-transparent after:to-bg-secondary in-[[role=gridcell]:first-child]:after:hidden",
                );
            }}
        >
            {({ isDisabled, isFocusVisible, isSelectionStart, isSelectionEnd, isSelected, formattedDate }) => {
                const markedAsSelected = isSelectionStart || isSelectionEnd || (isSelected && !isDisabled && !isRangeCalendar);

                return (
                    <div
                        className={cx(
                            "relative flex size-full items-center justify-center rounded-full text-sm text-[var(--text-primary)]",
                            isDisabled && "opacity-40",
                            isFocusVisible ? "outline-2 outline-offset-2 outline-focus-ring" : "",
                            isSelected && !isDisabled && isRangeCalendar ? "font-medium" : "",
                            markedAsSelected && "bg-blue-600 dark:bg-blue-500 font-semibold text-white hover:bg-blue-700 dark:hover:bg-blue-600 shadow-xs",
                            !isSelected && !isDisabled ? "hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600 dark:hover:text-blue-400 hover:font-semibold!" : "",
                            !isSelected && isTodayDate ? "bg-blue-50 dark:bg-blue-950/40 font-bold text-blue-600 dark:text-blue-400" : "",
                        )}
                    >
                        {formattedDate}

                        {(isHighlighted || isTodayDate) && (
                            <div
                                className={cx(
                                    "absolute bottom-1 left-1/2 size-1.25 -translate-x-1/2 rounded-full",
                                    markedAsSelected ? "bg-white" : "bg-blue-600 dark:bg-blue-400",
                                    isDisabled && "opacity-50",
                                )}
                            />
                        )}
                    </div>
                );
            }}
        </AriaCalendarCell>
    );
};
