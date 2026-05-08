import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api.deps import get_current_user
from app.db.base import get_db
from app.db.models import ShareToken, Task, User
from app.schemas.share import ShareRequest, ShareTokenOut, SharedTaskOut
from app.schemas.task import TaskOut
from app.services.email import send_share_email
from app.core.config import settings

router = APIRouter(prefix="/share", tags=["share"])


@router.post("/{task_id}", response_model=ShareTokenOut, status_code=status.HTTP_201_CREATED)
async def create_share_token(
    task_id: str,
    payload: ShareRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ShareToken:
    """Generate a share token for a task and email it to the recipient."""
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    if task.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    token_value = str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    share_token = ShareToken(
        task_owner_id=current_user.id,
        task_id=task_id,
        token=token_value,
        recipient_email=payload.recipient_email,
        expires_at=expires_at,
    )
    db.add(share_token)
    await db.commit()
    await db.refresh(share_token)

    background_tasks.add_task(
        send_share_email,
        recipient=payload.recipient_email,
        task_title=task.title,
        token=token_value,
        owner_name=current_user.name,
    )

    return share_token


@router.get("/{token}", response_model=SharedTaskOut)
async def view_shared_task(token: str, db: AsyncSession = Depends(get_db)) -> SharedTaskOut:
    """Public endpoint — view a task via share token (no auth required)."""
    result = await db.execute(select(ShareToken).where(ShareToken.token == token))
    share = result.scalar_one_or_none()
    if share is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Share token not found")

    now = datetime.now(timezone.utc)
    if share.expires_at.replace(tzinfo=timezone.utc) < now:
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Share token has expired")

    task_result = await db.execute(select(Task).where(Task.id == share.task_id))
    task = task_result.scalar_one_or_none()
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task no longer exists")

    owner_result = await db.execute(select(User).where(User.id == share.task_owner_id))
    owner = owner_result.scalar_one_or_none()

    return SharedTaskOut(
        task=TaskOut.model_validate(task),
        shared_by=owner.name if owner else "Unknown",
        expires_at=share.expires_at,
    )
