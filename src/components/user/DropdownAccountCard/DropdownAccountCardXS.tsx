import { useState, useRef, useEffect } from "react";
import { ArrowLeft, ChevronDown, Clock, LogOut01, Moon01, Settings01, User01 } from "@untitledui/icons";
import { Avatar } from "./Avatar/avatar";
import { ToggleBase } from "@/components/ui";
import { useTheme } from "@/context/ThemeContext";
import { TIME_ZONE_OPTIONS } from "@/utils/trading/tradeTime";
import { cx } from "@/utils/cx";

export interface DropdownAccountCardXSProps {
    user?: {
        firstName?: string;
        lastName?: string;
        email?: string;
        avatarUrl?: string;
    } | null;
    timeZone?: string;
    onTimeZoneChange?: (timeZone: string) => void;
    onOpenProfile?: () => void;
    onOpenDashboardLayout?: () => void;
    onOpenSettings?: () => void;
    onSignOut?: () => void;
    isMobile?: boolean;
    dateRangeLabel?: string;
    onOpenDateRange?: () => void;
    tradeMode?: string;
    tradeModeLabel?: string;
    tradeModeOptions?: { value: string; label: string }[];
    onTradeModeChange?: (mode: string) => void;
    currencyCode?: string;
    currencyOptions?: { code: string; label?: string; shortLabel?: string; symbol?: string; flag?: string }[];
    onCurrencyChange?: (code: string) => void;
}

