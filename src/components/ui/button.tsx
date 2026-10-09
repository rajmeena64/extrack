import type { FC, ReactElement, ReactNode } from "react";
import React, { isValidElement } from "react";
import type { ButtonProps as AriaButtonProps, LinkProps as AriaLinkProps } from "react-aria-components";
import { Button as AriaButton, Link as AriaLink } from "react-aria-components";
import { cx, sortCx } from "@/utils/cx";
import { isReactComponent } from "@/utils/is-react-component";

export const styles = sortCx({
    common: {
        root: "group relative inline-flex h-max cursor-pointer items-center justify-center whitespace-nowrap outline-brand transition duration-100 ease-linear before:absolute focus-visible:outline-2 focus-visible:outline-offset-2 in-data-input-wrapper:shadow-xs in-data-input-wrapper:focus:!z-50 in-data-input-wrapper:in-data-leading:-mr-px in-data-input-wrapper:in-data-leading:rounded-r-none in-data-input-wrapper:in-data-leading:before:rounded-r-none in-data-input-wrapper:in-data-trailing:-ml-px in-data-input-wrapper:in-data-trailing:rounded-l-none in-data-input-wrapper:in-data-trailing:before:rounded-l-none disabled:cursor-not-allowed disabled:opacity-50 in-data-input-wrapper:disabled:opacity-100 *:data-icon:pointer-events-none *:data-icon:size-5 *:data-icon:shrink-0 *:data-icon:transition-inherit-all",
        icon: "pointer-events-none size-5 shrink-0 transition-inherit-all",
    },
    sizes: {
        xs: {
            root: "gap-1 rounded-lg px-2.5 py-1.5 text-sm font-semibold before:rounded-[7px] data-icon-only:p-2 in-data-input-wrapper:px-3.5 in-data-input-wrapper:py-2.5 in-data-input-wrapper:data-icon-only:p-2.5 *:data-icon:size-4 *:data-icon:stroke-[2.25px]",
            linkRoot: "gap-1 *:data-text:underline-offset-3",
        },
        sm: {
            root: "gap-1 rounded-lg px-3 py-2 text-sm font-semibold before:rounded-[7px] data-icon-only:p-2 in-data-input-wrapper:px-3.5 in-data-input-wrapper:py-2.5 in-data-input-wrapper:data-icon-only:p-2.5",
            linkRoot: "gap-1 *:data-text:underline-offset-3",
        },
        md: {
            root: "gap-1 rounded-lg px-3.5 py-2.5 text-sm font-semibold before:rounded-[7px] data-icon-only:p-2.5 in-data-input-wrapper:gap-1.5 in-data-input-wrapper:px-4 in-data-input-wrapper:text-md in-data-input-wrapper:data-icon-only:p-3",
            linkRoot: "gap-1 *:data-text:underline-offset-4",
        },
        lg: {
            root: "gap-1.5 rounded-lg px-4 py-2.5 text-md font-semibold before:rounded-[7px] data-icon-only:p-3",
            linkRoot: "gap-1.5 *:data-text:underline-offset-4",
        },
        xl: {
            root: "gap-1.5 rounded-lg px-4.5 py-3 text-md font-semibold before:rounded-[7px] data-icon-only:p-3.5",
            linkRoot: "gap-1.5 *:data-text:underline-offset-4",
        },
    },
    colors: {
        primary: {
            root: "bg-brand-solid text-white shadow-xs-skeuomorphic ring-1 ring-transparent ring-inset hover:bg-brand-solid_hover data-loading:bg-brand-solid_hover before:absolute before:inset-px before:border before:border-white/12 before:mask-b-from-0% *:data-icon:text-white/60 hover:*:data-icon:text-white/70",
        },
        secondary: {
            root: "bg-[var(--bg-card)] text-secondary shadow-xs-skeuomorphic ring-1 ring-primary ring-inset hover:bg-primary_hover hover:text-secondary_hover data-loading:bg-primary_hover *:data-icon:text-fg-quaternary hover:*:data-icon:text-fg-quaternary_hover",
        },
        tertiary: {
            root: "text-tertiary hover:bg-primary_hover hover:text-tertiary_hover data-loading:bg-primary_hover *:data-icon:text-fg-quaternary hover:*:data-icon:text-fg-quaternary_hover",
        },
        "link-color": {
            root: "justify-normal rounded p-0! text-brand-secondary hover:text-brand-secondary_hover *:data-text:underline *:data-text:decoration-transparent hover:*:data-text:decoration-fg-brand-secondary_alt *:data-icon:text-fg-brand-secondary_alt hover:*:data-icon:text-fg-brand-secondary_hover",
        },
        "link-gray": {
            root: "justify-normal rounded p-0! text-tertiary hover:text-tertiary_hover *:data-text:underline *:data-text:decoration-transparent hover:*:data-text:decoration-fg-quaternary *:data-icon:text-fg-quaternary hover:*:data-icon:text-fg-quaternary_hover",
        },
        "primary-destructive": {
            root: "bg-error-solid text-white shadow-xs-skeuomorphic ring-1 ring-transparent outline-error ring-inset hover:bg-error-solid_hover data-loading:bg-error-solid_hover before:absolute before:inset-px before:border before:border-white/12 before:mask-b-from-0% *:data-icon:text-white/60 hover:*:data-icon:text-white/70",
        },
        "secondary-destructive": {
            root: "bg-primary text-error-primary shadow-xs-skeuomorphic ring-1 ring-error_subtle outline-error ring-inset hover:bg-error-primary hover:text-error-primary_hover data-loading:bg-error-primary *:data-icon:text-fg-error-secondary hover:*:data-icon:text-fg-error-primary",
        },
        "tertiary-destructive": {
            root: "text-error-primary outline-error hover:bg-error-primary hover:text-error-primary_hover data-loading:bg-error-primary *:data-icon:text-fg-error-secondary hover:*:data-icon:text-fg-error-primary",
        },
        "link-destructive": {
            root: "justify-normal rounded p-0! text-error-primary outline-error hover:text-error-primary_hover *:data-text:underline *:data-text:decoration-transparent *:data-text:underline-offset-2 hover:*:data-text:decoration-current *:data-icon:text-fg-error-secondary hover:*:data-icon:text-fg-error-primary",
        },
    },
});

