import React, { useState, useRef, useEffect } from "react";
import { ALL_DRAWING_TOOLS } from "./toolsRegistry";

const CURSOR_OPTIONS = [
  {
    id: "cross",
    label: "Cross",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="12" y1="2" x2="12" y2="8" strokeDasharray="2 2" />
        <line x1="12" y1="16" x2="12" y2="22" strokeDasharray="2 2" />
        <line x1="2" y1="12" x2="8" y2="12" strokeDasharray="2 2" />
        <line x1="16" y1="12" x2="22" y2="12" strokeDasharray="2 2" />
        <line x1="12" y1="9" x2="12" y2="15" />
        <line x1="9" y1="12" x2="15" y2="12" />
      </svg>
    ),
  },
  {
    id: "dot",
    label: "Dot",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="4" />
      </svg>
    ),
  },
  {
    id: "arrow",
    label: "Arrow",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m3 3 7 18 3-7 7-3L3 3z" />
      </svg>
    ),
  },
  {
    id: "eraser",
    label: "Eraser",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" />
        <path d="M22 21H7" />
        <path d="m5 11 9 9" />
      </svg>
    ),
  },
];

export default function TradingChartToolbar({
  activeTool,
  onSelectTool,
  crosshairMode = "cross",
  onSelectCrosshairMode,
  onUndo,
  onClearAll,
  drawingsCount = 0,
}) {
  const activeCursor = crosshairMode;
  const [cursorMenuOpen, setCursorMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 44, y: 10 });
  const cursorButtonRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!cursorMenuOpen) return undefined;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target) && !cursorButtonRef.current?.contains(e.target)) {
        setCursorMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [cursorMenuOpen]);

  const handleToggleCursorMenu = (e) => {
    e.stopPropagation();
    if (!cursorMenuOpen && cursorButtonRef.current) {
      const rect = cursorButtonRef.current.getBoundingClientRect();
      setMenuPos({ x: rect.right + 4, y: rect.top });
    }
    setCursorMenuOpen((prev) => !prev);
  };

  const handleSelectCursorOption = (optId) => {
    onSelectCrosshairMode?.(optId);
    setCursorMenuOpen(false);
    onSelectTool(optId === "eraser" ? "eraser" : "cursor");
  };

  const activeCursorOption = CURSOR_OPTIONS.find((c) => c.id === activeCursor) || CURSOR_OPTIONS[0];
  const isCursorActive = (!activeTool && activeCursor !== "eraser") || activeTool === "cursor" || activeTool === "eraser";

  return (
    <div className="w-[42px] shrink-0 h-full flex flex-col items-center py-2 px-1 rounded-md bg-[var(--bg-card,#ffffff)] dark:bg-[var(--bg-card,#131722)] select-none overflow-y-auto overflow-x-hidden scrollbar-none z-10">
      <div className="relative shrink-0">
        <button
          ref={cursorButtonRef}
          type="button"
          title={activeCursorOption.label}
          onClick={(e) => {
            if (isCursorActive) {
              handleToggleCursorMenu(e);
            } else {
              onSelectTool(activeCursor === "eraser" ? "eraser" : "cursor");
            }
          }}
          className={`relative w-7 h-7 flex items-center justify-center rounded transition-colors cursor-pointer ${
            isCursorActive
              ? "bg-[var(--primary,#2962ff)] text-white shadow-sm"
              : "text-[var(--text-secondary,#787b86)] hover:text-[var(--text-primary,#d1d4dc)] hover:bg-[var(--bg-hover,#2a2e39)]"
          }`}
        >
          {activeCursorOption.icon}
          <span
            onClick={handleToggleCursorMenu}
            className="absolute right-0 bottom-0 w-2.5 h-2.5 flex items-center justify-center cursor-pointer hover:opacity-100 opacity-60"
            title="More cursor tools"
          >
            <svg width="4" height="4" viewBox="0 0 4 4">
              <path d="M4 4H0L4 0Z" fill="currentColor" />
            </svg>
          </span>
        </button>
      </div>

      {cursorMenuOpen && (
        <div
          ref={menuRef}
          className="fixed z-50 py-1.5 px-1 bg-[var(--bg-card,#1e222d)] border border-[var(--border-color,#2a2e39)] rounded-lg shadow-2xl min-w-[150px] flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100"
          style={{ left: menuPos.x, top: menuPos.y }}
        >
          {CURSOR_OPTIONS.map((opt) => {
            const isOptActive = activeCursor === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelectCursorOption(opt.id)}
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                  isOptActive
                    ? "bg-[var(--primary,#2962ff)]/15 text-[var(--primary,#2962ff)] font-semibold"
                    : "text-[var(--text-primary,#d1d4dc)] hover:bg-[var(--bg-hover,#2a2e39)]"
                }`}
              >
                <span className="w-4 h-4 flex items-center justify-center shrink-0">{opt.icon}</span>
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {ALL_DRAWING_TOOLS.slice(1).map((item) => {
        const isActive = activeTool === item.id;
        return (
          <button
            key={item.id}
            type="button"
            title={item.label}
            onClick={() => onSelectTool(item.id)}
            className={`w-7 h-7 flex items-center justify-center rounded transition-colors cursor-pointer shrink-0 mt-1 ${
              isActive
                ? "bg-[var(--primary,#2962ff)] text-white shadow-sm"
                : "text-[var(--text-secondary,#787b86)] hover:text-[var(--text-primary,#d1d4dc)] hover:bg-[var(--bg-hover,#2a2e39)]"
            }`}
          >
            {item.icon}
          </button>
        );
      })}
      <div className="w-5 h-px bg-[var(--border-light,#e2e8f0)] dark:bg-[var(--border-color,#2a2e39)] my-1 shrink-0" />
      <button
        type="button"
        title="Undo"
        onClick={onUndo}
        disabled={drawingsCount === 0}
        className="w-7 h-7 flex items-center justify-center rounded text-[var(--text-secondary,#787b86)] hover:text-[var(--text-primary,#d1d4dc)] hover:bg-[var(--bg-hover,#2a2e39)] transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer shrink-0"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 7v6h6" />
          <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
        </svg>
      </button>
      <button
        type="button"
        title="Clear All"
        onClick={onClearAll}
        disabled={drawingsCount === 0}
        className="w-7 h-7 flex items-center justify-center rounded text-[var(--text-secondary,#787b86)] hover:text-[var(--loss-color,#ef4444)] hover:bg-[var(--bg-hover,#2a2e39)] transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer shrink-0"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      </button>
    </div>
  );
}
