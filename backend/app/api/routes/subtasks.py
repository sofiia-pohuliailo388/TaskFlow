from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api.deps import get_current_user
from app.db.base import get_db
from app.db.models import Task, Subtask, User
from app.schemas.subtask import SubtaskCreate, SubtaskOut, SubtaskUpdate

router = APIRouter(prefix="/tasks/{task_id}/subtasks", tags=["subtasks"])


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
    subtask = result.scalar_one_or_none()
    if subtask is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subtask not found")
    return subtask


@router.get("", response_model=List[SubtaskOut])
async def list_subtasks(
    task_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[Subtask]:
    await _get_task_or_403(task_id, current_user, db)
    result = await db.execute(
        select(Subtask).where(Subtask.task_id == task_id).order_by(Subtask.created_at)
    )
    subtasks = list(result.scalars().all())
    # eagerly load attachments for each subtask
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(Subtask)
        .where(Subtask.task_id == task_id)
        .options(selectinload(Subtask.attachments))
        .order_by(Subtask.created_at)
    )
    return list(result.scalars().all())


@router.post("", response_model=SubtaskOut, status_code=status.HTTP_201_CREATED)
async def create_subtask(
    task_id: str,
    payload: SubtaskCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Subtask:
    await _get_task_or_403(task_id, current_user, db)
    subtask = Subtask(task_id=task_id, title=payload.title)
    db.add(subtask)
    await db.commit()
    await db.refresh(subtask)
    return subtask


@router.patch("/{subtask_id}", response_model=SubtaskOut)
async def update_subtask(
    task_id: str,
    subtask_id: str,
    payload: SubtaskUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Subtask:
    await _get_task_or_403(task_id, current_user, db)
    subtask = await _get_subtask_or_404(subtask_id, task_id, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(subtask, field, value)
    await db.commit()
    await db.refresh(subtask)
    return subtask


@router.delete("/{subtask_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_subtask(
    task_id: str,
    subtask_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    await _get_task_or_403(task_id, current_user, db)
    subtask = await _get_subtask_or_404(subtask_id, task_id, db)
    await db.delete(subtask)
    await db.commit()
