"""Complete workflow schema for staff, thumbnails, and mail retry."""

import sqlalchemy as sa
from alembic import op
from app import models  # noqa: F401
from app.database import Base
from sqlalchemy import inspect

revision = "20260812_01"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    connection = op.get_bind()
    inspector = inspect(connection)
    if "organizations" not in inspector.get_table_names():
        Base.metadata.create_all(connection)
        return

    op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'STAFF'")
    photo_columns = {column["name"] for column in inspector.get_columns("photos")}
    if "thumbnail_storage_key" not in photo_columns:
        op.add_column("photos", sa.Column("thumbnail_storage_key", sa.String(length=500), nullable=True))
    if "thumbnail_size_bytes" not in photo_columns:
        op.add_column("photos", sa.Column("thumbnail_size_bytes", sa.BigInteger(), nullable=False, server_default="0"))
    enrollment_columns = {column["name"] for column in inspector.get_columns("face_enrollments")}
    if "size_bytes" not in enrollment_columns:
        op.add_column("face_enrollments", sa.Column("size_bytes", sa.BigInteger(), nullable=False, server_default="0"))
    email_columns = {column["name"] for column in inspector.get_columns("email_outbox")}
    if "attempts" not in email_columns:
        op.add_column("email_outbox", sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"))
    if "next_attempt_at" not in email_columns:
        op.add_column("email_outbox", sa.Column("next_attempt_at", sa.DateTime(timezone=True), nullable=True))
        op.create_index("ix_email_outbox_next_attempt_at", "email_outbox", ["next_attempt_at"])
    if "last_attempt_at" not in email_columns:
        op.add_column("email_outbox", sa.Column("last_attempt_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("email_outbox", "last_attempt_at")
    op.drop_index("ix_email_outbox_next_attempt_at", table_name="email_outbox")
    op.drop_column("email_outbox", "next_attempt_at")
    op.drop_column("email_outbox", "attempts")
    op.drop_column("face_enrollments", "size_bytes")
    op.drop_column("photos", "thumbnail_size_bytes")
    op.drop_column("photos", "thumbnail_storage_key")
