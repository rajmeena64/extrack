import React from "react";
import { Skeleton } from "@/components/ui";

export const SkeletonHeader = () => (
  <header className="app-page-header relative z-10 mb-1 shrink-0">
    <div className="app-page-header__left flex items-center">
      <Skeleton className="w-5 h-5 rounded-md mr-3" />
      <Skeleton className="w-28 h-6 rounded-md" />
    </div>
    <div className="app-page-header__right flex items-center gap-1.5 flex-wrap !overflow-visible">
      <Skeleton className="w-20 h-8 rounded-lg" />
      <Skeleton className="w-28 h-8 rounded-lg" />
      <Skeleton className="w-20 h-8 rounded-lg" />
    </div>
  </header>
);

export const SkeletonTableRow = () => (
  <tr className="border-b border-[var(--border-light)]">
    <td className="p-3 px-4"><Skeleton className="w-20 h-4 rounded" /></td>
    <td className="p-3 px-4"><Skeleton className="w-24 h-4 rounded" /></td>
    <td className="p-3 px-4"><Skeleton className="w-14 h-4 rounded" /></td>
    <td className="p-3 px-4"><Skeleton className="w-16 h-4 rounded" /></td>
    <td className="p-3 px-4"><Skeleton className="w-24 h-4 rounded" /></td>
  </tr>
);

export const SkeletonTable = () => (
  <div className="w-full flex-1 min-h-0 border border-[var(--border-medium)] dark:border-white/10 rounded-xl flex flex-col bg-[var(--bg-card)] shadow-xs dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)] overflow-hidden mt-1">
    <div className="min-h-0 flex-1 overflow-auto flex flex-col custom-scrollbar">
      <table className="w-full min-w-[760px] border-collapse text-left">
        <thead>
          <tr className="sticky top-0 bg-[var(--bg-card)] border-b border-[var(--border-medium)]">
            <th className="p-3 px-4 text-left font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-[11.5px]">Symbol</th>
            <th className="p-3 px-4 text-left font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-[11.5px]">Date</th>
            <th className="p-3 px-4 text-left font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-[11.5px]">Type</th>
            <th className="p-3 px-4 text-left font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-[11.5px]">P&amp;L</th>
            <th className="p-3 px-4 text-left font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-[11.5px]">Strategy</th>
          </tr>
        </thead>
        <tbody>
          {[...Array(8)].map((_, index) => (
            <SkeletonTableRow key={index} />
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export const TradeLogSkeleton = () => (
  <>
    <SkeletonHeader />
    <SkeletonTable />
  </>
);

export default TradeLogSkeleton;
