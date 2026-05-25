#!/usr/bin/env python3
import json
import os
import stat
import sys


def main():
    if len(sys.argv) not in (4, 5):
        raise SystemExit("usage: write-login-config.py <job-json> <config-path> <backend-url> [expert-preset]")

    job = json.loads(sys.argv[1])
    config_path = sys.argv[2]
    backend_url = sys.argv[3].rstrip("/")
    expert_preset = sys.argv[4] if len(sys.argv) == 5 else ""

    login = str(job.get("login") or "").strip()
    password = str(job.get("password") or "")
    broker_server = str(job.get("broker_server") or "").strip()

    if not login or not password or not broker_server:
        raise SystemExit("missing login, password, or broker_server")

    os.makedirs(os.path.dirname(config_path), exist_ok=True)

    content = "\r\n".join(
        [
            "[Common]",
            f"Login={login}",
            f"Server={broker_server}",
            f"Password={password}",
            "KeepPrivate=1",
            "NewsEnable=0",
            "CertInstall=1",
            "",
            "[Experts]",
            "Enabled=1",
            "AllowLiveTrading=1",
            "AllowDllImport=0",
            "Account=0",
            "Profile=0",
            "WebRequest=1",
            f"WebRequestUrl={backend_url}",
            "",
            "[StartUp]",
            "Expert=Extrack_Backend_Job_Bulk_M1_EA",
            f"ExpertParameters={expert_preset}" if expert_preset else "",
            "Symbol=EURUSD",
            "Period=M1",
            "ShutdownTerminal=0",
            "",
        ]
    )

    with open(config_path, "w", encoding="utf-16") as handle:
        handle.write(content)

    os.chmod(config_path, stat.S_IRUSR | stat.S_IWUSR)


if __name__ == "__main__":
    main()
