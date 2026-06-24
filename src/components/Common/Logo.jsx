import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import './Logo.css';

const APP_LOGO_LIGHT_SRC = '/assets/applogo/entrack_dna_light_icon.svg';
const APP_LOGO_DARK_SRC = '/assets/applogo/entrack_dna_dark_icon.svg';

function Logo({ className = '', showText = true, compact = false, invertTheme = false }) {
  const { darkMode } = useTheme() || {};
  const useDarkLogo = invertTheme ? !darkMode : darkMode;

  return (
    <div className={`app-brand ${compact ? 'app-brand--compact' : ''} ${className}`.trim()}>
      <span className="app-brand__mark" aria-hidden="true">
        <img className="app-brand__image" src={useDarkLogo ? APP_LOGO_DARK_SRC : APP_LOGO_LIGHT_SRC} alt="" />
      </span>

      {showText && (
        <span className="app-brand__wordmark">
          Entrack
        </span>
      )}
    </div>
  );
}

export default Logo;
