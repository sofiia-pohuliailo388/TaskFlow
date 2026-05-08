from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api.deps import get_current_user
from app.db.base import get_db
from app.db.models import Task, TaskStatus, User
from app.schemas.task import TaskCreate, TaskOut, TaskUpdate, TaskStatusUpdate

router = APIRouter(prefix="/tasks", tags=["tasks"])

# Valid forward transitions only
_ALLOWED_TRANSITIONS: dict[TaskStatus, set[TaskStatus]] = {
    TaskStatus.pending: {TaskStatus.in_progress},
    TaskStatus.in_progress: {TaskStatus.done, TaskStatus.pending},
    TaskStatus.done: set(),
}


async def _get_task_or_404(task_id: str, user: User, db: AsyncSession) -> Task:
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    if task.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return task


@router.get("", response_model=List[TaskOut])
async def list_tasks(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[Task]:
    """Return all tasks belonging to the authenticated user."""
    result = await db.execute(select(Task).where(Task.user_id == current_user.id))
    return list(result.scalars().all())


@router.post("", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
async def create_task(
    payload: TaskCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Task:
    """Create a new task for the authenticated user."""
    task = Task(
        user_id=current_user.id,
        title=payload.title,
        description=payload.description,
        due_date=payload.due_date,
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return task


@router.get("/{task_id}", response_model=TaskOut)
async def get_task(
    task_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Task:
    """Retrieve a single task by ID (must belong to the authenticated user)."""
    return await _get_task_or_404(task_id, current_user, db)


@router.patch("/{task_id}", response_model=TaskOut)
async def update_task(
    task_id: str,
    payload: TaskUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Task:
    """Update title, description, or due_date of a task."""
    task = await _get_task_or_404(task_id, current_user, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(task, field, value)
    await db.commit()
    await db.refresh(task)
    return task


@router.patch("/{task_id}/status", response_model=TaskOut)
async def update_task_status(
    task_id: str,
    payload: TaskStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Task:
    """Change a task's status. Invalid transitions return 400."""
    task = await _get_task_or_404(task_id, current_user, db)

    allowed = _ALLOWED_TRANSITIONS.get(task.status, set())
    if payload.status not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot transition from '{task.status}' to '{payload.status}'",
        )

    task.status = payload.status
    await db.commit()
    await db.refresh(task)
    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    """Delete a task permanently."""
    task = await _get_task_or_404(task_id, current_user, db)
    await db.delete(task)
    await db.commit()
