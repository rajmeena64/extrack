#!/usr/bin/env bash
set -euo pipefail

AGENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MT5_INSTANCES_DIR="${MT5_INSTANCES_DIR:-/home/ubuntu/mt5-instances}"
SYNC_SETTLE_SECONDS="${MT5_SYNC_SETTLE_SECONDS:-45}"
SANITIZER="$AGENT_DIR/lib/sanitize-log.sh"

job_json="$(cat)"
job_id="$(printf '%s' "$job_json" | python3 -c 'import json,sys; print(json.load(sys.stdin)["job_id"])')"
instance_key="$(printf '%s' "$job_json" | python3 -c 'import json,sys; print(json.load(sys.stdin)["instance_key"])')"
login_id="$(printf '%s' "$job_json" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("login") or "")')"

case "$instance_key" in
  ""|*/*|*..*|*" "*)
    echo "Unsafe instance key" >&2
    exit 1
    ;;
esac

instance_root="$MT5_INSTANCES_DIR/$instance_key"
scripts_dir="$instance_root/scripts"
lock_dir="$instance_root/.sync.lock"

log_info() {
  printf '%s %s\n' "$(date -Is)" "$*" | "$SANITIZER" >&2
}

case "$(readlink -m "$instance_root")" in
  "$(readlink -m "$MT5_INSTANCES_DIR")"/*) ;;
  *)
    echo "Instance path escaped instances directory" >&2
    exit 1
    ;;
esac

if [ ! -d "$instance_root" ]; then
  echo "MT5 instance folder does not exist" >&2
  exit 1
fi

if ! mkdir "$lock_dir" 2>/dev/null; then
  echo "MT5 account folder is already locked by another job" >&2
  exit 1
fi

cleanup() {
  if [ -x "$scripts_dir/stop.sh" ]; then
    "$scripts_dir/stop.sh" || true
  fi
  rmdir "$lock_dir" 2>/dev/null || true
}
trap cleanup EXIT

if "$AGENT_DIR/lib/verify-running.sh" "$instance_root" >/dev/null; then
  echo "MT5 account folder is already running" >&2
  exit 1
fi

if [ ! -x "$scripts_dir/start.sh" ] || [ ! -x "$scripts_dir/stop.sh" ]; then
  echo "MT5 instance scripts are missing; reconnect this account to recreate the persistent folder" >&2
  exit 1
fi

log_info "sync launching job=$job_id instance=$instance_key"
"$AGENT_DIR/lib/report-sync-status.sh" "$job_id" "launching_terminal" || true
"$scripts_dir/start.sh"

for wait_seconds in 5 5 10 15 25; do
  sleep "$wait_seconds"
  if "$AGENT_DIR/lib/verify-running.sh" "$instance_root" >/dev/null; then
    if [ -n "$login_id" ]; then
      "$AGENT_DIR/lib/verify-login.sh" "$instance_root" "$login_id" || true
    fi
    "$AGENT_DIR/lib/report-sync-status.sh" "$job_id" "fetching_trades" || true
    sleep "$SYNC_SETTLE_SECONDS"
    "$AGENT_DIR/lib/report-sync-status.sh" "$job_id" "saving_data" || true
    sleep 5
    exit 0
  fi
done

echo "MT5 terminal did not become verified running for sync" >&2
exit 1
