import json
import asyncpg
from domains.trading.writes.create import prepare_row_params

NUMERIC_COLS = {"quantity", "entry_price", "exit_price", "stop_loss", "take_profit", "gross_pnl", "net_pnl", "total_charges", "percent_change"}
TS_COLS = {"entry_timestamp", "exit_timestamp"}
VALID_UPDATE_COLS = NUMERIC_COLS | TS_COLS | {"notes", "strategy", "symbol", "side", "status", "category", "product_type", "currency", "pnl_currency"}

async def update_trade(pool: asyncpg.Pool, user_id: int, unique_id: str, updates: dict) -> dict | None:
    if not updates:
        return None
    cmap = {"exitPrice": "exit_price", "entryPrice": "entry_price", "grossPnl": "gross_pnl", "netPnl": "net_pnl", "stopLoss": "stop_loss", "takeProfit": "take_profit", "totalCharges": "total_charges", "productType": "product_type", "entryTimestamp": "entry_timestamp", "exitTimestamp": "exit_timestamp"}
    updates = {cmap.get(k, k): v for k, v in updates.items()}
    cur = await pool.fetchrow("SELECT * FROM trading.trades WHERE unique_id = $1 AND user_id = $2", unique_id, user_id)
    if not cur:
        return None
    m = dict(cur)
    tid = m["id"]
    opt = updates.get("option_details") if updates.get("option_details") is not None else updates.get("optionDetails")
    if isinstance(opt, dict) and opt.get("underlyingSymbol") and opt.get("optionType"):
        strike_val = float(opt["strikePrice"]) if opt.get("strikePrice") is not None else 0.0
        mult_val = float(opt["contractMultiplier"]) if opt.get("contractMultiplier") is not None else 1.0
        lot_val = float(opt["lotSize"]) if opt.get("lotSize") is not None else None
        await pool.execute("""
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
    mkt = updates.get("market_details") if updates.get("market_details") is not None else updates.get("marketDetails")
    if isinstance(mkt, dict) and mkt:
        pt_name = str(updates.get("product_type") if updates.get("product_type") is not None else m.get("product_type"))
        await pool.execute("""
            INSERT INTO trading.trade_market_details (trade_id, product_type, details)
            VALUES ($1, $2, $3::jsonb)
            ON CONFLICT (trade_id) DO UPDATE SET
                product_type = EXCLUDED.product_type,
                details = EXCLUDED.details,
                updated_at = NOW()
        """, tid, pt_name, json.dumps(mkt))
    rv_keys = ("setup", "mistakes", "custom_tags", "execution_score", "review_summary")
    has_review = any(updates.get(k) is not None for k in rv_keys) or updates.get("trade_rating") is not None
    if has_review:
        score = updates.get("execution_score") if updates.get("execution_score") is not None else updates.get("trade_rating")
        sc_val = int(score) if score is not None else None
        await pool.execute("""
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
        """, user_id, tid, updates.get("setup"), updates.get("mistakes"), updates.get("custom_tags"), sc_val, updates.get("review_summary"))
    if any(k in updates for k in NUMERIC_COLS | {"side"}) and "net_pnl" not in updates and "gross_pnl" not in updates:
        merged = {**m, **updates, "gross_pnl": None, "net_pnl": None, "percent_change": None}
        p = await prepare_row_params(pool, merged, user_id, m.get("broker_connection_id"))
        updates["gross_pnl"], updates["net_pnl"], updates["percent_change"] = p[11], p[12], p[18]
    clauses, params = [], []
    for k, v in updates.items():
        if k in VALID_UPDATE_COLS and v is not None:
            cast = "::numeric" if k in NUMERIC_COLS else ("::text::timestamptz" if k in TS_COLS else "")
            params.append(v)
            clauses.append(f"{k} = ${len(params)}{cast}")
    if updates.get("setup") is not None:
        params.append(json.dumps({"setup": updates["setup"]}))
        clauses.append(f"custom_fields = COALESCE(custom_fields, '{{}}'::jsonb) || ${len(params)}::jsonb")
    if not clauses:
        return dict(cur) if has_review else None
    params.extend([unique_id, user_id])
    sql = f"UPDATE trading.trades SET {', '.join(clauses)}, updated_at = NOW() WHERE unique_id = ${len(params)-1} AND user_id = ${len(params)} RETURNING *"
    row = await pool.fetchrow(sql, *params)
    return dict(row) if row else None

async def update_trade_attachments(pool: asyncpg.Pool, user_id: int, unique_id: str, attachments: list) -> dict | None:
    row = await pool.fetchrow("UPDATE trading.trades SET attachments = $1::jsonb, updated_at = NOW() WHERE unique_id = $2 AND user_id = $3 RETURNING unique_id, attachments", json.dumps(attachments), unique_id, user_id)
    return dict(row) if row else None

async def toggle_breakeven_day(pool: asyncpg.Pool, user_id: int, journal_date: any, is_breakeven: bool) -> dict:
    sql = """
        INSERT INTO trading.journal_entries (user_id, journal_date, is_breakeven, content, created_at, updated_at)
        VALUES ($1, $2, $3, '{}'::jsonb, NOW(), NOW())
        ON CONFLICT (user_id, journal_date) WHERE journal_date IS NOT NULL
        DO UPDATE SET is_breakeven = EXCLUDED.is_breakeven, updated_at = NOW()
        RETURNING id, journal_date, is_breakeven
    """
    row = await pool.fetchrow(sql, user_id, journal_date, is_breakeven)
    return dict(row) if row else {}
