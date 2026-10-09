import { type FC, type RefAttributes, useCallback } from "react";
import React from "react";
import { Check, ChevronDown, ChevronRight, DotsVertical } from "@untitledui/icons";
import type {
    ButtonProps as AriaButtonProps,
    MenuItemProps as AriaMenuItemProps,
    MenuProps as AriaMenuProps,
    PopoverProps as AriaPopoverProps,
    SeparatorProps as AriaSeparatorProps,
    MenuItemRenderProps,
} from "react-aria-components";
import {
    Button as AriaButton,
    Header as AriaHeader,
    Menu as AriaMenu,
    MenuItem as AriaMenuItem,
    MenuSection as AriaMenuSection,
    MenuTrigger as AriaMenuTrigger,
    Popover as AriaPopover,
    Separator as AriaSeparator,
} from "react-aria-components";
import { cx } from "@/utils/cx";
import { Avatar } from "@/components/user/DropdownAccountCard/Avatar/avatar";

export interface DropdownOption {
    value: string | number;
    label: React.ReactNode;
    disabled?: boolean;
    avatarUrl?: string;
}

export interface DropdownSelectProps {
    id?: string;
    name?: string;
    value?: string | number;
    onChange?: (e: { target: { id?: string; name?: string; value: string } }) => void;
    options?: Array<DropdownOption | string | number>;
    children?: React.ReactNode;
    className?: string;
    placeholder?: string;
    triggerText?: string;
    ariaLabel?: string;
    "aria-label"?: string;
    disabled?: boolean;
    size?: "sm" | "md" | "lg";
}

const normalizeSelectOptions = (options?: Array<DropdownOption | string | number>, children?: React.ReactNode): DropdownOption[] => {
    if (Array.isArray(options)) {
        return options.map((opt) =>
            typeof opt === "object" && opt !== null
                ? { value: String(opt.value ?? ""), label: opt.label ?? String(opt.value ?? ""), disabled: opt.disabled, avatarUrl: opt.avatarUrl }
                : { value: String(opt ?? ""), label: String(opt ?? "") }
        );
    }
    return React.Children.toArray(children)
        .filter((child): child is React.ReactElement => React.isValidElement(child))
        .map((child) => ({
            value: String(child.props.value ?? child.props.children ?? ""),
            label: child.props.children,
            disabled: child.props.disabled,
        }));
};

const SELECT_SIZE_CLASSES = {
    sm: "min-h-[34px] px-2.5 py-1 text-xs rounded-lg gap-1.5",
    md: "min-h-[38px] px-3 py-2 text-xs rounded-xl gap-2",
    lg: "min-h-[44px] px-3.5 py-2.5 text-sm rounded-xl gap-2.5",
};

export const DropdownSelect: FC<DropdownSelectProps> = ({
    id,
    name,
    value,
    onChange,
    options,
    children,
    className = "",
    placeholder = "Select",
    triggerText,
    ariaLabel,
    disabled = false,
    size = "md",
    ...rest
}) => {
    const normalizedOptions = normalizeSelectOptions(options, children);
    const stringValue = String(value ?? "");
    const selectedOption = normalizedOptions.find((opt) => String(opt.value) === stringValue);
    const label = ariaLabel || rest["aria-label"] || name || id || placeholder;

    const handleSelect = (val: string) => {
        onChange?.({
            target: {
                id,
                name,
                value: val,
            },
        });
    };

    return (
        <AriaMenuTrigger>
            <AriaButton
                id={id}
                isDisabled={disabled}
                aria-label={label}
                className={cx(
                    "flex w-full items-center justify-between border border-[var(--border-light)] bg-[var(--bg-card)] font-semibold text-[var(--text-primary)] shadow-xs transition-colors duration-75 ease-out hover:border-[var(--border-medium)] focus:outline-hidden focus-visible:outline-2 focus-visible:outline-[var(--color-focus-ring,#175CD3)] disabled:cursor-not-allowed disabled:opacity-50",
                    SELECT_SIZE_CLASSES[size] || SELECT_SIZE_CLASSES.md,
                    !selectedOption && !triggerText && "text-[var(--text-muted)]",
                    className
                )}
            >
                <span className="truncate inline-flex items-center gap-1.5 min-w-0">{triggerText || selectedOption?.label || placeholder}</span>
                <ChevronDown className="size-4 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden="true" />
            </AriaButton>
            <DropdownPopover className="w-[max(180px,var(--trigger-width))] min-w-[140px] max-w-[92vw]">
                <DropdownMenu className="max-h-60 overflow-y-auto p-1">
                    {normalizedOptions.map((opt) => {
                        const valStr = String(opt.value);
                        const isSelected = valStr === stringValue;
                        return (
                            <DropdownItem
                                key={valStr}
                                isDisabled={opt.disabled}
                                isSelected={isSelected}
                                avatarUrl={opt.avatarUrl}
                                onAction={() => handleSelect(valStr)}
                            >
                                {opt.label}
                            </DropdownItem>
                        );
                    })}
                </DropdownMenu>
            </DropdownPopover>
        </AriaMenuTrigger>
    );
};

