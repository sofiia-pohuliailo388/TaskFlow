import asyncio
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import resend
from app.core.config import settings

logger = logging.getLogger(__name__)


def _build_html(owner_name: str, task_title: str, link: str) -> str:
    return (
        f"<p>Hello,</p>"
        f"<p><b>{owner_name}</b> has shared a task with you: <b>{task_title}</b>.</p>"
        f"<p>Click the link below to view it (valid for 7 days):</p>"
        f'<p><a href="{link}">{link}</a></p>'
    )


def _send_via_smtp(recipient: str, subject: str, html: str) -> None:
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.MAIL_FROM or settings.SMTP_USER
    msg["To"] = recipient
    msg.attach(MIMEText(html, "html"))
    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
        server.starttls()
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.sendmail(msg["From"], [recipient], msg.as_string())


async def send_share_email(recipient: str, task_title: str, token: str, owner_name: str) -> None:
    link = f"{settings.FRONTEND_URL}/share/{token}"
    subject = f"{owner_name} shared a task with you"
    html = _build_html(owner_name, task_title, link)

    try:
        if settings.RESEND_API_KEY:
            resend.api_key = settings.RESEND_API_KEY
            params: resend.Emails.SendParams = {
                "from": settings.MAIL_FROM or "onboarding@resend.dev",
                "to": [recipient],
                "subject": subject,
                "html": html,
            }
            result = await asyncio.to_thread(resend.Emails.send, params)
            logger.info("Resend result: %s", result)
        else:
            logger.info("Sending via SMTP to %s", recipient)
            await asyncio.to_thread(_send_via_smtp, recipient, subject, html)
            logger.info("SMTP send successful")
    except Exception as e:
        logger.error("Email send failed: %s", e, exc_info=True)
