#!/usr/bin/env bash
set -euo pipefail

AGENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MT5_TEMPLATE_DIR="${MT5_TEMPLATE_DIR:-${MT5_SOURCE_DIR:-/home/ubuntu/mt5-template}}"
MT5_INSTANCES_DIR="${MT5_INSTANCES_DIR:-/home/ubuntu/mt5-instances}"
SOURCE_WINE_PREFIX="${SOURCE_WINE_PREFIX:-/home/ubuntu/.wine}"
DISPLAY_VALUE="${DISPLAY_VALUE:-:10.0}"
SANITIZER="$AGENT_DIR/lib/sanitize-log.sh"

job_json="$(cat)"
job_id="$(printf '%s' "$job_json" | python3 -c 'import json,sys; print(json.load(sys.stdin)["job_id"])')"
instance_key="$(printf '%s' "$job_json" | python3 -c 'import json,sys; print(json.load(sys.stdin)["instance_key"])')"
login_id="$(printf '%s' "$job_json" | python3 -c 'import json,sys; print(json.load(sys.stdin)["login"])')"

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
config_dir="$instance_root/config"
login_config_linux="$config_dir/login.ini"
ea_preset_name="Extrack_Render.set"
ea_preset_linux="$mt5_dir/MQL5/Presets/$ea_preset_name"

log_info() {
  printf '%s %s\n' "$(date -Is)" "$*" | "$SANITIZER" >&2
}

resolve_mt5_source_dir() {
  local template_dir="$1"

  if [ -f "$template_dir/terminal64.exe" ]; then
    printf '%s\n' "$template_dir"
    return 0
  fi

  if [ -f "$template_dir/mt5/terminal64.exe" ]; then
    printf '%s\n' "$template_dir/mt5"
    return 0
  fi

  if [ -f "$template_dir/drive_c/Program Files/MetaTrader 5/terminal64.exe" ]; then
    printf '%s\n' "$template_dir/drive_c/Program Files/MetaTrader 5"
    return 0
  fi

  return 1
}

resolve_wine_source_dir() {
  local template_dir="$1"

  if [ -d "$template_dir/wine" ] && [ -f "$template_dir/wine/system.reg" ]; then
    printf '%s\n' "$template_dir/wine"
    return 0
  fi

  if [ -f "$template_dir/system.reg" ] && [ -d "$template_dir/drive_c" ]; then
    printf '%s\n' "$template_dir"
    return 0
  fi

  printf '%s\n' "$SOURCE_WINE_PREFIX"
}

validate_prepared_mt5_data() {
  local base_dir="$1"
  local label="$2"
  local found=0

  log_info "validating prepared MT5 data label=$label path=$base_dir"

  while IFS= read -r path; do
    [ -n "$path" ] || continue
    found=1
    log_info "found MT5 prepared data candidate label=$label path=$path"
  done < <(
    find "$base_dir" -maxdepth 10 \( \
      -iname 'Config' -o \
      -iname 'Bases' -o \
      -path '*/MQL5/Profiles' -o \
      -iname 'Profiles' -o \
      -iname 'config' -o \
      -iname 'bases' \
    \) -type d 2>/dev/null | head -n 20
  )

  if [ "$found" = "0" ]; then
    return 1
  fi

  return 0
}

copy_prepared_tree() {
  local source_dir="$1"
  local dest_dir="$2"

  if command -v rsync >/dev/null 2>&1; then
    rsync -a --delete \
      --exclude='logs/' \
      --exclude='Logs/' \
      --exclude='*.log' \
      --exclude='*.tmp' \
      --exclude='*.pid' \
      --exclude='*.lock' \
      --exclude='*.dmp' \
      --exclude='*.mdmp' \
      --exclude='MQL5/Files/*.csv' \
      --exclude='MQL5/Files/*.htm' \
      --exclude='MQL5/Files/*.html' \
      "$source_dir/" "$dest_dir/"
  else
    mkdir -p "$dest_dir"
    cp -a "$source_dir/." "$dest_dir/"
    find "$dest_dir" \( \
      -iname '*.log' -o \
      -iname '*.tmp' -o \
      -iname '*.pid' -o \
      -iname '*.lock' -o \
      -iname '*.dmp' -o \
      -iname '*.mdmp' \
    \) -type f -delete
  fi
}

clear_template_credentials_from_copy() {
  local copied_root="$1"

  find "$copied_root" -maxdepth 6 \( \
    -iname 'login.ini' -o \
    -iname 'lastprofile.ini' -o \
    -iname 'origin.txt' \
  \) -type f -delete 2>/dev/null || true
}

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

if [ ! -d "$MT5_TEMPLATE_DIR" ]; then
  echo "MT5_TEMPLATE_DIR does not exist" >&2
  exit 1
fi

if [ ! -r "$MT5_TEMPLATE_DIR" ]; then
  echo "MT5_TEMPLATE_DIR is not readable" >&2
  exit 1
fi

