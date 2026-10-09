import polars as pl
from core.calculations.stats import compute_stats, compute_radar

def build_performance_and_activity(day_map: dict[str, float], activity_limit: int = 30) -> tuple[list[dict], list[dict]]:
    if not day_map:
        return [], []
    df = pl.DataFrame([{"date": d, "pnl": round(p, 2)} for d, p in day_map.items()]).sort("date")
    df = df.with_columns(cumulativePnL=pl.col("pnl").cum_sum().round(2))
    return df.to_dicts(), df.tail(activity_limit).select(["date", "pnl"]).to_dicts()

def build_calendar_breakdown(calendar_rows: list[dict]) -> list[dict]:
    if not calendar_rows:
        return []
    df = pl.DataFrame(calendar_rows)
    grouped = (
        df.group_by("trade_date")
        .agg(
            pnl=pl.col("pnl").sum().round(2),
            trades=pl.len(),
            wins=(pl.col("pnl") > 0).sum(),
            hasBadge=pl.col("has_badge").any(),
            isBreakeven=pl.col("is_breakeven").any()
        )
        .sort("trade_date")
    )
    grouped = grouped.with_columns(
        dateKey=pl.col("trade_date").cast(pl.Utf8),
        winRate=(pl.col("wins") / pl.col("trades") * 100.0).round(1)
    )
    return grouped.select(["dateKey", "pnl", "trades", "wins", "winRate", "hasBadge", "isBreakeven"]).to_dicts()

def build_dashboard_analytics(trades: list[dict], calendar_rows: list[dict], target_currency: str = "USD") -> dict:
    stats = compute_stats(trades)
    radar = compute_radar(trades)
    day_map = stats.pop("dayMap", {})
    perf_chart, act_chart = build_performance_and_activity(day_map)
    calendar = build_calendar_breakdown(calendar_rows)
    recent_trades = trades[:12]
    return {
        "stats": stats,
        "performanceChart": perf_chart,
        "activityChart": act_chart,
        "radar": radar,
        "recentTrades": recent_trades,
        "calendar": calendar,
        "currency": target_currency
    }
