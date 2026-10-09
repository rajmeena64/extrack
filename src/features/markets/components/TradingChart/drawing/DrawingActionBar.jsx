import React, { useState, useEffect, useRef } from "react";
import { ColorPicker } from "@/components/ui";

const WIDTHS = [1, 2, 3, 4];

export function DrawingActionBar({ selectedDrawing, onUpdateStyle, onDelete }) {
  const [showPalette, setShowPalette] = useState(false);
  const [showWidths, setShowWidths] = useState(false);
  const [dragPos, setDragPos] = useState(null);
  const barRef = useRef(null);

  useEffect(() => {
    setShowPalette(false);
    setShowWidths(false);
  }, [selectedDrawing?.id]);

  useEffect(() => {
    if (!showPalette && !showWidths) return;
    const handleOutside = (e) => {
      if (barRef.current && !barRef.current.contains(e.target)) {
        setShowPalette(false);
        setShowWidths(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [showPalette, showWidths]);

  if (!selectedDrawing) return null;

  const style = selectedDrawing.style || {};
  const currentColor = style.color || "#2962ff";
  const currentWidth = style.width || 2;
  const isDashed = Boolean(style.dashed);

  const handlePointerDown = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const el = barRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const parent = el.parentElement?.getBoundingClientRect() || { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
    const shiftX = e.clientX - rect.left;
    const shiftY = e.clientY - rect.top;

    const onPointerMove = (ev) => {
      const maxX = Math.max(10, parent.width - rect.width - 10);
      const maxY = Math.max(10, parent.height - rect.height - 10);
      setDragPos({
        x: Math.max(10, Math.min(maxX, ev.clientX - parent.left - shiftX)),
        y: Math.max(10, Math.min(maxY, ev.clientY - parent.top - shiftY)),
      });
    };

    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  const handleColorChange = (hex, alphaVal) => {
    const alphaHex = Math.round(alphaVal * 255).toString(16).padStart(2, "0");
    onUpdateStyle?.({
      color: hex,
      fill: `${hex}${alphaHex}`,
    });
  };

  const handleWidthChange = (w) => {
    onUpdateStyle?.({ width: w });
    setShowWidths(false);
  };

  const handleToggleDashed = () => {
    onUpdateStyle?.({ dashed: !isDashed });
  };

  const stylePos = dragPos
    ? { left: `${dragPos.x}px`, top: `${dragPos.y}px` }
    : { left: "50%", top: "16px", transform: "translateX(-50%)" };

  const openPaletteUp = Boolean(dragPos && dragPos.y > 260);

  return (
    <div
      ref={barRef}
      style={stylePos}
      className="absolute z-30 flex items-center gap-1 px-1.5 py-1 bg-[var(--bg-card,#1e222d)]/95 backdrop-blur-md border border-[var(--border-color,#2a2e39)] rounded-lg shadow-xl text-xs text-[var(--text-primary,#d1d4dc)] select-none"
    >
      <div
        onPointerDown={handlePointerDown}
        className="flex items-center justify-center p-1 rounded cursor-grab active:cursor-grabbing text-[var(--text-muted,#787b86)] hover:text-[var(--text-primary,#d1d4dc)] hover:bg-[var(--bg-hover,#2a2e39)] transition-colors"
        title="Drag to move"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="8" cy="5" r="2" />
          <circle cx="8" cy="12" r="2" />
          <circle cx="8" cy="19" r="2" />
          <circle cx="16" cy="5" r="2" />
          <circle cx="16" cy="12" r="2" />
          <circle cx="16" cy="19" r="2" />
        </svg>
      </div>

      <div className="w-[1px] h-4 bg-[var(--border-color,#2a2e39)]" />

      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setShowPalette((v) => !v);
            setShowWidths(false);
          }}
          className="flex items-center justify-center p-1 rounded hover:bg-[var(--bg-hover,#2a2e39)] transition-colors"
          title="Color"
        >
          <span
            className="w-3.5 h-3.5 rounded border border-white/20 shadow-sm"
            style={{ backgroundColor: currentColor }}
          />
        </button>
        {showPalette && (
          <div className={`absolute ${openPaletteUp ? "bottom-full mb-2" : "top-full mt-2"} -left-8 z-50 animate-in fade-in zoom-in-95 duration-100`}>
            <ColorPicker
              color={currentColor}
              onChange={handleColorChange}
              onClose={() => setShowPalette(false)}
            />
          </div>
        )}
      </div>

      <div className="w-[1px] h-4 bg-[var(--border-color,#2a2e39)]" />

      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setShowWidths((v) => !v);
            setShowPalette(false);
          }}
          className="flex items-center gap-1 px-1.5 py-1 rounded hover:bg-[var(--bg-hover,#2a2e39)] font-mono text-[11px] transition-colors"
          title="Line Width"
        >
          <span className="inline-block w-3 bg-current rounded-full" style={{ height: `${Math.max(1, currentWidth)}px` }} />
          <span>{currentWidth}px</span>
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
        {showWidths && (
          <div className={`absolute ${openPaletteUp ? "bottom-full mb-1" : "top-full mt-1"} left-0 flex flex-col gap-1 p-1 bg-[var(--bg-card,#1e222d)] border border-[var(--border-color,#2a2e39)] rounded-md shadow-lg z-40 min-w-[56px]`}>
            {WIDTHS.map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => handleWidthChange(w)}
                className={`px-2 py-0.5 rounded text-left font-mono hover:bg-[var(--bg-hover,#2a2e39)] flex items-center justify-between gap-2 ${
                  currentWidth === w ? "bg-[var(--bg-hover,#2a2e39)] font-semibold" : ""
                }`}
              >
                <span className="inline-block w-3 bg-current rounded-full" style={{ height: `${w}px` }} />
                <span>{w}px</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="w-[1px] h-4 bg-[var(--border-color,#2a2e39)]" />

      <button
        type="button"
        onClick={handleToggleDashed}
        className={`p-1 rounded hover:bg-[var(--bg-hover,#2a2e39)] transition-colors ${
          isDashed ? "bg-[var(--bg-hover,#2a2e39)] text-[var(--primary,#2563eb)]" : "text-[var(--text-muted,#787b86)] hover:text-[var(--text-primary,#d1d4dc)]"
        }`}
        title={isDashed ? "Dashed Line" : "Solid Line"}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          {isDashed ? (
            <line x1="2" y1="12" x2="22" y2="12" strokeDasharray="4 4" />
          ) : (
            <line x1="2" y1="12" x2="22" y2="12" />
          )}
        </svg>
      </button>

      <div className="w-[1px] h-4 bg-[var(--border-color,#2a2e39)]" />

      <button
        type="button"
        onClick={() => onDelete?.()}
        className="p-1 rounded hover:bg-red-500/10 hover:text-red-400 text-[var(--text-muted,#787b86)] transition-colors"
        title="Delete Drawing"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18" />
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
        </svg>
      </button>
    </div>
  );
}
