import { type FC, type ReactNode, useState } from "react";
import { User01 } from "@untitledui/icons";
import { cx } from "@/utils/cx";
import { AvatarOnlineIndicator, VerifiedTick } from "./base-components";
import { AvatarCount } from "./base-components/avatar-count";

export interface AvatarProps {
    size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
    className?: string;
    contentClassName?: string;
    src?: string | null;
    alt?: string;
    contrastBorder?: boolean;
    rounded?: boolean;
    border?: boolean;
    badge?: ReactNode;
    status?: "online" | "offline";
    verified?: boolean;
    count?: number;
    initials?: string;
    placeholderIcon?: FC<{ className?: string }>;
    placeholder?: ReactNode;

    focusable?: boolean;
}

const styles = {
    xs: { root: "size-6", rootWithBorder: "p-px", initials: "text-xs font-semibold", icon: "size-4" },
    sm: { root: "size-8", rootWithBorder: "p-px", initials: "text-sm font-semibold", icon: "size-5" },
    md: { root: "size-10", rootWithBorder: "p-px", initials: "text-md font-semibold", icon: "size-6" },
    lg: { root: "size-12", rootWithBorder: "p-[1.5px]", initials: "text-lg font-semibold", icon: "size-7" },
    xl: { root: "size-14", rootWithBorder: "p-0.5", initials: "text-xl font-semibold", icon: "size-8" },
    "2xl": { root: "size-16", rootWithBorder: "p-0.5", initials: "text-display-xs font-semibold", icon: "size-8" },
};

export const Avatar = ({
    size = "md",
    src,
    alt,
    initials,
    placeholder,
    placeholderIcon: PlaceholderIcon,
    border,
    badge,
    status,
    verified,
    count,
    focusable = false,
    rounded = true,
    className,
    contentClassName,
}: AvatarProps) => {
    const [isFailed, setIsFailed] = useState(false);

    const canShowImage = src && !isFailed;

    const renderMainContent = () => {
        if (canShowImage) {
            return <img data-avatar-img className="size-full object-cover" src={src} alt={alt} referrerPolicy="no-referrer" onError={() => setIsFailed(true)} />;
        }

        if (initials) {
            return <span className={cx("text-quaternary", styles[size].initials)}>{initials}</span>;
        }

        if (PlaceholderIcon) {
            return <PlaceholderIcon className={cx("text-fg-quaternary", styles[size].icon)} />;
        }

        return placeholder || <User01 className={cx("text-fg-quaternary", styles[size].icon)} />;
    };

    const renderBadgeContent = () => {
        if (status) {
            return <AvatarOnlineIndicator status={status} size={size} />;
        }

        if (verified) {
            return <VerifiedTick size={size} className={cx("absolute right-0 bottom-0", size === "xs" && "-right-px -bottom-px")} />;
        }

        if (count) {
            return <AvatarCount count={count} />;
        }

        return badge;
    };

    return (
        <div
            data-avatar
            className={cx(
                "relative inline-flex shrink-0 rounded-[7px]",
                rounded && "rounded-full",
                focusable && "outline-transparent group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-focus-ring",
                border && "ring-1 ring-secondary_alt",
                border && styles[size].rootWithBorder,
                styles[size].root,
                className,
            )}
        >
            <div
                className={cx(
                    "relative inline-flex size-full shrink-0 items-center justify-center overflow-hidden rounded-md bg-tertiary outline-[0.5px] -outline-offset-[0.5px] outline-black/16 before:inset-[0.5px]",
                    rounded && "rounded-full",
                    canShowImage &&
                        size !== "xs" &&
                        "before:absolute before:inset-0 before:rounded-[inherit] before:border before:border-white/32 before:mask-[linear-gradient(to_bottom,black_0%,transparent_25%,transparent_75%,black_100%)]",
                    contentClassName,
                )}
            >
                {renderMainContent()}
            </div>
            {renderBadgeContent()}
        </div>
    );
};
