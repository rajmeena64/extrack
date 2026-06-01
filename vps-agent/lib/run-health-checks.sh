#!/usr/bin/env bash
set -euo pipefail

AGENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
instances_dir="${MT5_INSTANCES_DIR:-/home/ubuntu/mt5-instances}"

if [ -f "$AGENT_DIR/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$AGENT_DIR/.env"
  set +a
fi

if [ "${ENABLE_MT5_PROCESS_HEALTH_CHECKS:-0}" != "1" ]; then
  exit 0
fi

"$AGENT_DIR/lib/fetch-health-targets.sh" | while IFS=$'\t' read -r account_id instance_key; do
  [ -n "${account_id:-}" ] || continue
  [ -n "${instance_key:-}" ] || continue

  case "$instance_key" in
    ""|*/*|*..*|*" "*)
      "$AGENT_DIR/lib/report-account-health.sh" "$account_id" false "Unsafe instance key"
      continue
      ;;
  esac

  instance_root="$instances_dir/$instance_key"
  case "$(readlink -m "$instance_root")" in
    "$(readlink -m "$instances_dir")"/*) ;;
    *)
      "$AGENT_DIR/lib/report-account-health.sh" "$account_id" false "Instance path escaped instances directory"
      continue
      ;;
  esac

  if "$AGENT_DIR/lib/verify-running.sh" "$instance_root" >/dev/null; then
    "$AGENT_DIR/lib/report-account-health.sh" "$account_id" true
  else
    "$AGENT_DIR/lib/report-account-health.sh" "$account_id" false "MT5 terminal process is not running"
  fi
done
