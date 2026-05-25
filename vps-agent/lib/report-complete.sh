#!/usr/bin/env bash
set -euo pipefail

job_id="${1:?job id is required}"

curl -fsS \
  -X POST \
  -H "Authorization: Bearer ${VPS_AGENT_TOKEN:?VPS_AGENT_TOKEN is required}" \
  -H "Content-Type: application/json" \
  "${BACKEND_URL:?BACKEND_URL is required}/api/vps/jobs/${job_id}/complete" \
  >/dev/null
