import time
import asyncpg

_opts_cache: dict[int, tuple[dict, float]] = {}

def invalidate_filter_options_cache(user_id: int):
    _opts_cache.pop(int(user_id), None)

async def fetch_user_trades(pool: asyncpg.Pool, user_id: int, **filters) -> dict:
    params = [user_id]
    conds = [
        "trade.user_id = $1",
        "NOT EXISTS (SELECT 1 FROM broker_connections.user_broker_connections r WHERE r.id = trade.broker_connection_id AND r.user_id = trade.user_id AND r.deleted_at IS NOT NULL)"
    ]
    def add(sql: str, val):
        if val is not None and val != "":
            params.append(val)
            conds.append(sql.replace("?", f"${len(params)}"))
    mode = filters.get("trade_mode")
    if mode == "api": conds.append("trade.source = 'sync'")
    elif mode == "manual": conds.append("trade.source IN ('manual', 'file')")
    add("trade.source = ?", filters.get("source"))
    add("COALESCE(trade.exit_timestamp, trade.entry_timestamp) >= CAST(? AS text)::timestamptz", filters.get("from_date"))
    to_d = str(filters["to_date"]) if filters.get("to_date") is not None else ""
    if to_d: add("COALESCE(trade.exit_timestamp, trade.entry_timestamp) <= CAST(? AS text)::timestamptz", to_d.replace("T00:00:00", "T23:59:59.999") if "T00:00:00" in to_d else to_d)
    sym = filters.get("symbol")
    if sym: add("trade.symbol ILIKE ?", f"%{sym.strip().upper()}%")
    side = filters.get("side")
    if side: add("trade.side = ?", "short" if str(side).lower() in ("short", "sell") else "long")
    add("trade.category = ?", filters.get("category"))
    add("trade.product_type = ?", filters.get("product_type"))
    add("trade.strategy = ?", filters.get("strategy"))
    add("COALESCE(trade.custom_fields->>'platform', '') ILIKE ?", filters.get("platform"))
    add("COALESCE(trade.custom_fields->>'setup', '') ILIKE ?", filters.get("setup"))
    add("COALESCE(trade.broker_connection_id::text, '') = ?", filters.get("account"))
    acc = filters.get("account_name")
    if acc: add("(SELECT connection.account_name FROM broker_connections.user_broker_connections connection WHERE connection.id = trade.broker_connection_id AND connection.user_id = trade.user_id LIMIT 1) ILIKE ?", f"%{acc.strip()}%")
    brk = filters.get("broker")
    if brk: add("(SELECT broker.name FROM broker_connections.user_broker_connections connection JOIN trading_catalog.broker_integrations integration ON integration.id = connection.integration_id JOIN trading_catalog.brokers broker ON broker.id = integration.broker_id WHERE connection.id = trade.broker_connection_id AND connection.user_id = trade.user_id LIMIT 1) ILIKE ?", f"%{brk.strip()}%")
    be = filters.get("breakeven")
    if be == "yes": conds.append("(SELECT j.is_breakeven FROM trading.journal_entries j WHERE j.user_id = trade.user_id AND j.journal_date = COALESCE(trade.exit_timestamp, trade.entry_timestamp)::date LIMIT 1) = true")
    elif be == "no": conds.append("COALESCE((SELECT j.is_breakeven FROM trading.journal_entries j WHERE j.user_id = trade.user_id AND j.journal_date = COALESCE(trade.exit_timestamp, trade.entry_timestamp)::date LIMIT 1), false) = false")
    if filters.get("win_trades"): conds.append("COALESCE(trade.net_pnl, trade.gross_pnl, 0) > 0")
    elif filters.get("loss_trades"): conds.append("COALESCE(trade.net_pnl, trade.gross_pnl, 0) < 0")
    if filters.get("has_stop_loss"): conds.append("trade.stop_loss IS NOT NULL AND trade.stop_loss > 0")
    if filters.get("has_take_profit"): conds.append("trade.take_profit IS NOT NULL AND trade.take_profit > 0")
    if filters.get("has_notes"): conds.append("trade.notes IS NOT NULL AND trade.notes != ''")
    if filters.get("has_mistakes"): conds.append("trade.custom_fields ? 'mistakes' AND trade.custom_fields->>'mistakes' != ''")
    rat = filters.get("rating")
    if rat is not None and rat != "": add("COALESCE((SELECT j.execution_score FROM trading.journal_entries j WHERE j.user_id = trade.user_id AND j.trade_id = trade.id LIMIT 1), (trade.custom_fields->>'trade_rating')::numeric, 0) = ?", float(rat))
    min_pnl = filters.get("min_pnl")
    if min_pnl is not None and min_pnl != "": add("COALESCE(trade.net_pnl, trade.gross_pnl, 0) >= ?", float(min_pnl))
    max_pnl = filters.get("max_pnl")
    if max_pnl is not None and max_pnl != "": add("COALESCE(trade.net_pnl, trade.gross_pnl, 0) <= ?", float(max_pnl))
    min_qty = filters.get("min_quantity")
    if min_qty is not None and min_qty != "": add("trade.quantity >= ?", float(min_qty))
    max_qty = filters.get("max_quantity")
    if max_qty is not None and max_qty != "": add("trade.quantity <= ?", float(max_qty))
    order_dir = "ASC" if str(filters.get("order")).lower() == "asc" else "DESC"
    sb = filters.get("sort_by")
    sort_col = "COALESCE(trade.net_pnl, trade.gross_pnl)" if sb == "pnl" else ("trade.quantity" if sb == "quantity" else ("COALESCE(trade.custom_fields->>'trade_rating', '0')::numeric" if sb == "rating" else "COALESCE(trade.exit_timestamp, trade.entry_timestamp)"))
    limit, page = filters.get("limit"), filters.get("page")
    pag_sql = ""
    if limit:
        lim = max(1, min(100, int(limit)))
        p = max(1, int(page)) if page is not None else 1
        params.extend([lim, (p - 1) * lim])
        pag_sql = f"LIMIT ${len(params)-1} OFFSET ${len(params)}"
    sql = f"""SELECT trade.id, COALESCE(trade.unique_id, CAST(trade.id AS TEXT)) AS unique_id, trade.symbol, trade.side, trade.category, trade.product_type, trade.source, trade.quantity, trade.quantity_unit, trade.entry_price, trade.exit_price, trade.gross_pnl, trade.net_pnl, trade.total_charges, trade.charges, trade.pnl_currency, trade.status, trade.close_reason, trade.percent_change, trade.stop_loss, trade.take_profit, trade.strategy, trade.notes, trade.attachments, trade.custom_fields, trade.entry_timestamp, trade.exit_timestamp, COALESCE(trade.exit_timestamp, trade.entry_timestamp) AS display_timestamp, (SELECT broker.name FROM broker_connections.user_broker_connections connection JOIN trading_catalog.broker_integrations integration ON integration.id = connection.integration_id JOIN trading_catalog.brokers broker ON broker.id = integration.broker_id WHERE connection.id = trade.broker_connection_id AND connection.user_id = trade.user_id LIMIT 1) AS broker_name, (SELECT connection.account_name FROM broker_connections.user_broker_connections connection WHERE connection.id = trade.broker_connection_id AND connection.user_id = trade.user_id LIMIT 1) AS account_name, (SELECT platform.name FROM broker_connections.user_broker_connections connection JOIN trading_catalog.broker_integrations integration ON integration.id = connection.integration_id JOIN trading_catalog.platforms platform ON platform.id = integration.platform_id WHERE connection.id = trade.broker_connection_id AND connection.user_id = trade.user_id LIMIT 1) AS platform_name, (SELECT j.is_breakeven FROM trading.journal_entries j WHERE j.user_id = trade.user_id AND j.journal_date = COALESCE(trade.exit_timestamp, trade.entry_timestamp)::date LIMIT 1) AS is_breakeven, (SELECT JSONB_BUILD_OBJECT('underlyingSymbol', od.underlying_symbol, 'optionType', od.option_type, 'strikePrice', od.strike_price, 'expiryDate', od.expiry_date, 'contractMultiplier', od.contract_multiplier, 'lotSize', od.lot_size, 'expirationOutcome', od.expiration_outcome) FROM trading.option_trade_details od WHERE od.trade_id = trade.id) AS option_details, (SELECT md.details FROM trading.trade_market_details md WHERE md.trade_id = trade.id) AS market_details, (SELECT j.mistakes FROM trading.journal_entries j WHERE j.user_id = trade.user_id AND j.trade_id = trade.id LIMIT 1) AS mistakes, (SELECT j.custom_tags FROM trading.journal_entries j WHERE j.user_id = trade.user_id AND j.trade_id = trade.id LIMIT 1) AS custom_tags, (SELECT j.execution_score FROM trading.journal_entries j WHERE j.user_id = trade.user_id AND j.trade_id = trade.id LIMIT 1) AS execution_score, (SELECT j.review_summary FROM trading.journal_entries j WHERE j.user_id = trade.user_id AND j.trade_id = trade.id LIMIT 1) AS review_summary, COUNT(*) OVER()::int AS total_count FROM trading.trades trade WHERE {' AND '.join(conds)} ORDER BY {sort_col} {order_dir} {pag_sql}"""
    rows = await pool.fetch(sql, *params)
    now = time.time()
    cached_opts = _opts_cache.get(user_id)
    if cached_opts and cached_opts[1] > now:
        filter_opts = cached_opts[0]
    else:
        opt_sql = """
            SELECT
                COALESCE(ARRAY_AGG(DISTINCT trade.symbol ORDER BY trade.symbol) FILTER (WHERE trade.symbol IS NOT NULL), '{}') AS symbols,
                COALESCE(ARRAY_AGG(DISTINCT trade.category ORDER BY trade.category) FILTER (WHERE trade.category IS NOT NULL), '{}') AS categories,
                COALESCE(ARRAY_AGG(DISTINCT trade.product_type ORDER BY trade.product_type) FILTER (WHERE trade.product_type IS NOT NULL), '{}') AS product_types,
                COALESCE(ARRAY_AGG(DISTINCT trade.source ORDER BY trade.source) FILTER (WHERE trade.source IS NOT NULL), '{}') AS sources,
                COALESCE(ARRAY_AGG(DISTINCT trade.strategy ORDER BY trade.strategy) FILTER (WHERE trade.strategy IS NOT NULL), '{}') AS strategies,
                COALESCE(ARRAY_AGG(DISTINCT broker.name ORDER BY broker.name) FILTER (WHERE broker.name IS NOT NULL), '{}') AS brokers,
                COALESCE(ARRAY_AGG(DISTINCT connection.account_name ORDER BY connection.account_name) FILTER (WHERE connection.account_name IS NOT NULL), '{}') AS accounts,
                COALESCE(ARRAY_AGG(DISTINCT platform.name ORDER BY platform.name) FILTER (WHERE platform.name IS NOT NULL), '{}') AS platforms
            FROM trading.trades trade
            LEFT JOIN broker_connections.user_broker_connections connection ON connection.id = trade.broker_connection_id AND connection.user_id = trade.user_id AND connection.deleted_at IS NULL
            LEFT JOIN trading_catalog.broker_integrations integration ON integration.id = connection.integration_id
            LEFT JOIN trading_catalog.brokers broker ON broker.id = integration.broker_id
            LEFT JOIN trading_catalog.platforms platform ON platform.id = integration.platform_id
            WHERE trade.user_id = $1
        """
        opt_row = await pool.fetchrow(opt_sql, user_id)
        filter_opts = {
            "symbols": list(opt_row["symbols"]) if opt_row else [],
            "categories": list(opt_row["categories"]) if opt_row else [],
            "productTypes": list(opt_row["product_types"]) if opt_row else [],
            "sources": list(opt_row["sources"]) if opt_row else [],
            "platforms": list(opt_row["platforms"]) if opt_row else [],
            "accounts": list(opt_row["accounts"]) if opt_row else [],
            "brokers": list(opt_row["brokers"]) if opt_row else [],
            "strategies": list(opt_row["strategies"]) if opt_row else [],
            "ratings": [1, 2, 3, 4, 5]
        }
        _opts_cache[user_id] = (filter_opts, now + 600.0)
        if len(_opts_cache) > 500: _opts_cache.clear()
    return {"trades": [dict(r) for r in rows], "total_count": rows[0]["total_count"] if rows else 0, "filter_options": filter_opts}

