#!/usr/bin/env python3
import os
import stat
import sys


def preset_line(name, value):
    return f"{name}={value}"


def main():
    if len(sys.argv) != 4:
        raise SystemExit("usage: write-ea-preset.py <preset-path> <backend-url> <ingest-secret>")

    preset_path = sys.argv[1]
    backend_url = sys.argv[2].rstrip("/")
    ingest_secret = sys.argv[3]

    if not backend_url:
        raise SystemExit("backend url is required")

    job_url = f"{backend_url}/api/mt5/kline-jobs"
    result_url = f"{backend_url}/api/mt5/bulk-klines"
    server_url = f"{backend_url}/api/save-api-trade"
    balance_url = f"{backend_url}/api/mt5/balance-update"

    os.makedirs(os.path.dirname(preset_path), exist_ok=True)

    content = "\r\n".join(
        [
            preset_line("JobUrl", job_url),
            preset_line("ResultUrl", result_url),
            preset_line("ServerURL", server_url),
            preset_line("BalanceURL", balance_url),
            preset_line("IngestSecret", ingest_secret),
            preset_line("PollSeconds", "5"),
            preset_line("MaxCandlesPerJob", "5000"),
            preset_line("Timeout", "15000"),
            preset_line("SyncIntervalMs", "5000"),
            preset_line("SendInitialHistory", "true"),
            preset_line("SendRealTimeUpdates", "true"),
            preset_line("SendBalanceUpdates", "false"),
            preset_line("MinBalanceChange", "1.0"),
            preset_line("ResendAllOnStart", "true"),
            preset_line("TrackSentPairs", "true"),
            "",
        ]
    )

    with open(preset_path, "w", encoding="utf-8", newline="") as handle:
        handle.write(content)

    os.chmod(preset_path, stat.S_IRUSR | stat.S_IWUSR)


if __name__ == "__main__":
    main()