interface DropdownItemProps extends AriaMenuItemProps {
    label?: string;
    addon?: string;
    unstyled?: boolean;
    icon?: FC<{ className?: string }>;
    avatarUrl?: string;
    selectionIndicator?: "checkmark" | "checkbox" | "radio" | "toggle" | "none";
    isDestructive?: boolean;
}

const DropdownItem = ({ label, children, addon, icon: Icon, avatarUrl, unstyled, selectionIndicator = "checkmark", isDestructive: isDestructiveProp, ...props }: DropdownItemProps) => {
    const rawClassName = typeof props.className === "string" ? props.className : "";
    const isDestructive = isDestructiveProp || props.id === "delete" || rawClassName.includes("text-error-primary") || rawClassName.includes("text-red") || rawClassName.includes("destructive");
    const isCheckbox = selectionIndicator === "checkbox";

    const SelectionIndicator = useCallback(
        (state: MenuItemRenderProps & { className?: string }) => {
            if (selectionIndicator === "checkmark") {
                return (
                    <Check
                        aria-hidden="true"
                        className={cx("size-4 shrink-0 stroke-[2.25px] text-blue-600 dark:text-blue-400", !state.isSelected && "invisible", state.className)}
                    />
                );
            }
            if (selectionIndicator === "checkbox") {
                return (
                    <div
                        aria-hidden="true"
                        className={cx(
                            "size-4 shrink-0 rounded-[4px] border transition-colors flex items-center justify-center",
                            state.isSelected
                                ? "bg-[var(--checkbox-accent,#1570EF)] border-[var(--checkbox-accent,#1570EF)] text-white"
                                : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800",
                            state.className
                        )}
                    >
                        {state.isSelected && (
                            <Check className="size-3 stroke-[3px] text-white" aria-hidden="true" />
                        )}
                    </div>
                );
            }
            return null;
        },
        [selectionIndicator],
    );

    if (unstyled) return <AriaMenuItem id={label} textValue={label} {...props}>{children}</AriaMenuItem>;

    return (
        <AriaMenuItem
            {...props}
            className={(state) =>
                cx(
                    "group block cursor-pointer px-1.5 py-px outline-hidden",
                    state.isDisabled && "cursor-not-allowed opacity-50",
                    typeof props.className === "function" ? props.className(state) : props.className,
                )
            }
        >
            {(state) => {
                const isHighlighted = state.isFocused || state.isHovered;
                return (
                    <div
                        className={cx(
                            "relative flex w-full items-center rounded-lg px-2.5 py-2 text-xs font-medium outline-focus-ring transition-colors duration-75 ease-out select-none",
                            !isDestructive && !state.isDisabled && isHighlighted && "bg-slate-100 dark:bg-slate-800/80 text-slate-900 dark:text-white font-semibold",
                            !isDestructive && !state.isDisabled && !isCheckbox && state.isSelected && "text-blue-600 dark:text-blue-400 font-bold",
                            isDestructive && !state.isDisabled && isHighlighted && "text-rose-600 dark:text-rose-400 bg-rose-500/10 dark:bg-rose-500/15",
                            state.isFocusVisible && "outline-2 -outline-offset-2",
                            state.hasSubmenu && "pr-1.5",
                        )}
                    >
                        {state.selectionMode !== "none" && !avatarUrl && !Icon && <SelectionIndicator {...state} className="mr-2" />}
                        {avatarUrl && (
                            <div className="mr-2 flex size-4 items-center justify-center">
                                <Avatar aria-hidden="true" size="xs" src={avatarUrl} alt={label} className="size-5" />
                            </div>
                        )}
                        {Icon && (
                            <Icon
                                aria-hidden="true"
                                className={cx("mr-2 size-4 shrink-0 stroke-[2.25px] transition-colors", isDestructive ? "text-rose-600 dark:text-rose-400" : "text-slate-400 dark:text-slate-400")}
                            />
                        )}
                        <span
                            className={cx(
                                "grow truncate text-sm font-semibold transition-colors",
                                isDestructive ? "text-rose-600 dark:text-rose-400" : (!isCheckbox && state.isSelected) ? "text-blue-600 dark:text-blue-400 font-bold" : "text-slate-700 dark:text-slate-300"
                            )}
                        >
                            {label || (typeof children === "function" ? children(state) : children)}
                        </span>
                        {addon && <span className="ml-1 shrink-0 pr-1 text-xs font-medium text-quaternary">{addon}</span>}
                        {state.selectionMode !== "none" && (avatarUrl || Icon) && <SelectionIndicator {...state} className="ml-1" />}
                        {state.hasSubmenu && <ChevronRight aria-hidden="true" className="ml-auto size-4 shrink-0 stroke-[2.25px] text-fg-quaternary" />}
                    </div>
                );
            }}
        </AriaMenuItem>
    );
};

