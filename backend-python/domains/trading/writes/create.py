import json
import uuid
import asyncpg
from domains.instruments.registry import normalize_symbol, ensure_loaded, find_by_symbol
from core.calculations.calculator import calculate_trade_pnl
from core.finance.currency import get_fx_rate
from domains.trading.mapper import get_broker_trade_mapping, map_manual_trade, map_broker_trade
from core.errors.app_error import AppError
from core.errors.messages import ERROR_MESSAGES

UPSERT_TRADE_SQL = """
    INSERT INTO trading.trades (
        unique_id, user_id, broker_connection_id, symbol, side, status, quantity, entry_price, exit_price,
        entry_timestamp, exit_timestamp, gross_pnl, net_pnl, total_charges, currency, pnl_currency, stop_loss,
        take_profit, percent_change, product_type, category, strategy, notes, attachments, source, created_at, updated_at
    ) VALUES (
        $1, $2, $3::uuid, $4, $5, $6, $7::numeric, $8::numeric, $9::numeric, $10::text::timestamptz,
        $11::text::timestamptz, $12::numeric, $13::numeric, $14::numeric, $15, $16, $17::numeric, $18::numeric,
        $19::numeric, $20, $21, $22, $23, $24::jsonb, $25, NOW(), NOW()
    ) ON CONFLICT (user_id, unique_id) DO UPDATE SET
        broker_connection_id = COALESCE(EXCLUDED.broker_connection_id, trading.trades.broker_connection_id),
        symbol = EXCLUDED.symbol, side = EXCLUDED.side, status = EXCLUDED.status, quantity = EXCLUDED.quantity,
        entry_price = EXCLUDED.entry_price, exit_price = EXCLUDED.exit_price, entry_timestamp = EXCLUDED.entry_timestamp,
        exit_timestamp = EXCLUDED.exit_timestamp, gross_pnl = EXCLUDED.gross_pnl, net_pnl = EXCLUDED.net_pnl,
        total_charges = EXCLUDED.total_charges, currency = COALESCE(EXCLUDED.currency, trading.trades.currency),
        pnl_currency = COALESCE(EXCLUDED.pnl_currency, trading.trades.pnl_currency), stop_loss = EXCLUDED.stop_loss,
        take_profit = EXCLUDED.take_profit, percent_change = EXCLUDED.percent_change, product_type = EXCLUDED.product_type,
        category = EXCLUDED.category, strategy = COALESCE(EXCLUDED.strategy, trading.trades.strategy),
        notes = COALESCE(EXCLUDED.notes, trading.trades.notes),
        attachments = CASE WHEN EXCLUDED.attachments = '[]'::jsonb THEN trading.trades.attachments ELSE EXCLUDED.attachments END,
        source = EXCLUDED.source, updated_at = NOW() RETURNING *
"""

async def _validate_connection(pool: asyncpg.Pool, conn_id: any, user_id: int) -> uuid.UUID | None:
    if not conn_id:
        return None
    try:
        parsed = uuid.UUID(str(conn_id))
    except (ValueError, TypeError, AttributeError):
        raise AppError(ERROR_MESSAGES["TRADING"]["INVALID_CONNECTION_ID"])
    if not await pool.fetchval("SELECT 1 FROM broker_connections.user_broker_connections WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL", parsed, user_id):
        raise AppError(ERROR_MESSAGES["TRADING"]["UNAUTHORIZED_CONNECTION"])
    return parsed

