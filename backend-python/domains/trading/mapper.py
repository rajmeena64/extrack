import json
import uuid
import asyncpg
from core.errors.app_error import AppError
from core.errors.messages import ERROR_MESSAGES
from domains.instruments.registry import ensure_loaded

CANONICAL_FIELDS = (
    "unique_id", "symbol", "side", "status", "quantity", "entry_price", "exit_price",
    "entry_timestamp", "exit_timestamp", "gross_pnl", "net_pnl", "total_charges",
    "pnl_currency", "contract_multiplier", "product_type", "category", "strategy",
    "notes", "attachments", "source", "stop_loss", "take_profit", "percent_change"
)

def _normalize_side(val: any, inverse: bool = False) -> str:
    s = str(val if val is not None else "").strip().lower()
    is_buy = s in ("buy", "long", "1", "b")
    if inverse:
        return "short" if is_buy else "long"
    return "long" if is_buy else "short"

def _to_float(val: any) -> float | None:
    if val is None or str(val).strip() == "":
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None

def map_manual_trade(raw: dict) -> dict:
    exit_p = _to_float(raw.get("exit_price"))
    mult = _to_float(raw.get("contract_multiplier"))
    if mult is None:
        mult = _to_float(raw.get("multiplier"))
    if mult is None and isinstance(raw.get("market_details"), dict):
        mult = _to_float(raw["market_details"].get("contractSize"))
    if mult is None and isinstance(raw.get("option_details"), dict):
        mult = _to_float(raw["option_details"].get("contractMultiplier"))
    mult_f = mult if (mult is not None and mult > 0) else None
    charges = raw.get("total_charges")
    if charges is None and isinstance(raw.get("charges"), dict):
        charges = sum(abs(_to_float(v) if _to_float(v) is not None else 0.0) for v in raw["charges"].values())
    net_p = _to_float(raw.get("net_pnl"))
    if net_p is None and "actual_net_pnl" in raw:
        net_p = _to_float(raw.get("actual_net_pnl"))
    tot_qty = _to_float(raw.get("quantity"))
    if tot_qty is None or tot_qty <= 0:
        raise AppError(ERROR_MESSAGES["TRADING"]["INVALID_DATA"])
    closed_qty = _to_float(raw.get("closed_quantity"))
    raw_curr = str(raw["currency"]).upper().strip() if raw.get("currency") is not None else ""
    if not raw_curr and raw.get("pnl_currency") is not None:
        raw_curr = str(raw["pnl_currency"]).upper().strip()
    pnl_curr = str(raw["pnl_currency"]).upper().strip() if raw.get("pnl_currency") is not None else raw_curr
    status = str(raw["status"]) if raw.get("status") is not None else ("closed" if exit_p is not None else "open")
    return {
        "unique_id": str(raw["unique_id"] if raw.get("unique_id") is not None else uuid.uuid4()),
        "symbol": str(raw["symbol"] if raw.get("symbol") is not None else "").strip().upper(),
        "side": _normalize_side(raw.get("side")),
        "status": status,
        "quantity": tot_qty,
        "closed_quantity": closed_qty,
        "entry_price": _to_float(raw.get("entry_price")),
        "exit_price": exit_p,
        "entry_timestamp": raw.get("entry_timestamp"),
        "exit_timestamp": raw.get("exit_timestamp"),
        "gross_pnl": _to_float(raw.get("gross_pnl")),
        "net_pnl": net_p,
        "total_charges": _to_float(charges) if charges is not None else 0.0,
        "currency": raw_curr,
        "pnl_currency": pnl_curr,
        "contract_multiplier": mult_f,
        "product_type": raw.get("product_type"),
        "category": raw.get("category"),
        "strategy": raw.get("strategy"),
        "notes": raw.get("notes"),
        "attachments": raw["attachments"] if raw.get("attachments") is not None else [],
        "source": "manual",
        "stop_loss": _to_float(raw.get("stop_loss")),
        "take_profit": _to_float(raw.get("take_profit")),
        "percent_change": _to_float(raw.get("percent_change")),
        "option_details": raw.get("option_details"),
        "market_details": raw.get("market_details"),
        "setup": raw.get("setup"),
        "mistakes": raw.get("mistakes"),
        "custom_tags": raw.get("custom_tags"),
        "execution_score": _to_float(raw.get("execution_score")) if raw.get("execution_score") is not None else _to_float(raw.get("trade_rating")),
        "review_summary": raw.get("review_summary"),
    }

