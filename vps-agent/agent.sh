#!/usr/bin/env bash
set -euo pipefail

AGENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

OVERRIDE_RUN_ONCE="${RUN_ONCE-}"
OVERRIDE_POLL_INTERVAL_SECONDS="${POLL_INTERVAL_SECONDS-}"
OVERRIDE_HEALTH_CHECK_INTERVAL_SECONDS="${HEALTH_CHECK_INTERVAL_SECONDS-}"

if [ -f "$AGENT_DIR/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$AGENT_DIR/.env"
  set +a
fi

[ -n "$OVERRIDE_RUN_ONCE" ] && RUN_ONCE="$OVERRIDE_RUN_ONCE"
[ -n "$OVERRIDE_POLL_INTERVAL_SECONDS" ] && POLL_INTERVAL_SECONDS="$OVERRIDE_POLL_INTERVAL_SECONDS"
[ -n "$OVERRIDE_HEALTH_CHECK_INTERVAL_SECONDS" ] && HEALTH_CHECK_INTERVAL_SECONDS="$OVERRIDE_HEALTH_CHECK_INTERVAL_SECONDS"

if [ "${AGENT_SERVICE_MODE:-0}" = "1" ]; then
  RUN_ONCE=0
fi

: "${BACKEND_URL:?BACKEND_URL is required}"
: "${VPS_AGENT_TOKEN:?VPS_AGENT_TOKEN is required}"

POLL_INTERVAL_SECONDS="${POLL_INTERVAL_SECONDS:-10}"
HEALTH_CHECK_INTERVAL_SECONDS="${HEALTH_CHECK_INTERVAL_SECONDS:-30}"
RUN_ONCE="${RUN_ONCE:-0}"
LOG_DIR="$AGENT_DIR/logs"
mkdir -p "$LOG_DIR"

log() {
  printf '%s %s\n' "$(date -Is)" "$*" | "$AGENT_DIR/lib/sanitize-log.sh" >> "$LOG_DIR/agent.log"
}

last_health_check=0

run_health_checks_if_due() {
  [ "$RUN_ONCE" = "1" ] && return 0

  now="$(date +%s)"
  if [ $((now - last_health_check)) -lt "$HEALTH_CHECK_INTERVAL_SECONDS" ]; then
    return 0
  fi

  last_health_check="$now"
  if "$AGENT_DIR/lib/run-health-checks.sh"; then
    log "health check completed"
  else
    log "health check failed"
  fi
}

log "agent starting run_once=$RUN_ONCE poll_interval=$POLL_INTERVAL_SECONDS health_interval=$HEALTH_CHECK_INTERVAL_SECONDS"

while true; do
  run_health_checks_if_due

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
    run_health_checks_if_due
  else
    "$AGENT_DIR/lib/report-fail.sh" "$job_id" "MT5 instance provisioning failed"
    log "failed job=$job_id instance=$instance_key"
  fi

  if [ "$RUN_ONCE" = "1" ]; then
    exit 0
  fi
done
