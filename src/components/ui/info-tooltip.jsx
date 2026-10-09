import React from 'react';
import { Info } from '@/icons/lucideIcons';
import { Tooltip, TooltipTrigger } from './tooltip';

const placementMap = {
  top: 'top',
  bottom: 'bottom',
  'bottom-left': 'bottom left',
  'bottom-right': 'bottom right',
  left: 'left',
  right: 'right',
};

export function InfoTooltip({ title, text, description, className = '', size = 14, side = 'top' }) {
  const content = text || description || '';
  if (!content && !title) return null;
  const placement = placementMap[side] || 'top';

  return (
    <Tooltip title={title || content} description={title && content ? content : undefined} placement={placement} arrow delay={0} closeDelay={0}>
      <TooltipTrigger
        className={`info-tooltip relative inline-flex items-center justify-center w-[22px] h-[22px] shrink-0 rounded-full border border-[var(--divider-strong)] bg-[var(--accent-info-soft)] text-[var(--primary)] cursor-help outline-none hover:border-[color-mix(in_srgb,var(--accent-ink)_28%,var(--border-light))] hover:bg-[var(--bg-hover)] focus-visible:border-[color-mix(in_srgb,var(--accent-ink)_28%,var(--border-light))] focus-visible:bg-[var(--bg-hover)] ${className}`.trim()}
        aria-label={String(title || content)}
      >
        <Info size={size} aria-hidden="true" />
      </TooltipTrigger>
    </Tooltip>
  );
}

export default InfoTooltip;
