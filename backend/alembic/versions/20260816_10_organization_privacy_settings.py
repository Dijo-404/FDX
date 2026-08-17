"""Add organization-specific participant privacy settings.

Revision ID: 20260816_10
Revises: 20260816_09
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision = "20260816_10"
down_revision = "20260816_09"
branch_labels = None
depends_on = None


def upgrade() -> None:
    organization_columns = {column["name"] for column in inspect(op.get_bind()).get_columns("organizations")}
    if "privacy_contact_email" not in organization_columns:
        op.add_column(
            "organizations",
            sa.Column("privacy_contact_email", sa.String(length=254), nullable=True),
        )
    if "participant_privacy_notice" not in organization_columns:
        op.add_column(
            "organizations",
            sa.Column(
                "participant_privacy_notice",
                sa.Text(),
                nullable=False,
                server_default="",
            ),
        )
    if "privacy_notice_version" not in organization_columns:
        op.add_column(
            "organizations",
            sa.Column(
                "privacy_notice_version",
                sa.Integer(),
                nullable=False,
                server_default="1",
            ),
        )


def downgrade() -> None:
    op.drop_column("organizations", "privacy_notice_version")
    op.drop_column("organizations", "participant_privacy_notice")
    op.drop_column("organizations", "privacy_contact_email")
