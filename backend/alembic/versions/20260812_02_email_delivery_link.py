"""Link email attempts to gallery deliveries."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision = "20260812_02"
down_revision = "20260812_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    inspector = inspect(op.get_bind())
    columns = {column["name"] for column in inspector.get_columns("email_outbox")}
    if "delivery_id" not in columns:
        op.add_column(
            "email_outbox",
            sa.Column("delivery_id", sa.String(length=36), nullable=True),
        )
        op.create_foreign_key(
            "fk_email_outbox_delivery_id",
            "email_outbox",
            "deliveries",
            ["delivery_id"],
            ["id"],
            ondelete="SET NULL",
        )
        op.create_index("ix_email_outbox_delivery_id", "email_outbox", ["delivery_id"])


def downgrade() -> None:
    inspector = inspect(op.get_bind())
    columns = {column["name"] for column in inspector.get_columns("email_outbox")}
    if "delivery_id" in columns:
        op.drop_index("ix_email_outbox_delivery_id", table_name="email_outbox")
        op.drop_constraint("fk_email_outbox_delivery_id", "email_outbox", type_="foreignkey")
        op.drop_column("email_outbox", "delivery_id")
