#!/usr/bin/env bash
set -euo pipefail

account_id="${1:?account id is required}"
running="${2:?running flag is required}"
message="${3:-}"

case "$running" in
  true|false) ;;
  *) echo "running flag must be true or false" >&2; exit 1 ;;
esac

sanitized_message="$(printf '%s' "$message" | "$(dirname "$0")/sanitize-log.sh")"

python3 -c 'import json,sys; print(json.dumps({"running": sys.argv[1] == "true", "error_message": sys.argv[2] or None}))' "$running" "$sanitized_message" |
curl -fsS \
  -X POST \
  -H "Authorization: Bearer ${VPS_AGENT_TOKEN:?VPS_AGENT_TOKEN is required}" \
  -H "Content-Type: application/json" \
  --data-binary @- \
  "${BACKEND_URL:?BACKEND_URL is required}/api/vps/accounts/${account_id}/health" \
  >/dev/null
