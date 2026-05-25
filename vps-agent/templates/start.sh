#!/usr/bin/env bash
set -euo pipefail

INSTANCE_ROOT="__INSTANCE_ROOT__"
export WINEPREFIX="$INSTANCE_ROOT/wine"
export DISPLAY="__DISPLAY_VALUE__"

mkdir -p "$INSTANCE_ROOT/logs"
nohup wine "$INSTANCE_ROOT/mt5/terminal64.exe" \
  > "$INSTANCE_ROOT/logs/terminal.out.log" \
  2> "$INSTANCE_ROOT/logs/terminal.err.log" &
