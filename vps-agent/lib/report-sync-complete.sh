#!/usr/bin/env bash
set -euo pipefail

job_id="${1:?job id is required}"

printf '{}\n' |
curl -fsS \
  -X POST \
  -H "Authorization: Bearer ${VPS_AGENT_TOKEN:?VPS_AGENT_TOKEN is required}" \
  -H "Content-Type: application/json" \
  --data-binary @- \
  "${BACKEND_URL:?BACKEND_URL is required}/api/vps/sync-jobs/${job_id}/complete" \
  >/dev/null
