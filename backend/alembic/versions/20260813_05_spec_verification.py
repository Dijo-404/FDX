"""Add durable state for direct enrollment uploads.

Revision ID: 20260813_05
Revises: 20260813_04
"""

import sqlalchemy as sa
from alembic import op

revision = "20260813_05"
down_revision = "20260813_04"
branch_labels = None
depends_on = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    columns = {column["name"] for column in inspector.get_columns("participant_enrollment_tokens")}
    additions = {
        "pending_storage_key": sa.Column("pending_storage_key", sa.String(length=500), nullable=True),
        "pending_content_type": sa.Column("pending_content_type", sa.String(length=120), nullable=True),
        "pending_size_bytes": sa.Column("pending_size_bytes", sa.BigInteger(), nullable=True),
        "pending_sha256": sa.Column("pending_sha256", sa.String(length=64), nullable=True),
    }
    for name, column in additions.items():
        if name not in columns:
            op.add_column("participant_enrollment_tokens", column)


def downgrade() -> None:
    # Security and biometric lifecycle migrations are intentionally forward-only.
    pass
