from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, asc
from sqlalchemy.orm import selectinload

from datetime import datetime, timedelta, timezone

from app.api.deps import get_current_user
from app.db.base import get_db
from app.db.models import Task, TaskStatus, Priority, User, Subtask
from app.schemas.task import TaskCreate, TaskOut, TaskUpdate, TaskStatusUpdate
from app.services.gemini import estimate_task_time, generate_summary

router = APIRouter(prefix="/tasks", tags=["tasks"])

# Valid forward transitions only
_ALLOWED_TRANSITIONS: dict[TaskStatus, set[TaskStatus]] = {
    TaskStatus.to_do: {TaskStatus.in_progress},
    TaskStatus.in_progress: {TaskStatus.done, TaskStatus.to_do},
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
) -> List[TaskOut]:
    """Return all tasks belonging to the authenticated user."""
    result = await db.execute(
        select(Task)
        .where(Task.user_id == current_user.id)
        .options(selectinload(Task.subtasks), selectinload(Task.all_attachments))
    )
    tasks = list(result.scalars().all())
    out = []
    for task in tasks:
        d = TaskOut.model_validate(task).model_dump()
        d['subtask_count'] = len(task.subtasks)
        d['attachment_count'] = sum(1 for a in task.all_attachments if a.subtask_id is None)
        out.append(TaskOut.model_validate(d))
    return out


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
        priority=payload.priority,
        start_date=payload.start_date,
        due_date=payload.due_date,
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return task


@router.post("/summary")
async def task_summary(
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Generate an AI summary of task activity for the past day or week."""
    period = payload.get("period", "week")
    if period not in ("day", "week"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="period must be 'day' or 'week'")

    delta = timedelta(days=1) if period == "day" else timedelta(weeks=1)
    since = datetime.now(timezone.utc) - delta

    result = await db.execute(
        select(Task)
        .where(Task.user_id == current_user.id)
        .where(Task.updated_at >= since)
    )
    tasks = result.scalars().all()

    tasks_data = []
    for t in tasks:
        created_in_period = t.created_at >= since
        if created_in_period:
            event = "created"
        elif t.status == TaskStatus.done:
            event = "completed"
        else:
            event = "updated"
        tasks_data.append({
            "event": event,
            "title": t.title,
            "status": t.status.value,
            "priority": t.priority.value,
        })

    if not tasks_data:
        return {"summary": f"No task activity in the past {'day' if period == 'day' else 'week'}."}

    try:
        text = await generate_summary(period, tasks_data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))
    except Exception:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="AI summary failed")

    return {"summary": text}


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


@router.post("/{task_id}/estimate")
async def estimate_task(
    task_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Use Gemini AI to estimate how long a task will take."""
    task = await _get_task_or_404(task_id, current_user, db)
    result = await db.execute(select(Subtask).where(Subtask.task_id == task_id))
    subtask_titles = [s.title for s in result.scalars().all()]
    try:
        estimate = await estimate_task_time(
            title=task.title,
            description=task.description,
            priority=task.priority.value,
            subtasks=subtask_titles,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))
    except Exception:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="AI estimation failed")
    return {"estimate": estimate}


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
