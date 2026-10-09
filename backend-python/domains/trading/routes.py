import json, time, asyncio
import uuid
from typing import Any
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, Query, File, UploadFile, Form
import asyncpg
from domains.auth.service import get_current_user_id
from infra.db.postgres import get_db, init_db
from domains.trading.reads import fetch_user_trades, fetch_dashboard_trades, fetch_calendar_trades, find_trade_by_id, fetch_trade_detail, invalidate_filter_options_cache
from domains.trading.writes import insert_trade, insert_trades_batch, update_trade, delete_trade, toggle_breakeven_day, upload_trade_attachment, delete_trade_attachment
from core.finance.currency import get_fx_rate, get_fx_rate_map, convert_trade_pnl, get_cached_fx_rate, is_supported_currency
from infra.db.redis import get_redis
from datetime import date as dt_date, datetime
from core.calculations.formulas import calculate_trade_risk, calculate_initial_target, calculate_planned_r_multiple, calculate_realized_r_multiple, calculate_percent_change, calculate_adjusted_cost, resolve_multiplier
from core.calculations.dashboard import build_dashboard_analytics
from core.errors.app_error import AppError
from core.errors.messages import ERROR_MESSAGES
from domains.trading.mapper import get_broker_trade_mapping
from domains.trading.file_parser import parse_and_map_file_trades

_dash_cache: dict[str, tuple[Any, float]] = {}

async def invalidate_dashboard_cache(user_id: int):
    invalidate_filter_options_cache(user_id)
    prefix = f"dash:{user_id}:"
    for k in list(_dash_cache.keys()):
        if k.startswith(prefix): _dash_cache.pop(k, None)
    try:
        r = get_redis()
        if r:
            keys = [k async for k in r.scan_iter(f"dash:{user_id}:*", count=100)]
            if keys: await r.delete(*keys)
    except Exception:
        pass

class BreakevenDayRequest(BaseModel):
    date: dt_date
    isBreakeven: bool

trading_router = APIRouter(tags=["trading"])

CURR_SYMS = {"USD": "$", "USC": "¢", "USDT": "$", "USDC": "$", "EUR": "€", "GBP": "£", "INR": "₹", "JPY": "¥", "AUD": "A$", "CAD": "C$", "CHF": "Fr", "AED": "AED", "SGD": "S$"}
INST_MAP = {"equity": "Stock / Equity", "stock": "Stock / Equity", "option": "Option", "future": "Futures", "perpetual": "Perpetual", "spot": "Crypto Spot", "forex": "Forex / CFD", "cfd": "CFD", "forex_cfd": "Forex / CFD"}

