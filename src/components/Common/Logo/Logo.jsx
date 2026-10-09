import React from 'react';
import { useTheme } from '../../../context/ThemeContext';
const APP_LOGO_LIGHT_SRC = '/assets/applogo/entrack_dna_light_icon.svg';
const APP_LOGO_DARK_SRC = '/assets/applogo/entrack_dna_dark_icon.svg';

function Logo({ className = '', showText = true, compact = false, invertTheme = false }) {
  const { darkMode } = useTheme() || {};
  const useDarkLogo = invertTheme ? !darkMode : darkMode;

  return (
    <div className={`app-brand inline-flex items-center min-w-0 text-[var(--text-primary)] ${compact ? 'app-brand--compact gap-0' : 'gap-[9px]'} ${className}`.trim()}>
      <span className={`app-brand__mark relative overflow-visible rounded-[10px] bg-transparent shadow-[0_12px_24px_-18px_rgba(37,99,235,0.52)] ${compact ? 'w-8 h-8 flex-[0_0_32px]' : 'w-[34px] h-[34px] flex-[0_0_34px]'}`} aria-hidden="true">
        <img className="app-brand__image absolute inset-0 w-full max-w-full h-full left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 object-contain pointer-events-none select-none" src={useDarkLogo ? APP_LOGO_DARK_SRC : APP_LOGO_LIGHT_SRC} alt="" />
      </span>
      {showText && (
        <span className="app-brand__wordmark inline-flex items-center min-w-0 text-[17px] font-black leading-none text-[var(--text-primary)] whitespace-nowrap tracking-normal">
          Entrack
        </span>
      )}
    </div>
  );
}

export default Logo;
