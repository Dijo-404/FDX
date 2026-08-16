"""Add the durable unique-face index and face-to-photo mapping.

Revision ID: 20260816_07
Revises: 20260816_06
"""

from __future__ import annotations

import math
import os
import uuid
from datetime import datetime, timezone

import sqlalchemy as sa
from alembic import op
from app.models import UniqueFace, UniqueFacePhoto

revision = "20260816_07"
down_revision = "20260816_06"
branch_labels = None
depends_on = None

CLUSTER_THRESHOLD = float(os.getenv("UNIQUE_FACE_CLUSTER_THRESHOLD", "0.75"))
EMBEDDER_VERSION = os.getenv(
    "FDX_EMBEDDER_MODEL_VERSION",
    "adaface-ir101-ms1mv2-v1",
)


def _cosine(left: list[float], right: list[float]) -> float:
    dot = sum(a * b for a, b in zip(left, right))
    norm_left = math.sqrt(sum(value * value for value in left))
    norm_right = math.sqrt(sum(value * value for value in right))
    return dot / (norm_left * norm_right) if norm_left and norm_right else 0.0


def _merge(centroid: list[float], count: int, embedding: list[float]) -> list[float]:
    average = [((current * count) + incoming) / (count + 1) for current, incoming in zip(centroid, embedding)]
    norm = math.sqrt(sum(value * value for value in average))
    return [value / norm for value in average] if norm else average


def _backfill() -> None:
    connection = op.get_bind()
    metadata = sa.MetaData()
    detections = sa.Table("face_detections", metadata, autoload_with=connection)
    rows = (
        connection.execute(
            sa.select(
                detections.c.id,
                detections.c.organization_id,
                detections.c.event_id,
                detections.c.photo_id,
                detections.c.embedding,
            )
            .where(
                detections.c.unique_face_id.is_(None),
                detections.c.quality_class != "REJECTED",
            )
            .order_by(detections.c.event_id, detections.c.created_at, detections.c.id)
        )
        .mappings()
        .all()
    )
    clusters_by_event: dict[str, list[dict]] = {}
    photo_links: dict[tuple[str, str], dict] = {}
    detection_updates: list[dict] = []
    now = datetime.now(timezone.utc)

    for row in rows:
        embedding = row["embedding"]
        if not embedding:
            continue
        clusters = clusters_by_event.setdefault(row["event_id"], [])
        best = max(
            clusters,
            key=lambda item: _cosine(embedding, item["centroid"]),
            default=None,
        )
        if not best or _cosine(embedding, best["centroid"]) < CLUSTER_THRESHOLD:
            best = {
                "id": str(uuid.uuid4()),
                "organization_id": row["organization_id"],
                "event_id": row["event_id"],
                "centroid": list(embedding),
                "count": 1,
            }
            clusters.append(best)
        else:
            best["centroid"] = _merge(best["centroid"], best["count"], embedding)
            best["count"] += 1

        detection_updates.append(
            {
                "target_detection_id": row["id"],
                "target_unique_face_id": best["id"],
            }
        )
        link_key = (best["id"], row["photo_id"])
        if link_key in photo_links:
            photo_links[link_key]["detection_count"] += 1
        else:
            photo_links[link_key] = {
                "id": str(uuid.uuid4()),
                "organization_id": row["organization_id"],
                "event_id": row["event_id"],
                "unique_face_id": best["id"],
                "photo_id": row["photo_id"],
                "detection_count": 1,
                "created_at": now,
            }

    unique_face_rows = [
        {
            "id": cluster["id"],
            "organization_id": cluster["organization_id"],
            "event_id": cluster["event_id"],
            "centroid_embedding": cluster["centroid"],
            "centroid_vector": cluster["centroid"],
            "occurrence_count": cluster["count"],
            "model_name": "adaface-ir101-ms1mv2",
            "model_version": EMBEDDER_VERSION,
            "created_at": now,
            "updated_at": now,
        }
        for clusters in clusters_by_event.values()
        for cluster in clusters
    ]
    if unique_face_rows:
        connection.execute(UniqueFace.__table__.insert(), unique_face_rows)
        connection.execute(
            detections.update()
            .where(detections.c.id == sa.bindparam("target_detection_id"))
            .values(unique_face_id=sa.bindparam("target_unique_face_id")),
            detection_updates,
        )
        connection.execute(
            UniqueFacePhoto.__table__.insert(),
            list(photo_links.values()),
        )


def upgrade() -> None:
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    tables = inspector.get_table_names()
    if "unique_faces" not in tables:
        UniqueFace.__table__.create(connection)
    if "unique_face_photos" not in tables:
        UniqueFacePhoto.__table__.create(connection)

    detection_columns = {column["name"] for column in sa.inspect(connection).get_columns("face_detections")}
    if "unique_face_id" not in detection_columns:
        op.add_column(
            "face_detections",
            sa.Column("unique_face_id", sa.String(length=36), nullable=True),
        )
        op.create_foreign_key(
            "fk_face_detections_unique_face_id",
            "face_detections",
            "unique_faces",
            ["unique_face_id"],
            ["id"],
            ondelete="SET NULL",
        )
        op.create_index(
            "ix_face_detections_unique_face_id",
            "face_detections",
            ["unique_face_id"],
        )

    _backfill()
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_unique_faces_centroid_hnsw "
        "ON unique_faces USING hnsw (centroid_vector vector_cosine_ops)"
    )


def downgrade() -> None:
    # Biometric lifecycle migrations are intentionally forward-only.
    pass