def format_trade(r: dict) -> dict:
    net = r.get("net_pnl")
    gross = r.get("gross_pnl")
    pnl = round(float(r["pnl"] if r.get("pnl") is not None else (net if net is not None else (gross if gross is not None else 0.0))), 2)
    custom = r.get("custom_fields") if isinstance(r.get("custom_fields"), dict) else {}
    platform = r.get("platform_name") if r.get("platform_name") is not None else custom.get("platform")
    setup = custom.get("setup") if custom.get("setup") is not None else r.get("strategy")
    ep = float(r["entry_price"]) if r.get("entry_price") is not None else None
    xp = float(r["exit_price"]) if r.get("exit_price") is not None else None
    qty = float(r["quantity"]) if r.get("quantity") is not None else None
    sl = float(r["stop_loss"]) if r.get("stop_loss") is not None else None
    tp = float(r["take_profit"]) if r.get("take_profit") is not None else None
    side = str(r["side"]).lower() if r.get("side") is not None else None
    mult = resolve_multiplier(str(r["symbol"]), r.get("product_type"), r) if r.get("symbol") is not None else 1.0
    dur = None
    ent_dt = None
    ext_dt = None
    if r.get("entry_timestamp"):
        try: ent_dt = r["entry_timestamp"] if isinstance(r["entry_timestamp"], datetime) else datetime.fromisoformat(str(r["entry_timestamp"]).replace("Z", "+00:00"))
        except Exception: pass
    if r.get("exit_timestamp"):
        try: ext_dt = r["exit_timestamp"] if isinstance(r["exit_timestamp"], datetime) else datetime.fromisoformat(str(r["exit_timestamp"]).replace("Z", "+00:00"))
        except Exception: pass
    if ent_dt and ext_dt:
        dur = max(1, round(abs((ext_dt - ent_dt).total_seconds()) / 60))
    pos_val = calculate_adjusted_cost(qty, ep, mult) if (qty is not None and ep is not None) else None
    price_roi = calculate_percent_change(ep, xp, side) if (ep is not None and xp is not None and side in ("long", "short")) else (float(r["percent_change"]) if r.get("percent_change") is not None else None)
    risk_val = calculate_trade_risk(ep, sl, qty, mult) if (ep is not None and sl is not None and qty is not None) else None
    target_val = calculate_initial_target(ep, tp, qty, mult) if (ep is not None and tp is not None and qty is not None) else None
    planned_r = calculate_planned_r_multiple(risk_val, target_val) if (risk_val is not None and target_val is not None) else None
    realized_r = calculate_realized_r_multiple(float(net) if net is not None else pnl, risk_val) if risk_val is not None else None
    disp_dt = ext_dt if ext_dt else ent_dt
    disp_date = disp_dt.strftime("%d/%m/%Y") if disp_dt else "--"
    disp_time = disp_dt.strftime("%H:%M") if disp_dt else "--"
    ent_time = ent_dt.strftime("%H:%M") if ent_dt else "--"
    ext_time = ext_dt.strftime("%H:%M") if ext_dt else "--"
    curr = str(r["pnl_currency"]).upper().strip() if r.get("pnl_currency") else "USD"
    csym = CURR_SYMS[curr] if curr in CURR_SYMS else f"{curr} "
    def fmt_m(val):
        if val is None: return "--"
        v = float(val)
        prefix = "+" if v > 0 else ("-" if v < 0 else "")
        return f"{prefix}{csym}{abs(v):,.2f}"
    def fmt_p(val):
        if val is None: return "--"
        return f"{float(val):,.4f}".rstrip("0").rstrip(".") if float(val) % 1 != 0 else f"{float(val):,.2f}"
    status = str(r["status"]).lower() if r.get("status") is not None else "closed"
    status_label = "Open" if status == "open" else ("Win" if pnl > 0 else ("Loss" if pnl < 0 else "Breakeven"))
    status_tone = "brand" if status == "open" else ("success" if pnl > 0 else ("error" if pnl < 0 else "gray"))
    cat = str(r["category"]).lower() if r.get("category") else ""
    opt = r.get("option_details") if isinstance(r.get("option_details"), dict) else {}
    opt_type = opt.get("optionType") if isinstance(opt, dict) else None
    dir_label = f"{side.capitalize()} {str(opt_type).capitalize()}" if (cat == "option" and opt_type and side) else (side.capitalize() if side else "--")
    inst_label = INST_MAP[cat] if cat in INST_MAP else (cat.capitalize() if cat else "--")
    unit = r.get("quantity_unit")
    qty_fmt = f"{qty:g} {unit}" if (qty is not None and unit) else (f"{qty:g}" if qty is not None else "--")
    dur_fmt = f"{dur // 60}h {dur % 60}m" if (dur and dur >= 60) else (f"{dur}m" if dur else "--")
    be_val = r.get("is_breakeven")
    be_label = "Yes" if be_val is True else ("No" if be_val is False else "--")
    exec_score = r.get("execution_score")
    trade_rating = custom.get("trade_rating") if isinstance(custom, dict) else None
    rating_val = int(exec_score) if exec_score is not None else (int(trade_rating) if trade_rating is not None else 0)
    return {
        **r,
        "pnl": pnl,
        "uniqueId": r.get("unique_id"),
        "entryPrice": ep,
        "exitPrice": xp,
        "grossPnl": float(gross) if gross is not None else None,
        "netPnl": float(net) if net is not None else None,
        "totalCharges": float(r["total_charges"]) if r.get("total_charges") is not None else None,
        "pnlCurrency": r.get("pnl_currency"),
        "productType": r.get("product_type"),
        "stopLoss": sl,
        "takeProfit": tp,
        "entryAt": r.get("entry_timestamp"),
        "exitAt": r.get("exit_timestamp"),
        "displayDate": disp_date,
        "displayTime": disp_time,
        "entryTimeFormatted": ent_time,
        "exitTimeFormatted": ext_time,
        "statusLabel": status_label,
        "statusTone": status_tone,
        "directionLabel": dir_label,
        "instrumentTypeLabel": inst_label,
        "quantityFormatted": qty_fmt,
        "durationFormatted": dur_fmt,
        "pnlFormatted": fmt_m(pnl),
        "grossPnlFormatted": fmt_m(gross),
        "netPnlFormatted": fmt_m(net),
        "totalChargesFormatted": fmt_m(r.get("total_charges")),
        "tradeRiskFormatted": fmt_m(risk_val),
        "entryPriceFormatted": fmt_p(ep),
        "exitPriceFormatted": fmt_p(xp),
        "stopLossFormatted": fmt_p(sl),
        "takeProfitFormatted": fmt_p(tp),
        "breakevenFormatted": be_label,
        "rating": rating_val,
        "tradeType": r.get("side"),
        "accountName": r.get("account_name"),
        "brokerName": r.get("broker_name"),
        "platform": platform,
        "setup": setup,
        "durationMinutes": dur,
        "priceMovePercent": price_roi,
        "positionValue": pos_val,
        "tradeRisk": risk_val,
        "initialTarget": target_val,
        "plannedRMultiple": planned_r,
        "realizedRMultiple": realized_r,
        "optionDetails": r.get("option_details"),
        "marketDetails": r.get("market_details"),
        "mistakes": r.get("mistakes"),
        "customTags": r.get("custom_tags"),
        "executionScore": r.get("execution_score"),
        "reviewSummary": r.get("review_summary"),
    }


