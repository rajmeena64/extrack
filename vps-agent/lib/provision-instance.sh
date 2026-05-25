#!/usr/bin/env bash
set -euo pipefail

AGENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MT5_SOURCE_DIR="${MT5_SOURCE_DIR:-/home/ubuntu/.wine/drive_c/Program Files/MetaTrader 5}"
MT5_INSTANCES_DIR="${MT5_INSTANCES_DIR:-/home/ubuntu/mt5-instances}"
SOURCE_WINE_PREFIX="${SOURCE_WINE_PREFIX:-/home/ubuntu/.wine}"
DISPLAY_VALUE="${DISPLAY_VALUE:-:10.0}"
MT5_LAUNCH_WAIT_SECONDS="${MT5_LAUNCH_WAIT_SECONDS:-12}"

job_json="$(cat)"
job_id="$(printf '%s' "$job_json" | python3 -c 'import json,sys; print(json.load(sys.stdin)["job_id"])')"
instance_key="$(printf '%s' "$job_json" | python3 -c 'import json,sys; print(json.load(sys.stdin)["instance_key"])')"

case "$instance_key" in
  ""|*/*|*..*|*" "*)
    echo "Unsafe instance key" >&2
    exit 1
    ;;
esac

instance_root="$MT5_INSTANCES_DIR/$instance_key"
wine_prefix="$instance_root/wine"
mt5_dir="$instance_root/mt5"
scripts_dir="$instance_root/scripts"
logs_dir="$instance_root/logs"

case "$(readlink -m "$instance_root")" in
  "$(readlink -m "$MT5_INSTANCES_DIR")"/*) ;;
  *)
    echo "Instance path escaped instances directory" >&2
    exit 1
    ;;
esac

case "$(readlink -m "$wine_prefix")" in
  "$(readlink -m /home/ubuntu/.wine)") echo "Refusing to use existing Wine prefix" >&2; exit 1 ;;
esac

if [ ! -f "$MT5_SOURCE_DIR/terminal64.exe" ]; then
  echo "MT5 source terminal64.exe not found" >&2
  exit 1
fi

if [ ! -d "$SOURCE_WINE_PREFIX" ]; then
  echo "Source Wine prefix not found" >&2
  exit 1
fi

if [ "$(readlink -m "$SOURCE_WINE_PREFIX")" = "$(readlink -m "$wine_prefix")" ]; then
  echo "Source and destination Wine prefixes must be different" >&2
  exit 1
fi

"$AGENT_DIR/lib/report-status.sh" "$job_id" "creating_terminal" || true
mkdir -p "$instance_root" "$mt5_dir" "$scripts_dir" "$logs_dir"
rsync -a --delete "$SOURCE_WINE_PREFIX/" "$wine_prefix/"
rsync -a --delete "$MT5_SOURCE_DIR/" "$mt5_dir/"

for required_file in \
  "$wine_prefix/system.reg" \
  "$wine_prefix/user.reg" \
  "$wine_prefix/drive_c/windows/system32/kernel32.dll"; do
  if [ ! -f "$required_file" ]; then
    echo "Wine prefix missing required file: $required_file" >&2
    exit 1
  fi
done

"$AGENT_DIR/lib/report-status.sh" "$job_id" "applying_ea" || true
mkdir -p "$mt5_dir/MQL5/Experts"
if compgen -G "$AGENT_DIR/fixed-ea/*.ex5" > /dev/null; then
  cp "$AGENT_DIR"/fixed-ea/*.ex5 "$mt5_dir/MQL5/Experts/"
fi

if compgen -G "$AGENT_DIR/fixed-ea/*.mq5" > /dev/null; then
  cp "$AGENT_DIR"/fixed-ea/*.mq5 "$mt5_dir/MQL5/Experts/"
fi

for script in start.sh stop.sh status.sh logs.sh; do
  sed \
    -e "s#__INSTANCE_ROOT__#$instance_root#g" \
    -e "s#__DISPLAY_VALUE__#$DISPLAY_VALUE#g" \
    "$AGENT_DIR/templates/$script" > "$scripts_dir/$script"
  chmod 700 "$scripts_dir/$script"
done

"$AGENT_DIR/lib/report-status.sh" "$job_id" "launching_terminal" || true
"$scripts_dir/start.sh"
sleep "$MT5_LAUNCH_WAIT_SECONDS"
"$AGENT_DIR/lib/verify-running.sh" "$instance_root" >/dev/null
