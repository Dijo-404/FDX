from __future__ import annotations

import math
import os
import socket
import time
from datetime import date, datetime, timezone

from kafka import KafkaConsumer
from kafka.errors import NoBrokersAvailable
from sqlalchemy import delete, func, select

from .config import settings
from .database import SessionLocal
from .integrations import ml_faces, storage
from .main import audit, bootstrap
from .models import Delivery, Event, FaceDetection, FaceEnrollment, FaceMatch, Organization, Participant, Photo, ProcessingJob, utcnow


WORKER_NAME = f"ml-{socket.gethostname()}-{os.getpid()}"


def cosine(left: list[float], right: list[float]) -> float:
    dot = sum(a * b for a, b in zip(left, right))
    norm_left = math.sqrt(sum(value * value for value in left))
    norm_right = math.sqrt(sum(value * value for value in right))
    return dot / (norm_left * norm_right) if norm_left and norm_right else 0.0


def process_job(job_id: str) -> None:
    with SessionLocal() as db:
        job = db.get(ProcessingJob, job_id)
        if not job or job.status in {"completed", "processing"}:
            return
        job.status = "processing"
        job.progress = 10
        job.worker = WORKER_NAME
        job.started_at = utcnow()
        photo = db.get(Photo, job.photo_id)
        photo.processing_status = "processing"
        db.commit()
        try:
            content, content_type = storage.read(photo.storage_key)
            results = ml_faces(content, photo.filename, content_type)
            enrollments = db.scalars(select(FaceEnrollment).join(Participant).where(Participant.event_id == job.event_id)).all()
            for result in results:
                detection = FaceDetection(organization_id=job.organization_id, event_id=job.event_id, photo_id=photo.id, box=result["box"], embedding=result["embedding"], detector_confidence=result["box"]["probability"])
                db.add(detection)
                db.flush()
                ranked = sorted(((cosine(result["embedding"], enrollment.embedding), enrollment.participant_id) for enrollment in enrollments), reverse=True)
                best_score, participant_id = ranked[0] if ranked else (0.0, None)
                runner_up = ranked[1][0] if len(ranked) > 1 else -1.0
                # A conservative margin prevents lookalikes from being assigned automatically.
                if best_score >= 0.85 and best_score - runner_up >= 0.08:
                    state = "high"
                elif best_score >= 0.65 and best_score - runner_up >= 0.04:
                    state = "review"
                else:
                    state = "low"
                    participant_id = None
                db.add(FaceMatch(organization_id=job.organization_id, event_id=job.event_id, detection_id=detection.id, participant_id=participant_id, confidence=max(0.0, best_score), state=state))
            job.status = "completed"
            job.progress = 100
            job.completed_at = utcnow()
            photo.processing_status = "ready"
            db.flush()
            remaining = db.scalar(select(func.count(ProcessingJob.id)).where(ProcessingJob.event_id == job.event_id, ProcessingJob.status.in_(["queued", "processing"]))) or 0
            if remaining == 0:
                event = db.get(Event, job.event_id)
                event.status = "ready"
                participant_ids = db.scalars(select(FaceMatch.participant_id).where(FaceMatch.event_id == event.id, FaceMatch.participant_id.is_not(None), FaceMatch.state == "high").distinct()).all()
                for participant_id in participant_ids:
                    if not db.scalar(select(Delivery).where(Delivery.event_id == event.id, Delivery.participant_id == participant_id)):
                        db.add(Delivery(organization_id=job.organization_id, event_id=event.id, participant_id=participant_id, gallery_token_hash=os.urandom(32).hex(), status="ready", expires_at=datetime.combine(event.expires_at, datetime.min.time(), timezone.utc)))
                audit(db, None, "Event processing completed", event.name, organization_id=job.organization_id)
            db.commit()
        except Exception as exc:
            db.rollback()
            job = db.get(ProcessingJob, job_id)
            photo = db.get(Photo, job.photo_id) if job else None
            if job:
                job.status = "failed"
                job.error = str(exc)
                job.completed_at = utcnow()
            if photo:
                photo.processing_status = "failed"
            audit(db, None, "Processing job failed", f"{job_id}: {exc}", "danger", job.organization_id if job else None)
            db.commit()


def run_retention() -> None:
    with SessionLocal() as db:
        expired_events = db.scalars(select(Event).where(Event.expires_at <= date.today(), Event.status != "expired")).all()
        for event in expired_events:
            photos = db.scalars(select(Photo).where(Photo.event_id == event.id)).all()
            released = sum(photo.size_bytes for photo in photos)
            for photo in photos:
                storage.delete(photo.storage_key)
            enrollments = db.scalars(select(FaceEnrollment).join(Participant).where(Participant.event_id == event.id)).all()
            for enrollment in enrollments:
                storage.delete(enrollment.storage_key)
            if photos:
                db.execute(delete(Photo).where(Photo.id.in_([photo.id for photo in photos])))
            if enrollments:
                db.execute(delete(FaceEnrollment).where(FaceEnrollment.id.in_([enrollment.id for enrollment in enrollments])))
            organization = db.get(Organization, event.organization_id)
            organization.storage_used_bytes = max(0, organization.storage_used_bytes - released)
            event.status = "expired"
            audit(db, None, "Retention cleanup completed", f"{event.name}: {len(photos)} photos removed", organization_id=event.organization_id)
        db.commit()


def main() -> None:
    bootstrap()
    consumer = None
    while consumer is None:
        try:
            consumer = KafkaConsumer(settings.kafka_topic, bootstrap_servers=settings.kafka_bootstrap_servers.split(","), group_id="fdx-ml-workers", auto_offset_reset="earliest", enable_auto_commit=True, value_deserializer=lambda value: __import__("json").loads(value.decode()))
        except NoBrokersAvailable:
            print("Waiting for Kafka...", flush=True)
            time.sleep(5)
    last_retention = 0.0
    while True:
        if time.monotonic() - last_retention > 3600:
            run_retention()
            last_retention = time.monotonic()
        batches = consumer.poll(timeout_ms=5_000, max_records=10)
        for messages in batches.values():
            for message in messages:
                process_job(message.value["job_id"])


if __name__ == "__main__":
    main()
