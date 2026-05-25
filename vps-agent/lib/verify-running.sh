#!/usr/bin/env bash
set -euo pipefail

instance_root="${1:?instance root is required}"
wine_prefix="$instance_root/wine"
terminal_path="$instance_root/mt5/terminal64.exe"

while read -r pid comm args; do
  [ -n "${pid:-}" ] || continue

  case "$args" in
    *"$terminal_path"*) ;;
    *) continue ;;
  esac

  env_file="/proc/$pid/environ"
  if [ -r "$env_file" ]; then
    if tr '\0' '\n' 2>/dev/null < "$env_file" | grep -Fxq "WINEPREFIX=$wine_prefix"; then
      ps -p "$pid" -o pid=,comm=,args=
      exit 0
    fi

    continue
  fi

  ps -p "$pid" -o pid=,comm=,args=
  exit 0
done < <(ps -eo pid=,comm=,args=)

exit 1
