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

POLL_INTERVAL_SECONDS="${POLL_INTERVAL_SECONDS:-10}"
RUN_ONCE="${RUN_ONCE:-0}"
LOG_DIR="$AGENT_DIR/logs"
mkdir -p "$LOG_DIR"

log() {
  printf '%s %s\n' "$(date -Is)" "$*" | "$AGENT_DIR/lib/sanitize-log.sh" >> "$LOG_DIR/agent.log"
}

while true; do
  job_json="$("$AGENT_DIR/lib/claim-job.sh" || true)"

  if [ -z "$job_json" ] || [ "$job_json" = "null" ]; then
    if [ "$RUN_ONCE" = "1" ]; then
      log "no pending job found; exiting"
      exit 0
    fi

    sleep "$POLL_INTERVAL_SECONDS"
    continue
  fi

  job_id="$(printf '%s' "$job_json" | python3 -c 'import json,sys; print(json.load(sys.stdin)["job_id"])')"
  request_id="$(printf '%s' "$job_json" | python3 -c 'import json,sys; print(json.load(sys.stdin)["request_id"])')"
  instance_key="$(printf '%s' "$job_json" | python3 -c 'import json,sys; print(json.load(sys.stdin)["instance_key"])')"

  log "claimed job=$job_id request=$request_id instance=$instance_key"

  if printf '%s' "$job_json" | "$AGENT_DIR/lib/provision-instance.sh"; then
    "$AGENT_DIR/lib/report-complete.sh" "$job_id"
    log "completed job=$job_id instance=$instance_key"
  else
    "$AGENT_DIR/lib/report-fail.sh" "$job_id" "MT5 instance provisioning failed"
    log "failed job=$job_id instance=$instance_key"
  fi

  if [ "$RUN_ONCE" = "1" ]; then
    exit 0
  fi
done