async def prepare_row_params(pool: asyncpg.Pool, t: dict, user_id: int, parsed_conn_id: uuid.UUID | None, rate_cache: dict | None = None) -> tuple:
    entry_p = float(t["entry_price"]) if t.get("entry_price") is not None else None
    exit_p = float(t["exit_price"]) if t.get("exit_price") is not None else None
    qty = float(t["quantity"]) if t.get("quantity") is not None else 0.0
    if entry_p is None or entry_p <= 0.0:
        raise AppError(ERROR_MESSAGES["TRADING"]["INVALID_ENTRY_PRICE"])
    if qty <= 0.0:
        raise AppError(ERROR_MESSAGES["TRADING"]["INVALID_QUANTITY"])
    side = str(t["side"]).lower().strip() if t.get("side") is not None else ""
    if side not in ("long", "short"):
        raise AppError(ERROR_MESSAGES["TRADING"]["INVALID_SIDE"])
    sl = float(t["stop_loss"]) if t.get("stop_loss") is not None else None
    tp = float(t["take_profit"]) if t.get("take_profit") is not None else None
    is_existing = bool(t.get("id")) or bool(t.get("is_update")) or bool(t.get("created_at"))
    if entry_p is not None:
        if side == "long":
            if sl is not None and tp is not None and sl >= tp:
                raise AppError(ERROR_MESSAGES["TRADING"]["SL_ABOVE_TP_LONG"])
            if not is_existing and sl is not None and sl > entry_p:
                raise AppError(ERROR_MESSAGES["TRADING"]["SL_ABOVE_ENTRY_LONG"])
            if tp is not None and tp <= entry_p:
                raise AppError(ERROR_MESSAGES["TRADING"]["TP_BELOW_ENTRY_LONG"])
        elif side == "short":
            if sl is not None and tp is not None and sl <= tp:
                raise AppError(ERROR_MESSAGES["TRADING"]["SL_BELOW_TP_SHORT"])
            if not is_existing and sl is not None and sl < entry_p:
                raise AppError(ERROR_MESSAGES["TRADING"]["SL_BELOW_ENTRY_SHORT"])
            if tp is not None and tp >= entry_p:
                raise AppError(ERROR_MESSAGES["TRADING"]["TP_ABOVE_ENTRY_SHORT"])
    charges = float(t["total_charges"]) if t.get("total_charges") is not None else 0.0
    inst = find_by_symbol(t.get("symbol"), t.get("product_type"))
    cat = str(inst["category"]).lower() if (inst and inst.get("category")) else (str(t["category"]).lower() if t.get("category") is not None else (str(t["product_type"]).lower() if t.get("product_type") is not None else ""))
    if not cat:
        raise AppError(ERROR_MESSAGES["TRADING"]["CATEGORY_REQUIRED"])
    raw_mult = t.get("contract_multiplier") if t.get("contract_multiplier") is not None else t.get("multiplier")
    if raw_mult is not None:
        mult = float(raw_mult)
    elif inst and inst.get("contractSize"):
        mult = float(inst["contractSize"])
    elif cat in ("future", "futures", "option", "options"):
        raise AppError(ERROR_MESSAGES["TRADING"]["MULTIPLIER_REQUIRED"])
    else:
        mult = 1.0
    closed_qty = float(t["closed_quantity"]) if t.get("closed_quantity") is not None else None
    status = str(t["status"]) if t.get("status") is not None else ("closed" if exit_p is not None else "open")
    calc_qty = closed_qty if (exit_p is not None and closed_qty is not None and 0.0 < closed_qty < qty) else qty
    if exit_p is not None and closed_qty is not None and 0.0 < closed_qty < qty:
        status = "partially_closed"
    raw_curr = t.get("pnl_currency")
    profit_curr = inst.get("profitCurrency") if (inst and inst.get("profitCurrency")) else "USD"
    account_curr = str(raw_curr).upper().strip() if raw_curr else profit_curr
    conversion_rate = 1.0
    if profit_curr and profit_curr != account_curr:
        ts = t.get("exit_timestamp") if t.get("exit_timestamp") is not None else t.get("entry_timestamp")
        dt_key = str(ts)[:10] if ts else ""
        cache_key = (profit_curr, account_curr, dt_key)
        if rate_cache is not None and cache_key in rate_cache:
            conversion_rate = rate_cache[cache_key]
        else:
            conversion_rate = await get_fx_rate(pool, profit_curr, account_curr, dt_key)
            if rate_cache is not None:
                rate_cache[cache_key] = conversion_rate
    gross, net, pct = calculate_trade_pnl(
        entry_p=entry_p, exit_p=exit_p, qty=calc_qty, mult=mult, side=side, charges=charges,
        category=cat, conversion_rate=conversion_rate,
        gross_pnl=float(t["gross_pnl"]) if t.get("gross_pnl") is not None else None,
        net_pnl=float(t["net_pnl"]) if t.get("net_pnl") is not None else None,
        pct_change=float(t["percent_change"]) if t.get("percent_change") is not None else None,
        status=status
    )
    sym = inst["symbol"] if inst else normalize_symbol(t.get("symbol"))
    pt = inst["productType"] if (inst and inst.get("productType")) else t.get("product_type")
    curr = t.get("currency")
    pnl_curr = account_curr
    src = str(t["source"] if t.get("source") is not None else "manual").lower().strip()
    return (
        t["unique_id"], user_id, parsed_conn_id, sym, side, status,
        qty, entry_p, exit_p, t.get("entry_timestamp"), t.get("exit_timestamp"), gross, net, charges, curr, pnl_curr,
        t.get("stop_loss"), t.get("take_profit"), pct, pt, cat, t.get("strategy"), t.get("notes"),
        json.dumps(t["attachments"] if t.get("attachments") is not None else []), src
    )

async def insert_trade(pool: asyncpg.Pool, t: dict) -> dict:
    rows = await insert_trades_batch(pool, [t], t["user_id"])
    return rows[0] if rows else {}

