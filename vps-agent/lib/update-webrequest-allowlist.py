#!/usr/bin/env python3
import os
import sys


def read_ini(path):
    for encoding in ("utf-16", "utf-8"):
        try:
            with open(path, "r", encoding=encoding) as handle:
                return handle.read(), encoding
        except UnicodeError:
            continue
        except FileNotFoundError:
            return "", "utf-16"
    with open(path, "r", encoding="utf-8", errors="ignore") as handle:
        return handle.read(), "utf-8"


def upsert_section_values(text, section, values):
    lines = text.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    section_header = f"[{section}]"
    start = None
    end = len(lines)

    for idx, line in enumerate(lines):
        if line.strip().lower() == section_header.lower():
            start = idx
            break

    if start is None:
        if lines and lines[-1] != "":
            lines.append("")
        lines.append(section_header)
        start = len(lines) - 1
        end = len(lines)
    else:
        for idx in range(start + 1, len(lines)):
            stripped = lines[idx].strip()
            if stripped.startswith("[") and stripped.endswith("]"):
                end = idx
                break

    existing_keys = {}
    for idx in range(start + 1, end):
        if "=" in lines[idx]:
            key = lines[idx].split("=", 1)[0].strip().lower()
            existing_keys[key] = idx

    inserted = 0
    for key, value in values.items():
        formatted = f"{key}={value}"
        idx = existing_keys.get(key.lower())
        if idx is None:
            lines.insert(end + inserted, formatted)
            inserted += 1
        else:
            lines[idx] = formatted

    return "\r\n".join(lines).rstrip() + "\r\n"


def main():
    if len(sys.argv) != 3:
        raise SystemExit("usage: update-webrequest-allowlist.py <common.ini> <backend-url>")

    common_ini = sys.argv[1]
    backend_url = sys.argv[2].rstrip("/")
    os.makedirs(os.path.dirname(common_ini), exist_ok=True)

    text, encoding = read_ini(common_ini)
    text = upsert_section_values(
        text,
        "Experts",
        {
            "Enabled": "1",
            "AllowLiveTrading": "1",
            "AllowDllImport": "0",
            "Account": "0",
            "Profile": "0",
            "WebRequest": "1",
            "WebRequestUrl": backend_url,
        },
    )

    with open(common_ini, "w", encoding=encoding) as handle:
        handle.write(text)


if __name__ == "__main__":
    main()
