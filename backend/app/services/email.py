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
        api_key = settings.MAILJET_API_KEY.strip()
        secret_key = settings.MAILJET_SECRET_KEY.strip()
        logger.info("Mailjet key lengths: api=%d secret=%d", len(api_key), len(secret_key))
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                "https://api.mailjet.com/v3.1/send",
                auth=(api_key, secret_key),
                json={
                    "Messages": [{
                        "From": {"Email": settings.MAIL_FROM, "Name": "TaskFlow"},
                        "To": [{"Email": recipient}],
                        "Subject": subject,
                        "HTMLPart": html,
                    }]
                },
            )
            response.raise_for_status()
            logger.info("Mailjet email sent to %s, status %s", recipient, response.status_code)
    except Exception as e:
        logger.error("Email send failed: %s", e, exc_info=True)
