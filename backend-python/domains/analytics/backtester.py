from typing import Dict, Any, List
import polars as pl
from domains.analytics.metrics import calculate_returns_metrics

class Backtester:
    def __init__(self, initial_capital: float = 10000.0, commission: float = 0.001):
        self.initial_capital = initial_capital
        self.commission = commission

    def run(self, df: pl.DataFrame, signal_col: str = "signal", price_col: str = "close") -> Dict[str, Any]:
        equity = [self.initial_capital]
        current_pos = 0.0
        trades: List[Dict[str, Any]] = []
        prices = df[price_col].to_list()
        signals = df[signal_col].to_list()
        capital = self.initial_capital

        for i in range(1, len(prices)):
            prev_sig = signals[i - 1]
            price = prices[i]
            if prev_sig == 1 and current_pos <= 0:
                current_pos = (capital * (1.0 - self.commission)) / price
                capital = 0.0
                trades.append({"type": "BUY", "price": price, "idx": i})
            elif prev_sig == -1 and current_pos > 0:
                capital = current_pos * price * (1.0 - self.commission)
                current_pos = 0.0
                trades.append({"type": "SELL", "price": price, "idx": i})
            cur_equity = capital + (current_pos * price)
            equity.append(cur_equity)

        equity_series = pl.Series("equity", equity)
        metrics = calculate_returns_metrics(equity_series)
        metrics["trades_count"] = len(trades)
        metrics["final_equity"] = equity[-1]
        return metrics
