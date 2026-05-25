#!/usr/bin/env bash
set -euo pipefail

response="$(
  curl -fsS \
    -X POST \
    -H "Authorization: Bearer ${VPS_AGENT_TOKEN:?VPS_AGENT_TOKEN is required}" \
    -H "Content-Type: application/json" \
    "${BACKEND_URL:?BACKEND_URL is required}/api/vps/jobs/claim"
)"

printf '%s' "$response" | python3 -c '
import json, sys
payload = json.load(sys.stdin)
if not payload.get("success"):
    raise SystemExit(payload.get("error") or "claim failed")
job = payload.get("job")
print("null" if job is None else json.dumps(job))
'
