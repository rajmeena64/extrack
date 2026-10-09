import asyncpg

async def fetch_dashboard_trades(pool: asyncpg.Pool, user_id: int, trade_mode: str | None = None, from_date: str | None = None, to_date: str | None = None) -> list[dict]:
    params, conds = [user_id], ["trade.user_id = $1", "NOT EXISTS (SELECT 1 FROM broker_connections.user_broker_connections r WHERE r.id = trade.broker_connection_id AND r.user_id = trade.user_id AND r.deleted_at IS NOT NULL)"]
    if trade_mode == "api": conds.append("trade.source = 'sync'")
    elif trade_mode == "manual": conds.append("trade.source IN ('manual', 'file')")
    if from_date:
        params.append(from_date)
        conds.append(f"COALESCE(trade.exit_timestamp, trade.entry_timestamp) >= CAST(${len(params)} AS text)::timestamptz")
    if to_date:
        to_d = str(to_date).replace("T00:00:00", "T23:59:59.999") if "T00:00:00" in str(to_date) else str(to_date)
        params.append(to_d)
        conds.append(f"COALESCE(trade.exit_timestamp, trade.entry_timestamp) <= CAST(${len(params)} AS text)::timestamptz")
    sql = f"""SELECT trade.id, COALESCE(trade.unique_id, CAST(trade.id AS TEXT)) AS unique_id, trade.symbol, trade.side, trade.category, trade.product_type, trade.source, trade.quantity, trade.quantity_unit, trade.entry_price, trade.exit_price, trade.gross_pnl, trade.net_pnl, trade.total_charges, trade.charges, trade.pnl_currency, trade.status, trade.close_reason, trade.percent_change, trade.stop_loss, trade.take_profit, trade.strategy, trade.notes, trade.custom_fields, trade.entry_timestamp, trade.exit_timestamp, COALESCE(trade.exit_timestamp, trade.entry_timestamp) AS display_timestamp FROM trading.trades trade WHERE {' AND '.join(conds)} ORDER BY COALESCE(trade.exit_timestamp, trade.entry_timestamp) DESC"""
    rows = await pool.fetch(sql, *params)
    return [dict(r) for r in rows]

async def fetch_calendar_trades(pool: asyncpg.Pool, user_id: int, trade_mode: str | None = None, days_limit: int = 365) -> list[dict]:
    params = [user_id, str(days_limit)]
    conditions = [
        "trade.user_id = $1",
        "COALESCE(trade.status, 'closed') != 'open'",
        "COALESCE(trade.exit_timestamp, trade.entry_timestamp) >= NOW() - ($2 || ' days')::interval",
        "NOT EXISTS (SELECT 1 FROM broker_connections.user_broker_connections r WHERE r.id = trade.broker_connection_id AND r.user_id = trade.user_id AND r.deleted_at IS NOT NULL)"
    ]
    if trade_mode == "api": conditions.append("trade.source = 'sync'")
    sql = f"""SELECT COALESCE(trade.exit_timestamp, trade.entry_timestamp)::date AS trade_date, COALESCE(trade.net_pnl, trade.gross_pnl, 0) AS pnl, trade.pnl_currency, (CASE WHEN (trade.notes IS NOT NULL AND trade.notes != '') OR (trade.strategy IS NOT NULL AND trade.strategy != '') THEN true ELSE false END) AS has_badge, j.is_breakeven FROM trading.trades trade LEFT JOIN trading.journal_entries j ON j.user_id = trade.user_id AND j.journal_date = COALESCE(trade.exit_timestamp, trade.entry_timestamp)::date WHERE {' AND '.join(conditions)} ORDER BY trade_date ASC"""
    rows = await pool.fetch(sql, *params)
    return [dict(r) for r in rows]
