import type { ComponentType, HTMLAttributes, ReactNode, Ref } from "react";
import { createContext, useContext } from "react";
import { HelpCircle, InfoCircle } from "@untitledui/icons";
import type { DateInputProps as AriaDateInputProps, LabelProps as AriaLabelProps, TextProps as AriaTextProps } from "react-aria-components";
import {
    DateField as AriaDateField,
    type DateFieldProps as AriaDateFieldProps,
    DateInput as AriaDateInput,
    DateSegment as AriaDateSegment,
    Group as AriaGroup,
    Label as AriaLabel,
    Text as AriaText,
    type DateValue,
} from "react-aria-components";
import { cx, sortCx } from "@/utils/cx";
import { Tooltip, TooltipTrigger } from "./tooltip";

interface HintTextProps extends AriaTextProps {
    isInvalid?: boolean;
    ref?: Ref<HTMLElement>;
    size?: "sm" | "md";
    children: ReactNode;
}

export const HintText = ({ isInvalid, className, size = "md", ...props }: HintTextProps) => (
    <AriaText
        {...props}
        slot={isInvalid ? "errorMessage" : "description"}
        className={cx("text-sm text-tertiary", size === "sm" && "text-xs", "in-data-[input-size=sm]:text-xs", isInvalid && "text-error-primary", "group-invalid:text-error-primary", className)}
    />
);
HintText.displayName = "HintText";

interface LabelProps extends AriaLabelProps {
    children: ReactNode;
    isInvalid?: boolean;
    isRequired?: boolean;
    tooltip?: string;
    tooltipDescription?: string;
    ref?: Ref<HTMLLabelElement>;
}

export const Label = ({ isInvalid, isRequired, tooltip, tooltipDescription, className, ...props }: LabelProps) => (
    <AriaLabel data-label="true" {...props} className={cx("flex cursor-default items-center gap-0.5 text-sm font-medium text-secondary", className)}>
        {props.children}
        <span className={cx("hidden text-brand-tertiary", isRequired && "block", typeof isRequired === "undefined" && "group-required:block", isInvalid && "text-error-primary", typeof isInvalid === "undefined" && "group-invalid:text-error-primary")}>*</span>
        {tooltip && (
            <Tooltip title={tooltip} description={tooltipDescription} placement="top">
                <TooltipTrigger isDisabled={false} className="cursor-pointer text-fg-quaternary transition duration-200 hover:text-fg-quaternary_hover focus:text-fg-quaternary_hover">
                    <HelpCircle className="size-4" />
                </TooltipTrigger>
            </Tooltip>
        )}
    </AriaLabel>
);
Label.displayName = "Label";

const DateFieldContext = createContext<{
    size?: "sm" | "md" | "lg";
    wrapperClassName?: string;
    iconClassName?: string;
    tooltipClassName?: string;
    inputClassName?: string;
}>({});

export interface InputDateBaseProps extends Omit<AriaDateInputProps, "children"> {
    tooltip?: string;
    size?: "sm" | "md" | "lg";
    placeholder?: string;
    iconClassName?: string;
    wrapperClassName?: string;
    tooltipClassName?: string;
    shortcut?: string | boolean;
    ref?: Ref<HTMLInputElement>;
    groupRef?: Ref<HTMLDivElement>;
    icon?: ComponentType<HTMLAttributes<HTMLOrSVGElement>>;
    isInvalid?: boolean;
    isDisabled?: boolean;
}