async def get_broker_trade_mapping(pool: asyncpg.Pool, user_id: int, connection_id: uuid.UUID, trade_method: str = "file_upload") -> dict:
    row = await pool.fetchrow("""
        SELECT COALESCE(target.trade_mapping, integration.trade_mapping, '{}'::jsonb) AS trade_mapping
        FROM broker_connections.user_broker_connections connection
        JOIN trading_catalog.broker_integrations integration ON integration.id = connection.integration_id
        LEFT JOIN trading_catalog.brokers broker ON broker.id = integration.broker_id
        LEFT JOIN trading_catalog.broker_integrations target ON target.broker_id = broker.id AND (target.trade_method = $3 OR ($3 = 'file_upload' AND target.trade_method = 'csv_upload')) AND target.is_active = TRUE
        WHERE connection.user_id = $1 AND connection.id = $2
        LIMIT 1
    """, user_id, connection_id, trade_method)
    if not row or not row["trade_mapping"]:
        return {}
    m = row["trade_mapping"]
    return json.loads(m) if isinstance(m, str) else dict(m)

def map_broker_trade(raw: dict, mapping_config: dict, source: str = "file") -> dict:
    fm = mapping_config["fieldMapping"] if mapping_config.get("fieldMapping") is not None else {}
    defaults = mapping_config["defaults"] if mapping_config.get("defaults") is not None else {}
    transforms = mapping_config["transforms"] if mapping_config.get("transforms") is not None else {}
    charge_fields = mapping_config["chargeFields"] if mapping_config.get("chargeFields") is not None else {}
    norm_raw = {str(k).strip().lower(): v for k, v in raw.items() if v is not None}
    def _read(canonical: str):
        if canonical in norm_raw and str(norm_raw[canonical]).strip() != "":
            return norm_raw[canonical]
        aliases = fm.get(canonical, [canonical])
        if not isinstance(aliases, list):
            aliases = [aliases]
        for a in aliases:
            k = str(a).strip().lower()
            if k in norm_raw and str(norm_raw[k]).strip() != "":
                return norm_raw[k]
        return defaults.get(canonical)
    side_val = _read("side")
    side = _normalize_side(side_val, transforms.get("side") == "inverse_side")
    exit_p = _to_float(_read("exit_price"))
    total_charges = 0.0
    if charge_fields:
        for src_key in charge_fields.keys():
            k = str(src_key).strip().lower()
            if k in norm_raw:
                val = _to_float(norm_raw[k])
                if val:
                    total_charges += abs(val)
    if total_charges == 0.0:
        chg_val = _read("total_charges")
        if chg_val is None:
            chg_val = _read("charges")
        total_charges = abs(_to_float(chg_val) if _to_float(chg_val) is not None else 0.0)
    mult_val = _read("contract_multiplier")
    if mult_val is None:
        mult_val = _read("lot_size")
    mult_f = _to_float(mult_val)
    qty_val = _to_float(_read("quantity"))
    if qty_val is None or qty_val <= 0:
        raise AppError(ERROR_MESSAGES["TRADING"]["INVALID_DATA"])
    b_curr = _read("currency")
    if not b_curr:
        b_curr = _read("pnl_currency")
    b_pnl_curr = _read("pnl_currency")
    if not b_pnl_curr:
        b_pnl_curr = b_curr
    status = str(_read("status")) if _read("status") is not None else ("closed" if exit_p is not None else "open")
    return {
        "unique_id": str(_read("unique_id") if _read("unique_id") is not None else uuid.uuid4()),
        "symbol": str(_read("symbol") if _read("symbol") is not None else "").strip().upper(),
        "side": side,
        "status": status,
        "quantity": qty_val,
        "entry_price": _to_float(_read("entry_price")),
        "exit_price": exit_p,
        "entry_timestamp": _read("entry_timestamp"),
        "exit_timestamp": _read("exit_timestamp"),
        "gross_pnl": _to_float(_read("gross_pnl")),
        "net_pnl": _to_float(_read("net_pnl")),
        "total_charges": total_charges,
        "currency": str(b_curr if b_curr is not None else "").upper().strip(),
        "pnl_currency": str(b_pnl_curr if b_pnl_curr is not None else "").upper().strip(),
        "contract_multiplier": mult_f if mult_f and mult_f > 0 else None,
        "product_type": _read("product_type") if _read("product_type") is not None else defaults.get("product_type"),
        "category": _read("category") if _read("category") is not None else defaults.get("category"),
        "strategy": _read("strategy"),
        "notes": _read("notes"),
        "attachments": raw["attachments"] if raw.get("attachments") is not None else [],
        "source": source,
        "stop_loss": _to_float(_read("stop_loss")),
        "take_profit": _to_float(_read("take_profit")),
        "percent_change": _to_float(_read("percent_change")),
    }

VALID_SOURCES = ("manual", "file", "sync")

async def normalize_trade_payload(pool: asyncpg.Pool, raw: dict, user_id: int, connection_id: uuid.UUID | None) -> dict:
    await ensure_loaded()
    src = str(raw["source"] if raw.get("source") is not None else "manual").lower().strip()
    if src not in VALID_SOURCES:
        raise AppError(ERROR_MESSAGES["TRADING"]["INVALID_DATA"])
    if src == "manual":
        return map_manual_trade(raw)
    trade_method = "api_sync" if src == "sync" else "file_upload"
    config = await get_broker_trade_mapping(pool, user_id, connection_id, trade_method) if connection_id else {}
    return map_broker_trade(raw, config, src)
