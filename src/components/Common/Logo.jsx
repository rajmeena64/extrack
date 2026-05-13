import React from 'react';
import './Logo.css';

const APP_LOGO_SRC = '/assets/applogo/ex_stylish_clean.svg';

function Logo({ className = '', showText = true, compact = false }) {
  return (
    <div className={`app-brand ${compact ? 'app-brand--compact' : ''} ${className}`.trim()}>
      <span className="app-brand__mark" aria-hidden="true">
        <img className="app-brand__image" src={APP_LOGO_SRC} alt="" />
      </span>

      {showText && (
        <span className="app-brand__wordmark">
          EXTRACK
        </span>
      )}
    </div>
  );
}

export default Logo;
