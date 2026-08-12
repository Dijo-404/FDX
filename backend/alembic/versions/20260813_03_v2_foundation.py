"""Add the FDX V2 security, workflow, outbox, and storage foundation."""

import sqlalchemy as sa
from alembic import op
from app import models  # noqa: F401
from app.database import Base
from pgvector.sqlalchemy import Vector
from sqlalchemy import inspect

revision = "20260813_03"
down_revision = "20260812_02"
branch_labels = None
depends_on = None


def _add(table: str, name: str, column: sa.Column) -> None:
    inspector = inspect(op.get_bind())
    if name not in {item["name"] for item in inspector.get_columns(table)}:
        op.add_column(table, column)


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    _add(
        "users",
        "updated_at",
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )

    _add(
        "events",
        "starts_at",
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=True),
    )
    _add(
        "events",
        "ends_at",
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=True),
    )
    _add(
        "events",
        "enrollment_opens_at",
        sa.Column("enrollment_opens_at", sa.DateTime(timezone=True), nullable=True),
    )
    _add(
        "events",
        "enrollment_closes_at",
        sa.Column("enrollment_closes_at", sa.DateTime(timezone=True), nullable=True),
    )
    _add(
        "events",
        "gallery_expires_at",
        sa.Column("gallery_expires_at", sa.DateTime(timezone=True), nullable=True),
    )
    _add(
        "events",
        "created_by",
        sa.Column(
            "created_by",
            sa.String(length=36),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )

    _add(
        "face_enrollments",
        "organization_id",
        sa.Column(
            "organization_id",
            sa.String(length=36),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=True,
        ),
    )
    _add(
        "face_enrollments",
        "embedding_vector",
        sa.Column("embedding_vector", Vector(512), nullable=True),
    )
    _add(
        "face_enrollments",
        "event_id",
        sa.Column(
            "event_id",
            sa.String(length=36),
            sa.ForeignKey("events.id", ondelete="CASCADE"),
            nullable=True,
        ),
    )
    _add(
        "face_enrollments",
        "status",
        sa.Column("status", sa.String(length=24), nullable=False, server_default="valid"),
    )
    _add(
        "face_enrollments",
        "model_name",
        sa.Column(
            "model_name",
            sa.String(length=120),
            nullable=False,
            server_default="adaface-ir101-ms1mv2",
        ),
    )
    _add(
        "face_enrollments",
        "model_version",
        sa.Column("model_version", sa.String(length=80), nullable=False, server_default="1"),
    )
    _add(
        "face_enrollments",
        "embedding_dimension",
        sa.Column("embedding_dimension", sa.Integer(), nullable=False, server_default="512"),
    )
    _add(
        "face_enrollments",
        "quality_score",
        sa.Column("quality_score", sa.Float(), nullable=True),
    )
    _add(
        "face_enrollments",
        "expires_at",
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
    )
    _add(
        "face_enrollments",
        "deleted_at",
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )

    _add(
        "face_detections",
        "face_index",
        sa.Column("face_index", sa.Integer(), nullable=False, server_default="0"),
    )
    _add(
        "face_detections",
        "embedding_vector",
        sa.Column("embedding_vector", Vector(512), nullable=True),
    )
    _add("face_detections", "landmarks", sa.Column("landmarks", sa.JSON(), nullable=True))
    _add(
        "face_detections",
        "face_width",
        sa.Column("face_width", sa.Integer(), nullable=True),
    )
    _add(
        "face_detections",
        "face_height",
        sa.Column("face_height", sa.Integer(), nullable=True),
    )
    _add(
        "face_detections",
        "quality_class",
        sa.Column("quality_class", sa.String(length=24), nullable=False, server_default="GOOD"),
    )
    _add(
        "face_detections",
        "model_name",
        sa.Column(
            "model_name",
            sa.String(length=120),
            nullable=False,
            server_default="retinaface-r50",
        ),
    )
    _add(
        "face_detections",
        "model_version",
        sa.Column("model_version", sa.String(length=80), nullable=False, server_default="1"),
    )

    _add(
        "face_matches",
        "second_best_score",
        sa.Column("second_best_score", sa.Float(), nullable=True),
    )
    _add("face_matches", "margin", sa.Column("margin", sa.Float(), nullable=True))
    _add(
        "face_matches",
        "decision_source",
        sa.Column(
            "decision_source",
            sa.String(length=24),
            nullable=False,
            server_default="AUTO",
        ),
    )
    _add(
        "face_matches",
        "model_name",
        sa.Column(
            "model_name",
            sa.String(length=120),
            nullable=False,
            server_default="adaface-ir101-ms1mv2",
        ),
    )
    _add(
        "face_matches",
        "model_version",
        sa.Column("model_version", sa.String(length=80), nullable=False, server_default="1"),
    )
    _add(
        "face_matches",
        "threshold_profile_version",
        sa.Column(
            "threshold_profile_version",
            sa.String(length=80),
            nullable=False,
            server_default="default-v1",
        ),
    )

    _add(
        "processing_jobs",
        "attempt",
        sa.Column("attempt", sa.Integer(), nullable=False, server_default="0"),
    )
    _add(
        "processing_jobs",
        "max_attempts",
        sa.Column("max_attempts", sa.Integer(), nullable=False, server_default="5"),
    )
    _add(
        "processing_jobs",
        "progress_current",
        sa.Column("progress_current", sa.Integer(), nullable=False, server_default="0"),
    )
    _add(
        "processing_jobs",
        "progress_total",
        sa.Column("progress_total", sa.Integer(), nullable=False, server_default="100"),
    )
    _add(
        "processing_jobs",
        "correlation_id",
        sa.Column("correlation_id", sa.String(length=36), nullable=True),
    )
    _add(
        "processing_jobs",
        "next_attempt_at",
        sa.Column("next_attempt_at", sa.DateTime(timezone=True), nullable=True),
    )
    _add(
        "processing_jobs",
        "heartbeat_at",
        sa.Column("heartbeat_at", sa.DateTime(timezone=True), nullable=True),
    )

    # New V2 tables are declared centrally in models.py; create_all is safe and
    # idempotent here and keeps local PostgreSQL and production migrations aligned.
    Base.metadata.create_all(op.get_bind())

    # create_all creates upload_batches on fresh databases; this guard supports
    # an interrupted/partially-applied V2 migration as well.
    if "upload_batches" in inspect(op.get_bind()).get_table_names():
        _add(
            "upload_batches",
            "manifest",
            sa.Column("manifest", sa.JSON(), nullable=True),
        )

    op.execute("""
        UPDATE face_enrollments AS enrollment
        SET organization_id = participant.organization_id,
            event_id = participant.event_id,
            expires_at = event.expires_at::timestamp with time zone
        FROM participants AS participant, events AS event
        WHERE enrollment.participant_id = participant.id
          AND participant.event_id = event.id
          AND enrollment.organization_id IS NULL
    """)


def downgrade() -> None:
    # The V2 migration is intentionally forward-only because dropping its tables
    # would destroy refresh sessions, consent evidence, and audit/outbox state.
    pass
