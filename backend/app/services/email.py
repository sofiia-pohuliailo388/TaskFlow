import asyncio
import resend
from app.core.config import settings


async def send_share_email(recipient: str, task_title: str, token: str, owner_name: str) -> None:
    resend.api_key = settings.RESEND_API_KEY
    link = f"{settings.FRONTEND_URL}/share/{token}"
    body = (
        f"<p>Hello,</p>"
        f"<p><b>{owner_name}</b> has shared a task with you: <b>{task_title}</b>.</p>"
        f"<p>Click the link below to view it (valid for 7 days):</p>"
        f'<p><a href="{link}">{link}</a></p>'
    )
    params: resend.Emails.SendParams = {
        "from": settings.MAIL_FROM or "onboarding@resend.dev",
        "to": [recipient],
        "subject": f"{owner_name} shared a task with you",
        "html": body,
    }
    await asyncio.to_thread(resend.Emails.send, params)
