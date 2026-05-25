#!/usr/bin/env bash
set -euo pipefail

AGENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -f "$AGENT_DIR/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$AGENT_DIR/.env"
  set +a
fi

: "${BACKEND_URL:?BACKEND_URL is required}"
: "${VPS_AGENT_TOKEN:?VPS_AGENT_TOKEN is required}"

account_id="${1:?account id is required}"
instance_key="${2:?instance key is required}"
instances_dir="${MT5_INSTANCES_DIR:-/home/ubuntu/mt5-instances}"
instance_root="$instances_dir/$instance_key"

case "$instance_key" in
  ""|*/*|*..*|*" "*)
    echo "Unsafe instance key" >&2
    exit 1
    ;;
esac

case "$(readlink -m "$instance_root")" in
  "$(readlink -m "$instances_dir")"/*) ;;
  *)
    echo "Instance path escaped instances directory" >&2
    exit 1
    ;;
esac

if "$AGENT_DIR/lib/verify-running.sh" "$instance_root" >/dev/null; then
  "$AGENT_DIR/lib/report-account-health.sh" "$account_id" true
  echo "account_id=$account_id running=true"
else
  "$AGENT_DIR/lib/report-account-health.sh" "$account_id" false "MT5 terminal process is not running"
  echo "account_id=$account_id running=false"
fi
