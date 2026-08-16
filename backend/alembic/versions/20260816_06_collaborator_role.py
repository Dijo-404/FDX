"""Add the least-privilege collaborator role.

Revision ID: 20260816_06
Revises: 20260813_05
"""

from alembic import op

revision = "20260816_06"
down_revision = "20260813_05"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'COLLABORATOR'")


def downgrade() -> None:
    # PostgreSQL enum values are intentionally forward-only.
    pass
