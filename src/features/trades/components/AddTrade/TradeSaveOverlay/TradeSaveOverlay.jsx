import React from 'react';
import { Loader as LoaderIcon } from '@/icons/lucideIcons';

function TradeSaveOverlay({ label = 'Saving trade...' }) {
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/30 backdrop-blur-xs"
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="flex items-center justify-center p-8">
        <LoaderIcon className="size-8 animate-spin text-[var(--button-bg)]" strokeWidth={2.5} aria-hidden="true" />
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}

export default TradeSaveOverlay;
