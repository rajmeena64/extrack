import { ChevronDown } from 'lucide-react';
import { DASHBOARD_CURRENCIES, getCurrencyMeta, normalizeCurrencyCode } from '../../utils/user/Currency';
import { Button, Dropdown } from '@/components/ui';

export default function CurrencyFilterDropdown({
  currencyCode = 'USD',
  defaultCurrencyCode = 'USD',
  onCurrencyChange,
  isDimmed = false,
}) {
  const selectedCurrency = getCurrencyMeta(normalizeCurrencyCode(currencyCode));
  const defaultCurrency = getCurrencyMeta(normalizeCurrencyCode(defaultCurrencyCode));

  return (
    <div className={`relative z-[9001] ${isDimmed ? 'opacity-100' : ''}`}>
      <Dropdown.Root>
        <Button
          color="secondary"
          size="sm"
          className="min-h-[32px] px-2.5 py-1.5 text-[13px] font-semibold"
          aria-label={`Dashboard currency: ${selectedCurrency.label}`}
          title={`Dashboard currency: ${selectedCurrency.label}`}
          iconTrailing={<ChevronDown size={15} aria-hidden="true" />}
        >
          <span>
            {selectedCurrency.symbol}
          </span>
        </Button>

        <Dropdown.Popover placement="bottom start" className="w-56 p-1">
          <div className="px-3 py-1.5 text-xs text-[var(--text-secondary)] border-b border-[var(--border-light)] dark:border-[#242424] uppercase font-bold tracking-wider">
            Default currency: {defaultCurrency.code}
          </div>
          <Dropdown.Menu
            selectionMode="single"
            selectedKeys={new Set([selectedCurrency.code])}
            onAction={(key) => onCurrencyChange?.(String(key))}
          >
            {DASHBOARD_CURRENCIES.map((currency) => (
              <Dropdown.Item
                key={currency.code}
                id={currency.code}
                label={currency.code}
                avatarUrl={currency.flag}
                addon={currency.symbol}
                textValue={`${currency.code} ${currency.shortLabel}`}
              >
                {currency.code} ({currency.shortLabel})
              </Dropdown.Item>
            ))}
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown.Root>
    </div>
  );
}

