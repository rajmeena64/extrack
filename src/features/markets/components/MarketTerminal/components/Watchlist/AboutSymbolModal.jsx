import React from 'react';
import { Info, X } from '@/icons/lucideIcons';
import SymbolWithIcon from '@/components/Common/SymbolWithIcon/SymbolWithIcon';
import {
  classifySymbol,
  getDisplaySymbol,
  getRequestSymbol,
  getSymbolSubtitle,
  hasUsableQuote,
  normalizeStreamSymbol,
} from '../../utils/terminalHelpers';

export default function AboutSymbolModal({
  isOpen,
  onClose,
  symbolValue,
  availableSymbols = [],
  quotes = {},
}) {
  if (!isOpen || !symbolValue) return null;

  const normalized = normalizeStreamSymbol(symbolValue);
  const rawItem = availableSymbols.find((item) => (
    normalizeStreamSymbol(getRequestSymbol(item)) === normalized ||
    normalizeStreamSymbol(getDisplaySymbol(item)) === normalized
  ));

  const displaySymbol = rawItem ? getDisplaySymbol(rawItem) : String(symbolValue).toUpperCase();
  const requestSymbol = rawItem ? getRequestSymbol(rawItem) : normalized;
  const subtitle = getSymbolSubtitle(rawItem, displaySymbol);
  const category = classifySymbol(displaySymbol, rawItem);
  const quote = quotes[requestSymbol] || quotes[displaySymbol] || null;

  const baseCurrency = rawItem?.baseAsset || '-';
  const quoteCurrency = rawItem?.quoteAsset || '-';
  const contractSize = rawItem?.contractSize ?? null;
  const contractUnit = rawItem?.contractUnit ?? '';
  const digits = rawItem?.digits ?? '-';
  const minMove = rawItem?.tickSize ?? quote?.tickSize ?? '-';

  const hasQuoteData = hasUsableQuote(quote);
  const bidText = quote?.bidText || '-';
  const askText = quote?.askText || '-';
  const spreadText = quote?.spreadText || (quote?.ask && quote?.bid && digits !== '-' ? (quote.ask - quote.bid).toFixed(digits) : '-');
  const changeText = quote?.todayChangePercentText || '0.00%';
  const isUp = quote?.todayDirection !== 'down';

  return (
    <div className="fixed inset-0 z-[9999] bg-black/45 flex items-center justify-center backdrop-blur-xs" onClick={onClose}>
      <div className="w-[440px] max-w-[92vw] flex flex-col bg-[var(--bg-card)] border border-[var(--border-light)] rounded-lg shadow-[0_16px_40px_var(--shadow-medium)] overflow-hidden text-[var(--text-primary)] animate-in fade-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-[var(--border-light)]">
          <div className="flex items-center gap-2 font-bold text-sm text-[var(--text-primary)]">
            <Info size={16} aria-hidden="true" />
            <span>About Instrument</span>
          </div>
          <button
            type="button"
            className="flex items-center justify-center w-7 h-7 border-0 rounded bg-transparent text-[var(--text-muted)] cursor-pointer hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)] transition-colors"
            onClick={onClose}
            aria-label="Close about symbol modal"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="flex items-center gap-3 px-5 py-4 bg-[var(--surface-subtle)] border-b border-[var(--border-light)]">
          <SymbolWithIcon symbol={displaySymbol} size="lg" showLabel={false} />
          <div className="flex flex-col gap-[3px] min-w-0">
            <div className="flex items-center gap-2">
              <strong className="text-base font-bold text-[var(--text-primary)]">{displaySymbol}</strong>
              <span className="text-[10px] font-bold px-[7px] py-0.5 rounded bg-[var(--button-bg)] text-[var(--button-text)] uppercase">{category}</span>
            </div>
            <p className="text-xs text-[var(--text-muted)] m-0">{subtitle}</p>
          </div>
        </div>

        <div className="px-5 py-4 flex flex-col max-h-[380px] overflow-y-auto">
          <div className="flex flex-col rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-light)] overflow-hidden">
            <div className="flex items-center justify-between px-3.5 py-[9px] border-b border-[var(--border-light)] text-[12.5px]">
              <span className="text-[var(--text-secondary)] font-medium">Ticker / Symbol</span>
              <span className="text-[var(--text-primary)] font-semibold tabular-nums">{displaySymbol}</span>
            </div>
            <div className="flex items-center justify-between px-3.5 py-[9px] border-b border-[var(--border-light)] text-[12.5px]">
              <span className="text-[var(--text-secondary)] font-medium">Category</span>
              <span className="text-[var(--text-primary)] font-semibold tabular-nums">{category}</span>
            </div>
            <div className="flex items-center justify-between px-3.5 py-[9px] border-b border-[var(--border-light)] text-[12.5px]">
              <span className="text-[var(--text-secondary)] font-medium">Base Currency</span>
              <span className="text-[var(--text-primary)] font-semibold tabular-nums">{baseCurrency}</span>
            </div>
            <div className="flex items-center justify-between px-3.5 py-[9px] border-b border-[var(--border-light)] text-[12.5px]">
              <span className="text-[var(--text-secondary)] font-medium">Quote Currency</span>
              <span className="text-[var(--text-primary)] font-semibold tabular-nums">{quoteCurrency}</span>
            </div>
            <div className="flex items-center justify-between px-3.5 py-[9px] border-b border-[var(--border-light)] text-[12.5px]">
              <span className="text-[var(--text-secondary)] font-medium">Digits (Precision)</span>
              <span className="text-[var(--text-primary)] font-semibold tabular-nums">{digits}</span>
            </div>
            <div className="flex items-center justify-between px-3.5 py-[9px] border-b border-[var(--border-light)] text-[12.5px]">
              <span className="text-[var(--text-secondary)] font-medium">Min Price Move</span>
              <span className="text-[var(--text-primary)] font-semibold tabular-nums">{minMove}</span>
            </div>
            {contractSize && (
              <div className="flex items-center justify-between px-3.5 py-[9px] border-b border-[var(--border-light)] text-[12.5px]">
                <span className="text-[var(--text-secondary)] font-medium">Contract Size</span>
                <span className="text-[var(--text-primary)] font-semibold tabular-nums">{contractSize} {contractUnit}</span>
              </div>
            )}
            <div className="flex items-center justify-between px-3.5 py-[9px] border-b border-[var(--border-light)] text-[12.5px]">
              <span className="text-[var(--text-secondary)] font-medium">Bid Price</span>
              <span className={`font-semibold tabular-nums ${hasQuoteData ? (isUp ? 'text-[var(--bull-candle,#089981)]' : 'text-[var(--bear-candle,#f23645)]') : 'text-[var(--text-primary)]'}`}>{bidText}</span>
            </div>
            <div className="flex items-center justify-between px-3.5 py-[9px] border-b border-[var(--border-light)] text-[12.5px]">
              <span className="text-[var(--text-secondary)] font-medium">Ask Price</span>
              <span className={`font-semibold tabular-nums ${hasQuoteData ? (isUp ? 'text-[var(--bull-candle,#089981)]' : 'text-[var(--bear-candle,#f23645)]') : 'text-[var(--text-primary)]'}`}>{askText}</span>
            </div>
            <div className="flex items-center justify-between px-3.5 py-[9px] border-b border-[var(--border-light)] text-[12.5px]">
              <span className="text-[var(--text-secondary)] font-medium">Spread</span>
              <span className="text-[var(--text-primary)] font-semibold tabular-nums">{spreadText}</span>
            </div>
            <div className="flex items-center justify-between px-3.5 py-[9px] border-b border-[var(--border-light)] text-[12.5px] last:border-b-0">
              <span className="text-[var(--text-secondary)] font-medium">24h Change</span>
              <span className={`font-semibold tabular-nums ${hasQuoteData ? (isUp ? 'text-[var(--bull-candle,#089981)]' : 'text-[var(--bear-candle,#f23645)]') : 'text-[var(--text-primary)]'}`}>{changeText}</span>
            </div>
          </div>
        </div>

        <div className="px-4 py-3 border-t border-[var(--border-light)] bg-[var(--bg-card)] flex justify-end">
          <button
            type="button"
            className="px-5 py-[7px] rounded-md border border-[var(--button-bg)] bg-[var(--button-bg)] text-[var(--button-text)] font-semibold text-[13px] cursor-pointer ml-auto hover:bg-[var(--button-bg-hover)] hover:border-[var(--button-bg-hover)] transition-all duration-150"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

