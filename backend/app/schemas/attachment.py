from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, HttpUrl, field_validator


class AttachmentCreate(BaseModel):
    name: str = Field(min_length=1, max_length=500)
    url: str = Field(min_length=1, max_length=2048)

    @field_validator("url")
    @classmethod
    def url_must_have_scheme(cls, v: str) -> str:
        if not (v.startswith("http://") or v.startswith("https://")):
            raise ValueError("URL must start with http:// or https://")
        return v


class AttachmentOut(BaseModel):
    id: str
    task_id: str
    subtask_id: Optional[str]
    name: str
    url: str
    created_at: datetime

    model_config = {"from_attributes": True}
