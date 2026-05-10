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
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": f"TaskFlow <{settings.MAIL_FROM or 'onboarding@resend.dev'}>",
                    "to": [recipient],
                    "subject": subject,
                    "html": html,
                },
            )
            response.raise_for_status()
            logger.info("Resend email sent to %s, status %s", recipient, response.status_code)
    except Exception as e:
        logger.error("Email send failed: %s", e, exc_info=True)
