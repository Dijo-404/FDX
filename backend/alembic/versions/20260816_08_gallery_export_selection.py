"""Persist private gallery export selections.

Revision ID: 20260816_08
Revises: 20260816_07
"""

import sqlalchemy as sa
from alembic import op

revision = "20260816_08"
down_revision = "20260816_07"
branch_labels = None
depends_on = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    columns = {column["name"] for column in inspector.get_columns("gallery_exports")}
    if "photo_ids" not in columns:
        op.add_column("gallery_exports", sa.Column("photo_ids", sa.JSON(), nullable=True))
    if "selection_hash" not in columns:
        op.add_column(
            "gallery_exports",
            sa.Column("selection_hash", sa.String(length=64), nullable=False, server_default="ALL"),
        )
        op.create_index(
            "ix_gallery_exports_selection_hash",
            "gallery_exports",
            ["selection_hash"],
        )


def downgrade() -> None:
    # Media lifecycle migrations are intentionally forward-only.
    pass
