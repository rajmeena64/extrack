#!/usr/bin/env bash
set -euo pipefail

instance_root="${1:?instance root is required}"
wine_prefix="$instance_root/wine"
terminal_path_linux="$instance_root/mt5/terminal64.exe"
terminal_path_wine="Z:$(printf '%s' "$terminal_path_linux" | sed 's#/#\\#g')"

while read -r pid comm args; do
  [ -n "${pid:-}" ] || continue

  case "$args" in
    *"$terminal_path_linux"*|*"$terminal_path_wine"*) ;;
    *) continue ;;
  esac

  env_file="/proc/$pid/environ"
  if [ ! -r "$env_file" ]; then
    continue
  fi

  if tr '\0' '\n' 2>/dev/null < "$env_file" | grep -Fxq "WINEPREFIX=$wine_prefix"; then
    ps -p "$pid" -o pid=,comm=,args=
    exit 0
  fi
done < <(ps -eo pid=,comm=,args=)

exit 1
