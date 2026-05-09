from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from app.db.models import TaskStatus, Priority


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    description: Optional[str] = None
    priority: Priority = Priority.medium
    start_date: Optional[datetime] = None
    due_date: Optional[datetime] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=500)
    description: Optional[str] = None
    priority: Optional[Priority] = None
    start_date: Optional[datetime] = None
    due_date: Optional[datetime] = None


class TaskStatusUpdate(BaseModel):
    status: TaskStatus


class TaskOut(BaseModel):
    id: str
    user_id: str
    title: str
    description: Optional[str]
    status: TaskStatus
    priority: Priority
    start_date: Optional[datetime]
    due_date: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
