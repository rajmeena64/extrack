import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from '../../icons/lucideIcons';
import './CustomSelect.css';

function normalizeOptions(options, children) {
  if (Array.isArray(options)) {
    return options.map((option) => (
      typeof option === 'string'
        ? { value: option, label: option }
        : {
          ...option,
          value: String(option.value ?? ''),
          label: option.label ?? String(option.value ?? ''),
        }
    ));
  }

  return React.Children.toArray(children)
    .filter((child) => React.isValidElement(child))
    .map((child) => ({
      value: String(child.props.value ?? child.props.children ?? ''),
      label: child.props.children,
      disabled: child.props.disabled,
    }));
}

export default function CustomSelect({
  id,
  name,
  value,
  onChange,
  options,
  children,
  className = '',
  placeholder = 'Select',
  ariaLabel,
  disabled = false,
  ...rest
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const normalizedOptions = useMemo(() => normalizeOptions(options, children), [children, options]);
  const stringValue = String(value ?? '');
  const selectedOption = normalizedOptions.find((option) => option.value === stringValue);
  const triggerLabel = ariaLabel || rest['aria-label'] || name || id || placeholder;

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

  const selectOption = (option) => {
    if (option.disabled) return;

    onChange?.({
      target: {
        id,
        name,
        value: option.value,
      },
    });
    setOpen(false);
  };

  return (
    <div className={`custom-select ${className}`.trim()} ref={wrapperRef}>
      <button
        type="button"
        id={id}
        className={`custom-select__trigger ${!selectedOption ? 'is-placeholder' : ''}`}
        onClick={() => !disabled && setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={triggerLabel}
        disabled={disabled}
      >
        <span>{selectedOption?.label || placeholder}</span>
        <ChevronDown size={15} aria-hidden="true" />
      </button>

      {open ? (
        <div className="custom-select__menu" role="listbox" aria-labelledby={id}>
          {normalizedOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`custom-select__option ${option.value === stringValue ? 'is-selected' : ''}`}
              onClick={() => selectOption(option)}
              disabled={option.disabled}
              role="option"
              aria-selected={option.value === stringValue}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
