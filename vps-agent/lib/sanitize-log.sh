#!/usr/bin/env bash
set -euo pipefail

sed -E \
  -e 's/(password[[:space:]]*[:=][[:space:]]*)[^[:space:]]+/\1[redacted]/Ig' \
  -e 's/(token[[:space:]]*[:=][[:space:]]*)[^[:space:]]+/\1[redacted]/Ig' \
  -e 's/(authorization[[:space:]]*[:=][[:space:]]*)[^[:space:]]+/\1[redacted]/Ig'