if ! mt5_source_dir="$(resolve_mt5_source_dir "$MT5_TEMPLATE_DIR")"; then
  echo "terminal64.exe missing in MT5_TEMPLATE_DIR" >&2
  exit 1
fi

wine_source_dir="$(resolve_wine_source_dir "$MT5_TEMPLATE_DIR")"

if [ ! -d "$wine_source_dir" ]; then
  echo "Source Wine prefix not found" >&2
  exit 1
fi

if [ "$(readlink -m "$wine_source_dir")" = "$(readlink -m "$wine_prefix")" ]; then
  echo "Source and destination Wine prefixes must be different" >&2
  exit 1
fi

if [ "$(readlink -m "$mt5_source_dir")" = "$(readlink -m "$mt5_dir")" ]; then
  echo "MT5 template and destination instance must be different" >&2
  exit 1
fi

if ! validate_prepared_mt5_data "$mt5_source_dir" "template-mt5"; then
  validate_prepared_mt5_data "$wine_source_dir" "template-wine" || {
    echo "MT5 template appears fresh/uninitialized; broker server discovery data may be missing and only MetaQuotes-Demo may appear" >&2
    exit 1
  }
fi
log_info "copying MT5 template job=$job_id instance=$instance_key template=$MT5_TEMPLATE_DIR mt5_source=$mt5_source_dir wine_source=$wine_source_dir destination=$instance_root"

"$AGENT_DIR/lib/report-status.sh" "$job_id" "creating_terminal" || true
mkdir -p "$instance_root" "$mt5_dir" "$scripts_dir" "$logs_dir" "$config_dir"
copy_prepared_tree "$wine_source_dir" "$wine_prefix" || {
  echo "MT5 instance copy failed" >&2
  exit 1
}
copy_prepared_tree "$mt5_source_dir" "$mt5_dir" || {
  echo "MT5 instance copy failed" >&2
  exit 1
}
clear_template_credentials_from_copy "$instance_root"

if [ ! -d "$instance_root" ]; then
  echo "MT5 instance copy failed" >&2
  exit 1
fi

if [ ! -f "$mt5_dir/terminal64.exe" ]; then
  echo "terminal64.exe missing in copied MT5 instance" >&2
  exit 1
fi

case "$(readlink -m "$mt5_dir")" in
  "$(readlink -m "$MT5_TEMPLATE_DIR")"|\
  "$(readlink -m "$MT5_TEMPLATE_DIR")"/*)
    echo "MT5 instance validation failed before launch" >&2
    exit 1
    ;;
esac

if ! validate_prepared_mt5_data "$mt5_dir" "copied-mt5"; then
  validate_prepared_mt5_data "$wine_prefix" "copied-wine" || {
    echo "MT5 template appears fresh/uninitialized; broker server discovery data may be missing and only MetaQuotes-Demo may appear" >&2
    echo "MT5 instance validation failed before launch" >&2
    exit 1
  }
fi

for required_file in \
  "$wine_prefix/system.reg" \
  "$wine_prefix/user.reg" \
  "$wine_prefix/drive_c/windows/system32/kernel32.dll"; do
  if [ ! -f "$required_file" ]; then
    echo "Wine prefix missing required file: $required_file" >&2
    exit 1
  fi
done

"$AGENT_DIR/lib/write-ea-preset.py" "$ea_preset_linux" "${BACKEND_URL:?BACKEND_URL is required}" "${MT5_INGEST_SECRET:-${TRADE_INGEST_SECRET:-}}"
"$AGENT_DIR/lib/write-login-config.py" "$job_json" "$login_config_linux" "${BACKEND_URL:?BACKEND_URL is required}" "$ea_preset_name"
"$AGENT_DIR/lib/update-webrequest-allowlist.py" "$mt5_dir/Config/common.ini" "${BACKEND_URL:?BACKEND_URL is required}"
"$AGENT_DIR/lib/update-webrequest-allowlist.py" "$wine_prefix/drive_c/Program Files/MetaTrader 5/Config/common.ini" "${BACKEND_URL:?BACKEND_URL is required}"

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
    -e "s#__CONFIG_PATH_LINUX__#$login_config_linux#g" \
    -e "s#__DISPLAY_VALUE__#$DISPLAY_VALUE#g" \
    "$AGENT_DIR/templates/$script" > "$scripts_dir/$script"
  chmod 700 "$scripts_dir/$script"
done

"$AGENT_DIR/lib/report-status.sh" "$job_id" "launching_terminal" || true
"$scripts_dir/start.sh"
for wait_seconds in 5 5 5 15 30; do
  sleep "$wait_seconds"
  if "$AGENT_DIR/lib/verify-running.sh" "$instance_root" >/dev/null; then
    if "$AGENT_DIR/lib/verify-login.sh" "$instance_root" "$login_id"; then
      exit 0
    fi
    echo "MT5 terminal is running, but login verification failed" >&2
    exit 1
  fi
done

echo "MT5 terminal did not become verified running within 60 seconds" >&2
exit 1
