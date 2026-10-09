import React, { useMemo } from "react";
import { ArrowLeft, ArrowRight, ChevronRight } from "@untitledui/icons";
import { Button as AriaButton } from "react-aria-components";
import { cx } from "@/utils/cx";
import { Dropdown } from "../dropdown";

export interface PaginationCardMinimalProps {
    page: number;
    total?: number;
    totalPages?: number;
    from?: number;
    to?: number;
    totalItems?: number;
    onPageChange?: (page: number) => void;
    rowsPerPage?: number;
    onRowsPerPageChange?: (size: number) => void;
    rowsPerPageOptions?: number[];
    align?: "left" | "center" | "right";
    className?: string;
}

export const PaginationCardMinimal: React.FC<PaginationCardMinimalProps> = ({
    page,
    total,
    totalPages: totalPagesProp,
    from,
    to,
    totalItems,
    onPageChange,
    rowsPerPage,
    onRowsPerPageChange,
    rowsPerPageOptions = [10, 25, 50, 100],
    align = "right",
    className,
}) => {
    const computedTotalPages = totalPagesProp ?? total ?? 1;
    const canPrev = page > 1;
    const canNext = page < computedTotalPages;

    const pageNumbers = useMemo(() => {
        const pages: (number | string)[] = [];
        const totalP = computedTotalPages;
        if (totalP <= 7) {
            for (let i = 1; i <= totalP; i++) pages.push(i);
        } else {
            pages.push(1);
            if (page > 3) pages.push("...");
            const start = Math.max(2, page - 1);
            const end = Math.min(totalP - 1, page + 1);
            for (let i = start; i <= end; i++) {
                if (!pages.includes(i)) pages.push(i);
            }
            if (page < totalP - 2) pages.push("...");
            pages.push(totalP);
        }
        return pages;
    }, [page, computedTotalPages]);

    return (
        <div
            className={cx(
                "flex flex-nowrap items-center justify-between gap-2.5 sm:gap-3 border-t border-slate-200 bg-[var(--bg-card,#ffffff)] dark:bg-[var(--bg-card,#0f172a)] px-3 py-2.5 sm:px-4 sm:py-3 text-sm font-medium text-slate-700 dark:border-slate-800 dark:text-slate-300 rounded-b-xl overflow-x-auto shrink-0 scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
                className
            )}
            aria-label="Table pagination"
        >
            <div className="flex shrink-0 items-center gap-2 text-xs md:text-sm text-slate-500 dark:text-slate-400">
                {from != null && to != null && totalItems != null ? (
                    <span>
                        <span className="hidden sm:inline">Showing </span>
                        <strong className="font-semibold text-slate-900 dark:text-white">{from}–{to}</strong> of{" "}
                        <strong className="font-semibold text-slate-900 dark:text-white">{totalItems}</strong>
                        <span className="hidden sm:inline"> trades</span>
                    </span>
                ) : (
                    <span>
                        Page <strong className="font-semibold text-slate-900 dark:text-white">{page}</strong> of{" "}
                        <strong className="font-semibold text-slate-900 dark:text-white">{computedTotalPages}</strong>
                    </span>
                )}
            </div>

            <div className="inline-flex shrink-0 items-center rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 shadow-xs overflow-hidden">
                <button
                    type="button"
                    disabled={!canPrev}
                    onClick={() => canPrev && onPageChange?.(page - 1)}
                    className="inline-flex h-8 items-center gap-1 border-r border-slate-200 dark:border-slate-800 px-2.5 sm:px-3 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                    aria-label="Previous page"
                >
                    <ArrowLeft className="size-3.5 shrink-0 stroke-[2.25px]" />
                    <span className="hidden sm:inline">Previous</span>
                </button>

                {pageNumbers.map((p, idx) => (
                    <button
                        key={idx}
                        type="button"
                        disabled={typeof p !== "number"}
                        onClick={() => typeof p === "number" && onPageChange?.(p)}
                        className={cx(
                            "inline-flex h-8 min-w-[32px] items-center justify-center border-r border-slate-200 dark:border-slate-800 px-2 text-xs font-semibold transition-colors cursor-pointer",
                            p === page
                                ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60",
                            typeof p !== "number" && "cursor-default opacity-60"
                        )}
                        aria-current={p === page ? "page" : undefined}
                    >
                        {p}
                    </button>
                ))}

                <button
                    type="button"
                    disabled={!canNext}
                    onClick={() => canNext && onPageChange?.(page + 1)}
                    className="inline-flex h-8 items-center gap-1 px-2.5 sm:px-3 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                    aria-label="Next page"
                >
                    <span className="hidden sm:inline">Next</span>
                    <ArrowRight className="size-3.5 shrink-0 stroke-[2.25px]" />
                </button>
            </div>

            {rowsPerPage != null && onRowsPerPageChange != null && (
                <div className="flex shrink-0 items-center gap-1.5 sm:gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="hidden sm:inline">Per page:</span>
                    <Dropdown.Root>
                        <AriaButton
                            aria-label="Rows per page"
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 px-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 outline-none cursor-pointer transition-colors"
                        >
                            <span>{rowsPerPage}</span>
                            <ChevronRight className="size-3.5 rotate-90 shrink-0 stroke-[2.25px] text-slate-500" />
                        </AriaButton>
                        <Dropdown.Popover placement="top end" className="w-24">
                            <Dropdown.Menu
                                onAction={(key) => {
                                    const size = Number(key);
                                    if (size && rowsPerPageOptions.includes(size)) {
                                        onRowsPerPageChange(size);
                                    }
                                }}
                            >
                                <Dropdown.Section>
                                    {rowsPerPageOptions.map((size) => (
                                        <Dropdown.Item
                                            key={size}
                                            id={String(size)}
                                            label={String(size)}
                                            selectionIndicator="checkmark"
                                            isSelected={size === rowsPerPage}
                                        />
                                    ))}
                                </Dropdown.Section>
                            </Dropdown.Menu>
                        </Dropdown.Popover>
                    </Dropdown.Root>
                </div>
            )}
        </div>
    );
};

export const PaginationCard = PaginationCardMinimal;
export default PaginationCardMinimal;
