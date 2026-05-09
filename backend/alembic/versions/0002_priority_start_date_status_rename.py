"""add priority, start_date; rename pending to to_do

Revision ID: 0002
Revises: 0001
Create Date: 2026-05-09 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()

    if bind.dialect.name == "postgresql":
        # ALTER TYPE renames the value in all existing rows automatically
        op.execute("ALTER TYPE taskstatus RENAME VALUE 'pending' TO 'to_do'")
    else:
        # SQLite stores enum as VARCHAR — update manually
        op.execute("UPDATE tasks SET status = 'to_do' WHERE status = 'pending'")

    # Add priority column (stored as varchar, validated at app level)
    op.add_column(
        "tasks",
        sa.Column("priority", sa.String(20), nullable=False, server_default="medium"),
    )

    # Add start_date column
    op.add_column(
        "tasks",
        sa.Column("start_date", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("tasks", "start_date")
    op.drop_column("tasks", "priority")

    op.execute("UPDATE tasks SET status = 'pending' WHERE status = 'to_do'")

    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("ALTER TYPE taskstatus RENAME VALUE 'to_do' TO 'pending'")
