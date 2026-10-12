import os
from infra.email.client import send_mail
from infra.email.templates import build_auth_email

_raw_furl = os.getenv("FRONTEND_URL")
FRONTEND_URL = _raw_furl.rstrip("/") if _raw_furl else ""

async def send_verification_email(email: str, name: str, token: str) -> bool:
    tpl = build_auth_email("verify", {"name": name, "token": token}, FRONTEND_URL)
    return await send_mail(email, tpl["subject"], tpl["html"], tpl["text"])

async def send_password_reset_email(email: str, name: str, otp: str) -> bool:
    tpl = build_auth_email("reset_otp", {"name": name, "otp": otp}, FRONTEND_URL)
    return await send_mail(email, tpl["subject"], tpl["html"], tpl["text"])

async def send_password_changed_email(email: str, name: str) -> bool:
    tpl = build_auth_email("password_changed", {"name": name}, FRONTEND_URL)
    return await send_mail(email, tpl["subject"], tpl["html"], tpl["text"])

async def send_login_notification_email(email: str, name: str, ip: str, device: str) -> bool:
    tpl = build_auth_email("login", {"name": name, "ip": ip, "device": device}, FRONTEND_URL)
    return await send_mail(email, tpl["subject"], tpl["html"], tpl["text"])
