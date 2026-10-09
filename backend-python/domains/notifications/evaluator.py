from typing import Dict, Any, Optional

def evaluate_alert_condition(
    condition: str,
    target_price: float,
    current_price: float,
    previous_price: Optional[float] = None
) -> bool:
    if not current_price or current_price <= 0 or not target_price or target_price <= 0:
        return False
    cond = str(condition or "ABOVE").upper()
    if cond in ("ABOVE", "RSI_ABOVE", "PRICE_ABOVE"):
        return current_price >= target_price
    if cond in ("BELOW", "RSI_BELOW", "PRICE_BELOW"):
        return current_price <= target_price
    if cond == "CROSS_UP" and previous_price:
        return previous_price < target_price and current_price >= target_price
    if cond == "CROSS_DOWN" and previous_price:
        return previous_price > target_price and current_price <= target_price
    return current_price >= target_price if cond == "ABOVE" else current_price <= target_price
