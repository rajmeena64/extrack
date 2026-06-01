#!/usr/bin/env bash
set -euo pipefail

instances_dir="${MT5_INSTANCES_DIR:-/home/ubuntu/mt5-instances}"
count=0

for env_file in /proc/[0-9]*/environ; do
  pid="${env_file#/proc/}"
  pid="${pid%/environ}"
  [ -r "$env_file" ] || continue

  wine_prefix="$(tr '\0' '\n' 2>/dev/null < "$env_file" | awk -F= '$1 == "WINEPREFIX" {print $2; exit}')"
  [ -n "$wine_prefix" ] || continue

  case "$(readlink -m "$wine_prefix" 2>/dev/null || true)" in
    "$(readlink -m "$instances_dir")"/*/wine) count=$((count + 1)) ;;
  esac
done

printf '%s\n' "$count"
