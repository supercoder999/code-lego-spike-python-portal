"""
Email Router — Sends program code to admin via email.
Includes a 60-second rate limit per IP to prevent spam.
"""

import os
import time
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

router = APIRouter()

# --- Configuration (set via environment variables) ---
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "craftbots.ai@gmail.com")
SMTP_PASS = os.getenv("SMTP_PASS", "xire anlo atqo ezwb")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "craftbots.ai@gmail.com")
FROM_EMAIL = os.getenv("FROM_EMAIL", "") or SMTP_USER

# Rate limiting: IP -> last_send_timestamp
_rate_limit: Dict[str, float] = {}
RATE_LIMIT_SECONDS = 60


class SendProgramRequest(BaseModel):
    program_name: str
    code: str
    mode: str = "python"


@router.post("/send-program")
async def send_program_email(req: SendProgramRequest, request: Request):
    """Send program code to admin email. Rate limited to 1 email per 60 seconds per IP."""

    # --- Rate limit check ---
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()
    last_sent = _rate_limit.get(client_ip, 0)
    elapsed = now - last_sent

    if elapsed < RATE_LIMIT_SECONDS:
        retry_after = int(RATE_LIMIT_SECONDS - elapsed) + 1
        raise HTTPException(
            status_code=429,
            detail=f"Rate limited. Please wait {retry_after} seconds.",
            headers={"Retry-After": str(retry_after)},
        )

    # --- Check config ---
    if not SMTP_USER or not SMTP_PASS or not ADMIN_EMAIL:
        raise HTTPException(
            status_code=503,
            detail="Email not configured. Set SMTP_USER, SMTP_PASS, and ADMIN_EMAIL environment variables.",
        )

    # --- Build email ---
    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"[Pybricks IDE] Program: {req.program_name}"
    msg["From"] = FROM_EMAIL
    msg["To"] = ADMIN_EMAIL

    # Plain text version
    plain_body = f"""Program: {req.program_name}
Mode: {req.mode}
Sent from Pybricks IDE

--- Code ---
{req.code}
"""

    # HTML version with syntax styling
    escaped_code = (
        req.code.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    )
    html_body = f"""
<html>
<body style="font-family: Arial, sans-serif; color: #333;">
    <h2 style="color: #1a73e8;">📤 Program Submitted: {req.program_name}</h2>
    <p><strong>Mode:</strong> {req.mode}</p>
    <p><strong>Source:</strong> Pybricks IDE</p>
    <hr style="border: 1px solid #eee;" />
    <pre style="background: #1e1e1e; color: #d4d4d4; padding: 16px; border-radius: 8px; font-size: 14px; overflow-x: auto;">
{escaped_code}
    </pre>
</body>
</html>
"""

    msg.attach(MIMEText(plain_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    # --- Send ---
    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(FROM_EMAIL, [ADMIN_EMAIL], msg.as_string())
    except smtplib.SMTPAuthenticationError:
        raise HTTPException(status_code=500, detail="SMTP authentication failed. Check SMTP_USER and SMTP_PASS.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")

    # Record successful send for rate limiting
    _rate_limit[client_ip] = time.time()

    return {"status": "sent", "to": ADMIN_EMAIL, "program": req.program_name}


@router.get("/status")
async def email_status():
    """Check if email is configured."""
    configured = bool(SMTP_USER and SMTP_PASS and ADMIN_EMAIL)
    return {
        "configured": configured,
        "admin_email": ADMIN_EMAIL[:3] + "***" if ADMIN_EMAIL else None,
    }
