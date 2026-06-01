#!/usr/bin/env bash
set -euo pipefail

job_id="${1:?job id is required}"
progress_status="${2:?progress status is required}"

python3 -c 'import json,sys; print(json.dumps({"progress_status": sys.argv[1]}))' "$progress_status" |
curl -fsS \
  -X POST \
  -H "Authorization: Bearer ${VPS_AGENT_TOKEN:?VPS_AGENT_TOKEN is required}" \
  -H "Content-Type: application/json" \
  --data-binary @- \
  "${BACKEND_URL:?BACKEND_URL is required}/api/vps/sync-jobs/${job_id}/status" \
  >/dev/null
