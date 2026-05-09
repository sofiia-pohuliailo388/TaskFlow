from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api.deps import get_current_user
from app.db.base import get_db
from app.db.models import Task, Subtask, Attachment, User
from app.schemas.attachment import AttachmentCreate, AttachmentOut

router = APIRouter(tags=["attachments"])


async def _get_task_or_403(task_id: str, user: User, db: AsyncSession) -> Task:
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    if task.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return task


async def _get_subtask_or_404(subtask_id: str, task_id: str, db: AsyncSession) -> Subtask:
    result = await db.execute(
        select(Subtask).where(Subtask.id == subtask_id, Subtask.task_id == task_id)
    )
    sub = result.scalar_one_or_none()
    if sub is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subtask not found")
    return sub


async def _get_attachment_or_404(attachment_id: str, task_id: str,
                                  subtask_id: Optional[str], db: AsyncSession) -> Attachment:
    result = await db.execute(
        select(Attachment).where(
            Attachment.id == attachment_id,
            Attachment.task_id == task_id,
            Attachment.subtask_id == subtask_id,
        )
    )
    att = result.scalar_one_or_none()
    if att is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attachment not found")
    return att


# ── Task-level attachments ────────────────────────────────────────────────

@router.get("/tasks/{task_id}/attachments", response_model=List[AttachmentOut])
async def list_task_attachments(
    task_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[Attachment]:
    await _get_task_or_403(task_id, current_user, db)
    result = await db.execute(
        select(Attachment)
        .where(Attachment.task_id == task_id, Attachment.subtask_id.is_(None))
        .order_by(Attachment.created_at)
    )
    return list(result.scalars().all())


@router.post("/tasks/{task_id}/attachments", response_model=AttachmentOut,
             status_code=status.HTTP_201_CREATED)
async def create_task_attachment(
    task_id: str,
    payload: AttachmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Attachment:
    await _get_task_or_403(task_id, current_user, db)
    att = Attachment(task_id=task_id, subtask_id=None, name=payload.name, url=payload.url)
    db.add(att)
    await db.commit()
    await db.refresh(att)
    return att


@router.delete("/tasks/{task_id}/attachments/{attachment_id}",
               status_code=status.HTTP_204_NO_CONTENT)
async def delete_task_attachment(
    task_id: str,
    attachment_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    await _get_task_or_403(task_id, current_user, db)
    att = await _get_attachment_or_404(attachment_id, task_id, None, db)
    await db.delete(att)
    await db.commit()


# ── Subtask-level attachments ─────────────────────────────────────────────

@router.get("/tasks/{task_id}/subtasks/{subtask_id}/attachments",
            response_model=List[AttachmentOut])
async def list_subtask_attachments(
    task_id: str,
    subtask_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[Attachment]:
    await _get_task_or_403(task_id, current_user, db)
    await _get_subtask_or_404(subtask_id, task_id, db)
    result = await db.execute(
        select(Attachment)
        .where(Attachment.task_id == task_id, Attachment.subtask_id == subtask_id)
        .order_by(Attachment.created_at)
    )
    return list(result.scalars().all())


@router.post("/tasks/{task_id}/subtasks/{subtask_id}/attachments",
             response_model=AttachmentOut, status_code=status.HTTP_201_CREATED)
async def create_subtask_attachment(
    task_id: str,
    subtask_id: str,
    payload: AttachmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Attachment:
    await _get_task_or_403(task_id, current_user, db)
    await _get_subtask_or_404(subtask_id, task_id, db)
    att = Attachment(task_id=task_id, subtask_id=subtask_id, name=payload.name, url=payload.url)
    db.add(att)
    await db.commit()
    await db.refresh(att)
    return att


@router.delete("/tasks/{task_id}/subtasks/{subtask_id}/attachments/{attachment_id}",
               status_code=status.HTTP_204_NO_CONTENT)
async def delete_subtask_attachment(
    task_id: str,
    subtask_id: str,
    attachment_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    await _get_task_or_403(task_id, current_user, db)
    await _get_subtask_or_404(subtask_id, task_id, db)
    att = await _get_attachment_or_404(attachment_id, task_id, subtask_id, db)
    await db.delete(att)
    await db.commit()