async def resolve_target_currency(conn: asyncpg.Connection, uid: int, currency: str | None) -> str:
    if currency:
        c = currency.upper().strip()
        if not is_supported_currency(c):
            raise AppError(ERROR_MESSAGES["CURRENCY"]["UNSUPPORTED"])
        return c
    row = await conn.fetchrow("SELECT settings FROM app.user_settings WHERE user_id = $1", uid)
    if row and row["settings"]:
        s = row["settings"]
        s_dict = s if isinstance(s, dict) else json.loads(s)
        if isinstance(s_dict, dict):
            d_cfg = s_dict.get("dashboard")
            if isinstance(d_cfg, dict) and d_cfg.get("currency"):
                c = str(d_cfg["currency"]).upper().strip()
                if is_supported_currency(c):
                    return c
    u_row = await conn.fetchrow("SELECT preferred_currency FROM app_auth.users WHERE id = $1", uid)
    pref = str(u_row["preferred_currency"]).upper().strip() if (u_row and u_row.get("preferred_currency")) else None
    if pref and is_supported_currency(pref):
        return pref
    return "USD"

@trading_router.get("/analytics/dashboard")
async def get_dashboard_analytics(
    trade_mode: str = "all",
    from_date: str | None = Query(None, alias="from"),
    to_date: str | None = Query(None, alias="to"),
    currency: str | None = None,
    user_id: Any = Depends(get_current_user_id),
    pool: asyncpg.Pool = Depends(init_db)
):
    uid = int(user_id)
    async with pool.acquire() as conn1, pool.acquire() as conn2:
        target_currency = await resolve_target_currency(conn1, uid, currency)
        raw_trades, cal_rows = await asyncio.gather(
            fetch_dashboard_trades(conn1, uid, trade_mode=trade_mode, from_date=from_date, to_date=to_date),
            fetch_calendar_trades(conn2, uid, trade_mode=trade_mode)
        )
    formatted_trades = []
    for t in raw_trades:
        raw_pnl = float(t["net_pnl"] if t["net_pnl"] is not None else (t["gross_pnl"] if t.get("gross_pnl") is not None else 0.0))
        ts = t.get("display_timestamp")
        d_str = ts.date().isoformat() if hasattr(ts, "date") else (str(ts)[:10] if ts else None)
        rate = get_cached_fx_rate(t.get("pnl_currency"), target_currency, d_str)
        t["pnl"] = convert_trade_pnl(raw_pnl, t.get("pnl_currency"), target_currency, rate)
        t["pnl_currency"] = target_currency
        t["date"] = d_str
        formatted_trades.append(format_trade(t))
    for r in cal_rows:
        cal_pnl = float(r["pnl"]) if r.get("pnl") is not None else 0.0
        d_str = str(r["trade_date"]) if r.get("trade_date") else None
        rate = get_cached_fx_rate(r.get("pnl_currency"), target_currency, d_str)
        r["pnl"] = convert_trade_pnl(cal_pnl, r.get("pnl_currency"), target_currency, rate)
    return build_dashboard_analytics(formatted_trades, cal_rows, target_currency)