export const DropdownAccountCardXS = ({
    user,
    timeZone = "UTC",
    onTimeZoneChange,
    onOpenProfile,
    onOpenDashboardLayout,
    onOpenSettings,
    onSignOut,
    isMobile,
    dateRangeLabel,
    onOpenDateRange,
    tradeMode,
    tradeModeLabel,
    tradeModeOptions,
    onTradeModeChange,
    currencyCode,
    currencyOptions,
    onCurrencyChange,
}: DropdownAccountCardXSProps = {}) => {
    const { darkMode, setDarkModePreference } = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const [activeView, setActiveView] = useState<"main" | "settings" | "timezone" | "tradeMode" | "currency">("main");
    const containerRef = useRef<HTMLDivElement>(null);

    const displayName = user ? ([user.firstName, user.lastName].filter(Boolean).join(" ") || "User") : "Active User";
    const initials = user ? `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}` : "U";
    const avatarSrc = user?.avatarUrl || undefined;

    const handleDarkModeToggle = () => {
        if (setDarkModePreference) {
            setDarkModePreference(!darkMode);
        }
    };

    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
                setActiveView("main");
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    return (
        <div ref={containerRef} className="relative inline-block text-left">
            <button
                type="button"
                onClick={() => {
                    setIsOpen((prev) => !prev);
                    setActiveView("main");
                }}
                aria-expanded={isOpen}
                aria-label={displayName}
                className={cx(
                    "relative flex cursor-pointer items-center justify-center rounded-lg bg-[var(--bg-card)] border border-[var(--border-light)] outline-none hover:bg-[var(--bg-hover)] transition-colors",
                    isMobile ? "size-9 p-1.5 min-w-0" : "w-auto min-w-[9.5rem] p-2 pr-8 text-left gap-2"
                )}
            >
                <Avatar size="xs" src={avatarSrc} initials={initials} className="size-5" />
                {!isMobile && (
                    <>
                        <p className="text-sm font-semibold text-primary truncate max-w-[110px]">{displayName}</p>
                        <div className="absolute top-1 right-1 flex size-7 items-center justify-center rounded-md">
                            <ChevronDown className="size-4 shrink-0 stroke-[2.25px] text-fg-quaternary" />
                        </div>
                    </>
                )}
            </button>

            {isOpen && (
                <div
                    className="absolute right-0 top-full mt-2 w-60 max-h-[80vh] overflow-y-auto rounded-xl bg-[var(--bg-card)] border border-[var(--border-light)] shadow-2xl p-1.5 z-[10050] animate-in fade-in slide-in-from-top-1 duration-150"
                >
                    {activeView === "main" && (
                        <div className="flex flex-col gap-0.5">
                            <div className="px-3 pt-2 pb-1">
                                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Active Account</span>
                                <div className="flex items-center gap-2 mt-1">
                                    <Avatar size="xs" src={avatarSrc} initials={initials} className="size-6" />
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-sm font-semibold text-primary truncate">{displayName}</span>
                                        {user?.email && <span className="text-xs text-slate-400 truncate max-w-[150px]">{user.email}</span>}
                                    </div>
                                </div>
                            </div>

                            <div className="my-1 h-px w-full bg-[var(--border-light)]" />

                            <button
                                type="button"
                                onClick={() => { onOpenProfile?.(); setIsOpen(false); }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-primary hover:bg-[var(--bg-hover)] rounded-lg transition-colors text-left cursor-pointer"
                            >
                                <User01 className="size-4 shrink-0 text-slate-400" />
                                <span className="flex-1">My Profile</span>
                                <span className="text-xs text-slate-400">⌘S</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => { onOpenSettings?.(); setIsOpen(false); setActiveView("main"); }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-primary hover:bg-[var(--bg-hover)] rounded-lg transition-colors text-left cursor-pointer"
                            >
                                <Settings01 className="size-4 shrink-0 text-slate-400" />
                                <span className="flex-1">Settings</span>
                            </button>

                            {isMobile && (
                                <>
                                    <div className="my-1 h-px w-full bg-[var(--border-light)]" />
                                    <div className="px-3 pt-1 pb-0.5">
                                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Quick Actions</span>
                                    </div>

                                    {onOpenDateRange && (
                                        <button
                                            type="button"
                                            onClick={() => { onOpenDateRange(); setIsOpen(false); }}
                                            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-primary hover:bg-[var(--bg-hover)] rounded-lg transition-colors text-left cursor-pointer"
                                        >
                                            <CalendarIcon className="size-4 shrink-0 text-slate-400" />
                                            <span className="flex-1">Date range ({dateRangeLabel || "All time"})</span>
                                        </button>
                                    )}

                                    {tradeModeOptions && tradeModeOptions.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setActiveView("tradeMode")}
                                            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-primary hover:bg-[var(--bg-hover)] rounded-lg transition-colors text-left cursor-pointer"
                                        >
                                            <FilterIcon className="size-4 shrink-0 text-slate-400" />
                                            <span className="flex-1">Trade mode ({tradeModeLabel || "All"})</span>
                                        </button>
                                    )}

                                    {currencyOptions && currencyOptions.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setActiveView("currency")}
                                            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-primary hover:bg-[var(--bg-hover)] rounded-lg transition-colors text-left cursor-pointer"
                                        >
                                            <CurrencyIcon className="size-4 shrink-0 text-slate-400" />
                                            <span className="flex-1">Currency ({currencyCode || "USD"})</span>
                                        </button>
                                    )}
                                </>
                            )}

                            <div className="my-1 h-px w-full bg-[var(--border-light)]" />

                            <button
                                type="button"
                                onClick={handleDarkModeToggle}
                                className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-primary hover:bg-[var(--bg-hover)] rounded-lg transition-colors text-left cursor-pointer"
                            >
                                <div className="flex items-center gap-2.5">
                                    <Moon01 className="size-4 shrink-0 text-slate-400" />
                                    <span>Dark mode</span>
                                </div>
                                <ToggleBase size="sm" isSelected={Boolean(darkMode)} />
                            </button>

                            <div className="my-1 h-px w-full bg-[var(--border-light)]" />

                            <button
                                type="button"
                                onClick={() => { onSignOut?.(); setIsOpen(false); }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors text-left cursor-pointer"
                            >
                                <LogOut01 className="size-4 shrink-0" />
                                <span>Sign out</span>
                            </button>
                        </div>
                    )}

                    {activeView === "timezone" && (
                        <div className="flex flex-col gap-0.5">
                            <button
                                type="button"
                                onClick={() => setActiveView("main")}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold text-primary hover:bg-[var(--bg-hover)] rounded-lg transition-colors text-left cursor-pointer"
                            >
                                <ArrowLeft className="size-4 text-slate-400" />
                                <span>Back to Menu</span>
                            </button>
                            <div className="my-1 h-px w-full bg-[var(--border-light)]" />
                            <div className="px-3 py-1">
                                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Select Timezone</span>
                            </div>
                            {TIME_ZONE_OPTIONS.map((tz) => (
                                <button
                                    key={tz.value}
                                    type="button"
                                    onClick={() => {
                                        onTimeZoneChange?.(tz.value);
                                        setIsOpen(false);
                                        setActiveView("main");
                                    }}
                                    className={cx(
                                        "w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors text-left cursor-pointer",
                                        tz.value === timeZone ? "text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/20 font-semibold" : "text-primary hover:bg-[var(--bg-hover)]"
                                    )}
                                >
                                    <span>{tz.label}</span>
                                    {tz.value === timeZone && <span className="text-blue-600 dark:text-blue-400 font-bold">✓</span>}
                                </button>
                            ))}
                        </div>
                    )}

                    {activeView === "tradeMode" && tradeModeOptions && (
                        <div className="flex flex-col gap-0.5">
                            <button
                                type="button"
                                onClick={() => setActiveView("main")}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold text-primary hover:bg-[var(--bg-hover)] rounded-lg transition-colors text-left cursor-pointer"
                            >
                                <ArrowLeft className="size-4 text-slate-400" />
                                <span>Back to Menu</span>
                            </button>
                            <div className="my-1 h-px w-full bg-[var(--border-light)]" />
                            <div className="px-3 py-1">
                                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Select Trade Mode</span>
                            </div>
                            {tradeModeOptions.map((mode) => (
                                <button
                                    key={mode.value}
                                    type="button"
                                    onClick={() => {
                                        onTradeModeChange?.(mode.value);
                                        setIsOpen(false);
                                        setActiveView("main");
                                    }}
                                    className={cx(
                                        "w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors text-left cursor-pointer",
                                        mode.value === tradeMode ? "text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/20 font-semibold" : "text-primary hover:bg-[var(--bg-hover)]"
                                    )}
                                >
                                    <span>{mode.label}</span>
                                    {mode.value === tradeMode && <span className="text-blue-600 dark:text-blue-400 font-bold">✓</span>}
                                </button>
                            ))}
                        </div>
                    )}

                    {activeView === "currency" && currencyOptions && (
                        <div className="flex flex-col gap-0.5">
                            <button
                                type="button"
                                onClick={() => setActiveView("main")}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold text-primary hover:bg-[var(--bg-hover)] rounded-lg transition-colors text-left cursor-pointer"
                            >
                                <ArrowLeft className="size-4 text-slate-400" />
                                <span>Back to Menu</span>
                            </button>
                            <div className="my-1 h-px w-full bg-[var(--border-light)]" />
                            <div className="px-3 py-1">
                                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Select Currency</span>
                            </div>
                            {currencyOptions.map((curr) => (
                                <button
                                    key={curr.code}
                                    type="button"
                                    onClick={() => {
                                        onCurrencyChange?.(curr.code);
                                        setIsOpen(false);
                                        setActiveView("main");
                                    }}
                                    className={cx(
                                        "w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors text-left cursor-pointer gap-2.5",
                                        curr.code === currencyCode ? "text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/20 font-semibold" : "text-primary hover:bg-[var(--bg-hover)]"
                                    )}
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        {curr.flag && (
                                            <img
                                                src={curr.flag}
                                                alt=""
                                                className="w-5 h-3.5 rounded-[2px] object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                                            />
                                        )}
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-sm font-semibold truncate leading-tight">{curr.code}</span>
                                            <span className="text-[11px] text-slate-400 truncate leading-tight">{curr.label}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        {curr.symbol && <span className="text-sm font-semibold text-slate-400">{curr.symbol}</span>}
                                        {curr.code === currencyCode && <span className="text-blue-600 dark:text-blue-400 font-bold">✓</span>}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
