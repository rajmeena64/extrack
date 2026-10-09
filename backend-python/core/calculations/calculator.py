def calculate_trade_pnl(
    entry_p: float,
    exit_p: float | None,
    qty: float,
    mult: float,
    side: str,
    charges: float,
    category: str,
    conversion_rate: float = 1.0,
    gross_pnl: float | None = None,
    net_pnl: float | None = None,
    pct_change: float | None = None,
    status: str | None = None,
) -> tuple[float | None, float | None, float]:
    s = str(side).lower().strip()
    if s not in ("long", "short"):
        raise ValueError(f"Invalid side: '{side}'. Allowed sides: 'long'/'short'")
    if net_pnl is not None:
        net = round(float(net_pnl), 2)
        gross = round(float(gross_pnl), 2) if (gross_pnl is not None and abs(round(float(gross_pnl) - abs(charges), 2) - net) < 0.05) else round(net + abs(charges), 2)
        pct = float(pct_change) if pct_change is not None else (round(((exit_p - entry_p) / entry_p) * (1 if s == "long" else -1) * 100.0, 2) if exit_p is not None and entry_p else 0.0)
        return gross, net, pct
    cat = str(category).lower().strip() if category else ""
    if not cat:
        raise ValueError("Trade category is required for PnL calculation")
    if cat in ("forex", "cfd", "forex_cfd"):
        return calculate_forex_pnl(entry_p, exit_p, qty, mult, s, charges, conversion_rate, pct_change)
    if cat in ("option", "options"):
        return calculate_options_pnl(entry_p, exit_p, qty, mult, s, charges, conversion_rate, pct_change, status)
    if cat in ("future", "futures"):
        return calculate_futures_pnl(entry_p, exit_p, qty, mult, s, charges, conversion_rate, pct_change)
    if cat in ("stock", "stocks", "equity", "equities", "crypto", "spot", "commodity", "etf", "bond"):
        return calculate_equities_pnl(entry_p, exit_p, qty, mult, s, charges, conversion_rate, pct_change)
    raise ValueError(f"Unsupported trade category: '{category}'")

def calculate_forex_pnl(entry_p: float, exit_p: float | None, lots: float, contract_size: float, side: str, charges: float, conversion_rate: float = 1.0, pct_change: float | None = None) -> tuple[float | None, float | None, float]:
    if exit_p is None or not entry_p:
        return None, None, 0.0
    s = str(side).lower().strip()
    if s not in ("long", "short"):
        raise ValueError(f"Invalid side: '{side}'. Allowed sides: 'long'/'short'")
    direction = 1 if s == "long" else -1
    gross = round((exit_p - entry_p) * direction * lots * contract_size * conversion_rate, 2)
    net = round(gross - abs(charges), 2)
    pct = float(pct_change) if pct_change is not None else round(((exit_p - entry_p) / entry_p) * direction * 100.0, 2)
    return gross, net, pct

def calculate_options_pnl(entry_p: float, exit_p: float | None, contracts: float, multiplier: float, side: str, charges: float, conversion_rate: float = 1.0, pct_change: float | None = None, status: str | None = None) -> tuple[float | None, float | None, float]:
    if exit_p is None and status == "expired":
        exit_p = 0.0
    if exit_p is None or not entry_p:
        return None, None, 0.0
    s = str(side).lower().strip()
    if s not in ("long", "short"):
        raise ValueError(f"Invalid side: '{side}'. Allowed sides: 'long'/'short'")
    direction = 1 if s == "long" else -1
    gross = round((exit_p - entry_p) * direction * contracts * multiplier * conversion_rate, 2)
    net = round(gross - abs(charges), 2)
    pct = float(pct_change) if pct_change is not None else round(((exit_p - entry_p) / entry_p) * direction * 100.0, 2)
    return gross, net, pct

def calculate_futures_pnl(entry_p: float, exit_p: float | None, contracts: float, point_value: float, side: str, charges: float, conversion_rate: float = 1.0, pct_change: float | None = None) -> tuple[float | None, float | None, float]:
    if exit_p is None or not entry_p:
        return None, None, 0.0
    s = str(side).lower().strip()
    if s not in ("long", "short"):
        raise ValueError(f"Invalid side: '{side}'. Allowed sides: 'long'/'short'")
    direction = 1 if s == "long" else -1
    gross = round((exit_p - entry_p) * direction * contracts * point_value * conversion_rate, 2)
    net = round(gross - abs(charges), 2)
    pct = float(pct_change) if pct_change is not None else round(((exit_p - entry_p) / entry_p) * direction * 100.0, 2)
    return gross, net, pct

def calculate_equities_pnl(entry_p: float, exit_p: float | None, shares: float, multiplier: float, side: str, charges: float, conversion_rate: float = 1.0, pct_change: float | None = None) -> tuple[float | None, float | None, float]:
    if exit_p is None or not entry_p:
        return None, None, 0.0
    s = str(side).lower().strip()
    if s not in ("long", "short"):
        raise ValueError(f"Invalid side: '{side}'. Allowed sides: 'long'/'short'")
    direction = 1 if s == "long" else -1
    gross = round((exit_p - entry_p) * direction * shares * multiplier * conversion_rate, 2)
    net = round(gross - abs(charges), 2)
    pct = float(pct_change) if pct_change is not None else round(((exit_p - entry_p) / entry_p) * direction * 100.0, 2)
    return gross, net, pct
