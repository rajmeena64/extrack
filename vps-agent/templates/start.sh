#!/usr/bin/env bash
set -euo pipefail

INSTANCE_ROOT="__INSTANCE_ROOT__"
CONFIG_PATH_LINUX="__CONFIG_PATH_LINUX__"
export WINEPREFIX="$INSTANCE_ROOT/wine"
export DISPLAY="__DISPLAY_VALUE__"

mkdir -p "$INSTANCE_ROOT/logs"
if [ -n "$CONFIG_PATH_LINUX" ]; then
  CONFIG_PATH="$(winepath -w "$CONFIG_PATH_LINUX" 2>/dev/null || printf 'Z:%s' "$(printf '%s' "$CONFIG_PATH_LINUX" | sed 's#/#\\#g')")"
  nohup wine "$INSTANCE_ROOT/mt5/terminal64.exe" "/config:$CONFIG_PATH" \
    > "$INSTANCE_ROOT/logs/terminal.out.log" \
    2> "$INSTANCE_ROOT/logs/terminal.err.log" &
else
  nohup wine "$INSTANCE_ROOT/mt5/terminal64.exe" \
    > "$INSTANCE_ROOT/logs/terminal.out.log" \
    2> "$INSTANCE_ROOT/logs/terminal.err.log" &
fi