def _parse_float(v: str | float | None) -> float | None:
    if v is None or v == "": return None
    try: return float(v)
    except Exception: return None

def _parse_bool(v: str | bool | None) -> bool | None:
    if v is None or v == "" or str(v).lower() in ("false", "0"): return None
    return True if str(v).lower() in ("true", "1") else None

@trading_router.get("/trades")
async def list_trades(
    page: int = 1,
    limit: int = 25,
    symbol: str | None = None,
    side: str | None = Query(None, alias="tradeType"),
    category: str | None = None,
    product_type: str | None = Query(None, alias="productType"),
    source: str | None = None,
    platform: str | None = None,
    account: str | None = None,
    strategy: str | None = None,
    setup: str | None = None,
    breakeven: str | None = None,
    win_trades: str | None = Query(None, alias="winTrades"),
    loss_trades: str | None = Query(None, alias="lossTrades"),
    has_stop_loss: str | None = Query(None, alias="hasStopLoss"),
    has_take_profit: str | None = Query(None, alias="hasTakeProfit"),
    has_notes: str | None = Query(None, alias="hasNotes"),
    has_mistakes: str | None = Query(None, alias="hasMistakes"),
    min_pnl: str | None = Query(None, alias="minPnl"),
    max_pnl: str | None = Query(None, alias="maxPnl"),
    min_quantity: str | None = Query(None, alias="minQuantity"),
    max_quantity: str | None = Query(None, alias="maxQuantity"),
    sort_by: str | None = Query("date", alias="sortBy"),
    order: str = "desc",
    broker: str | None = None,
    rating: str | None = None,
    from_date: str | None = Query(None, alias="from"),
    to_date: str | None = Query(None, alias="to"),
    currency: str | None = None,
    user_id: Any = Depends(get_current_user_id),
    conn: asyncpg.Connection = Depends(get_db)
):
    sb = sort_by if (sort_by is not None and sort_by != "") else "date"
    target_currency = await resolve_target_currency(conn, int(user_id), currency)
    res = await fetch_user_trades(
        conn, int(user_id), page=page, limit=limit, symbol=symbol, side=side, category=category,
        product_type=product_type, source=source, platform=platform, account=account, strategy=strategy,
        setup=setup, breakeven=breakeven, win_trades=_parse_bool(win_trades), loss_trades=_parse_bool(loss_trades),
        has_stop_loss=_parse_bool(has_stop_loss), has_take_profit=_parse_bool(has_take_profit),
        has_notes=_parse_bool(has_notes), has_mistakes=_parse_bool(has_mistakes),
        min_pnl=_parse_float(min_pnl), max_pnl=_parse_float(max_pnl),
        min_quantity=_parse_float(min_quantity), max_quantity=_parse_float(max_quantity),
        sort_by=sb, order=order, broker=broker, rating=_parse_float(rating),
        from_date=from_date, to_date=to_date
    )
    formatted_trades = []
    for t in res["trades"]:
        raw_pnl = float(t["net_pnl"] if t["net_pnl"] is not None else (t["gross_pnl"] if t.get("gross_pnl") is not None else 0.0))
        ts = t.get("display_timestamp")
        d_str = ts.date().isoformat() if hasattr(ts, "date") else (str(ts)[:10] if ts else None)
        trade_curr = t.get("pnl_currency")
        rate = get_cached_fx_rate(trade_curr, target_currency, d_str)
        t["pnl"] = convert_trade_pnl(raw_pnl, trade_curr, target_currency, rate)
        if t.get("gross_pnl") is not None:
            t["gross_pnl"] = convert_trade_pnl(float(t["gross_pnl"]), trade_curr, target_currency, rate)
        if t.get("net_pnl") is not None:
            t["net_pnl"] = convert_trade_pnl(float(t["net_pnl"]), trade_curr, target_currency, rate)
        if t.get("total_charges") is not None:
            t["total_charges"] = convert_trade_pnl(float(t["total_charges"]), trade_curr, target_currency, rate)
        t["pnl_currency"] = target_currency
        formatted_trades.append(format_trade(t))
    return {"success": True, "trades": formatted_trades, "totalCount": res["total_count"], "filterOptions": res.get("filter_options"), "currency": target_currency}

