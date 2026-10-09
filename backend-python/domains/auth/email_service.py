import os, html as html_lib
import httpx
from core.logger.logger import logger

EMAIL_API_KEY = os.getenv("RESEND_API_KEY") if os.getenv("RESEND_API_KEY") else os.getenv("EMAIL_API_KEY")
EMAIL_API_URL = os.getenv("EMAIL_API_URL")
FROM_EMAIL = os.getenv("EMAIL_FROM")
FROM_NAME = os.getenv("EMAIL_FROM_NAME", "Entrack")
EMAIL_FROM = f"{FROM_NAME} <{FROM_EMAIL}>" if FROM_EMAIL else None
_raw_furl = os.getenv("FRONTEND_URL")
FRONTEND_URL = _raw_furl.rstrip("/") if _raw_furl else ""

async def send_mail(to: str, subject: str, html: str, text: str) -> bool:
    if not EMAIL_API_KEY or not EMAIL_API_URL or not EMAIL_FROM:
        logger.warning("Email skipped: EMAIL_API_KEY, EMAIL_API_URL, or EMAIL_FROM missing")
        return False
    headers = {"Authorization": f"Bearer {EMAIL_API_KEY}", "Content-Type": "application/json"}
    payload = {"from": EMAIL_FROM, "to": [to], "subject": subject, "html": html, "text": text}
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(EMAIL_API_URL, json=payload, headers=headers)
            if resp.status_code >= 400:
                logger.error(f"Email provider error {resp.status_code}: {resp.text}")
                return False
            return True
    except Exception as e:
        logger.error(f"Failed to send email to {to}: {str(e)}")
        return False

async def send_verification_email(email: str, name: str, token: str) -> bool:
    if not FRONTEND_URL:
        logger.error("FRONTEND_URL missing in environment")
        return False
    verify_url = f"{FRONTEND_URL}/verify-email?token={token}"
    subject = "Verify your Entrack account"
    text = f"Hi {name},\n\nPlease verify your email by clicking the link:\n{verify_url}\n\nThis link will expire in 60 minutes."
    s_name = html_lib.escape(name) if name else "there"
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #111827;">Verify your email</h2>
        <p style="color: #4b5563;">Hi {s_name},</p>
        <p style="color: #4b5563;">Thanks for signing up for Entrack. Please click the button below to verify your email address:</p>
        <a href="{verify_url}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 16px 0;">Verify Email</a>
        <p style="color: #6b7280; font-size: 13px;">If the button doesn't work, copy and paste this link:<br><a href="{verify_url}" style="color: #2563eb;">{verify_url}</a></p>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">If you didn't create an account, you can safely ignore this email.</p>
    </div>
    """
    return await send_mail(email, subject, html, text)

async def send_password_reset_email(email: str, name: str, otp: str) -> bool:
    subject = "Your Entrack password reset OTP"
    text = f"Hi {name},\n\nYour password reset OTP is: {otp}\n\nThis code expires in 5 minutes."
    s_name = html_lib.escape(name) if name else "there"
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #111827;">Reset your password</h2>
        <p style="color: #4b5563;">Hi {s_name},</p>
        <p style="color: #4b5563;">You requested a password reset. Use this verification code:</p>
        <div style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #2563eb; padding: 16px 0;">{otp}</div>
        <p style="color: #6b7280; font-size: 13px;">This code expires in 5 minutes. Do not share this OTP with anyone.</p>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">If you didn't request this, your account is safe and you can ignore this email.</p>
    </div>
    """
    return await send_mail(email, subject, html, text)

async def send_password_changed_email(email: str, name: str) -> bool:
    subject = "Your Entrack password was changed"
    text = f"Hi {name},\n\nYour Entrack account password was successfully updated. If this wasn't you, reset your password immediately."
    s_name = html_lib.escape(name) if name else "there"
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #111827;">Password Changed</h2>
        <p style="color: #4b5563;">Hi {s_name},</p>
        <p style="color: #4b5563;">Your password has been changed successfully. If you made this change, no action is needed.</p>
        <p style="color: #ef4444; font-size: 13px; font-weight: bold;">If you did not make this change, please reset your password immediately and contact support.</p>
    </div>
    """
    return await send_mail(email, subject, html, text)

async def send_login_notification_email(email: str, name: str, ip: str, device: str) -> bool:
    subject = "New login to your Entrack account"
    text = f"Hi {name},\n\nA new login was detected on your Entrack account.\nIP: {ip}\nDevice: {device}"
    s_name = html_lib.escape(name) if name else "there"
    s_ip = html_lib.escape(ip) if ip else "unknown"
    s_dev = html_lib.escape(device) if device else "unknown"
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #111827;">New Login Detected</h2>
        <p style="color: #4b5563;">Hi {s_name},</p>
        <p style="color: #4b5563;">A new login was recorded:</p>
        <p style="color: #374151; font-size: 14px;"><strong>IP Address:</strong> {s_ip}<br><strong>Device:</strong> {s_dev}</p>
        <p style="color: #6b7280; font-size: 13px;">If this was you, you can ignore this notice.</p>
    </div>
    """
    return await send_mail(email, subject, html, text)