async def find_trade_by_id(pool: asyncpg.Pool, user_id: int, unique_id: str) -> dict | None:
    sql = """
        SELECT trade.*,
            (SELECT JSONB_BUILD_OBJECT(
                'underlyingSymbol', od.underlying_symbol,
                'optionType', od.option_type,
                'strikePrice', od.strike_price,
                'expiryDate', od.expiry_date,
                'contractMultiplier', od.contract_multiplier,
                'lotSize', od.lot_size,
                'expirationOutcome', od.expiration_outcome
            ) FROM trading.option_trade_details od WHERE od.trade_id = trade.id) AS option_details,
            (SELECT md.details FROM trading.trade_market_details md WHERE md.trade_id = trade.id) AS market_details,
            (SELECT j.mistakes FROM trading.journal_entries j WHERE j.user_id = trade.user_id AND j.trade_id = trade.id LIMIT 1) AS mistakes,
            (SELECT j.custom_tags FROM trading.journal_entries j WHERE j.user_id = trade.user_id AND j.trade_id = trade.id LIMIT 1) AS custom_tags,
            (SELECT j.execution_score FROM trading.journal_entries j WHERE j.user_id = trade.user_id AND j.trade_id = trade.id LIMIT 1) AS execution_score,
            (SELECT j.review_summary FROM trading.journal_entries j WHERE j.user_id = trade.user_id AND j.trade_id = trade.id LIMIT 1) AS review_summary
        FROM trading.trades trade
        WHERE trade.unique_id = $1 AND trade.user_id = $2 LIMIT 1
    """
    row = await pool.fetchrow(sql, unique_id, user_id)
    return dict(row) if row else None
