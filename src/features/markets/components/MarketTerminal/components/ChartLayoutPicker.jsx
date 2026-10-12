import React, { useEffect, useState, useRef } from 'react';

const LAYOUT_LINES = {
  '2v': [[9, 1, 9, 17]],
  '2h': [[1, 9, 17, 9]],
  '3v': [[6.3, 1, 6.3, 17], [11.7, 1, 11.7, 17]],
  '3h': [[1, 6.3, 17, 6.3], [1, 11.7, 17, 11.7]],
  '3': [[1, 9, 17, 9], [9, 9, 9, 17]],
  '4': [[1, 9, 17, 9], [9, 1, 9, 17]],
  '5': [[1, 9, 17, 9], [6.3, 1, 6.3, 17], [11.7, 1, 11.7, 9]],
  '6': [[1, 9, 17, 9], [6.3, 1, 6.3, 17], [11.7, 1, 11.7, 17]],
};

export function LayoutIcon({ layout = '1', size = 16, className = '' }) {
  const lines = LAYOUT_LINES[layout] || [];
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.3" className={className}>
      <rect x="1" y="1" width="16" height="16" rx="2" />
      {lines.map(([x1, y1, x2, y2], i) => (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />
      ))}
    </svg>
  );
}

export const DEFAULT_LAYOUTS = [
  { value: '1', label: '1 Chart' },
  { value: '2v', label: '2 Vertical' },
  { value: '2h', label: '2 Horizontal' },
  { value: '3v', label: '3 Vertical' },
  { value: '3h', label: '3 Horizontal' },
  { value: '3', label: '3 Grid' },
  { value: '4', label: '4 Grid' },
  { value: '5', label: '5 Grid' },
  { value: '6', label: '6 Grid' },
];

export default function ChartLayoutPicker({
  layout = '1',
  layouts = DEFAULT_LAYOUTS,
  onLayoutChange,
  buttonClassName = 'inline-flex items-center justify-center w-7 h-7 rounded-md border-0 bg-transparent text-[var(--text-secondary,#64748b)] hover:text-[var(--text-primary,#0f172a)] hover:bg-[var(--bg-hover,#f1f5f9)] transition-colors cursor-pointer',
}) {
  const [layoutOpen, setLayoutOpen] = useState(false);
  const layoutDropdownRef = useRef(null);

  useEffect(() => {
    if (!layoutOpen) return undefined;
    const handleOutsideClick = (e) => {
      if (layoutDropdownRef.current && !layoutDropdownRef.current.contains(e.target)) setLayoutOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [layoutOpen]);

  return (
    <div className="relative inline-block" ref={layoutDropdownRef}>
      <button className={`${buttonClassName}${layoutOpen ? ' is-active' : ''}`} type="button" title="Select chart layout" onClick={() => setLayoutOpen((p) => !p)}>
        <LayoutIcon layout={layout} size={15} />
      </button>
      {layoutOpen && (
        <div className="absolute top-[calc(100%+4px)] left-0 z-[1000] bg-[var(--bg-card,#ffffff)] border border-[var(--border-light,#e2e8f0)] rounded-md shadow-lg p-2 flex flex-col gap-1.5 min-w-[140px]">
          <div className="text-xs font-semibold text-[var(--text-secondary,#64748b)] px-1">Select Layout</div>
          <div className="grid grid-cols-3 gap-1.5">
            {(layouts || DEFAULT_LAYOUTS).map((item) => (
              <button
                key={item.value}
                type="button"
                className={`flex flex-col items-center justify-center p-1.5 rounded text-[10px] text-[var(--text-secondary,#64748b)] hover:text-[var(--text-primary,#0f172a)] hover:bg-[var(--bg-secondary,#f1f5f9)] cursor-pointer transition-colors border ${
                  item.value === layout ? 'border-[var(--primary,#2563eb)] bg-[var(--bg-secondary,#f1f5f9)] text-[var(--primary,#2563eb)] font-semibold' : 'border-transparent'
                }`}
                onClick={() => { onLayoutChange?.(item.value); setLayoutOpen(false); }}
                title={item.label}
              >
                <LayoutIcon layout={item.value} size={20} />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
