from typing import Any
import asyncpg
from domains.trading.reads import fetch_user_trades, find_trade_by_id

def _fmt_trade(t: dict) -> dict[str, Any]:
    cf = t.get("custom_fields") if isinstance(t.get("custom_fields"), dict) else {}
    return {
        "id": str(t["unique_id"] if t.get("unique_id") is not None else t.get("id")),
        "symbol": t.get("symbol"),
        "side": t.get("side"),
        "quantity": float(t["quantity"]) if t.get("quantity") is not None else 0.0,
        "entry_price": float(t["entry_price"]) if t.get("entry_price") is not None else None,
        "exit_price": float(t["exit_price"]) if t.get("exit_price") is not None else None,
        "net_pnl": float(t["net_pnl"]) if t.get("net_pnl") is not None else (float(t["gross_pnl"]) if t.get("gross_pnl") is not None else None),
        "currency": t.get("pnl_currency"),
        "roi_pct": float(t["percent_change"]) if t.get("percent_change") is not None else None,
        "entry_time": str(t["entry_timestamp"]) if t.get("entry_timestamp") is not None else "",
        "exit_time": str(t["exit_timestamp"]) if t.get("exit_timestamp") is not None else None,
        "status": t.get("status"),
        "stop_loss": float(t["stop_loss"]) if t.get("stop_loss") is not None else None,
        "take_profit": float(t["take_profit"]) if t.get("take_profit") is not None else None,
        "strategy": t.get("strategy"),
        "notes": t.get("notes"),
        "mistakes": cf.get("mistakes"),
    }

async def get_my_trades(pool: asyncpg.Pool, user_id: int, symbol: str | None = None, from_date: str | None = None, to_date: str | None = None, win_only: bool = False, loss_only: bool = False, side: str | None = None, limit: int = 20) -> list[dict[str, Any]]:
    res = await fetch_user_trades(pool, user_id, symbol=symbol, from_date=from_date, to_date=to_date, win_trades=win_only, loss_trades=loss_only, side=side, limit=limit)
    trades_list = res.get("trades") if isinstance(res.get("trades"), list) else []
    return [_fmt_trade(t) for t in trades_list]

async def get_performance_metrics(pool: asyncpg.Pool, user_id: int, days: int = 30) -> dict[str, Any]:
    safe_days = max(1, min(3650, int(days))) if days is not None else 30
    sql = """
        SELECT
            COUNT(*)::int AS total_trades,
            COALESCE(SUM(CASE WHEN COALESCE(net_pnl, gross_pnl, 0) > 0 THEN 1 ELSE 0 END), 0)::int AS winning_trades,
            COALESCE(SUM(CASE WHEN COALESCE(net_pnl, gross_pnl, 0) < 0 THEN 1 ELSE 0 END), 0)::int AS losing_trades,
            COALESCE(SUM(COALESCE(net_pnl, gross_pnl, 0)), 0)::numeric AS total_net_pnl,
            COALESCE(MAX(COALESCE(net_pnl, gross_pnl, 0)), 0)::numeric AS best_trade_pnl,
            COALESCE(MIN(COALESCE(net_pnl, gross_pnl, 0)), 0)::numeric AS worst_trade_pnl,
            COALESCE(SUM(CASE WHEN COALESCE(net_pnl, gross_pnl, 0) > 0 THEN COALESCE(net_pnl, gross_pnl, 0) ELSE 0 END), 0)::numeric AS gross_profit,
            COALESCE(ABS(SUM(CASE WHEN COALESCE(net_pnl, gross_pnl, 0) < 0 THEN COALESCE(net_pnl, gross_pnl, 0) ELSE 0 END)), 0)::numeric AS gross_loss
        FROM trading.trades
        WHERE user_id = $1
          AND COALESCE(exit_timestamp, entry_timestamp) >= NOW() - ($2 || ' days')::interval
          AND NOT EXISTS (
              SELECT 1 FROM broker_connections.user_broker_connections r
              WHERE r.id = broker_connection_id AND r.user_id = $1 AND r.deleted_at IS NOT NULL
          )
    """
    row = await pool.fetchrow(sql, user_id, str(safe_days))
    if not row:
        return {"days": days, "total_trades": 0, "winning_trades": 0, "losing_trades": 0, "win_rate_pct": 0.0, "total_net_pnl": 0.0, "profit_factor": 0.0}
    total, wins = row["total_trades"], row["winning_trades"]
    gp = float(row["gross_profit"]) if row.get("gross_profit") is not None else 0.0
    gl = float(row["gross_loss"]) if row.get("gross_loss") is not None else 0.0
    pf = round(gp / gl, 2) if gl > 0 else (round(gp, 2) if gp > 0 else 0.0)
    wr = round((wins / total) * 100, 2) if total > 0 else 0.0
    return {
        "days": days,
        "total_trades": total,
        "winning_trades": wins,
        "losing_trades": row["losing_trades"],
        "win_rate_pct": wr,
        "total_net_pnl": float(row["total_net_pnl"]) if row.get("total_net_pnl") is not None else 0.0,
        "profit_factor": pf,
        "best_trade_pnl": float(row["best_trade_pnl"]) if row.get("best_trade_pnl") is not None else 0.0,
        "worst_trade_pnl": float(row["worst_trade_pnl"]) if row.get("worst_trade_pnl") is not None else 0.0,
    }

async def get_trade_details(pool: asyncpg.Pool, user_id: int, trade_id: str) -> dict[str, Any] | None:
    t = await find_trade_by_id(pool, user_id, trade_id)
    return _fmt_trade(t) if t else None

async def get_journal_entries(pool: asyncpg.Pool, user_id: int, from_date: str | None = None, to_date: str | None = None) -> list[dict[str, Any]]:
    conds, params = ["user_id = $1"], [user_id]
    if from_date and str(from_date).strip():
        params.append(str(from_date).strip())
        conds.append(f"journal_date >= CAST(${len(params)} AS text)::date")
    if to_date and str(to_date).strip():
        params.append(str(to_date).strip())
        conds.append(f"journal_date <= CAST(${len(params)} AS text)::date")
    sql = f"SELECT journal_date, is_breakeven, content, created_at, updated_at FROM trading.journal_entries WHERE {' AND '.join(conds)} ORDER BY journal_date DESC LIMIT 30"
    rows = await pool.fetch(sql, *params)
    return [dict(r) for r in rows]
