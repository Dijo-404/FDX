"""Add asynchronous private gallery exports.

Revision ID: 20260813_04
Revises: 20260813_03
"""

from alembic import op
from app.models import GalleryExport  # noqa: F401
from sqlalchemy import inspect

revision = "20260813_04"
down_revision = "20260813_03"
branch_labels = None
depends_on = None


def upgrade() -> None:
    if "gallery_exports" not in inspect(op.get_bind()).get_table_names():
        GalleryExport.__table__.create(op.get_bind())


def downgrade() -> None:
    # Biometric and media lifecycle migrations are intentionally forward-only.
    pass
