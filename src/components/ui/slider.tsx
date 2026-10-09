import type React from "react";
import type { SliderProps as AriaSliderProps } from "react-aria-components";
import {
    Label as AriaLabel,
    Slider as AriaSlider,
    SliderOutput as AriaSliderOutput,
    SliderThumb as AriaSliderThumb,
    SliderTrack as AriaSliderTrack,
} from "react-aria-components";
import { cx, sortCx } from "@/utils/cx";

const styles = sortCx({
    default: "hidden",
    bottom: "absolute top-2 left-1/2 -translate-x-1/2 translate-y-full text-md font-medium text-primary",
    "top-floating": "absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full rounded-lg bg-primary px-2 py-1.5 text-xs font-semibold text-secondary shadow-lg ring-1 ring-secondary_alt",
});

interface SliderProps extends AriaSliderProps {
    labelPosition?: keyof typeof styles;
    labelFormatter?: (value: number) => string;
    fillClassName?: string;
    fillStyle?: React.CSSProperties;
    trackClassName?: string;
    trackStyle?: React.CSSProperties;
    showFillTrack?: boolean;
}

export const Slider = ({
    labelPosition = "default",
    minValue = 0,
    maxValue = 100,
    labelFormatter,
    formatOptions,
    fillClassName,
    fillStyle,
    trackClassName,
    trackStyle,
    showFillTrack = true,
    ...rest
}: SliderProps) => {
    const defaultFormatOptions: Intl.NumberFormatOptions = { style: "percent", maximumFractionDigits: 0 };

    return (
        <AriaSlider {...rest} {...{ minValue, maxValue }} formatOptions={formatOptions ?? defaultFormatOptions}>
            <AriaLabel />
            <AriaSliderTrack className="relative h-6 w-full touch-none select-none cursor-pointer">
                {({ state: { values, getThumbValue, getThumbPercent, getFormattedValue } }) => {
                    const left = values.length === 1 ? 0 : getThumbPercent(0);
                    const width = values.length === 1 ? getThumbPercent(0) : getThumbPercent(1) - left;
                    return (
                        <>
                            <span className={cx("absolute top-1/2 h-2 w-full -translate-y-1/2 rounded-full", trackClassName || "bg-quaternary")} style={trackStyle} />
                            {showFillTrack && (
                                <span
                                    className={cx("absolute top-1/2 h-2 w-full -translate-y-1/2 rounded-full transition-none", fillClassName || "bg-brand-solid")}
                                    style={{ left: `${left * 100}%`, width: `${width * 100}%`, ...fillStyle }}
                                />
                            )}
                            {values.map((_, index) => (
                                <AriaSliderThumb
                                    key={index}
                                    index={index}
                                    className={({ isFocusVisible, isDragging }) =>
                                        cx("top-1/2 box-border size-6 cursor-grab rounded-full bg-slider-handle-bg shadow-md ring-2 ring-slider-handle-border ring-inset transition-none", isFocusVisible && "outline-2 outline-offset-2 outline-focus-ring", isDragging && "cursor-grabbing scale-110")
                                    }
                                >
                                    <AriaSliderOutput className={cx("whitespace-nowrap", styles[labelPosition])}>
                                        {labelFormatter ? labelFormatter(getThumbValue(index)) : getFormattedValue(getThumbValue(index) / 100)}
                                    </AriaSliderOutput>
                                </AriaSliderThumb>
                            ))}
                        </>
                    );
                }}
            </AriaSliderTrack>
        </AriaSlider>
    );
};

export default Slider;