export interface CommonProps {
    isDisabled?: boolean;
    isLoading?: boolean;
    size?: keyof typeof styles.sizes;
    color?: keyof typeof styles.colors;
    iconLeading?: FC<{ className?: string }> | ReactNode;
    iconTrailing?: FC<{ className?: string }> | ReactNode;
    noTextPadding?: boolean;
    showTextWhileLoading?: boolean;
    children?: ReactNode;
    className?: string;
}

export interface ButtonProps extends CommonProps, Omit<AriaButtonProps, "children" | "className"> {}
interface LinkProps extends CommonProps, Omit<AriaLinkProps, "children" | "className"> {
    href: NonNullable<AriaLinkProps["href"]>;
}

export type Props = ButtonProps | LinkProps;

export const Button: {
    (props: LinkProps): ReactElement<LinkProps>;
    (props: ButtonProps): ReactElement<ButtonProps>;
} = ({
    size = "sm",
    color = "primary",
    children,
    className,
    noTextPadding,
    iconLeading: IconLeading,
    iconTrailing: IconTrailing,
    isDisabled: disabled,
    isLoading: loading,
    showTextWhileLoading,
    ...props
}) => {
    const href = "href" in props ? props.href : undefined;
    const isIcon = (IconLeading || IconTrailing) && !children;
    const isLinkType = ["link-gray", "link-color", "link-destructive"].includes(color);
    noTextPadding = isLinkType || noTextPadding;

    const commonChildren = (
        <>
            {isValidElement(IconLeading) && IconLeading}
            {isReactComponent(IconLeading) && <IconLeading data-icon="leading" className={styles.common.icon} />}
            {loading && (
                <svg fill="none" data-icon="loading" viewBox="0 0 20 20" className={cx(styles.common.icon, !showTextWhileLoading && "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2")}>
                    <circle className="stroke-current opacity-30" cx="10" cy="10" r="8" fill="none" strokeWidth="2" />
                    <circle className="origin-center animate-spin stroke-current" cx="10" cy="10" r="8" fill="none" strokeWidth="2" strokeDasharray="12.5 50" strokeLinecap="round" />
                </svg>
            )}
            {children && <span data-text className={cx("transition-inherit-all", !noTextPadding && "px-0.5")}>{children}</span>}
            {isValidElement(IconTrailing) && IconTrailing}
            {isReactComponent(IconTrailing) && <IconTrailing data-icon="trailing" className={styles.common.icon} />}
        </>
    );

    const commonProps = {
        "data-loading": loading ? true : undefined,
        "data-icon-only": isIcon ? true : undefined,
        ...props,
        isDisabled: disabled,
        className: cx(
            styles.common.root,
            styles.sizes[size].root,
            styles.colors[color].root,
            isLinkType && styles.sizes[size].linkRoot,
            (loading || (href && (disabled || loading))) && "pointer-events-none",
            loading && (showTextWhileLoading ? "[&>*:not([data-icon=loading]):not([data-text])]:hidden" : "[&>*:not([data-icon=loading])]:invisible"),
            className,
        ),
        children: commonChildren,
    };

    if ("href" in commonProps) return <AriaLink {...commonProps} href={disabled ? undefined : href} />;
    return <AriaButton {...commonProps} type={commonProps.type || "button"} isPending={loading} />;
};

export default Button;
