#!/usr/bin/env python3
# pyright: reportMissingImports=false
"""
Bulk S3 / R2 Parquet Candles to Tinybird Importer
Reads ZSTD-compressed Parquet files from S3/R2 and bulk-appends them to Tinybird.
"""

import os
import io
import re
import sys
import gzip
import time
from pathlib import Path
from collections import defaultdict

import boto3
import botocore
from botocore.config import Config
import pyarrow.parquet as pq
import pyarrow.compute as pc
import pyarrow as pa
import requests
from dotenv import load_dotenv

# Load .env from backend directory
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(env_path)

# Credentials & Configuration
TINYBIRD_TOKEN = os.getenv("TINYBIRD_TOKEN")
TINYBIRD_URL = os.getenv("TINYBIRD_URL", "https://api.ap-east-1.aws.tinybird.co").rstrip("/")
DATASOURCE_NAME = "candles"

# S3 / Cloudflare R2 Settings
R2_ENDPOINT = os.getenv("R2_ENDPOINT")
R2_ACCESS_KEY_ID = os.getenv("R2_ACCESS_KEY_ID") or os.getenv("AWS_ACCESS_KEY_ID")
R2_SECRET_ACCESS_KEY = os.getenv("R2_SECRET_ACCESS_KEY") or os.getenv("AWS_SECRET_ACCESS_KEY")
BUCKET_NAME = os.getenv("R2_BUCKET_NAME", "binance")

# Batching threshold (e.g. 500,000 rows per HTTP append)
MAX_ROWS_PER_APPEND = 500_000


def get_s3_client():
    """Initializes and returns boto3 S3 client for AWS S3 or Cloudflare R2."""
    if not R2_ACCESS_KEY_ID or not R2_SECRET_ACCESS_KEY:
        print("[ERROR] S3/R2 credentials not found in .env!")
        sys.exit(1)

    session = boto3.session.Session()
    client = session.client(
        "s3",
        endpoint_url=R2_ENDPOINT if R2_ENDPOINT else None,
        aws_access_key_id=R2_ACCESS_KEY_ID,
        aws_secret_access_key=R2_SECRET_ACCESS_KEY,
        config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
    )
    return client


def extract_symbol_from_key(key: str) -> str:
    """
    Extracts the symbol name from S3 object key.
    Examples:
      - 'AUDCAD_2007_09_30.parquet' -> 'AUDCAD'
      - 'forex/EURUSD/2026-01-01.parquet' -> 'EURUSD'
      - 'BTCUSDT-1m-2026-01.parquet' -> 'BTCUSDT'
    """
    filename = os.path.basename(key)
    # Match standard symbol prefix (e.g., AUDCAD, BTCUSDT, EUR_USD)
    match = re.match(r"^([A-Za-z0-9]+)[_\-\.]", filename)
    if match:
        return match.group(1).upper()
    # Fallback to parent directory name if filename doesn't have it
    parent = os.path.basename(os.path.dirname(key))
    if parent:
        return parent.upper()
    return "UNKNOWN"


def push_to_tinybird(csv_bytes: bytes, row_count: int, symbol: str) -> bool:
    """
    Sends compressed CSV data to Tinybird /v0/datasources/candles/append.
    """
    url = f"{TINYBIRD_URL}/v0/datasources/{DATASOURCE_NAME}/append"
    headers = {
        "Authorization": f"Bearer {TINYBIRD_TOKEN}",
        "Content-Encoding": "gzip",
        "Content-Type": "text/csv",
    }

    try:
        t0 = time.time()
        resp = requests.post(url, headers=headers, data=csv_bytes, timeout=120)
        elapsed = time.time() - t0

        if resp.status_code in [200, 201, 202]:
            print(f"  ✓ [{symbol}] Uploaded {row_count:,} rows in {elapsed:.2f}s")
            return True
        else:
            print(f"  ✗ [{symbol}] Failed! Status: {resp.status_code}, Response: {resp.text}")
            return False
    except Exception as e:
        print(f"  ✗ [{symbol}] Request error: {e}")
        return False


