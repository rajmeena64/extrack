import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Clock } from '@/icons/lucideIcons';

const HOURS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0'));

function splitTime(value) {
  const [rawHour = '00', rawMinute = '00'] = String(value || '').split(':');
  return {
    hour: HOURS.includes(rawHour) ? rawHour : '00',
    minute: MINUTES.includes(rawMinute) ? rawMinute : '00',
  };
}

function formatNow() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export function CustomTimePicker({
  id,
  value,
  onChange,
  className = '',
  ariaLabel = 'Select time',
  inline = false,
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const hourRef = useRef(null);
  const minuteRef = useRef(null);
  const { hour, minute } = useMemo(() => splitTime(value), [value]);

  useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (event) => {
      if (!wrapperRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (!inline && !open) return;
    [hourRef.current, minuteRef.current].forEach((selected) => {
      const list = selected?.parentElement;
      if (list) list.scrollTop += selected.getBoundingClientRect().top - list.getBoundingClientRect().top - (list.clientHeight - selected.offsetHeight) / 2;
    });
  }, [hour, inline, minute, open]);

  const emitChange = (nextHour, nextMinute) => {
    onChange?.(`${nextHour}:${nextMinute}`);
  };

  return (
    <div className={`custom-time-picker relative w-full min-w-0 ${inline ? 'custom-time-picker--inline h-full' : ''} ${className}`.trim()} ref={wrapperRef}>
      {!inline ? (
        <button
          type="button"
          id={id}
          className="custom-time-picker__trigger flex w-full min-h-[48px] items-center gap-[9px] rounded-[16px] [border:var(--dashboard-card-border)] bg-[var(--bg-card)] px-[14px] py-3 text-left font-inherit text-[12px] leading-[1.25] text-[var(--text-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.46)] cursor-pointer transition-[border-color,box-shadow,background-color] duration-200 ease hover:outline-none hover:border-[#2563eb] hover:shadow-[0_0_0_4px_rgba(37,99,235,0.16)] focus-visible:outline-none focus-visible:border-[#2563eb] focus-visible:shadow-[0_0_0_4px_rgba(37,99,235,0.16)] aria-expanded:outline-none aria-expanded:border-[#2563eb] aria-expanded:shadow-[0_0_0_4px_rgba(37,99,235,0.16)]"
          onClick={() => setOpen((current) => !current)}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={ariaLabel}
        >
          <Clock size={14} aria-hidden="true" />
          <span className="min-w-0 truncate">{hour}:{minute}</span>
        </button>
      ) : null}

      {inline || open ? (
        <div
          className={inline
            ? 'custom-time-picker__inline flex h-full min-h-[306px] flex-col px-1'
            : 'custom-time-picker__popover absolute left-0 top-[calc(100%+8px)] z-[48] w-[224px] rounded-[16px] [border:var(--dashboard-card-border)] bg-[var(--surface-elevated,var(--bg-secondary))] p-[10px] shadow-[0_24px_56px_-34px_rgba(15,23,42,0.48)]'
          }
          role={inline ? 'group' : 'dialog'}
          aria-label={ariaLabel}
        >
          {inline ? (
            <div className="custom-time-picker__inline-heading flex min-h-[36px] items-center gap-[7px] text-[10px] font-extrabold uppercase tracking-[0.1em] text-[var(--text-muted)]">
              <Clock size={14} aria-hidden="true" />
              <span>Time</span>
              <strong className="ml-auto text-[12px] font-bold tracking-normal text-[var(--heading)]">{hour}:{minute}</strong>
            </div>
          ) : null}
          <div className={`custom-time-picker__columns grid grid-cols-2 gap-5 ${inline ? 'flex-1' : ''}`}>
            <div className={`custom-time-picker__column flex flex-col gap-1.5 ${inline ? 'flex-1' : ''}`} aria-label="Hours">
              <span className="custom-time-picker__column-label text-center text-[10px] font-bold uppercase tracking-[0.05em] text-[var(--text-muted)]">Hour</span>
              <div className={`custom-time-picker__options flex flex-col overflow-y-auto pl-[2px] pr-1 ${inline ? 'flex-1 h-[275px] max-h-[295px] gap-3.5' : 'max-h-[220px] gap-[18px]'}`}>
                {HOURS.map((option) => (
                  <button
                    key={option}
                    ref={option === hour ? hourRef : null}
                    type="button"
                    className={`w-full h-[42px] border-0 rounded-[10px] bg-transparent text-[15px] font-semibold cursor-pointer transition-[background,color] duration-150 ease hover:bg-[rgba(37,99,235,0.12)] hover:text-[#2563eb] dark:hover:bg-[rgba(37,99,235,0.22)] dark:hover:text-[#60a5fa] ${option === hour ? 'is-selected bg-[rgba(37,99,235,0.12)] text-[#2563eb] dark:bg-[rgba(37,99,235,0.22)] dark:text-[#60a5fa]' : 'text-[var(--text-secondary)]'}`}
                    onClick={() => emitChange(option, minute)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className={`custom-time-picker__column flex flex-col gap-1.5 ${inline ? 'flex-1' : ''}`} aria-label="Minutes">
              <span className="custom-time-picker__column-label text-center text-[10px] font-bold uppercase tracking-[0.05em] text-[var(--text-muted)]">Min</span>
              <div className={`custom-time-picker__options flex flex-col overflow-y-auto pl-[2px] pr-1 ${inline ? 'flex-1 h-[275px] max-h-[295px] gap-3.5' : 'max-h-[220px] gap-[18px]'}`}>
                {MINUTES.map((option) => (
                  <button
                    key={option}
                    ref={option === minute ? minuteRef : null}
                    type="button"
                    className={`w-full h-[42px] border-0 rounded-[10px] bg-transparent text-[15px] font-semibold cursor-pointer transition-[background,color] duration-150 ease hover:bg-[rgba(37,99,235,0.12)] hover:text-[#2563eb] dark:hover:bg-[rgba(37,99,235,0.22)] dark:hover:text-[#60a5fa] ${option === minute ? 'is-selected bg-[rgba(37,99,235,0.12)] text-[#2563eb] dark:bg-[rgba(37,99,235,0.22)] dark:text-[#60a5fa]' : 'text-[var(--text-secondary)]'}`}
                    onClick={() => emitChange(hour, option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {!inline ? (
            <div className="custom-time-picker__actions mt-2 flex items-center justify-between gap-2 border-t border-t-[var(--border-light)] pt-2">
              <button
                type="button"
                className="cursor-pointer rounded-lg border-0 bg-transparent px-2.5 py-[5px] text-[11px] font-bold text-[var(--text-secondary)]"
                onClick={() => emitChange(...formatNow().split(':'))}
              >
                Now
              </button>
              <button
                type="button"
                className="cursor-pointer rounded-lg border-0 bg-[var(--heading)] px-2.5 py-[5px] text-[11px] font-bold text-[var(--bg-card)]"
                onClick={() => setOpen(false)}
              >
                Done
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default CustomTimePicker;
