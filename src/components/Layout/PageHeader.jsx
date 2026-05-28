import React from 'react';
import { ArrowLeft } from '../../icons/lucideIcons';

function PageHeader({
  title,
  eyebrow,
  actions,
  meta,
  onBack,
  backLabel = 'Back',
  className = '',
  left,
  right,
}) {
  const classes = ['app-page-header', className].filter(Boolean).join(' ');
  const headerLeft = left || (
    <>
      {onBack && (
        <button className="app-back-button" type="button" onClick={onBack} aria-label={backLabel} title={backLabel}>
          <ArrowLeft size={16} aria-hidden="true" />
          <span className="app-back-button__label">{backLabel}</span>
        </button>
      )}
      <div className="app-page-header__title-block">
        {eyebrow && <span className="app-page-header__eyebrow">{eyebrow}</span>}
        {title && <h1 className="app-page-title">{title}</h1>}
        {meta && <span className="app-page-header__meta">{meta}</span>}
      </div>
    </>
  );

  return (
    <header className={classes}>
      <div className="app-page-header__left">{headerLeft}</div>
      {(right || actions) && (
        <div className="app-page-header__right">
          {right || actions}
        </div>
      )}
    </header>
  );
}

export default PageHeader;
