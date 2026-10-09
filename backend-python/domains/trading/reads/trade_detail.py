import json
from datetime import datetime
import asyncpg
from core.calculations.formulas import (
    calculate_trade_risk,
    calculate_initial_target,
    calculate_planned_r_multiple,
    calculate_realized_r_multiple,
    calculate_percent_change,
    calculate_adjusted_cost,
    resolve_multiplier,
)
from core.finance.currency import get_cached_fx_rate, convert_trade_pnl

TYPE_LABELS = {
    "equity": "Stock / Equity", "stock": "Stock / Equity",
    "option": "Option", "future": "Futures",
    "perpetual": "Perpetual", "spot": "Crypto Spot",
    "forex": "Forex / CFD", "cfd": "CFD",
}
CURR_SYMS = {"USD": "$", "USC": "¢", "USDT": "$", "USDC": "$", "EUR": "€", "GBP": "£", "INR": "₹", "JPY": "¥", "AUD": "A$", "CAD": "C$", "CHF": "Fr", "AED": "AED", "SGD": "S$"}

def _market_rows(cat: str, opt: dict | None, mkt: dict | None, r: dict) -> list[dict]:
    rows = []
    opt = opt if opt is not None else {}
    mkt = mkt if mkt is not None else {}
    curr = r["pnl_currency"] if r.get("pnl_currency") is not None else "USD"
    sym = CURR_SYMS.get(curr, f"{curr} ")
    if cat == "option":
        if opt.get("underlyingSymbol"): rows.append({"label": "Underlying symbol", "value": str(opt["underlyingSymbol"])})
        if opt.get("optionType"): rows.append({"label": "Option type", "value": str(opt["optionType"]).capitalize()})
        if opt.get("strikePrice") is not None: rows.append({"label": "Strike price", "value": str(opt["strikePrice"])})
        if opt.get("expiryDate"): rows.append({"label": "Expiry date", "value": str(opt["expiryDate"])})
        if r.get("entry_price") is not None: rows.append({"label": "Entry premium", "value": f"{sym}{float(r['entry_price']):.2f}"})
        if r.get("exit_price") is not None: rows.append({"label": "Exit premium", "value": f"{sym}{float(r['exit_price']):.2f}"})
        if opt.get("contractMultiplier") is not None: rows.append({"label": "Contract multiplier", "value": str(opt["contractMultiplier"])})
        if opt.get("lotSize") is not None: rows.append({"label": "Lot size", "value": str(opt["lotSize"])})
        if opt.get("expirationOutcome"): rows.append({"label": "Settlement outcome", "value": str(opt["expirationOutcome"]).capitalize()})
    elif cat in ("future", "perpetual"):
        if mkt.get("leverage"): rows.append({"label": "Leverage", "value": f"{mkt['leverage']}x"})
        if mkt.get("marginMode"): rows.append({"label": "Margin mode", "value": str(mkt["marginMode"]).capitalize()})
        if mkt.get("liquidationPrice") is not None: rows.append({"label": "Liquidation price", "value": str(mkt["liquidationPrice"])})
        if mkt.get("fundingFee") is not None: rows.append({"label": "Funding fee", "value": f"{sym}{float(mkt['fundingFee']):.2f}"})
    elif cat in ("forex", "cfd"):
        if mkt.get("lotSize") is not None: rows.append({"label": "Lot size", "value": str(mkt["lotSize"])})
        if mkt.get("leverage"): rows.append({"label": "Leverage", "value": f"{mkt['leverage']}x"})
        if mkt.get("commission") is not None: rows.append({"label": "Commission", "value": f"{sym}{float(mkt['commission']):.2f}"})
        if mkt.get("swap") is not None: rows.append({"label": "Swap", "value": f"{sym}{float(mkt['swap']):.2f}"})
    elif cat == "spot":
        if mkt.get("baseAsset"): rows.append({"label": "Base asset", "value": str(mkt["baseAsset"])})
        if mkt.get("quoteAsset"): rows.append({"label": "Quote asset", "value": str(mkt["quoteAsset"])})
        if mkt.get("tradingFee") is not None: rows.append({"label": "Trading fee", "value": f"{sym}{float(mkt['tradingFee']):.2f}"})
    return rows

