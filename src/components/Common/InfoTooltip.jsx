import React from 'react';
import { Info } from '../../icons/lucideIcons';
import './InfoTooltip.css';

function InfoTooltip({ text, className = '', size = 14, side = 'top' }) {
  return (
    <span
      className={`info-tooltip info-tooltip--${side} ${className}`.trim()}
      tabIndex={0}
      role="button"
      aria-label={text}
    >
      <Info size={size} aria-hidden="true" />
      <span className="info-tooltip__bubble" role="tooltip">
        {text}
      </span>
    </span>
  );
}

export default InfoTooltip;
