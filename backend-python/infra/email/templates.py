import os, re, html as html_lib
from datetime import datetime

_AVAIL_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../src/components/Common/SymbolWithIcon/availableIcons.js"))

def _load_available_icons():
    c_set, f_set = set(), set()
    if os.path.exists(_AVAIL_PATH):
        try:
            with open(_AVAIL_PATH, "r", encoding="utf-8") as f:
                content = f.read()
            parts = content.split("FLAG_ICONS")
            c_set = set(re.findall(r'"([^"]+)"', parts[0]))
            if len(parts) > 1:
                f_set = set(re.findall(r'"([^"]+)"', parts[1]))
        except Exception:
            pass
    return c_set, f_set

CRYPTO_ICONS, FLAG_ICONS = _load_available_icons()

FIXED_SYMBOL_ICONS = {
    "US500": "/assets/commodities/us500.svg",
    "NAS100": "/assets/commodities/nasdaq.svg",
}

from domains.instruments.registry import find_by_symbol

FRONTEND_URL = os.getenv("FRONTEND_URL", "").rstrip("/")

def _asset_path(asset: str, cat: str = "", ac: str = "", icon: str = "") -> str:
    if not asset:
        return ""
    if icon and (icon.startswith("/") or icon.startswith("http")):
        return icon
    k = str(asset).strip().lower()
    if ac == "stock" or cat == "stock":
        name = icon.lower() if icon else f"stk_{k}"
        return f"/assets/stocks/{name}.svg"
    if ac == "metal" or (cat == "cfd" and ac != "crypto"):
        return f"/assets/commodities/{icon.lower() if icon else k}.svg"
    if cat == "forex" or k in FLAG_ICONS:
        return f"/assets/flags/4x3/{k}.svg"
    if k in CRYPTO_ICONS:
        return f"/assets/crypto/color/{k}.svg"
    return ""

def resolve_symbol_icon(symbol: str, base_url: str = "") -> dict:
    raw = (symbol or "").strip()
    inst = find_by_symbol(raw) or {}
    base = inst.get("baseAsset")
    quote = inst.get("quoteAsset")
    icon = inst.get("icon")
    title = inst.get("displayName") or inst.get("name") or raw
    cat = inst.get("category")
    ac = inst.get("assetClass")
    root = (base_url or FRONTEND_URL).rstrip("/")

    if ac == "stock" or cat == "stock":
        path = icon if (icon and (icon.startswith("/") or icon.startswith("http"))) else f"/assets/stocks/{icon.lower() if icon else raw.lower()}.svg"
        return {"type": "single", "url": f"{root}{path}", "title": title}

    if ac == "metal" or (cat == "cfd" and ac != "crypto"):
        name = (icon or base or raw).lower()
        return {"type": "single", "url": f"{root}/assets/commodities/{name}.svg", "title": title}

    b_path = _asset_path(base, cat, ac, icon)
    q_path = _asset_path(quote, cat, ac, icon)
    if b_path and q_path:
        return {"type": "pair", "base_url": f"{root}{b_path}", "quote_url": f"{root}{q_path}", "base": base, "quote": quote, "title": f"{base}/{quote}"}
    if b_path:
        return {"type": "single", "url": f"{root}{b_path}", "title": title}

    cap = re.sub(r"[^A-Z0-9]", "", raw.upper())
    if cap in FIXED_SYMBOL_ICONS:
        return {"type": "single", "url": f"{root}{FIXED_SYMBOL_ICONS[cap]}", "title": title}

    return {"type": "fallback", "text": cap[:2] if cap else "?", "title": title}

def _wrap_shell(title: str, preheader: str, body_html: str, furl: str = "") -> str:
    url = (furl or FRONTEND_URL).rstrip("/")
    return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>{html_lib.escape(title)}</title></head>
