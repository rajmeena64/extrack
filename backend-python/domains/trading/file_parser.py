import io
import json
import csv
import re
from typing import List, Dict, Any
import pandas as pd
from core.errors.app_error import AppError
from core.errors.messages import ERROR_MESSAGES
from domains.trading.mapper import map_broker_trade

def _norm(v: Any) -> str:
    return re.sub(r'[^a-z0-9]+', '_', str(v if v is not None else '').strip().lower()).strip('_')

def parse_file_to_rows(content: bytes, filename: str) -> List[List[Any]]:
    fname = filename.lower()
    if fname.endswith(('.xlsx', '.xls')):
        try:
            df = pd.read_excel(io.BytesIO(content), header=None)
            return df.fillna('').values.tolist()
        except Exception:
            raise AppError(ERROR_MESSAGES["TRADING"]["FILE_FORMAT_UNSUPPORTED"])
    if fname.endswith('.json'):
        try:
            data = json.loads(content.decode('utf-8', errors='ignore'))
            records = data if isinstance(data, list) else (data["trades"] if (isinstance(data, dict) and isinstance(data.get("trades"), list)) else [])
            if not records or not isinstance(records, list):
                raise AppError(ERROR_MESSAGES["TRADING"]["FILE_EMPTY"])
            keys = list(records[0].keys())
            return [keys] + [[r.get(k, '') for k in keys] for r in records]
        except Exception:
            raise AppError(ERROR_MESSAGES["TRADING"]["FILE_FORMAT_UNSUPPORTED"])
    text = content.decode('utf-8', errors='ignore')
    if fname.endswith(('.html', '.htm')) or '<table' in text.lower():
        try:
            tables = pd.read_html(io.StringIO(text))
            if not tables:
                raise AppError(ERROR_MESSAGES["TRADING"]["FILE_EMPTY"])
            return tables[0].fillna('').values.tolist()
        except Exception:
            raise AppError(ERROR_MESSAGES["TRADING"]["FILE_FORMAT_UNSUPPORTED"])
    lines = [l for l in text.splitlines() if l.strip()]
    if not lines:
        raise AppError(ERROR_MESSAGES["TRADING"]["FILE_EMPTY"])
    delim = ';' if ';' in lines[0] and ',' not in lines[0] else '\t' if '\t' in lines[0] else ','
    reader = csv.reader(lines, delimiter=delim)
    return [row for row in reader if any(row)]

def parse_and_map_file_trades(content: bytes, filename: str, mapping_config: dict) -> List[Dict[str, Any]]:
    req_headers = mapping_config["requiredHeaders"] if mapping_config.get("requiredHeaders") is not None else []
    if any(h.startswith("__") for h in req_headers):
        raise AppError(ERROR_MESSAGES["TRADING"]["IMPORT_NOT_SUPPORTED"])
    rows = parse_file_to_rows(content, filename)
    if not rows:
        raise AppError(ERROR_MESSAGES["TRADING"]["FILE_EMPTY"])
    field_map = mapping_config["fieldMapping"] if mapping_config.get("fieldMapping") is not None else {}
    exp_aliases = set(_norm(h) for h in req_headers if h and not h.startswith("__"))
    for sf in field_map.values():
        aliases = sf if isinstance(sf, list) else [sf]
        for a in aliases:
            if a:
                exp_aliases.add(_norm(a))
    exp_headers = list(exp_aliases)
    best_idx, max_score = -1, 0
    for idx, row in enumerate(rows[:50]):
        norm_row = [_norm(c) for c in row]
        score = sum(1 for exp in exp_headers if exp in norm_row)
        if score > max_score and score >= 2:
            max_score = score
            best_idx = idx
    if best_idx == -1 and field_map:
        raise AppError(ERROR_MESSAGES["TRADING"]["HEADER_VALIDATION_FAILED"])
    header_row = [_norm(c) for c in rows[best_idx]] if best_idx != -1 else []
    data_rows = rows[best_idx + 1:] if best_idx != -1 else rows
    result_trades = []
    for r in data_rows:
        if not any(r):
            continue
        raw_dict = {}
        if header_row:
            for col_i, val in enumerate(r):
                if col_i < len(header_row) and header_row[col_i]:
                    raw_dict[header_row[col_i]] = val
        else:
            raw_dict = {f"col_{i}": v for i, v in enumerate(r)}
        try:
            mapped = map_broker_trade(raw_dict, mapping_config, source="file")
            ep, qty = mapped.get("entry_price"), mapped.get("quantity")
            if mapped.get("entry_timestamp") and mapped.get("symbol") and ep and ep > 0 and qty and qty > 0:
                result_trades.append(mapped)
        except AppError:
            continue
    if not result_trades:
        raise AppError(ERROR_MESSAGES["TRADING"]["FILE_EMPTY"])
    return result_trades
