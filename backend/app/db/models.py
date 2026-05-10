import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum

from sqlalchemy import Column, String, DateTime, ForeignKey, Enum, Text, Boolean
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


class TaskStatus(str, PyEnum):
    to_do = "to_do"
    in_progress = "in_progress"
    done = "done"


class Priority(str, PyEnum):
    high = "high"
    medium = "medium"
    low = "low"


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=True)
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
    status = Column(Enum(TaskStatus, native_enum=False), nullable=False, default=TaskStatus.to_do)
    priority = Column(Enum(Priority, native_enum=False), nullable=False, default=Priority.medium)
    start_date = Column(DateTime(timezone=True), nullable=True)
    due_date = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=_now, onupdate=_now, nullable=False)

    owner = relationship("User", back_populates="tasks")
    share_tokens = relationship("ShareToken", back_populates="task", cascade="all, delete-orphan")
    subtasks = relationship("Subtask", back_populates="task", cascade="all, delete-orphan",
                            order_by="Subtask.created_at")
    all_attachments = relationship("Attachment", back_populates="task", cascade="all, delete-orphan",
                                   order_by="Attachment.created_at")


class Subtask(Base):
    __tablename__ = "subtasks"

    id = Column(String(36), primary_key=True, default=_uuid)
    task_id = Column(String(36), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(500), nullable=False)
    is_completed = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), default=_now, nullable=False)

    task = relationship("Task", back_populates="subtasks")
    attachments = relationship("Attachment", back_populates="subtask", cascade="all, delete-orphan",
                               order_by="Attachment.created_at")


class Attachment(Base):
    __tablename__ = "attachments"

    id = Column(String(36), primary_key=True, default=_uuid)
    task_id = Column(String(36), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    # NULL means task-level attachment; non-NULL means subtask-level
    subtask_id = Column(String(36), ForeignKey("subtasks.id", ondelete="CASCADE"), nullable=True, index=True)
    name = Column(String(500), nullable=False)
    url = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=_now, nullable=False)

    task = relationship("Task", back_populates="all_attachments", foreign_keys="[Attachment.task_id]")
    subtask = relationship("Subtask", back_populates="attachments")


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