interface DropdownMenuProps<T extends object> extends AriaMenuProps<T> {}

const DropdownMenu = <T extends object>(props: DropdownMenuProps<T>) => (
    <AriaMenu
        autoFocus={false}
        {...props}
        className={(state) => cx("h-min overflow-y-auto py-1 outline-hidden select-none", typeof props.className === "function" ? props.className(state) : props.className)}
    />
);

interface DropdownPopoverProps extends AriaPopoverProps {}

const DropdownPopover = (props: DropdownPopoverProps) => (
    <AriaPopover
        placement="bottom right"
        offset={4}
        isDismissable={true}
        shouldCloseOnInteractOutside={() => true}
        containerPadding={8}
        {...props}
        className={(state) =>
            cx(
                "z-[10050] w-48 origin-(--trigger-anchor-point) will-change-transform overflow-hidden rounded-xl bg-[var(--bg-card)] border border-[var(--border-light)] dark:border-[#242424] shadow-2xl",
                state.isEntering && "duration-150 ease-out animate-in fade-in placement-right:slide-in-from-left-0.5 placement-top:slide-in-from-bottom-0.5 placement-bottom:slide-in-from-top-0.5",
                state.isExiting && "duration-100 ease-in animate-out fade-out placement-right:slide-out-to-left-0.5 placement-top:slide-out-to-bottom-0.5 placement-bottom:slide-out-to-top-0.5",
                typeof props.className === "function" ? props.className(state) : props.className,
            )
        }
    >
        {props.children}
    </AriaPopover>
);

const DropdownSeparator = (props: AriaSeparatorProps) => <AriaSeparator {...props} className={cx("my-1 h-px w-full bg-border-secondary", props.className)} />;

const DropdownDotsButton = (props: AriaButtonProps & RefAttributes<HTMLButtonElement>) => (
    <AriaButton
        {...props}
        aria-label="Open menu"
        className={(state) =>
            cx(
                "box-border m-0 cursor-pointer rounded-lg p-1.5 outline-none focus:outline-none focus-visible:outline-none ring-0 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition duration-100 ease-linear",
                typeof props.className === "function" ? props.className(state) : props.className,
            )
        }
    >
        <DotsVertical className="size-5 transition-inherit-all" />
    </AriaButton>
);

export const Dropdown = {
    Root: AriaMenuTrigger,
    Popover: DropdownPopover,
    Menu: DropdownMenu,
    Section: AriaMenuSection,
    SectionHeader: AriaHeader,
    Item: DropdownItem,
    Separator: DropdownSeparator,
    DotsButton: DropdownDotsButton,
    Select: DropdownSelect,
};

export default Dropdown;
