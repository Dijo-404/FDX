from __future__ import annotations

import math
from dataclasses import dataclass

from sqlalchemy import delete, select, text
from sqlalchemy.orm import Session

from .config import settings
from .models import (
    FaceDetection,
    FaceEnrollment,
    FaceMatch,
    Participant,
    UniqueFace,
    UniqueFacePhoto,
    utcnow,
)


def cosine(left: list[float], right: list[float]) -> float:
    dot = sum(a * b for a, b in zip(left, right))
    norm_left = math.sqrt(sum(value * value for value in left))
    norm_right = math.sqrt(sum(value * value for value in right))
    return dot / (norm_left * norm_right) if norm_left and norm_right else 0.0


def normalized_centroid(embeddings: list[list[float]]) -> list[float]:
    if not embeddings:
        return []
    dimensions = len(embeddings[0])
    average = [sum(embedding[index] for embedding in embeddings) / len(embeddings) for index in range(dimensions)]
    norm = math.sqrt(sum(value * value for value in average))
    return [value / norm for value in average] if norm else average


def merge_centroid(centroid: list[float], count: int, embedding: list[float]) -> list[float]:
    if not centroid or count < 1:
        return normalized_centroid([embedding])
    average = [((current * count) + incoming) / (count + 1) for current, incoming in zip(centroid, embedding)]
    return normalized_centroid([average])


@dataclass(frozen=True)
class MatchDecision:
    participant_id: str | None
    state: str
    best_score: float
    second_best_score: float | None
    margin: float | None


def decide_match(
    embedding: list[float],
    enrollments: list[FaceEnrollment],
    quality_class: str = "GOOD",
) -> MatchDecision:
    ranked = sorted(
        (
            (cosine(embedding, enrollment.embedding), enrollment.participant_id)
            for enrollment in enrollments
            if enrollment.status == "valid" and enrollment.embedding
        ),
        reverse=True,
    )
    best_score, participant_id = ranked[0] if ranked else (0.0, None)
    runner_up = ranked[1][0] if len(ranked) > 1 else None
    margin = best_score - runner_up if runner_up is not None else (1.0 if ranked else None)
    threshold_boost = settings.low_resolution_threshold_boost if quality_class == "LOW_RESOLUTION" else 0.0
    if quality_class == "REJECTED":
        state = "low"
        participant_id = None
    elif (
        best_score >= settings.match_auto_threshold + threshold_boost
        and (margin or 0.0) >= settings.match_runner_up_margin
    ):
        state = "high"
    else:
        state = "low"
        participant_id = None
    return MatchDecision(
        participant_id=participant_id,
        state=state,
        best_score=max(0.0, best_score),
        second_best_score=runner_up,
        margin=margin,
    )


def lock_event_index(db: Session, event_id: str) -> None:
    """Serialize identity-cluster writes for an event across worker processes."""

    if db.bind and db.bind.dialect.name == "postgresql":
        db.execute(
            text("SELECT pg_advisory_xact_lock(hashtextextended(:event_id, 0))"),
            {"event_id": event_id},
        )


def prepare_photo_reindex(db: Session, event_id: str, photo_id: str) -> list[UniqueFace]:
    """Remove stale derived rows for a reprocessed photo and repair its clusters."""

    lock_event_index(db, event_id)
    affected_ids = set(
        db.scalars(
            select(FaceDetection.unique_face_id).where(
                FaceDetection.photo_id == photo_id,
                FaceDetection.unique_face_id.is_not(None),
            )
        ).all()
    )
    if affected_ids:
        db.execute(delete(UniqueFacePhoto).where(UniqueFacePhoto.photo_id == photo_id))
    db.execute(delete(FaceDetection).where(FaceDetection.photo_id == photo_id))
    db.flush()

    for unique_face_id in affected_ids:
        unique_face = db.get(UniqueFace, unique_face_id)
        if not unique_face:
            continue
        embeddings = db.scalars(
            select(FaceDetection.embedding).where(FaceDetection.unique_face_id == unique_face_id)
        ).all()
        if not embeddings:
            db.delete(unique_face)
            continue
        centroid = normalized_centroid(embeddings)
        unique_face.centroid_embedding = centroid
        unique_face.centroid_vector = centroid
        unique_face.occurrence_count = len(embeddings)
        unique_face.updated_at = utcnow()
    db.flush()
    return list(db.scalars(select(UniqueFace).where(UniqueFace.event_id == event_id).with_for_update()).all())


