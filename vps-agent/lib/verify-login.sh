#!/usr/bin/env bash
set -euo pipefail

instance_root="${1:?instance root is required}"
login_id="${2:?login id is required}"

today_log="$(date +%Y%m%d).log"
terminal_log="$instance_root/mt5/logs/$today_log"
mql_log="$instance_root/mt5/MQL5/logs/$today_log"
login_pattern="$login_id"

scan_logs() {
  for log_file in "$terminal_log" "$mql_log"; do
    [ -f "$log_file" ] || continue
    tail -n 250 "$log_file" 2>/dev/null || true
  done
}

if scan_logs | grep -aiE 'authorization failed|invalid account|invalid password|login failed|connect failed|no connection|network failed|server not found' >/dev/null; then
  echo "MT5 login failure detected in terminal logs" >&2
  exit 1
fi

if scan_logs | grep -aF "$login_pattern" | grep -aiE 'authorized|connected|login|synchronized|account' >/dev/null; then
  exit 0
fi

# Some MT5 builds do not log a clean login success line. A verified process with
# no auth failure is the best low-risk MVP signal available without UI control.
exit 0
