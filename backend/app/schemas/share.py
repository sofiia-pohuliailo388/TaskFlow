from datetime import datetime
from pydantic import BaseModel, EmailStr
from app.schemas.task import TaskOut


class ShareRequest(BaseModel):
    recipient_email: EmailStr


class ShareTokenOut(BaseModel):
    token: str
    recipient_email: str
    expires_at: datetime

    model_config = {"from_attributes": True}


class SharedTaskOut(BaseModel):
    task: TaskOut
    shared_by: str  # owner name
    expires_at: datetime
