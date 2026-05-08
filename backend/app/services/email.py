from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from app.core.config import settings


def _get_mailer() -> FastMail:
    conf = ConnectionConfig(
        MAIL_USERNAME=settings.SMTP_USER,
        MAIL_PASSWORD=settings.SMTP_PASSWORD,
        MAIL_FROM=settings.MAIL_FROM or settings.SMTP_USER or "noreply@example.com",
        MAIL_PORT=settings.SMTP_PORT,
        MAIL_SERVER=settings.SMTP_HOST,
        MAIL_STARTTLS=True,
        MAIL_SSL_TLS=False,
        USE_CREDENTIALS=bool(settings.SMTP_USER),
        VALIDATE_CERTS=True,
    )
    return FastMail(conf)


async def send_share_email(recipient: str, task_title: str, token: str, owner_name: str) -> None:
    """Send a share link email to the recipient."""
    link = f"{settings.FRONTEND_URL}/share/{token}"
    body = (
        f"<p>Hello,</p>"
        f"<p><b>{owner_name}</b> has shared a task with you: <b>{task_title}</b>.</p>"
        f"<p>Click the link below to view it (valid for 7 days):</p>"
        f'<p><a href="{link}">{link}</a></p>'
    )
    message = MessageSchema(
        subject=f"{owner_name} shared a task with you",
        recipients=[recipient],
        body=body,
        subtype=MessageType.html,
    )
    await _get_mailer().send_message(message)
