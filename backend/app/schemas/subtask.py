from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class SubtaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=500)


class SubtaskUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=500)
    is_completed: Optional[bool] = None


class AttachmentOut(BaseModel):
    id: str
    task_id: str
    subtask_id: Optional[str]
    name: str
    url: str
    created_at: datetime

    model_config = {"from_attributes": True}


class SubtaskOut(BaseModel):
    id: str
    task_id: str
    title: str
    is_completed: bool
    created_at: datetime
    attachments: List[AttachmentOut] = []

    model_config = {"from_attributes": True}
