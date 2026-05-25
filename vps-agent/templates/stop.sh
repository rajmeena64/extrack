#!/usr/bin/env bash
set -euo pipefail

INSTANCE_ROOT="__INSTANCE_ROOT__"
WINE_PREFIX="$INSTANCE_ROOT/wine"

for env_file in /proc/[0-9]*/environ; do
  pid="${env_file#/proc/}"
  pid="${pid%/environ}"
  if tr '\0' '\n' 2>/dev/null < "$env_file" | grep -Fxq "WINEPREFIX=$WINE_PREFIX"; then
    kill "$pid" 2>/dev/null || true
  fi
done