<body style="margin:0;padding:0;background-color:#f8f9fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;color:#1f2937;">
<span style="display:none;font-size:1px;color:#f8f9fa;max-height:0;max-width:0;opacity:0;overflow:hidden;">{html_lib.escape(preheader)}</span>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f8f9fa;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
<tr><td style="padding:28px 32px 20px 32px;border-bottom:1px solid #f1f5f9;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
<tr>
<td align="left" style="font-size:20px;font-weight:800;letter-spacing:-0.2px;color:#0f172a;"><a href="{url}" style="color:#0f172a;text-decoration:none;">ENTRACK<span style="color:#1a73e8;">.</span></a></td>
<td align="right" style="font-size:11px;font-weight:600;letter-spacing:0.5px;color:#64748b;text-transform:uppercase;">TRADING TERMINAL</td>
</tr>
</table>
</td></tr>
<tr><td style="padding:28px 32px 32px 32px;">
{body_html}
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:28px;">
<tr><td height="3" style="background:linear-gradient(90deg,#4285f4 0%,#ea4335 33%,#fbbc05 66%,#34a853 100%);border-radius:2px;"></td></tr>
</table>
</td></tr>
</table>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;margin-top:16px;">
<tr><td align="center" style="font-size:12px;color:#64748b;line-height:1.6;">
&copy; 2026 Entrack Technologies. All executions and alerts logged in real-time.<br>
<a href="{url}/dashboard" style="color:#64748b;text-decoration:underline;">Dashboard</a> &bull; <a href="{url}/chart" style="color:#64748b;text-decoration:underline;">Markets</a> &bull; <a href="{url}/settings/alerts" style="color:#64748b;text-decoration:underline;">Alert Settings</a>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>"""

def build_price_alert_email(symbol: str, condition: str, target_price: float, trigger_price: float, note: str = "", furl: str = "") -> dict:
    url = (furl or FRONTEND_URL).rstrip("/")
    info = resolve_symbol_icon(symbol, url)
    sym_title = html_lib.escape(info["title"])
    chart_url = f"{url}/chart?symbol={html_lib.escape(symbol.strip().upper())}"
    cond_clean = condition.strip().replace("_", " ").title()
    is_above = "Above" in cond_clean or "Greater" in cond_clean or trigger_price >= target_price
    badge_bg = "#ecfdf5" if is_above else "#fef2f2"
    badge_fg = "#047857" if is_above else "#b91c1c"
    badge_txt = html_lib.escape(cond_clean)
    now_str = datetime.now().strftime("%d/%m/%Y %H:%M")

    if info["type"] == "pair":
        icon_html = f"""<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="table-layout:fixed;width:44px;border-collapse:collapse;display:inline-table;vertical-align:middle;">
<tr>
<td width="16" style="width:16px;padding:0;line-height:0;overflow:visible;">
<img src="{info['base_url']}" width="28" height="28" alt="" style="display:block;width:28px;min-width:28px;height:28px;border-radius:50%;border:2px solid #ffffff;background-color:#f1f5f9;object-fit:cover;">
</td>
<td width="28" style="width:28px;padding:0;line-height:0;">
<img src="{info['quote_url']}" width="28" height="28" alt="" style="display:block;width:28px;min-width:28px;height:28px;border-radius:50%;border:2px solid #ffffff;background-color:#f1f5f9;object-fit:cover;">
</td>
</tr>
</table>"""
    elif info["type"] == "single":
        icon_html = f"""<img src="{info['url']}" width="32" height="32" alt="{sym_title}" style="display:block;border-radius:50%;border:2px solid #ffffff;background-color:#f1f5f9;box-shadow:0 1px 2px rgba(0,0,0,0.1);object-fit:cover;">"""
    else:
        icon_html = f"""<div style="width:32px;height:32px;border-radius:50%;background-color:#e2e8f0;color:#334155;font-size:11px;font-weight:700;line-height:32px;text-align:center;">{info['text']}</div>"""

    note_html = f"""<div style="margin-top:14px;padding:10px 14px;background-color:#ffffff;border:1px solid #e2e8f0;border-left:3px solid #1a73e8;border-radius:4px;font-size:13px;color:#475569;"><strong style="color:#0f172a;">Note:</strong> {html_lib.escape(note)}</div>""" if note else ""

    body = f"""<div style="font-size:15px;font-weight:600;color:#0f172a;margin-bottom:6px;">Hello Trader,</div>
