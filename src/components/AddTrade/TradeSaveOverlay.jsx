import { Loader as LoaderIcon } from '../../icons/lucideIcons';

function TradeSaveOverlay({ label = 'Saving trade...' }) {
  return (
    <div className="trade-save-overlay" role="status" aria-live="polite" aria-label={label}>
      <div className="trade-save-overlay__loader">
        <LoaderIcon className="trade-save-overlay__icon" strokeWidth={2.5} aria-hidden="true" />
      </div>
      <span className="trade-save-overlay__sr-only">{label}</span>
    </div>
  );
}

export default TradeSaveOverlay;
