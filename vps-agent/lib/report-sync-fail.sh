#!/usr/bin/env bash
set -euo pipefail

job_id="${1:?job id is required}"
message="${2:-MT5 sync failed}"
sanitized_message="$(printf '%s' "$message" | "$(dirname "$0")/sanitize-log.sh")"

python3 -c 'import json,sys; print(json.dumps({"error_message": sys.argv[1]}))' "$sanitized_message" |
curl -fsS \
  -X POST \
  -H "Authorization: Bearer ${VPS_AGENT_TOKEN:?VPS_AGENT_TOKEN is required}" \
  -H "Content-Type: application/json" \
  --data-binary @- \
  "${BACKEND_URL:?BACKEND_URL is required}/api/vps/sync-jobs/${job_id}/fail" \
  >/dev/null
