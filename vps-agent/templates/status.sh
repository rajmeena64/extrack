#!/usr/bin/env bash
set -euo pipefail

INSTANCE_ROOT="__INSTANCE_ROOT__"
WINE_PREFIX="$INSTANCE_ROOT/wine"

for env_file in /proc/[0-9]*/environ; do
  pid="${env_file#/proc/}"
  pid="${pid%/environ}"
  if tr '\0' '\n' 2>/dev/null < "$env_file" | grep -Fxq "WINEPREFIX=$WINE_PREFIX"; then
    ps -p "$pid" -o pid=,comm=,args=
    exit 0
  fi
done

if ps -eo pid=,comm=,args= | grep -F "$INSTANCE_ROOT/mt5/terminal64.exe" | grep -v grep; then
  exit 0
fi

exit 1
