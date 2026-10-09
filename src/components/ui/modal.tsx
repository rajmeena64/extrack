import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showClose?: boolean;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}

const sizeClasses = {
  sm: 'max-w-[420px]',
  md: 'max-w-[560px]',
  lg: 'max-w-[800px]',
  xl: 'max-w-[1020px]',
  full: 'max-w-[95vw] h-[92vh]',
};

export function Modal({
  isOpen,
  onClose,
  title,
  size = 'md',
  showClose = true,
  className = '',
  bodyClassName = '',
  children,
}: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen || typeof window === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[50000] flex items-center justify-center p-3 sm:p-5 bg-black/65 backdrop-blur-[3px] animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className={`relative flex flex-col w-full bg-[var(--bg-card)] border border-[var(--border-medium,#333)] rounded-2xl shadow-[0_24px_60px_rgba(0,0,0,0.35)] overflow-hidden max-h-[90vh] ${sizeClasses[size]} ${className}`.trim()}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || showClose) && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-light)] bg-[var(--bg-card)] shrink-0">
            {typeof title === 'string' ? (
              <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)] m-0 truncate">{title}</h3>
            ) : (
              title || <div />
            )}
            {showClose && (
              <button
                type="button"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer border-0 bg-transparent p-0"
                onClick={onClose}
                aria-label="Close modal"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            )}
          </div>
        )}
        <div className={`flex-1 min-h-0 overflow-y-auto ${bodyClassName}`.trim()}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default Modal;
