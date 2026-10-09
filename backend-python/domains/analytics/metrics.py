import numpy as np
import polars as pl
from typing import Dict, Any

def calculate_returns_metrics(equity_curve: pl.Series) -> Dict[str, Any]:
    arr = equity_curve.to_numpy()
    if len(arr) < 2:
        return {"total_return": 0.0, "max_drawdown": 0.0, "sharpe_ratio": 0.0}
    d = arr[:-1]
    returns = np.divide(np.diff(arr), d, out=np.zeros_like(d, dtype=float), where=d != 0)
    total_return = float((arr[-1] - arr[0]) / arr[0]) if arr[0] != 0 else 0.0
    cum_max = np.maximum.accumulate(arr)
    drawdowns = np.divide(cum_max - arr, cum_max, out=np.zeros_like(arr, dtype=float), where=cum_max > 0)
    max_dd = float(np.max(drawdowns)) if len(drawdowns) > 0 else 0.0
    mean_ret = np.mean(returns)
    std_ret = np.std(returns)
    sharpe = float(np.sqrt(252) * (mean_ret / std_ret)) if std_ret > 0 else 0.0
    return {
        "total_return": total_return,
        "max_drawdown": max_dd,
        "sharpe_ratio": sharpe,
    }