async def fetch_trade_detail(pool: asyncpg.Pool, user_id: int, unique_id: str, target_currency: str | None = None) -> dict | None:
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
    if not row:
        return None
    r = dict(row)
    net, gross = r.get("net_pnl"), r.get("gross_pnl")
    pnl = round(float(r["pnl"] if r.get("pnl") is not None else (net if net is not None else (gross if gross is not None else 0.0))), 2)
    custom = r.get("custom_fields") if isinstance(r.get("custom_fields"), dict) else {}
    platform = r.get("platform_name") if r.get("platform_name") is not None else custom.get("platform")
    setup = custom.get("setup") if custom.get("setup") is not None else r.get("strategy")
    ep = float(r["entry_price"]) if r.get("entry_price") is not None else None
    xp = float(r["exit_price"]) if r.get("exit_price") is not None else None
    qty = float(r["quantity"]) if r.get("quantity") is not None else None
    sl = float(r["stop_loss"]) if r.get("stop_loss") is not None else None
    tp = float(r["take_profit"]) if r.get("take_profit") is not None else None
    side = str(r["side"]).lower() if r.get("side") is not None else "long"
    cat = str(r["category"]).lower() if r.get("category") is not None else ""
    mult = resolve_multiplier(str(r["symbol"]), r.get("product_type"), r) if r.get("symbol") is not None else 1.0
    dur = None
    ent_dt = None
    ext_dt = None
    if r.get("entry_timestamp"):
        try:
            ent_dt = r["entry_timestamp"] if isinstance(r["entry_timestamp"], datetime) else datetime.fromisoformat(str(r["entry_timestamp"]).replace("Z", "+00:00"))
        except Exception:
            ent_dt = None
    if r.get("exit_timestamp"):
        try:
            ext_dt = r["exit_timestamp"] if isinstance(r["exit_timestamp"], datetime) else datetime.fromisoformat(str(r["exit_timestamp"]).replace("Z", "+00:00"))
        except Exception:
            ext_dt = None
    if ent_dt and ext_dt:
        dur = max(1, round(abs((ext_dt - ent_dt).total_seconds()) / 60))

    tgt = target_currency.upper().strip() if target_currency else None
    src_curr = r.get("pnl_currency")
    if tgt and src_curr:
        d_str = str(ent_dt.date()) if ent_dt else (str(ext_dt.date()) if ext_dt else None)
        rate = get_cached_fx_rate(src_curr, tgt, d_str)
        pnl = convert_trade_pnl(pnl, src_curr, tgt, rate)
        if net is not None: net = convert_trade_pnl(float(net), src_curr, tgt, rate)
        if gross is not None: gross = convert_trade_pnl(float(gross), src_curr, tgt, rate)
        if r.get("total_charges") is not None:
            r["total_charges"] = convert_trade_pnl(float(r["total_charges"]), src_curr, tgt, rate)
        r["pnl_currency"] = tgt

    pos_val = calculate_adjusted_cost(qty, ep, mult) if (qty is not None and ep is not None) else None
    price_roi = calculate_percent_change(ep, xp, side) if (ep is not None and xp is not None and side in ("long", "short")) else (float(r["percent_change"]) if r.get("percent_change") is not None else None)
    risk_val = calculate_trade_risk(ep, sl, qty, mult) if (ep is not None and sl is not None and qty is not None) else None
    target_val = calculate_initial_target(ep, tp, qty, mult) if (ep is not None and tp is not None and qty is not None) else None
    planned_r = calculate_planned_r_multiple(risk_val, target_val) if (risk_val is not None and target_val is not None) else None
    realized_r = calculate_realized_r_multiple(float(net) if net is not None else pnl, risk_val) if risk_val is not None else None

    inst_label = TYPE_LABELS.get(cat, cat.capitalize() if cat else "Stock / Equity")
    opt = r.get("option_details") if isinstance(r.get("option_details"), dict) else (json.loads(r["option_details"]) if isinstance(r.get("option_details"), str) else None)
    opt_type = opt.get("optionType") if opt else None
    dir_label = f"{side.capitalize()} {opt_type.capitalize()}" if (cat == "option" and opt_type) else side.capitalize()
    unit = r.get("quantity_unit")
    qty_fmt = f"{qty} {unit}" if (qty is not None and unit) else (str(qty) if qty is not None else "--")

    mkt = r.get("market_details") if isinstance(r.get("market_details"), dict) else (json.loads(r["market_details"]) if isinstance(r.get("market_details"), str) else None)
    mkt_rows = _market_rows(cat, opt, mkt, r)

    raw_att = r.get("attachments")
    att = json.loads(raw_att) if isinstance(raw_att, str) else (raw_att if isinstance(raw_att, list) else [])
    is_opt = cat == "option"
    sym = str(r["symbol"]) if r.get("symbol") is not None else ""
    underlying = opt.get("underlyingSymbol") if opt else None
    icon_sym = underlying if underlying is not None else (sym.split("-")[0] if is_opt else sym)

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
        "entryDateFormatted": ent_dt.strftime("%d %b %Y") if ent_dt else "--",
        "entryTimeFormatted": ent_dt.strftime("%H:%M") if ent_dt else "--",
        "exitTimeFormatted": ext_dt.strftime("%H:%M") if ext_dt else None,
        "isoDate": ent_dt.strftime("%Y-%m-%d") if ent_dt else None,
        "entryEpoch": int(ent_dt.timestamp()) if ent_dt else None,
        "exitEpoch": int(ext_dt.timestamp()) if ext_dt else None,
        "tradeType": side,
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
        "instrumentTypeLabel": inst_label,
        "directionLabel": dir_label,
        "quantityFormatted": qty_fmt,
        "marketDetailRows": mkt_rows,
        "attachments": att,
        "isOptionTrade": is_opt,
        "iconSymbol": icon_sym,
        "tradeQuality": custom.get("trade_quality"),
        "tradeRating": custom.get("trade_rating"),
        "executionScore": r.get("execution_score"),
        "optionDetails": opt,
        "marketDetails": mkt,
        "mistakes": r.get("mistakes"),
        "customTags": r.get("custom_tags"),
        "reviewSummary": r.get("review_summary"),
    }
