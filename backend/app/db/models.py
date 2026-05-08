import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum

from sqlalchemy import Column, String, DateTime, ForeignKey, Enum, Text
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


class TaskStatus(str, PyEnum):
    pending = "pending"
    in_progress = "in_progress"
    done = "done"


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), default=_now, nullable=False)

    tasks = relationship("Task", back_populates="owner", cascade="all, delete-orphan")
    share_tokens = relationship("ShareToken", back_populates="task_owner", cascade="all, delete-orphan")


class Task(Base):
    __tablename__ = "tasks"

    id = Column(String(36), primary_key=True, default=_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(Enum(TaskStatus, native_enum=False), nullable=False, default=TaskStatus.pending)
    due_date = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=_now, onupdate=_now, nullable=False)

    owner = relationship("User", back_populates="tasks")
    share_tokens = relationship("ShareToken", back_populates="task", cascade="all, delete-orphan")


class ShareToken(Base):
    __tablename__ = "share_tokens"

    id = Column(String(36), primary_key=True, default=_uuid)
    task_owner_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    task_id = Column(String(36), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    token = Column(String(36), unique=True, nullable=False, default=_uuid, index=True)
    recipient_email = Column(String(255), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=_now, nullable=False)

    task_owner = relationship("User", back_populates="share_tokens")
    task = relationship("Task", back_populates="share_tokens")