@trading_router.get("/trades/{unique_id}")
async def get_single_trade(unique_id: str, currency: str | None = None, user_id: Any = Depends(get_current_user_id), conn: asyncpg.Connection = Depends(get_db)):
    target_currency = await resolve_target_currency(conn, int(user_id), currency)
    t = await fetch_trade_detail(conn, int(user_id), unique_id, target_currency=target_currency)
    if not t:
        raise AppError(ERROR_MESSAGES["TRADING"]["NOT_FOUND"])
    return {"success": True, "trade": t}

@trading_router.patch("/trades/breakeven-day")
async def patch_breakeven_day(payload: BreakevenDayRequest, user_id: Any = Depends(get_current_user_id), conn: asyncpg.Connection = Depends(get_db)):
    res = await toggle_breakeven_day(conn, int(user_id), payload.date, payload.isBreakeven)
    await invalidate_dashboard_cache(int(user_id))
    return {"success": True, "data": res}

@trading_router.post("/trades")
@trading_router.post("/save-trade")
async def create_trade(payload: dict | list[dict], user_id: Any = Depends(get_current_user_id), conn: asyncpg.Connection = Depends(get_db)):
    uid = int(user_id)
    if isinstance(payload, list):
        rows = await insert_trades_batch(conn, payload, uid)
        await invalidate_dashboard_cache(uid)
        return {"success": True, "count": len(rows), "trades": [format_trade(r) for r in rows]}
    if isinstance(payload, dict) and isinstance(payload.get("trades"), list):
        bc_id = payload.get("broker_connection_id")
        batch = [{**t, **({"broker_connection_id": bc_id} if bc_id and not t.get("broker_connection_id") else {})} for t in payload["trades"]]
        rows = await insert_trades_batch(conn, batch, uid)
        await invalidate_dashboard_cache(uid)
        return {"success": True, "count": len(rows), "trades": [format_trade(r) for r in rows]}
    t = await insert_trade(conn, {**payload, "user_id": uid})
    await invalidate_dashboard_cache(uid)
    return {"success": True, "message": "Trade saved successfully!", "trade": format_trade(t)}

