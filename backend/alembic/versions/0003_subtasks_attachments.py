"""add subtasks and attachments tables

Revision ID: 0003
Revises: 0002
Create Date: 2026-05-09 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "subtasks",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("task_id", sa.String(36), sa.ForeignKey("tasks.id", ondelete="CASCADE"),
                  nullable=False),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("is_completed", sa.Boolean, nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_subtasks_task_id", "subtasks", ["task_id"])

    op.create_table(
        "attachments",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("task_id", sa.String(36), sa.ForeignKey("tasks.id", ondelete="CASCADE"),
                  nullable=False),
        sa.Column("subtask_id", sa.String(36), sa.ForeignKey("subtasks.id", ondelete="CASCADE"),
                  nullable=True),
        sa.Column("name", sa.String(500), nullable=False),
        sa.Column("url", sa.Text, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_attachments_task_id", "attachments", ["task_id"])
    op.create_index("ix_attachments_subtask_id", "attachments", ["subtask_id"])


def downgrade() -> None:
    op.drop_table("attachments")
    op.drop_table("subtasks")