def process_and_upload_tables(tables: list, symbol: str):
    """
    Combines pyarrow tables for a symbol, formats columns, and uploads to Tinybird in large batches.
    """
    if not tables:
        return

    # Combine all tables for this symbol into one large table
    combined = pa.concat_tables(tables, promote_options="default")
    total_rows = combined.num_rows

    if total_rows == 0:
        return

    print(f"\n[Processing] Symbol: {symbol} | Total Rows: {total_rows:,}")

    # 1. Add / ensure 'symbol' column
    symbol_array = pa.array([symbol] * total_rows, type=pa.string())
    if "symbol" in combined.column_names:
        combined = combined.drop(["symbol"])
    combined = combined.append_column("symbol", symbol_array)

    # 2. Convert timestamp to Unix integer (seconds) if it's datetime/timestamp
    if "timestamp" in combined.column_names:
        ts_col = combined.column("timestamp")
        # If it's a timestamp / datetime type, convert to int64 seconds
        if pa.types.is_timestamp(ts_col.type):
            ts_seconds = pc.cast(pc.cast(ts_col, pa.int64()), pa.int64())
            # If timestamp unit is nanoseconds (1e9) or milliseconds (1e3), normalize to seconds
            if ts_col.type.unit == "ns":
                ts_seconds = pc.divide(ts_seconds, 1_000_000_000)
            elif ts_col.type.unit == "us":
                ts_seconds = pc.divide(ts_seconds, 1_000_000)
            elif ts_col.type.unit == "ms":
                ts_seconds = pc.divide(ts_seconds, 1_000)
            ts_seconds = pc.cast(ts_seconds, pa.int64())
            combined = combined.set_column(combined.schema.get_field_index("timestamp"), "timestamp", ts_seconds)

    # 3. Select canonical columns in exact order
    target_columns = ["symbol", "timestamp", "open", "high", "low", "close", "volume"]
    existing_columns = [c for c in target_columns if c in combined.column_names]
    combined = combined.select(existing_columns)

    # 4. Upload in batches (e.g. up to MAX_ROWS_PER_APPEND per request)
    offset = 0
    while offset < total_rows:
        chunk = combined.slice(offset, min(MAX_ROWS_PER_APPEND, total_rows - offset))
        chunk_rows = chunk.num_rows

        # Convert chunk to CSV in memory
        csv_buffer = io.BytesIO()
        # Write CSV with header only for the first chunk if needed (Tinybird append handles headers)
        import pyarrow.csv as pa_csv
        pa_csv.write_csv(chunk, csv_buffer, write_options=pa_csv.WriteOptions(include_header=True))
        raw_csv = csv_buffer.getvalue()

        # Gzip compress for minimum network bandwidth
        gzipped_csv = gzip.compress(raw_csv, compresslevel=6)

        # Push to Tinybird
        push_to_tinybird(gzipped_csv, chunk_rows, symbol)
        offset += chunk_rows


def run_import(prefix=""):
    """
    Main runner: lists files from S3/R2 and imports them symbol by symbol.
    """
    if not TINYBIRD_TOKEN:
        print("[ERROR] TINYBIRD_TOKEN not found in backend/.env!")
        sys.exit(1)

    s3 = get_s3_client()
    print(f"[*] Connecting to S3/R2 bucket '{BUCKET_NAME}'...")

    paginator = s3.get_paginator("list_objects_v2")
    pages = paginator.paginate(Bucket=BUCKET_NAME, Prefix=prefix)

    # Group Parquet files by symbol
    symbol_files = defaultdict(list)
    total_files = 0

    for page in pages:
        if "Contents" in page and page["Contents"]:
            for obj in page["Contents"]:
                key = obj["Key"]
                if key.endswith(".parquet"):
                    sym = extract_symbol_from_key(key)
                    symbol_files[sym].append(key)
                    total_files += 1

    print(f"[*] Found {total_files} parquet files across {len(symbol_files)} symbols.\n")

    start_time = time.time()

    for symbol, keys in symbol_files.items():
        print(f"[*] Fetching {len(keys)} parquet files for symbol {symbol}...")
        tables = []

        for key in keys:
            try:
                response = s3.get_object(Bucket=BUCKET_NAME, Key=key)
                file_body = response["Body"].read()
                table = pq.read_table(io.BytesIO(file_body))
                tables.append(table)
            except Exception as e:
                print(f"  ✗ Error reading S3 key '{key}': {e}")

        if tables:
            process_and_upload_tables(tables, symbol)

    total_time = time.time() - start_time
    print(f"\n[DONE] Import completed in {total_time:.2f}s.")


if __name__ == "__main__":
    # Optional prefix argument: python import_s3_candles_to_tinybird.py [prefix]
    filter_prefix = sys.argv[1] if len(sys.argv) > 1 else ""
    run_import(prefix=filter_prefix)