def index_detection(
    db: Session,
    detection: FaceDetection,
    embedding: list[float],
    unique_faces: list[UniqueFace],
    photo_links: dict[str, UniqueFacePhoto],
) -> UniqueFace | None:
    """Attach a detection to its nearest identity cluster and materialize its photo link."""

    if detection.quality_class == "REJECTED":
        return None
    compatible = [item for item in unique_faces if item.model_version == settings.embedder_model_version]
    best = max(
        compatible,
        key=lambda item: cosine(embedding, item.centroid_embedding),
        default=None,
    )
    score = cosine(embedding, best.centroid_embedding) if best else -1.0
    if not best or score < settings.unique_face_cluster_threshold:
        centroid = normalized_centroid([embedding])
        best = UniqueFace(
            organization_id=detection.organization_id,
            event_id=detection.event_id,
            centroid_embedding=centroid,
            centroid_vector=centroid,
            occurrence_count=1,
            model_name="adaface-ir101-ms1mv2",
            model_version=settings.embedder_model_version,
        )
        db.add(best)
        db.flush()
        unique_faces.append(best)
    else:
        centroid = merge_centroid(best.centroid_embedding, best.occurrence_count, embedding)
        best.centroid_embedding = centroid
        best.centroid_vector = centroid
        best.occurrence_count += 1
        best.updated_at = utcnow()

    detection.unique_face_id = best.id
    link = photo_links.get(best.id)
    if link:
        link.detection_count += 1
    else:
        link = UniqueFacePhoto(
            organization_id=detection.organization_id,
            event_id=detection.event_id,
            unique_face_id=best.id,
            photo_id=detection.photo_id,
            detection_count=1,
        )
        db.add(link)
        photo_links[best.id] = link
    return best


def refresh_enrollment_matches(
    db: Session,
    participant: Participant,
    embedding: list[float],
) -> dict[str, int]:
    """Match a newly enrolled face from the database index without reading photos."""

    db.flush()
    distance = UniqueFace.centroid_vector.cosine_distance(embedding)
    candidate_ids = set(
        db.scalars(
            select(UniqueFace.id)
            .where(
                UniqueFace.event_id == participant.event_id,
                UniqueFace.centroid_vector.is_not(None),
                distance <= 1 - settings.match_auto_threshold,
            )
            .order_by(distance)
        ).all()
    )
    # Include prior assignments so replacing an enrollment cannot leave stale
    # automatic matches behind when the new embedding no longer agrees.
    candidate_ids.update(
        value
        for value in db.scalars(
            select(FaceDetection.unique_face_id)
            .join(FaceMatch, FaceMatch.detection_id == FaceDetection.id)
            .where(
                FaceMatch.event_id == participant.event_id,
                FaceMatch.participant_id == participant.id,
                FaceDetection.unique_face_id.is_not(None),
            )
        ).all()
        if value
    )
    if not candidate_ids:
        return {"unique_faces": 0, "photos": 0, "needs_review": 0}

    enrollments = list(
        db.scalars(
            select(FaceEnrollment)
            .join(Participant)
            .where(
                Participant.event_id == participant.event_id,
                FaceEnrollment.status == "valid",
                FaceEnrollment.deleted_at.is_(None),
            )
        ).all()
    )
    unique_faces = db.scalars(select(UniqueFace).where(UniqueFace.id.in_(candidate_ids))).all()
    matched_unique_faces: set[str] = set()
    matched_photos: set[str] = set()
    for unique_face in unique_faces:
        for detection in unique_face.detections:
            decision = decide_match(
                unique_face.centroid_embedding,
                enrollments,
                detection.quality_class,
            )
            match = detection.match
            if not match:
                match = FaceMatch(
                    organization_id=detection.organization_id,
                    event_id=detection.event_id,
                    detection_id=detection.id,
                    confidence=decision.best_score,
                    state=decision.state,
                )
                db.add(match)
            match.participant_id = decision.participant_id
            match.confidence = decision.best_score
            match.second_best_score = decision.second_best_score
            match.margin = decision.margin
            match.state = decision.state
            match.decision_source = "AUTO"
            match.model_name = "adaface-ir101-ms1mv2"
            match.model_version = settings.embedder_model_version
            match.threshold_profile_version = settings.threshold_profile_version
            if decision.participant_id == participant.id:
                if decision.state == "high":
                    matched_unique_faces.add(unique_face.id)
                    matched_photos.add(detection.photo_id)
    # SessionLocal disables autoflush. Flush here so callers can immediately
    # query the complete replacement match set for the enrollment response.
    db.flush()
    return {
        "unique_faces": len(matched_unique_faces),
        "photos": len(matched_photos),
        "needs_review": 0,
    }


def unique_face_stats(
    db: Session,
    *,
    organization_id: str | None = None,
    event_id: str | None = None,
) -> dict[str, int]:
    """Return mutually exclusive identity counts, not detection-row counts."""

    face_filters = []
    detection_filters = [FaceDetection.unique_face_id.is_not(None)]
    if organization_id:
        face_filters.append(UniqueFace.organization_id == organization_id)
        detection_filters.append(FaceDetection.organization_id == organization_id)
    if event_id:
        face_filters.append(UniqueFace.event_id == event_id)
        detection_filters.append(FaceDetection.event_id == event_id)
    face_ids = set(db.scalars(select(UniqueFace.id).where(*face_filters)).all())
    states_by_face: dict[str, set[str]] = {}
    for unique_face_id, state in db.execute(
        select(FaceDetection.unique_face_id, FaceMatch.state)
        .join(FaceMatch, FaceMatch.detection_id == FaceDetection.id)
        .where(*detection_filters)
    ).all():
        states_by_face.setdefault(unique_face_id, set()).add(state)
    high = {face_id for face_id, states in states_by_face.items() if "high" in states}
    return {
        "unique_faces": len(face_ids),
        "high": len(high),
        "review": 0,
        "low": len(face_ids - high),
    }
