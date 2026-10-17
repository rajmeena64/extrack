import React from 'react';
import SymbolWithIcon from '@/components/Common/SymbolWithIcon/SymbolWithIcon';
import { CheckCircle2, Plus } from '@/icons/lucideIcons';

function WatchlistRow({
  row,
  quote,
  active,
  onRowDrop,
  onSelect,
  onContextMenu,
  isSearchResult = false,
  inWatchlist = false,
  onAddSymbol,
  onRemoveSymbol,
}) {
  const numericBid = Number(quote?.bid);
  const numericAsk = Number(quote?.ask);
  const livePriceUp = Number.isFinite(numericBid + numericAsk)
    ? Math.floor((numericBid + numericAsk) * 100000) % 2 === 0
    : row.symbol.length % 2 === 0;
  const signalUp = quote?.todayDirection !== 'down';
  const todayChangeText = quote?.todayChangePercentText
    || quote?.dailyChangePercentText
    || quote?.changePercentText
    || (quote ? '0.00%' : '-');

  return (
    <div
      draggable={!isSearchResult}
      data-watchlist-row={row.requestSymbol}
      className={`relative grid grid-cols-[minmax(70px,1fr)_minmax(52px,auto)_54px_54px] items-center gap-x-1.5 min-h-[38px] border-b border-[var(--border-light)] bg-transparent text-[var(--text-primary)] px-2.5 py-1.5 cursor-grab active:cursor-grabbing select-none hover:bg-[var(--bg-hover)] transition-colors ${
        active ? 'bg-[var(--bg-hover)]' : ''
      } data-[dragging='true']:opacity-35 data-[dragging='true']:bg-[var(--surface-subtle)] data-[drop-position='top']:before:absolute data-[drop-position='top']:before:top-0 data-[drop-position='top']:before:left-0 data-[drop-position='top']:before:right-0 data-[drop-position='top']:before:h-[2px] data-[drop-position='top']:before:bg-[var(--brand-primary,#2563eb)] data-[drop-position='top']:before:z-20 data-[drop-position='bottom']:after:absolute data-[drop-position='bottom']:after:bottom-0 data-[drop-position='bottom']:after:left-0 data-[drop-position='bottom']:after:right-0 data-[drop-position='bottom']:after:h-[2px] data-[drop-position='bottom']:after:bg-[var(--brand-primary,#2563eb)] data-[drop-position='bottom']:after:z-20`}
      onContextMenu={(event) => {
        if (onContextMenu) {
          onContextMenu(event, row.requestSymbol, row.symbol);
        }
      }}
      onDragStart={(event) => {
        event.dataTransfer.setData('text/plain', row.requestSymbol);
        event.dataTransfer.effectAllowed = 'move';
        requestAnimationFrame(() => {
          event.target?.setAttribute?.('data-dragging', 'true');
        });
      }}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        const rect = event.currentTarget.getBoundingClientRect();
        const pos = (event.clientY - rect.top) < rect.height / 2 ? 'top' : 'bottom';
        if (event.currentTarget.getAttribute('data-drop-position') !== pos) {
          event.currentTarget.setAttribute('data-drop-position', pos);
        }
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          event.currentTarget.removeAttribute('data-drop-position');
        }
      }}
      onDrop={(event) => {
        event.preventDefault();
        const pos = event.currentTarget.getAttribute('data-drop-position') || 'bottom';
        event.currentTarget.removeAttribute('data-drop-position');
        const sourceSymbol = event.dataTransfer.getData('text/plain');
        onRowDrop?.(event, sourceSymbol, row.requestSymbol, pos);
      }}
      onDragEnd={(event) => {
        event.target?.removeAttribute?.('data-dragging');
        document.querySelectorAll('[data-drop-position]').forEach((el) => el.removeAttribute('data-drop-position'));
        document.querySelectorAll('[data-drop-over]').forEach((el) => el.removeAttribute('data-drop-over'));
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(row.requestSymbol);
        }
      }}
      onClick={() => onSelect(row.requestSymbol)}
      role="button"
      tabIndex={0}
    >
      <span className={`flex items-center gap-2 min-w-0 ${!isSearchResult ? 'pointer-events-none' : ''}`}>
        {isSearchResult && (
          <button
            type="button"
            className={`inline-flex items-center justify-center w-[22px] h-[22px] rounded border border-[#d1d5db] dark:border-[#383838] bg-transparent text-[#6b7280] dark:text-[#a1a1aa] cursor-pointer p-0 mr-1.5 transition-all duration-150 shrink-0 pointer-events-auto hover:bg-[#2563eb] hover:border-[#2563eb] hover:text-white ${
              inWatchlist ? 'text-[#10b981] border-[#10b981] hover:bg-[#ef4444] hover:border-[#ef4444] hover:text-white' : ''
            }`}
            title={inWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
            onClick={(e) => {
              e.stopPropagation();
              if (inWatchlist) {
                if (onRemoveSymbol) onRemoveSymbol(row.requestSymbol);
              } else {
                if (onAddSymbol) onAddSymbol(row.requestSymbol);
              }
            }}
          >
            {inWatchlist ? <CheckCircle2 size={14} aria-hidden="true" /> : <Plus size={14} aria-hidden="true" />}
          </button>
        )}
        <SymbolWithIcon symbol={row.symbol} size="md" showLabel={false} />
        <span className="flex flex-col min-w-0">
          <span className="inline-flex items-center gap-1.5">
            <strong className="text-[var(--text-primary)] text-xs font-semibold leading-[1.12] overflow-hidden text-ellipsis whitespace-nowrap">{row.symbol}</strong>
            {row.section === 'Crypto' && (
              <span className="inline-block text-[10px] font-medium tracking-[0.2px] leading-none text-[#10b981] opacity-75 select-none">
                Crypto
              </span>
            )}
          </span>
        </span>
      </span>
      <span className={`inline-flex items-center justify-end min-w-0 h-[18px] overflow-hidden text-[10.5px] tabular-nums font-[650] leading-[18px] text-ellipsis whitespace-nowrap pointer-events-none ${
        signalUp ? 'text-[var(--bull-candle,#089981)]' : 'text-[var(--bear-candle,#f23645)]'
      }`}>
        {todayChangeText}
      </span>
      <span className={`overflow-hidden border-0 rounded-[3px] text-[10.5px] tabular-nums font-[650] leading-[18px] text-ellipsis whitespace-nowrap px-1 text-right pointer-events-none ${
        livePriceUp
          ? 'bg-[var(--bull-candle,#089981)] text-white shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--bull-candle,#089981)_38%,transparent)]'
          : 'bg-[var(--bear-candle,#f23645)] text-white shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--bear-candle,#f23645)_42%,transparent)]'
      }`}>
        {quote?.bidText || '-'}
      </span>
      <span className={`overflow-hidden border-0 rounded-[3px] text-[10.5px] tabular-nums font-[650] leading-[18px] text-ellipsis whitespace-nowrap px-1 text-right pointer-events-none ${
        livePriceUp
          ? 'bg-[var(--bull-candle,#089981)] text-white shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--bull-candle,#089981)_38%,transparent)]'
          : 'bg-[var(--bear-candle,#f23645)] text-white shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--bear-candle,#f23645)_42%,transparent)]'
      }`}>
        {quote?.askText || '-'}
      </span>
    </div>
  );
}

export default React.memo(WatchlistRow);
