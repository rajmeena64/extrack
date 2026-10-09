from domains.instruments.registry import find_by_symbol

def calculate_gross_pnl(entry_price: float, exit_price: float | None, lots: float, side_or_mult: str | float = "long", contract_size: float = 1.0, conversion_rate: float = 1.0, multiplier: float | None = None) -> float | None:
    if exit_price is None or not entry_price:
        return None
    if isinstance(side_or_mult, str):
        side = side_or_mult
        mult = float(multiplier if multiplier is not None else contract_size)
    else:
        mult = float(side_or_mult)
        side = str(contract_size)
    s = side.lower().strip()
    if s not in ("long", "short"):
        raise ValueError(f"Invalid side: '{side}'. Allowed sides: 'long'/'short'")
    direction = 1 if s == "long" else -1
    return round((float(exit_price) - float(entry_price)) * direction * float(lots) * mult * float(conversion_rate), 2)

def calculate_net_pnl(gross_pnl: float | None, total_charges: float) -> float | None:
    return round(float(gross_pnl) - abs(float(total_charges)), 2) if gross_pnl is not None else None

def calculate_percent_change(entry_price: float, exit_price: float, side: str = "long") -> float:
    if not entry_price:
        return 0.0
    s = side.lower().strip()
    if s not in ("long", "short"):
        raise ValueError(f"Invalid side: '{side}'. Allowed sides: 'long'/'short'")
    direction = 1 if s == "long" else -1
    return round(((float(exit_price) - float(entry_price)) / float(entry_price)) * direction * 100.0, 2)

def calculate_adjusted_cost(quantity: float, entry_price: float, multiplier: float = 1.0) -> float:
    return round(float(quantity) * float(entry_price) * float(multiplier), 2)

def calculate_adjusted_proceeds(quantity: float, exit_price: float, multiplier: float = 1.0) -> float:
    return round(float(quantity) * float(exit_price) * float(multiplier), 2)

def calculate_net_roi(net_pnl: float, cost: float) -> float:
    return round((float(net_pnl) / float(cost)) * 100.0, 2) if cost else 0.0

def calculate_trade_risk(entry_price: float, stop_loss: float, quantity: float, multiplier: float = 1.0) -> float:
    return round(abs(float(entry_price) - float(stop_loss)) * float(quantity) * float(multiplier), 2)

def calculate_initial_target(entry_price: float, take_profit: float, quantity: float, multiplier: float = 1.0) -> float:
    return round(abs(float(take_profit) - float(entry_price)) * float(quantity) * float(multiplier), 2)

def calculate_planned_r_multiple(risk: float, target: float) -> float:
    return round(float(target) / float(risk), 2) if risk else 0.0

def calculate_realized_r_multiple(net_pnl: float, risk: float) -> float:
    return round(float(net_pnl) / float(risk), 2) if risk else 0.0

def calculate_breakeven_price(entry_price: float, charges: float, quantity: float, side: str = "long", multiplier: float = 1.0) -> float:
    s = side.lower().strip()
    if s not in ("long", "short"):
        raise ValueError(f"Invalid side: '{side}'. Allowed sides: 'long'/'short'")
    denom = float(quantity) * float(multiplier)
    if not denom:
        return float(entry_price)
    offset = abs(float(charges)) / denom
    return round(float(entry_price) + offset if s == "long" else float(entry_price) - offset, 4)

def is_forex_jpy_pair(symbol: str) -> bool:
    inst = find_by_symbol(symbol, "forex")
    return bool(inst and inst.get("profitCurrency") == "JPY")

def get_forex_pip_size(symbol: str) -> float:
    inst = find_by_symbol(symbol, "forex")
    if inst and inst.get("pipSize"):
        return float(inst["pipSize"])
    return 0.0001

def calculate_forex_pips(entry_price: float, exit_price: float, symbol: str, side: str = "long") -> float:
    s = side.lower().strip()
    if s not in ("long", "short"):
        raise ValueError(f"Invalid side: '{side}'. Allowed sides: 'long'/'short'")
    pip_size = get_forex_pip_size(symbol)
    direction = 1 if s == "long" else -1
    return round((float(exit_price) - float(entry_price)) * direction / pip_size, 1)

def resolve_multiplier(symbol: str, product_type: str | None = None, trade: dict | None = None) -> float:
    t = trade if trade else {}
    m = t.get("contract_multiplier") if t.get("contract_multiplier") is not None else t.get("multiplier")
    if m is not None:
        return float(m)
    inst = find_by_symbol(symbol, product_type)
    if inst and inst.get("contractSize"):
        return float(inst["contractSize"])
    return 1.0

def calculate_win_rate(wins: int, total: int) -> float:
    return round((wins / total * 100.0), 2) if total else 0.0

def calculate_profit_factor(gross_profit: float, gross_loss: float) -> float:
    return round((gross_profit / gross_loss), 2) if gross_loss > 0 else (round(gross_profit, 2) if gross_profit > 0 else 0.0)

def calculate_win_loss_ratio(avg_win: float, avg_loss: float) -> float:
    return round((avg_win / avg_loss), 2) if avg_loss > 0 else 0.0

def calculate_expectancy(win_rate: float, avg_win: float, avg_loss: float) -> float:
    loss_rate = 100.0 - win_rate
    return round(((win_rate / 100.0) * avg_win) - ((loss_rate / 100.0) * avg_loss), 2)
