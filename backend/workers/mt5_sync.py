import sys
import json
import argparse
from zoneinfo import ZoneInfo
from datetime import datetime, timezone, timedelta
import MetaTrader5 as mt5

def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--login", type=int, required=True)
    parser.add_argument("--password", type=str, required=True)
    parser.add_argument("--server", type=str, required=True)
    parser.add_argument("--path", type=str, default=None)
    parser.add_argument("--from-timestamp", type=int, default=0)
    parser.add_argument("--gmt-offset", type=int, default=None)
    return parser.parse_args()

def resolve_close_reason(reason):
    reasons = {
        mt5.DEAL_REASON_CLIENT: "manual_close",
        mt5.DEAL_REASON_SL: "stop_loss",
        mt5.DEAL_REASON_TP: "take_profit",
        mt5.DEAL_REASON_SO: "liquidation",
        mt5.DEAL_REASON_EXPERT: "manual_close",
    }
    return reasons.get(reason, "unknown")

def detect_friday_close_offset():
    now = datetime.now(timezone.utc)
    days_back = (now.weekday() - 4) % 7
    if days_back == 0 and now.hour < 21:
        days_back = 7
    last_friday = now - timedelta(days=days_back)
    ny_close_utc = int(datetime(last_friday.year, last_friday.month, last_friday.day, 17, 0, 0, tzinfo=ZoneInfo("America/New_York")).astimezone(timezone.utc).timestamp())
    from_dt = datetime(last_friday.year, last_friday.month, last_friday.day, 0, 0)
    to_dt = from_dt + timedelta(days=2)

    for sym in ["EURUSD", "EURUSDm", "GBPUSD", "GBPUSDm", "BTCUSD", "BTCUSDm"]:
        rates = mt5.copy_rates_range(sym, mt5.TIMEFRAME_M1, from_dt, to_dt)
        if rates is not None and len(rates) > 0:
            last_bar = rates[-1]
            bar_close_time = int(last_bar["time"]) + 60
            diff = bar_close_time - ny_close_utc
            return round(diff / 3600) * 3600

    syms = mt5.symbols_get()
    for s in (syms if syms else [])[:20]:
        tick = mt5.symbol_info_tick(s.name)
        if tick and tick.time > 0:
            diff = tick.time - int(now.timestamp())
            return round(diff / 3600) * 3600
    return 0

def match_completed_trades(deals, gmt_offset_sec):
    open_legs = []
    completed = []
    sorted_deals = sorted(deals, key=lambda d: (d.time, d.ticket))

    for deal in sorted_deals:
        if deal.entry == mt5.DEAL_ENTRY_IN:
            open_legs.append({
                "ticket": deal.ticket,
                "order": deal.order,
                "position_id": deal.position_id,
                "symbol": deal.symbol,
                "type": deal.type,
                "volume": deal.volume,
                "price": deal.price,
                "time": deal.time,
                "sl": getattr(deal, "sl", 0.0),
                "tp": getattr(deal, "tp", 0.0),
                "swap": deal.swap,
                "commission": deal.commission,
            })
            continue

        if deal.entry in (mt5.DEAL_ENTRY_OUT, mt5.DEAL_ENTRY_INOUT, getattr(mt5, "DEAL_ENTRY_OUT_BY", 3)):
            remaining_volume = deal.volume
            for leg in open_legs:
                if remaining_volume <= 1e-7:
                    break
                if leg["volume"] <= 1e-7 or leg["position_id"] != deal.position_id or leg["symbol"] != deal.symbol:
                    continue
                if (leg["type"] == mt5.DEAL_TYPE_BUY and deal.type != mt5.DEAL_TYPE_SELL) or \
                   (leg["type"] == mt5.DEAL_TYPE_SELL and deal.type != mt5.DEAL_TYPE_BUY):
                    continue

                matched_volume = min(leg["volume"], remaining_volume)
                close_ratio = matched_volume / deal.volume if deal.volume > 0 else 1.0
                open_ratio = matched_volume / leg["volume"] if leg["volume"] > 0 else 1.0

                open_utc = leg["time"] - gmt_offset_sec
                close_utc = deal.time - gmt_offset_sec

                trade_key = f"{leg['ticket']}-{deal.ticket}"
                completed.append({
                    "trade_key": trade_key,
                    "position_id": deal.position_id,
                    "entry_deal": leg["ticket"],
                    "exit_deal": deal.ticket,
                    "symbol": deal.symbol,
                    "side": "long" if leg["type"] == mt5.DEAL_TYPE_BUY else "short",
                    "quantity": round(matched_volume, 6),
                    "entry_price": leg["price"],
                    "exit_price": deal.price,
                    "entry_timestamp": open_utc,
                    "exit_timestamp": close_utc,
                    "stop_loss": leg["sl"] if leg["sl"] > 0 else getattr(deal, "sl", None),
                    "take_profit": leg["tp"] if leg["tp"] > 0 else getattr(deal, "tp", None),
                    "close_reason": resolve_close_reason(deal.reason),
                    "gross_pnl": round(deal.profit * close_ratio, 4),
                    "net_pnl": round((deal.profit * close_ratio) + (deal.swap * close_ratio + leg["swap"] * open_ratio) + (deal.commission * close_ratio + leg["commission"] * open_ratio), 4),
                    "charges": round(abs((deal.commission * close_ratio + leg["commission"] * open_ratio) + (deal.swap * close_ratio + leg["swap"] * open_ratio)), 4),
                })

                leg["volume"] -= matched_volume
                remaining_volume -= matched_volume

    return completed

def main():
    args = parse_args()
    init_kwargs = {
        "login": args.login,
        "password": args.password,
        "server": args.server,
        "portable": True,
    }
    if args.path:
        init_kwargs["path"] = args.path

    if not mt5.initialize(**init_kwargs):
        err = mt5.last_error()
        print(json.dumps({
            "success": False,
            "code": "AUTHENTICATION_FAILED",
            "error": str(err),
            "message": "Failed to connect to MetaTrader 5 terminal with provided credentials"
        }))
        sys.exit(1)

    try:
        acc = mt5.account_info()
        if not acc:
            print(json.dumps({"success": False, "code": "ACCOUNT_INFO_FAILED", "error": str(mt5.last_error())}))
            sys.exit(1)

        from_ts = args.from_timestamp if args.from_timestamp > 0 else 0
        to_ts = 2000000000
        raw_deals = mt5.history_deals_get(from_ts, to_ts)
        if raw_deals is None:
            raw_deals = []

        gmt_offset = args.gmt_offset if args.gmt_offset is not None else detect_friday_close_offset()
        trades = match_completed_trades(raw_deals, gmt_offset)

        print(json.dumps({
            "success": True,
            "account": {
                "login": acc.login,
                "server": acc.server,
                "company": acc.company,
                "currency": acc.currency,
                "balance": acc.balance,
                "equity": acc.equity,
                "leverage": acc.leverage,
                "is_demo": acc.trade_mode == mt5.ACCOUNT_TRADE_MODE_DEMO,
            },
            "gmt_offset": gmt_offset,
            "trades": trades
        }))
    finally:
        mt5.shutdown()

if __name__ == "__main__":
    main()