<p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 20px 0;">This email is an automated confirmation that your price alert for <strong>{sym_title}</strong> has been triggered on Entrack.</p>
<div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:18px 20px;margin-bottom:22px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
<tr>
<td valign="middle">
<table role="presentation" cellspacing="0" cellpadding="0" border="0">
<tr>
<td valign="middle">{icon_html}</td>
<td valign="middle" style="padding-left:10px;"><span style="font-size:18px;font-weight:700;color:#0f172a;">{sym_title}</span></td>
</tr>
</table>
</td>
<td align="right" valign="middle">
<span style="display:inline-block;padding:4px 10px;border-radius:20px;background-color:{badge_bg};color:{badge_fg};font-size:11px;font-weight:700;letter-spacing:0.3px;text-transform:uppercase;">{badge_txt}</span>
</td>
</tr>
</table>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:16px;border-top:1px solid #e2e8f0;padding-top:14px;">
<tr>
<td width="50%" valign="top">
<div style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.3px;">Triggered Price</div>
<div style="font-size:24px;font-weight:800;color:#0f172a;margin-top:3px;">{trigger_price}</div>
</td>
<td width="50%" valign="top">
<div style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.3px;">Target Price</div>
<div style="font-size:16px;font-weight:600;color:#475569;margin-top:5px;">{target_price}</div>
</td>
</tr>
<tr>
<td colspan="2" style="padding-top:10px;font-size:12px;color:#64748b;">
Triggered on: <strong style="color:#334151;">{now_str}</strong>
</td>
</tr>
</table>
{note_html}
</div>
<div style="margin:22px 0 24px 0;">
<a href="{chart_url}" style="display:inline-block;background-color:#1a73e8;color:#ffffff;font-size:14px;font-weight:600;padding:12px 26px;border-radius:6px;text-decoration:none;box-shadow:0 1px 2px rgba(0,0,0,0.08);">Open Live Chart on Entrack &rarr;</a>
</div>
<p style="font-size:13px;color:#4b5563;line-height:1.6;margin:0 0 16px 0;">Should you wish to modify or mute this alert, you can manage it anytime from your <a href="{url}/settings/alerts" style="color:#1a73e8;text-decoration:none;">Alert Settings</a>.</p>
<div style="font-size:14px;color:#1f2937;line-height:1.5;">Best,<br><strong>The Entrack Team</strong></div>"""

    subject = f"Price Alert: {symbol.strip().upper()} triggered at {trigger_price}"
    text = f"Hello Trader,\n\nYour alert for {symbol.strip().upper()} was triggered at {trigger_price} (Target: {target_price}).\nCondition: {cond_clean}\n{f'Note: {note}' if note else ''}\nTime: {now_str}\n\nView Chart: {chart_url}\n\nBest,\nThe Entrack Team"
    return {"subject": subject, "html": _wrap_shell("Price Alert Notification", f"{symbol} hit {trigger_price}", body, furl), "text": text}

def build_auth_email(kind: str, data: dict, furl: str = "") -> dict:
    url = (furl or FRONTEND_URL).rstrip("/")
    name = html_lib.escape(data.get("name") or "Trader")
    if kind == "verify":
        token = data.get("token", "")
        verify_url = f"{url}/verify-email?token={token}"
        subject = "Verify your Entrack account"
        body = f"""<div style="font-size:15px;font-weight:600;color:#0f172a;margin-bottom:6px;">Hello {name},</div>
