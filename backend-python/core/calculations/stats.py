from datetime import date as dt_date
from core.calculations.formulas import (
    calculate_win_rate, calculate_profit_factor,
    calculate_win_loss_ratio, calculate_expectancy
)

def compute_stats(trades: list[dict]) -> dict:
    total_trades = len(trades)
    if not total_trades:
        return {
            "totalPnL": 0.0, "winRate": 0.0, "winningTrades": 0, "losingTrades": 0,
            "totalTrades": 0, "winningDays": 0, "losingDays": 0, "totalTradingDays": 0,
            "dayWinRate": 0.0, "profitFactor": 0.0, "grossProfit": 0.0, "grossLoss": 0.0,
            "avgPnL": 0.0, "avgWin": 0.0, "avgLoss": 0.0, "winLossRatio": 0.0,
            "expectancy": 0.0, "maxDrawdown": 0.0, "dayMap": {}
        }
    total_pnl = 0.0
    winning_trades = 0
    losing_trades = 0
    gross_profit = 0.0
    gross_loss = 0.0
    day_map: dict[str, float] = {}
    for t in trades:
        p = float(t["pnl"]) if t.get("pnl") is not None else 0.0
        total_pnl += p
        if p > 0:
            winning_trades += 1
            gross_profit += p
        elif p < 0:
            losing_trades += 1
            gross_loss += abs(p)
        d = t.get("date")
        if d:
            day_map[str(d)] = day_map.get(str(d), 0.0) + p
    cum_pnl, peak, max_dd = 0.0, 0.0, 0.0
    for t in reversed(trades):
        cum_pnl += float(t["pnl"]) if t.get("pnl") is not None else 0.0
        if cum_pnl > peak:
            peak = cum_pnl
        dd = peak - cum_pnl
        if dd > max_dd:
            max_dd = dd
    winning_days = sum(1 for p in day_map.values() if p > 0)
    losing_days = sum(1 for p in day_map.values() if p < 0)
    total_trading_days = winning_days + losing_days
    win_rate = calculate_win_rate(winning_trades, total_trades)
    day_win_rate = calculate_win_rate(winning_days, total_trading_days)
    profit_factor = calculate_profit_factor(gross_profit, gross_loss)
    avg_win = round(gross_profit / winning_trades, 2) if winning_trades else 0.0
    avg_loss = round(gross_loss / losing_trades, 2) if losing_trades else 0.0
    win_loss_ratio = calculate_win_loss_ratio(avg_win, avg_loss)
    expectancy = calculate_expectancy(win_rate, avg_win, avg_loss)
    return {
        "totalPnL": round(total_pnl, 2),
        "winRate": win_rate,
        "winningTrades": winning_trades,
        "losingTrades": losing_trades,
        "totalTrades": total_trades,
        "winningDays": winning_days,
        "losingDays": losing_days,
        "totalTradingDays": total_trading_days,
        "dayWinRate": day_win_rate,
        "profitFactor": profit_factor,
        "grossProfit": round(gross_profit, 2),
        "grossLoss": round(gross_loss, 2),
        "avgPnL": round(total_pnl / total_trades, 2),
        "avgWin": avg_win,
        "avgLoss": avg_loss,
        "winLossRatio": win_loss_ratio,
        "expectancy": expectancy,
        "maxDrawdown": round(max_dd, 2),
        "dayMap": day_map
    }

def compute_radar(trades: list[dict]) -> dict:
    if not trades:
        return {"win": 0, "profit": 0, "avg": 0, "recovery": 0, "drawdown": 0, "consistency": 0, "overallScore": 0}
    pnls = [float(t["pnl"]) if t.get("pnl") is not None else 0.0 for t in trades]
    winners = [p for p in pnls if p > 0]
    losers = [p for p in pnls if p < 0]
    gross_profit = sum(winners)
    gross_loss = abs(sum(losers))
    raw_pf = (gross_profit / gross_loss) if gross_loss > 0 else (3.0 if gross_profit > 0 else 0.0)
    profit_score = min((raw_pf / 3.0) * 100.0, 100.0)
    avg_win = (gross_profit / len(winners)) if winners else 0.0
    avg_loss = (gross_loss / len(losers)) if losers else 1.0
    avg_ratio = min(((avg_win / (avg_loss if avg_loss else 1.0)) / 2.0) * 100.0, 100.0)
    running, peak, max_dd = 0.0, 0.0, 0.0
    for p in pnls:
        running += p
        if running > peak:
            peak = running
        dd = peak - running
        if dd > max_dd:
            max_dd = dd
    net_pnl = sum(pnls)
    raw_rf = (net_pnl / max_dd) if max_dd > 0 else (3.0 if net_pnl > 0 else 0.0)
    recovery_score = min(max((raw_rf / 3.0) * 100.0, 0.0), 100.0)
    drawdown_score = max(100.0 - ((max_dd / peak) * 100.0 if peak > 0 else 0.0), 0.0)
    week_map: dict[str, float] = {}
    for t in trades:
        # fallback-allow: Trade date payload compatibility
        d = str(t.get("date") or t.get("trade_date") or "")
        if len(d) >= 10:
            try:
                year, week, _ = dt_date.fromisoformat(d[:10]).isocalendar()
                wk_key = f"{year}-W{week}"
                week_map[wk_key] = week_map.get(wk_key, 0.0) + (float(t["pnl"]) if t.get("pnl") is not None else 0.0)
            except Exception:
                pass
    weeks = list(week_map.values())
    consistency = (sum(1 for w in weeks if w > 0) / len(weeks) * 100.0) if weeks else (len(winners) / len(pnls) * 100.0)
    win = round(len(winners) / len(pnls) * 100.0)
    profit = round(profit_score)
    avg = round(avg_ratio)
    rec = round(recovery_score)
    dd = round(drawdown_score)
    cons = round(consistency)
    overall = round(win * 0.20 + profit * 0.25 + avg * 0.15 + rec * 0.15 + dd * 0.15 + cons * 0.10)
    return {"win": win, "profit": profit, "avg": avg, "recovery": rec, "drawdown": dd, "consistency": cons, "overallScore": overall}
