import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Clock } from '../../icons/lucideIcons';
import './CustomTimePicker.css';

const HOURS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0'));

function splitTime(value) {
  const [rawHour = '00', rawMinute = '00'] = String(value || '').split(':');
  const hour = HOURS.includes(rawHour) ? rawHour : '00';
  const minute = MINUTES.includes(rawMinute) ? rawMinute : '00';

  return { hour, minute };
}

function formatNow() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export default function CustomTimePicker({
  id,
  value,
  onChange,
  className = '',
  ariaLabel = 'Select time',
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const { hour, minute } = useMemo(() => splitTime(value), [value]);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (!wrapperRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  const emitChange = (nextHour, nextMinute) => {
    onChange?.(`${nextHour}:${nextMinute}`);
  };

  return (
    <div className={`custom-time-picker ${className}`.trim()} ref={wrapperRef}>
      <button
        type="button"
        id={id}
        className="custom-time-picker__trigger"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
      >
        <Clock size={14} aria-hidden="true" />
        <span>{hour}:{minute}</span>
      </button>

      {open ? (
        <div className="custom-time-picker__popover" role="dialog" aria-label={ariaLabel}>
          <div className="custom-time-picker__columns">
            <div className="custom-time-picker__column" aria-label="Hours">
              <span className="custom-time-picker__column-label">Hour</span>
              <div className="custom-time-picker__options">
                {HOURS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={option === hour ? 'is-selected' : ''}
                    onClick={() => emitChange(option, minute)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="custom-time-picker__column" aria-label="Minutes">
              <span className="custom-time-picker__column-label">Min</span>
              <div className="custom-time-picker__options">
                {MINUTES.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={option === minute ? 'is-selected' : ''}
                    onClick={() => emitChange(hour, option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="custom-time-picker__actions">
            <button type="button" onClick={() => emitChange(...formatNow().split(':'))}>
              Now
            </button>
            <button type="button" onClick={() => setOpen(false)}>
              Done
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
