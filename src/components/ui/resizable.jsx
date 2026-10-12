import React from "react";
import * as ResizablePrimitive from "react-resizable-panels";
import { GripVertical, GripHorizontal } from "@/icons/lucideIcons";
import { cx } from "@/utils/cx";

export const ResizablePanelGroup = ({ className = "", direction = "horizontal", orientation, ...props }) => (
  <ResizablePrimitive.Group
    orientation={orientation || direction}
    className={cx("flex h-full w-full", className)}
    {...props}
  />
);

export const ResizablePanel = ResizablePrimitive.Panel;

export const ResizableHandle = ({ withHandle, className = "", ...props }) => (
  <ResizablePrimitive.Separator
    className={cx(
      "relative flex w-1.5 self-stretch items-center justify-center bg-transparent transition-colors cursor-col-resize aria-[orientation=horizontal]:h-1.5 aria-[orientation=horizontal]:w-full aria-[orientation=horizontal]:cursor-row-resize z-[2] group",
      className
    )}
    {...props}
  >
    <div className="w-px h-full bg-[var(--border-light,#e2e8f0)] dark:bg-white/15 group-hover:bg-[var(--primary,#2563eb)] group-active:bg-[var(--primary,#2563eb)] transition-colors group-aria-[orientation=horizontal]:w-full group-aria-[orientation=horizontal]:h-px" />
    {withHandle && (
      <div className="z-10 flex h-4 w-2.5 group-aria-[orientation=horizontal]:h-2.5 group-aria-[orientation=horizontal]:w-6 items-center justify-center rounded-xs border border-[var(--border-light)] bg-[var(--bg-card)] shadow-xs pointer-events-none">
        <GripVertical size={8} className="text-[var(--text-secondary)] group-aria-[orientation=horizontal]:hidden" />
        <GripHorizontal size={8} className="text-[var(--text-secondary)] hidden group-aria-[orientation=horizontal]:block" />
      </div>
    )}
  </ResizablePrimitive.Separator>
);
