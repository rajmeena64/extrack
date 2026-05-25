#!/usr/bin/env bash
set -euo pipefail

curl -fsS \
  -X GET \
  -H "Authorization: Bearer ${VPS_AGENT_TOKEN:?VPS_AGENT_TOKEN is required}" \
  -H "Content-Type: application/json" \
  "${BACKEND_URL:?BACKEND_URL is required}/api/vps/accounts/health-targets" |
python3 -c '
import json, sys
payload = json.load(sys.stdin)
if not payload.get("success"):
    raise SystemExit(payload.get("error") or "health target fetch failed")
for account in payload.get("accounts", []):
    account_id = account.get("id")
    instance_key = account.get("instance_key")
    if account_id and instance_key:
        print(f"{account_id}\t{instance_key}")
'
