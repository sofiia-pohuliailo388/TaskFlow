import logging

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
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                "https://api.brevo.com/v3/smtp/email",
                headers={
                    "api-key": settings.BREVO_API_KEY,
                    "Content-Type": "application/json",
                },
                json={
                    "sender": {"name": "TaskFlow", "email": settings.MAIL_FROM},
                    "to": [{"email": recipient}],
                    "subject": subject,
                    "htmlContent": html,
                },
            )
            response.raise_for_status()
            logger.info("Brevo email sent to %s, status %s", recipient, response.status_code)
    except Exception as e:
        logger.error("Email send failed: %s", e, exc_info=True)
