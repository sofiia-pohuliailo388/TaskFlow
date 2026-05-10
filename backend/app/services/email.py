import base64
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)


def _build_html(owner_name: str, task_title: str, link: str) -> str:
    return (
        f"<p>Hello,</p>"
        f"<p><b>{owner_name}</b> has shared a task with you: <b>{task_title}</b>.</p>"
        f"<p>Click the link below to view it (valid for 7 days):</p>"
        f'<p><a href="{link}">{link}</a></p>'
    )


async def send_share_email(recipient: str, task_title: str, token: str, owner_name: str) -> None:
    link = f"{settings.FRONTEND_URL}/share/{token}"
    subject = f"{owner_name} shared a task with you"
    html = _build_html(owner_name, task_title, link)

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            token_resp = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "refresh_token": settings.GMAIL_REFRESH_TOKEN,
                    "grant_type": "refresh_token",
                },
            )
            token_resp.raise_for_status()
            access_token = token_resp.json()["access_token"]

            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = settings.MAIL_FROM
            msg["To"] = recipient
            msg.attach(MIMEText(html, "html"))
            raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()

            resp = await client.post(
                "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
                headers={"Authorization": f"Bearer {access_token}"},
                json={"raw": raw},
            )
            resp.raise_for_status()
            logger.info("Gmail API email sent to %s", recipient)
    except Exception as e:
        logger.error("Email send failed: %s", e, exc_info=True)
