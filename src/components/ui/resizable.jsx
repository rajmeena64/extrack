import React from "react";
import * as ResizablePrimitive from "react-resizable-panels";
import { GripVertical } from "@/icons/lucideIcons";
import { cx } from "@/utils/cx";

export const ResizablePanelGroup = ({ className = "", direction = "horizontal", orientation, ...props }) => (
  <ResizablePrimitive.Group
    orientation={orientation || direction}
    className={cx("flex h-full w-full data-[orientation=vertical]:flex-col", className)}
    {...props}
  />
);

export const ResizablePanel = ResizablePrimitive.Panel;

export const ResizableHandle = ({ withHandle, className = "", ...props }) => (
  <ResizablePrimitive.Separator
    className={cx(
      "relative flex w-1.5 items-center justify-center bg-transparent transition-colors cursor-col-resize data-[orientation=vertical]:h-1.5 data-[orientation=vertical]:w-full data-[orientation=vertical]:cursor-row-resize z-[2] group",
      className
    )}
    {...props}
  >
    <div className="w-[2px] h-full rounded-full bg-transparent group-hover:bg-[var(--primary,#2563eb)]/50 group-active:bg-[var(--primary,#2563eb)] transition-colors group-data-[orientation=vertical]:w-full group-data-[orientation=vertical]:h-[2px]" />
    {withHandle && (
      <div className="z-10 flex h-4 w-2.5 items-center justify-center rounded-xs border border-[var(--border-light)] bg-[var(--bg-card)] shadow-xs pointer-events-none">
        <GripVertical size={8} className="text-[var(--text-secondary)]" />
      </div>
    )}
  </ResizablePrimitive.Separator>
);