export const InputDateBase = ({
    tooltip,
    shortcut,
    groupRef,
    size = "md",
    isInvalid,
    isDisabled,
    icon: Icon,
    wrapperClassName,
    tooltipClassName,
    iconClassName,
    ...inputProps
}: Omit<InputDateBaseProps, "label" | "hint">) => {
    const hasTrailingIcon = tooltip || isInvalid;
    const hasLeadingIcon = Icon;
    const context = useContext(DateFieldContext);
    const inputSize = context?.size || size;

    const sizes = sortCx({
        sm: { root: cx("px-3 py-2 text-sm", hasTrailingIcon && "pr-9", hasLeadingIcon && "pl-8.5"), iconLeading: "left-3 size-4 stroke-[2.25px]", iconTrailing: "right-3", shortcut: "pr-2.5" },
        md: { root: cx("px-3 py-2 text-md", hasTrailingIcon && "pr-9", hasLeadingIcon && "pl-10"), iconLeading: "left-3 size-5", iconTrailing: "right-3", shortcut: "pr-2.5" },
        lg: { root: cx("px-3.5 py-2.5 text-md", hasTrailingIcon && "pr-9.5", hasLeadingIcon && "pl-10.5"), iconLeading: "left-3.5 size-5", iconTrailing: "right-3.5", shortcut: "pr-3" },
    });

    return (
        <AriaGroup
            {...{ isDisabled, isInvalid }}
            ref={groupRef}
            className={({ isFocusWithin, isDisabled, isInvalid }) =>
                cx(
                    "group/input relative flex w-full flex-row place-content-center place-items-center rounded-lg bg-primary shadow-xs ring-1 ring-primary transition-shadow duration-100 ease-linear ring-inset",
                    isFocusWithin && !isDisabled && "ring-2 ring-brand",
                    isDisabled && "cursor-not-allowed opacity-50 in-data-input-wrapper:opacity-100",
                    "group-disabled:cursor-not-allowed group-disabled:opacity-50 in-data-input-wrapper:group-disabled:opacity-100",
                    isInvalid && "ring-error_subtle",
                    "group-invalid:ring-error_subtle",
                    isInvalid && isFocusWithin && "ring-2 ring-error",
                    isFocusWithin && "group-invalid:ring-2 group-invalid:ring-error",
                    context?.wrapperClassName,
                    wrapperClassName,
                )
            }
        >
            {Icon && <Icon className={cx("pointer-events-none absolute text-fg-quaternary", sizes[inputSize].iconLeading, context?.iconClassName, iconClassName)} />}
            <AriaDateInput {...inputProps} className={cx("flex w-full", sizes[size].root, typeof inputProps.className === "string" && inputProps.className)}>
                {(segment) => (
                    <AriaDateSegment
                        segment={segment}
                        className={cx(
                            "rounded px-0.5 text-primary tabular-nums caret-transparent focus:bg-brand-solid focus:font-medium focus:text-white focus:outline-hidden",
                            segment.isPlaceholder && "text-placeholder uppercase",
                            segment.type === "literal" && "text-fg-quaternary",
                        )}
                    />
                )}
            </AriaDateInput>
            {tooltip && (
                <Tooltip title={tooltip} placement="top">
                    <TooltipTrigger className={cx("absolute cursor-pointer text-fg-quaternary transition duration-200 group-invalid/input:hidden hover:text-fg-quaternary_hover focus:text-fg-quaternary_hover", sizes[inputSize].iconTrailing, context?.tooltipClassName, tooltipClassName)}>
                        <HelpCircle className="size-4 stroke-[2.25px]" />
                    </TooltipTrigger>
                </Tooltip>
            )}
            <InfoCircle className={cx("pointer-events-none absolute hidden size-4 stroke-[2.25px] text-fg-error-secondary group-invalid/input:block", sizes[inputSize].iconTrailing, context?.tooltipClassName, tooltipClassName)} />
            {shortcut && (
                <div className={cx("pointer-events-none absolute inset-y-0.5 right-0.5 z-10 flex items-center rounded-r-[inherit] bg-linear-to-r from-transparent to-bg-primary to-40% pl-8", sizes[inputSize].shortcut)}>
                    <span aria-hidden="true" className="pointer-events-none rounded px-1 py-px text-xs font-medium text-quaternary ring-1 ring-secondary select-none ring-inset">{typeof shortcut === "string" ? shortcut : "⌘K"}</span>
                </div>
            )}
        </AriaGroup>
    );
};

interface InputProps extends AriaDateFieldProps<DateValue>, Pick<InputDateBaseProps, "ref" | "size" | "placeholder" | "icon" | "shortcut" | "tooltip" | "groupRef" | "iconClassName" | "wrapperClassName" | "tooltipClassName"> {
    label?: string;
    hint?: ReactNode;
    hideRequiredIndicator?: boolean;
    inputClassName?: string;
}

export const InputDate = ({
    size = "md",
    placeholder,
    icon: Icon,
    label,
    hint,
    shortcut,
    hideRequiredIndicator,
    className,
    ref,
    groupRef,
    tooltip,
    iconClassName,
    inputClassName,
    wrapperClassName,
    tooltipClassName,
    ...props
}: InputProps) => (
    <AriaDateField {...props} className={(state) => cx("group flex h-max w-full flex-col items-start justify-start gap-1.5", typeof className === "function" ? className(state) : className)}>
        {({ isInvalid, state }) => (
            <>
                {label && <Label isRequired={hideRequiredIndicator ? !hideRequiredIndicator : state.isRequired} isInvalid={isInvalid}>{label}</Label>}
                <InputDateBase className={inputClassName} {...{ ref, groupRef, size, placeholder, icon: Icon, shortcut, iconClassName, wrapperClassName, tooltipClassName, tooltip }} />
                {hint && <HintText isInvalid={isInvalid} className={cx(size === "sm" && "text-xs")}>{hint}</HintText>}
            </>
        )}
    </AriaDateField>
);

export default InputDate;