@trading_router.patch("/trades/{unique_id}")
@trading_router.patch("/update-trade")
@trading_router.post("/update-trade")
async def edit_trade(payload: dict, unique_id: str | None = None, user_id: Any = Depends(get_current_user_id), conn: asyncpg.Connection = Depends(get_db)):
    uid = unique_id if unique_id is not None else payload.get("unique_id")
    if not uid:
        raise AppError(ERROR_MESSAGES["TRADING"]["NOT_FOUND"])
    t = await update_trade(conn, int(user_id), str(uid), payload)
    await invalidate_dashboard_cache(int(user_id))
    return {"success": True, "message": "Trade updated successfully", "trade": format_trade(t) if t else None}

@trading_router.delete("/trades/{unique_id}")
async def remove_trade(unique_id: str, user_id: Any = Depends(get_current_user_id), conn: asyncpg.Connection = Depends(get_db)):
    deleted = await delete_trade(conn, int(user_id), unique_id)
    await invalidate_dashboard_cache(int(user_id))
    return {"success": True, "trade": deleted}

@trading_router.post("/trades/upload-file")
async def upload_trade_file(
    file: UploadFile = File(...),
    brokerConnectionId: str = Form(...),
    user_id: Any = Depends(get_current_user_id),
    conn: asyncpg.Connection = Depends(get_db)
):
    uid = int(user_id)
    try:
        parsed_conn_id = uuid.UUID(str(brokerConnectionId))
    except (ValueError, TypeError):
        raise AppError(ERROR_MESSAGES["TRADING"]["INVALID_CONNECTION_ID"])
    content = await file.read()
    fname = file.filename if file.filename else "statement.csv"
    mapping_config = await get_broker_trade_mapping(conn, uid, parsed_conn_id, "file_upload")
    mapped_trades = parse_and_map_file_trades(content, fname, mapping_config)
    for t in mapped_trades:
        t["broker_connection_id"] = parsed_conn_id
        t["source"] = "file"
    rows = await insert_trades_batch(conn, mapped_trades, uid)
    await invalidate_dashboard_cache(uid)
    return {"success": True, "count": len(rows), "trades": [format_trade(r) for r in rows]}

@trading_router.post("/upload-image")
@trading_router.post("/upload-screenshot")
@trading_router.post("/notes/images")
@trading_router.post("/trades/{unique_id}/attachments")
async def upload_attachment_endpoint(
    unique_id: str | None = None,
    uniqueId: str | None = Query(None),
    unique_id_form: str | None = Form(None, alias="unique_id"),
    target: str = Query("screenshot"),
    file: UploadFile | None = File(None),
    screenshot: UploadFile | None = File(None),
    image: UploadFile | None = File(None),
    user_id: Any = Depends(get_current_user_id),
    pool: asyncpg.Pool = Depends(init_db)
):
    upload_file = file or screenshot or image
    if not upload_file:
        raise AppError(ERROR_MESSAGES["STORAGE"]["NO_FILE"])
    uid = unique_id or uniqueId or unique_id_form
    content = await upload_file.read()
    fname = upload_file.filename or "upload.jpg"
    tgt = "note" if (upload_file is image or target == "note") else "screenshot"
    return await upload_trade_attachment(pool, int(user_id), content, fname, unique_id=uid, target=tgt)

@trading_router.delete("/trades/{unique_id}/attachments")
async def delete_attachment_endpoint(
    unique_id: str,
    payload: dict | None = None,
    user_id: Any = Depends(get_current_user_id),
    pool: asyncpg.Pool = Depends(init_db)
):
    att_url = payload.get("screenshotUrl") if isinstance(payload, dict) else None
    if not att_url:
        raise AppError(ERROR_MESSAGES["STORAGE"]["URL_REQUIRED"])
    return await delete_trade_attachment(pool, int(user_id), unique_id, att_url)

