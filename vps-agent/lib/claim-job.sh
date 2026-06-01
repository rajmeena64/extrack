#!/usr/bin/env bash
set -euo pipefail

AGENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
worker_id="${WORKER_ID:-$(hostname 2>/dev/null || printf 'mt5-worker')}"
capacity="${MT5_WORKER_CAPACITY:-1}"
active_count="$("$AGENT_DIR/lib/count-active-terminals.sh" 2>/dev/null || printf '0')"
payload="$(python3 -c 'import json,sys; print(json.dumps({"worker_id": sys.argv[1], "capacity": int(sys.argv[2]), "active_count": int(sys.argv[3])}))' "$worker_id" "$capacity" "$active_count")"

response="$(
  curl -fsS \
    -X POST \
    -H "Authorization: Bearer ${VPS_AGENT_TOKEN:?VPS_AGENT_TOKEN is required}" \
    -H "Content-Type: application/json" \
    --data-binary "$payload" \
    "${BACKEND_URL:?BACKEND_URL is required}/api/vps/jobs/claim"
)"

set +e
printf '%s' "$response" | python3 -c '
import json, sys
payload = json.load(sys.stdin)
if not payload.get("success"):
    raise SystemExit(payload.get("error") or "claim failed")
job = payload.get("job")
if job is not None:
    print(json.dumps(job))
    raise SystemExit(0)
raise SystemExit(2)
'
claim_status="$?"
set -e

case "$claim_status" in
  0) exit 0 ;;
  2) ;;
  *) exit 1 ;;
esac

response="$(
  curl -fsS \
    -X POST \
    -H "Authorization: Bearer ${VPS_AGENT_TOKEN:?VPS_AGENT_TOKEN is required}" \
    -H "Content-Type: application/json" \
    --data-binary "$payload" \
    "${BACKEND_URL:?BACKEND_URL is required}/api/vps/sync-jobs/claim"
)"

printf '%s' "$response" | python3 -c '
import json, sys
payload = json.load(sys.stdin)
if not payload.get("success"):
    raise SystemExit(payload.get("error") or "sync claim failed")
job = payload.get("job")
print("null" if job is None else json.dumps(job))
'