<p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 20px 0;">Thank you for registering with Entrack. Please confirm your email address to activate your trading workspace and real-time alerts.</p>
<div style="margin:24px 0;">
<a href="{verify_url}" style="display:inline-block;background-color:#1a73e8;color:#ffffff;font-size:14px;font-weight:600;padding:12px 28px;border-radius:6px;text-decoration:none;box-shadow:0 1px 2px rgba(0,0,0,0.08);">Verify Email Address &rarr;</a>
</div>
<p style="font-size:12px;color:#64748b;line-height:1.5;margin:0 0 16px 0;">This link expires in 60 minutes. If you did not create an Entrack account, please disregard this email.</p>
<div style="font-size:14px;color:#1f2937;line-height:1.5;">Best,<br><strong>The Entrack Team</strong></div>"""
        return {"subject": subject, "html": _wrap_shell(subject, "Confirm your email address", body, furl), "text": f"Hello {name},\nVerify your email: {verify_url}\nExpires in 60 minutes.\n\nBest,\nThe Entrack Team"}

    if kind == "reset_otp":
        otp = html_lib.escape(str(data.get("otp", "")))
        subject = "Your Entrack Password Reset Code"
        body = f"""<div style="font-size:15px;font-weight:600;color:#0f172a;margin-bottom:6px;">Hello {name},</div>
<p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 16px 0;">We received a request to reset your password. Use the verification code below to proceed:</p>
<div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:18px;text-align:center;margin:18px 0;">
<div style="font-size:32px;font-weight:800;letter-spacing:6px;color:#1a73e8;font-family:monospace;">{otp}</div>
</div>
<p style="font-size:12px;color:#64748b;line-height:1.5;margin:0 0 16px 0;">This code will expire in 5 minutes. Never share this code with anyone.</p>
<div style="font-size:14px;color:#1f2937;line-height:1.5;">Best,<br><strong>The Entrack Team</strong></div>"""
        return {"subject": subject, "html": _wrap_shell(subject, f"Your verification code: {otp}", body, furl), "text": f"Hello {name},\nYour reset OTP is: {otp}\nExpires in 5 minutes.\n\nBest,\nThe Entrack Team"}

    if kind == "password_changed":
        subject = "Security Notice: Entrack Password Changed"
        body = f"""<div style="font-size:15px;font-weight:600;color:#0f172a;margin-bottom:6px;">Hello {name},</div>
<p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 16px 0;">Your Entrack account password was recently changed. If you performed this update, no further action is required.</p>
<div style="padding:12px 14px;background-color:#fef2f2;border-left:3px solid #dc2626;border-radius:4px;font-size:13px;color:#991b1b;margin:16px 0;">
<strong>Security Warning:</strong> If you did not make this change, please reset your password immediately and contact support.
</div>
<div style="font-size:14px;color:#1f2937;line-height:1.5;margin-top:16px;">Best,<br><strong>The Entrack Team</strong></div>"""
        return {"subject": subject, "html": _wrap_shell(subject, "Your Entrack password was updated", body, furl), "text": f"Hello {name},\nYour password was updated. If this wasn't you, reset it immediately.\n\nBest,\nThe Entrack Team"}

    ip = html_lib.escape(str(data.get("ip", "Unknown")))
    device = html_lib.escape(str(data.get("device", "Unknown")))
    subject = "Security Notice: New Login to Entrack"
    body = f"""<div style="font-size:15px;font-weight:600;color:#0f172a;margin-bottom:6px;">Hello {name},</div>
<p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 16px 0;">A new login was recorded for your Entrack account:</p>
<div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;font-size:13px;line-height:1.8;margin:16px 0;">
<div><strong style="color:#64748b;">IP Address:</strong> <span style="color:#0f172a;font-family:monospace;">{ip}</span></div>
<div><strong style="color:#64748b;">Device:</strong> <span style="color:#0f172a;">{device}</span></div>
</div>
<p style="font-size:12px;color:#64748b;line-height:1.5;margin:0 0 16px 0;">If this was you, you can safely ignore this notice.</p>
<div style="font-size:14px;color:#1f2937;line-height:1.5;">Best,<br><strong>The Entrack Team</strong></div>"""
    return {"subject": subject, "html": _wrap_shell(subject, "New login recorded", body, furl), "text": f"Hello {name},\nNew login detected.\nIP: {ip}\nDevice: {device}\n\nBest,\nThe Entrack Team"}
