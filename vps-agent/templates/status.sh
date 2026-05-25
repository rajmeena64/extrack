#!/usr/bin/env bash
set -euo pipefail

INSTANCE_ROOT="__INSTANCE_ROOT__"
WINE_PREFIX="$INSTANCE_ROOT/wine"
TERMINAL_PATH_LINUX="$INSTANCE_ROOT/mt5/terminal64.exe"
TERMINAL_PATH_WINE="Z:$(printf '%s' "$TERMINAL_PATH_LINUX" | sed 's#/#\\#g')"

while read -r pid comm args; do
  [ -n "${pid:-}" ] || continue

  case "$args" in
    *"$TERMINAL_PATH_LINUX"*|*"$TERMINAL_PATH_WINE"*) ;;
    *) continue ;;
  esac

  env_file="/proc/$pid/environ"
  if [ ! -r "$env_file" ]; then
    continue
  fi

  if tr '\0' '\n' 2>/dev/null < "$env_file" | grep -Fxq "WINEPREFIX=$WINE_PREFIX"; then
    ps -p "$pid" -o pid=,comm=,args=
    exit 0
  fi
done < <(ps -eo pid=,comm=,args=)

exit 1
