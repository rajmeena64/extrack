#!/usr/bin/env bash
set -euo pipefail

INSTANCE_ROOT="__INSTANCE_ROOT__"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SANITIZER="$SCRIPT_DIR/../../../lib/sanitize-log.sh"

if [ -x "$SANITIZER" ]; then
  tail -n 200 "$INSTANCE_ROOT"/logs/*.log 2>/dev/null | "$SANITIZER"
else
  tail -n 200 "$INSTANCE_ROOT"/logs/*.log 2>/dev/null
fi