async def insert_trades_batch(pool: asyncpg.Pool, trades: list[dict], user_id: int) -> list[dict]:
    if not trades:
        return []
    await ensure_loaded()
    conn_map, cfg_map, rate_cache, rows = {}, {}, {}, []
    conn = pool if hasattr(pool, "transaction") else await pool.acquire()
    try:
        async with conn.transaction():
            for t in trades:
                c_id = t.get("broker_connection_id")
                if c_id not in conn_map:
                    conn_map[c_id] = await _validate_connection(conn, c_id, user_id)
                parsed_conn_id = conn_map[c_id]
                src = str(t["source"] if t.get("source") is not None else "manual").lower().strip()
                if src == "manual":
                    canonical = map_manual_trade(t)
                else:
                    trade_method = "api_sync" if src == "sync" else "file_upload"
                    if (c_id, trade_method) not in cfg_map:
                        cfg_map[(c_id, trade_method)] = await get_broker_trade_mapping(conn, user_id, parsed_conn_id, trade_method) if parsed_conn_id else {}
                    canonical = map_broker_trade(t, cfg_map[(c_id, trade_method)], src)
                p = await prepare_row_params(conn, canonical, user_id, parsed_conn_id, rate_cache)
                r = await conn.fetchrow(UPSERT_TRADE_SQL, *p)
                if r:
                    tid = r["id"]
                    opt = t.get("option_details")
                    if isinstance(opt, dict) and opt.get("underlyingSymbol") and opt.get("optionType"):
                        strike_val = float(opt["strikePrice"]) if opt.get("strikePrice") is not None else 0.0
                        mult_val = float(opt["contractMultiplier"]) if opt.get("contractMultiplier") is not None else 1.0
                        lot_val = float(opt["lotSize"]) if opt.get("lotSize") is not None else None
                        await conn.execute("""
                            INSERT INTO trading.option_trade_details (
                                trade_id, underlying_symbol, option_type, strike_price, expiry_date, contract_multiplier, lot_size, expiration_outcome
                            ) VALUES ($1, $2, $3, $4::numeric, $5::date, $6::numeric, $7::numeric, $8)
                            ON CONFLICT (trade_id) DO UPDATE SET
                                underlying_symbol = EXCLUDED.underlying_symbol,
                                option_type = EXCLUDED.option_type,
                                strike_price = EXCLUDED.strike_price,
                                expiry_date = EXCLUDED.expiry_date,
                                contract_multiplier = EXCLUDED.contract_multiplier,
                                lot_size = EXCLUDED.lot_size,
                                expiration_outcome = EXCLUDED.expiration_outcome,
                                updated_at = NOW()
                        """, tid, str(opt["underlyingSymbol"]).upper(), str(opt["optionType"]).lower(), strike_val, opt.get("expiryDate"), mult_val, lot_val, opt.get("expirationOutcome"))
                    mkt = t.get("market_details")
                    if isinstance(mkt, dict) and mkt:
                        pt_name = str(t["product_type"]) if t.get("product_type") is not None else "general"
                        await conn.execute("""
                            INSERT INTO trading.trade_market_details (trade_id, product_type, details)
                            VALUES ($1, $2, $3::jsonb)
                            ON CONFLICT (trade_id) DO UPDATE SET
                                product_type = EXCLUDED.product_type,
                                details = EXCLUDED.details,
                                updated_at = NOW()
                        """, tid, pt_name, json.dumps(mkt))
                    rv_keys = ("setup", "mistakes", "custom_tags", "execution_score", "review_summary")
                    has_review = any(t.get(k) is not None for k in rv_keys) or t.get("trade_rating") is not None
                    if has_review:
                        score = t.get("execution_score") if t.get("execution_score") is not None else t.get("trade_rating")
                        sc_val = int(score) if score is not None else None
                        await conn.execute("""
                            INSERT INTO trading.journal_entries (
                                user_id, trade_id, setup, mistakes, custom_tags, execution_score, review_summary, created_at, updated_at
                            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
                            ON CONFLICT (user_id, trade_id) WHERE trade_id IS NOT NULL DO UPDATE SET
                                setup = COALESCE(EXCLUDED.setup, trading.journal_entries.setup),
                                mistakes = COALESCE(EXCLUDED.mistakes, trading.journal_entries.mistakes),
                                custom_tags = COALESCE(EXCLUDED.custom_tags, trading.journal_entries.custom_tags),
                                execution_score = COALESCE(EXCLUDED.execution_score, trading.journal_entries.execution_score),
                                review_summary = COALESCE(EXCLUDED.review_summary, trading.journal_entries.review_summary),
                                updated_at = NOW()
                        """, user_id, tid, t.get("setup"), t.get("mistakes"), t.get("custom_tags"), sc_val, t.get("review_summary"))
                    rows.append(dict(r))
    finally:
        if not hasattr(pool, "transaction"):
            await pool.release(conn)
    return rows
