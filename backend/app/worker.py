from __future__ import annotations

import hashlib
import io
import math
import os
import socket
import time
import zipfile
from datetime import date, datetime, timedelta, timezone

from kafka import KafkaConsumer
from kafka.errors import KafkaError
from PIL import Image, ImageOps
from sqlalchemy import delete, func, select

from .config import settings
from .database import SessionLocal
from .integrations import dispatch_email, ml_faces, publish_event, queue_email, storage
from .main import audit, bootstrap
from .models import (
    Delivery,
    EmailOutbox,
    Event,
    FaceDetection,
    FaceEnrollment,
    FaceMatch,
    GalleryExport,
    Organization,
    OutboxEvent,
    Participant,
    Photo,
    ProcessingJob,
    RefreshSession,
    StorageReservation,
    StorageUsageLedger,
    UploadBatch,
    User,
    UserRole,
    utcnow,
)

WORKER_NAME = f"ml-{socket.gethostname()}-{os.getpid()}"


def process_gallery_export(job_id: str) -> None:
    with SessionLocal() as db:
        job = db.scalar(select(ProcessingJob).where(ProcessingJob.id == job_id, ProcessingJob.job_type == "GALLERY_EXPORT", ProcessingJob.status.in_(["queued", "RETRY_SCHEDULED"])).with_for_update(skip_locked=True))
        if not job or (job.next_attempt_at and job.next_attempt_at > utcnow()):
            return
        item = db.scalar(select(GalleryExport).where(GalleryExport.processing_job_id == job.id).with_for_update())
        if not item:
            return
        job.status = "processing"
        job.attempt += 1
        job.worker = WORKER_NAME
        job.started_at = utcnow()
        job.heartbeat_at = utcnow()
        item.status = "PROCESSING"
        db.commit()
        try:
            matches = db.scalars(select(FaceMatch).where(
                FaceMatch.event_id == item.event_id,
                FaceMatch.participant_id == item.participant_id,
                FaceMatch.state.in_(["high", "approved"]),
            )).all()
            photos = {match.detection.photo.id: match.detection.photo for match in matches}
            archive = io.BytesIO()
            with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as bundle:
                for index, photo in enumerate(photos.values(), start=1):
                    content, _ = storage.read(photo.storage_key)
                    filename = os.path.basename(photo.filename).replace("..", "_") or f"photo-{index}.jpg"
                    bundle.writestr(f"{index:04d}-{photo.id[:8]}-{filename}", content)
            content = archive.getvalue()
            organization = db.get(Organization, item.organization_id)
            if organization.storage_used_bytes + len(content) > organization.storage_limit_bytes:
                raise ValueError("Organization storage quota would be exceeded by the gallery export")
            key = f"organizations/{item.organization_id}/events/{item.event_id}/exports/{item.id}.zip"
            storage.put(key, content, "application/zip")
            item.storage_key = key
            item.size_bytes = len(content)
            item.status = "READY"
            item.completed_at = utcnow()
            item.error = None
            organization.storage_used_bytes += len(content)
            db.add(StorageUsageLedger(organization_id=item.organization_id, event_id=item.event_id, operation="ADD", bytes=len(content)))
            job.status = "completed"
            job.progress = 100
            job.progress_current = 100
            job.completed_at = utcnow()
            job.heartbeat_at = utcnow()
            db.commit()
        except Exception as exc:
            db.rollback()
            job = db.get(ProcessingJob, job_id)
            item = db.scalar(select(GalleryExport).where(GalleryExport.processing_job_id == job_id))
            retry_delays = [0, 30, 120, 600, 1800]
            retryable = bool(job and job.attempt < job.max_attempts)
            if job:
                job.status = "RETRY_SCHEDULED" if retryable else "DEAD_LETTERED"
                job.error = str(exc)
                job.next_attempt_at = utcnow() + timedelta(seconds=retry_delays[min(job.attempt, len(retry_delays) - 1)]) if retryable else None
                job.completed_at = None if retryable else utcnow()
            if item:
                item.status = "QUEUED" if retryable else "FAILED"
                item.error = str(exc)
            audit(db, None, "Gallery export failed", f"{job_id}: {exc}", "danger", item.organization_id if item else None)
            db.commit()


def cosine(left: list[float], right: list[float]) -> float:
    dot = sum(a * b for a, b in zip(left, right))
    norm_left = math.sqrt(sum(value * value for value in left))
    norm_right = math.sqrt(sum(value * value for value in right))
    return dot / (norm_left * norm_right) if norm_left and norm_right else 0.0


def process_job(job_id: str) -> None:
    with SessionLocal() as db:
        job_type = db.scalar(select(ProcessingJob.job_type).where(ProcessingJob.id == job_id))
    if job_type == "GALLERY_EXPORT":
        process_gallery_export(job_id)
        return
    with SessionLocal() as db:
        job = db.scalar(select(ProcessingJob).where(ProcessingJob.id == job_id, ProcessingJob.status.in_(["queued", "RETRY_SCHEDULED"])).with_for_update(skip_locked=True))
        if not job:
            return
        if job.next_attempt_at and job.next_attempt_at > utcnow():
            return
        job.status = "processing"
        job.progress = 10
        job.progress_current = 10
        job.attempt += 1
        job.worker = WORKER_NAME
        job.started_at = utcnow()
        job.heartbeat_at = utcnow()
        photo = db.get(Photo, job.photo_id)
        photo.processing_status = "processing"
        db.commit()
        try:
            content, content_type = storage.read(photo.storage_key)
            if hashlib.sha256(content).hexdigest() != photo.sha256:
                raise ValueError("Media checksum does not match the verified upload manifest")
            with Image.open(io.BytesIO(content)) as source:
                detected_type = Image.MIME.get(source.format)
                source.verify()
            if detected_type not in {"image/jpeg", "image/png", "image/webp"} or detected_type != photo.content_type:
                raise ValueError("Media magic bytes do not match the declared content type")
            if not photo.thumbnail_storage_key:
                with Image.open(io.BytesIO(content)) as source:
                    thumbnail = ImageOps.exif_transpose(source).convert("RGB")
                    thumbnail.thumbnail((640, 640))
                    output = io.BytesIO()
                    thumbnail.save(output, format="WEBP", quality=82, method=6)
                thumbnail_content = output.getvalue()
                thumbnail_key = f"organizations/{job.organization_id}/events/{job.event_id}/media/thumbnails/{photo.id}.webp"
                storage.put(thumbnail_key, thumbnail_content, "image/webp")
                photo.thumbnail_storage_key = thumbnail_key
                photo.thumbnail_size_bytes = len(thumbnail_content)
                organization = db.get(Organization, job.organization_id)
                organization.storage_used_bytes += len(thumbnail_content)
                db.add(StorageUsageLedger(organization_id=job.organization_id, event_id=job.event_id, photo_id=photo.id, operation="ADD", bytes=len(thumbnail_content)))
            results = ml_faces(content, photo.filename, content_type)
            enrollments = db.scalars(select(FaceEnrollment).join(Participant).where(Participant.event_id == job.event_id)).all()
            for face_index, result in enumerate(results):
                box = result["box"]
                detection = FaceDetection(
                    organization_id=job.organization_id,
                    event_id=job.event_id,
                    photo_id=photo.id,
                    face_index=face_index,
                    box=box,
                    landmarks=result.get("landmarks"),
                    face_width=max(0, int(box.get("x_max", 0) - box.get("x_min", 0))),
                    face_height=max(0, int(box.get("y_max", 0) - box.get("y_min", 0))),
                    embedding=result["embedding"],
                    embedding_vector=result["embedding"],
                    detector_confidence=box["probability"],
                    model_name="retinaface-r50",
                    model_version=settings.detector_model_version,
                )
                db.add(detection)
                db.flush()
                ranked = sorted(((cosine(result["embedding"], enrollment.embedding), enrollment.participant_id) for enrollment in enrollments), reverse=True)
                best_score, participant_id = ranked[0] if ranked else (0.0, None)
                runner_up = ranked[1][0] if len(ranked) > 1 else -1.0
                # A conservative margin prevents lookalikes from being assigned automatically.
                margin = best_score - runner_up
                if best_score >= settings.match_auto_threshold and margin >= settings.match_runner_up_margin:
                    state = "high"
                elif best_score >= settings.match_review_threshold:
                    state = "review"
                else:
                    state = "low"
                    participant_id = None
                db.add(FaceMatch(
                    organization_id=job.organization_id,
                    event_id=job.event_id,
                    detection_id=detection.id,
                    participant_id=participant_id,
                    confidence=max(0.0, best_score),
                    second_best_score=runner_up if runner_up >= 0 else None,
                    margin=margin if ranked else None,
                    state=state,
                    decision_source="AUTO",
                    model_name="adaface-ir101-ms1mv2",
                    model_version=settings.embedder_model_version,
                    threshold_profile_version=settings.threshold_profile_version,
                ))
            job.status = "completed"
            job.progress = 100
            job.progress_current = 100
            job.completed_at = utcnow()
            job.heartbeat_at = utcnow()
            photo.processing_status = "ready"
            db.add(OutboxEvent(
                aggregate_type="processing_job",
                aggregate_id=job.id,
                organization_id=job.organization_id,
                event_type="fdx.v2.ml.process.completed",
                event_version=1,
                correlation_id=job.correlation_id or job.id,
                payload={"job_id": job.id, "media_id": photo.id, "faces_detected": len(results)},
            ))
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
                retry_delays = [0, 30, 120, 600, 1800]
                retryable = job.attempt < job.max_attempts
                job.status = "RETRY_SCHEDULED" if retryable else "DEAD_LETTERED"
                job.error = str(exc)
                job.next_attempt_at = utcnow() + timedelta(seconds=retry_delays[min(job.attempt, len(retry_delays) - 1)]) if retryable else None
                job.completed_at = None if retryable else utcnow()
                if not retryable:
                    db.add(OutboxEvent(
                        aggregate_type="processing_job",
                        aggregate_id=job.id,
                        organization_id=job.organization_id,
                        event_type="fdx.v2.ml.process.dlq",
                        event_version=1,
                        correlation_id=job.correlation_id or job.id,
                        payload={"job_id": job.id, "media_id": job.photo_id, "error": str(exc)},
                    ))
            if photo:
                photo.processing_status = "queued" if job and job.status == "RETRY_SCHEDULED" else "failed"
            audit(db, None, "Processing job failed", f"{job_id}: {exc}", "danger", job.organization_id if job else None)
            db.commit()


def run_retention() -> None:
    with SessionLocal() as db:
        expired_exports = db.scalars(select(GalleryExport).where(GalleryExport.expires_at <= utcnow(), GalleryExport.storage_key.is_not(None))).all()
        for item in expired_exports:
            storage.delete(item.storage_key)
            organization = db.get(Organization, item.organization_id)
            if organization:
                organization.storage_used_bytes = max(0, organization.storage_used_bytes - item.size_bytes)
            db.add(StorageUsageLedger(organization_id=item.organization_id, event_id=item.event_id, operation="DELETE", bytes=-item.size_bytes))
            item.storage_key = None
            item.size_bytes = 0
            item.status = "EXPIRED"
        expired_organizations = db.scalars(select(Organization).where(Organization.expires_at < datetime.now(timezone.utc).date(), Organization.status == "active")).all()
        for organization in expired_organizations:
            organization.status = "expired"
            user_ids = select(User.id).where(User.organization_id == organization.id)
            db.query(RefreshSession).filter(RefreshSession.user_id.in_(user_ids), RefreshSession.revoked_at.is_(None)).update({"revoked_at": utcnow()}, synchronize_session=False)
            audit(db, None, "Organization account expired", organization.name, organization_id=organization.id)
        expired_events = db.scalars(select(Event).where((Event.expires_at <= date.today()) | (Event.status.in_(["DELETION_PENDING", "deletion_pending"])), Event.status.notin_(["expired", "DELETED"]))).all()
        for event in expired_events:
            deletion_requested = event.status.upper() == "DELETION_PENDING"
            photos = db.scalars(select(Photo).where(Photo.event_id == event.id)).all()
            released = sum(photo.size_bytes + photo.thumbnail_size_bytes for photo in photos)
            for photo in photos:
                storage.delete(photo.storage_key)
                if photo.thumbnail_storage_key:
                    storage.delete(photo.thumbnail_storage_key)
            enrollments = db.scalars(select(FaceEnrollment).join(Participant).where(Participant.event_id == event.id)).all()
            for enrollment in enrollments:
                storage.delete(enrollment.storage_key)
            released += sum(enrollment.size_bytes for enrollment in enrollments)
            exports = db.scalars(select(GalleryExport).where(GalleryExport.event_id == event.id, GalleryExport.storage_key.is_not(None))).all()
            for export in exports:
                storage.delete(export.storage_key)
            released += sum(export.size_bytes for export in exports)
            if photos:
                db.execute(delete(Photo).where(Photo.id.in_([photo.id for photo in photos])))
            if enrollments:
                db.execute(delete(FaceEnrollment).where(FaceEnrollment.id.in_([enrollment.id for enrollment in enrollments])))
            db.execute(delete(Participant).where(Participant.event_id == event.id))
            organization = db.get(Organization, event.organization_id)
            organization.storage_used_bytes = max(0, organization.storage_used_bytes - released)
            db.add(StorageUsageLedger(organization_id=organization.id, event_id=event.id, operation="DELETE", bytes=-released))
            event.status = "DELETED" if deletion_requested else "expired"
            audit(db, None, "Retention cleanup completed", f"{event.name}: {len(photos)} photos removed", organization_id=event.organization_id)
        db.flush()
        deleting_organizations = db.scalars(select(Organization).where(Organization.status == "deletion_pending")).all()
        for organization in deleting_organizations:
            active_events = db.scalar(select(func.count(Event.id)).where(Event.organization_id == organization.id, Event.status.notin_(["DELETED", "expired"]))) or 0
            if active_events:
                continue
            # Remove event-owned imports and workflow records first so their
            # created_by references cannot block removal of tenant users.
            db.execute(delete(Event).where(Event.organization_id == organization.id))
            db.flush()
            db.execute(delete(User).where(User.organization_id == organization.id))
            organization.status = "deleted"
            organization.storage_used_bytes = 0
            audit(db, None, "Organization deletion completed", organization.name, organization_id=organization.id)
        db.commit()


def main() -> None:
    bootstrap()
    consumer = None
    last_consumer_attempt = 0.0
    last_retention = 0.0
    last_email_poll = 0.0
    last_queue_poll = 0.0
    last_outbox_poll = 0.0
    last_reservation_poll = 0.0
    last_notification_poll = 0.0
    while True:
        now = time.monotonic()
        if consumer is None and now - last_consumer_attempt > 5:
            last_consumer_attempt = now
            try:
                consumer = KafkaConsumer(settings.kafka_topic, "fdx.v2.ml.process.requested", "fdx.v2.gallery.export.requested", bootstrap_servers=settings.kafka_bootstrap_servers.split(","), security_protocol=settings.kafka_security_protocol, group_id="fdx-workers", auto_offset_reset="earliest", enable_auto_commit=True, value_deserializer=lambda value: __import__("json").loads(value.decode()))
            except KafkaError:
                print("Waiting for Kafka; PostgreSQL fallback remains active...", flush=True)
        if settings.retention_scheduler_enabled and now - last_retention > settings.retention_poll_seconds:
            run_retention()
            last_retention = now
        if now - last_email_poll > settings.email_poll_seconds:
            retry_failed_emails()
            last_email_poll = now
        if now - last_queue_poll > 10:
            process_pending_jobs()
            last_queue_poll = now
        if now - last_outbox_poll > 2:
            publish_outbox_events()
            last_outbox_poll = now
        if now - last_reservation_poll > 60:
            expire_storage_reservations()
            last_reservation_poll = now
        if now - last_notification_poll > 3600:
            send_scheduled_notifications()
            last_notification_poll = now
        if consumer is None:
            time.sleep(1)
            continue
        try:
            batches = consumer.poll(timeout_ms=5_000, max_records=10)
            for messages in batches.values():
                for message in messages:
                    if "job_id" in message.value:
                        process_job(message.value["job_id"])
        except KafkaError:
            try:
                consumer.close(autocommit=False)
            except KafkaError:
                pass
            consumer = None


def retry_failed_emails() -> None:
    with SessionLocal() as db:
        pending = db.scalars(select(EmailOutbox).where(EmailOutbox.status == "failed", EmailOutbox.attempts < settings.email_max_attempts, EmailOutbox.next_attempt_at <= utcnow()).order_by(EmailOutbox.next_attempt_at).limit(25)).all()
        for item in pending:
            dispatch_email(db, item)
        db.commit()


def send_scheduled_notifications() -> None:
    """Queue idempotent enrollment, expiry, and permanent-failure notices."""
    with SessionLocal() as db:
        today = utcnow().date()

        def send_once(organization_id: str, recipient: str, subject: str, html: str) -> None:
            existing = db.scalar(select(EmailOutbox.id).where(EmailOutbox.recipient == recipient, EmailOutbox.subject == subject))
            if existing:
                return
            item = queue_email(db, organization_id, recipient, subject, html)
            dispatch_email(db, item)

        reminders = db.scalars(select(Participant).where(
            Participant.enrollment_status.in_(["invited", "opened"]),
            Participant.enrollment_expires_at > utcnow(),
            Participant.created_at <= utcnow() - timedelta(hours=24),
        )).all()
        for participant in reminders:
            send_once(
                participant.organization_id,
                participant.email,
                f"Reminder: verify your face for {participant.event.name} [{participant.id}]",
                "<p>Your secure FDX enrollment is still incomplete. Use the original invitation before it expires.</p>",
            )

        administrators = db.scalars(select(User).where(User.role == UserRole.ORG_ADMIN, User.status == "active")).all()
        for administrator in administrators:
            organization = administrator.organization
            if organization.expires_at:
                days = (organization.expires_at - today).days
                if days in {7, 1}:
                    send_once(organization.id, administrator.email, f"FDX account expires in {days} day(s) [{organization.id}]", "<p>Your Organization's FDX access is approaching its configured expiry date.</p>")
            events = db.scalars(select(Event).where(Event.organization_id == organization.id, Event.expires_at.in_([today + timedelta(days=7), today + timedelta(days=1)]), Event.status.notin_(["expired", "DELETED"]))).all()
            for event in events:
                days = (event.expires_at - today).days
                send_once(organization.id, administrator.email, f"Event data expires in {days} day(s) [{event.id}]", f"<p>Media and biometric data for {event.name} will be removed by its retention policy.</p>")
            permanent_failures = db.scalars(select(EmailOutbox).where(EmailOutbox.organization_id == organization.id, EmailOutbox.status == "failed", EmailOutbox.attempts >= settings.email_max_attempts)).all()
            for failure in permanent_failures:
                send_once(organization.id, administrator.email, f"FDX email delivery requires attention [{failure.id}]", f"<p>A message to {failure.recipient} could not be delivered after bounded retries.</p>")
        db.commit()


def process_pending_jobs() -> None:
    """Use PostgreSQL as a durable fallback when Kafka publication is interrupted."""
    with SessionLocal() as db:
        job_ids = db.scalars(select(ProcessingJob.id).where(ProcessingJob.status.in_(["queued", "RETRY_SCHEDULED"]), (ProcessingJob.next_attempt_at.is_(None)) | (ProcessingJob.next_attempt_at <= utcnow()), ProcessingJob.created_at <= utcnow() - timedelta(seconds=5)).order_by(ProcessingJob.created_at).limit(10)).all()
    for job_id in job_ids:
        process_job(job_id)


def publish_outbox_events() -> None:
    with SessionLocal() as db:
        rows = db.scalars(select(OutboxEvent).where(OutboxEvent.published_at.is_(None)).order_by(OutboxEvent.created_at).with_for_update(skip_locked=True).limit(50)).all()
        for row in rows:
            envelope = {
                "event_id": row.id,
                "event_type": row.event_type,
                "event_version": row.event_version,
                "occurred_at": row.created_at.isoformat(),
                "correlation_id": row.correlation_id,
                "organization_id": row.organization_id,
                "actor_type": "SYSTEM",
                "actor_id": None,
                "payload": row.payload,
                **({"job_id": row.payload.get("job_id")} if row.payload.get("job_id") else {}),
            }
            row.publish_attempts += 1
            if publish_event(row.event_type, envelope):
                row.published_at = utcnow()
                row.last_error = None
            else:
                row.last_error = "Kafka publication failed"
        db.commit()


def expire_storage_reservations() -> None:
    with SessionLocal() as db:
        rows = db.scalars(select(StorageReservation).where(StorageReservation.status == "RESERVED", StorageReservation.expires_at <= utcnow()).with_for_update(skip_locked=True)).all()
        for row in rows:
            row.status = "EXPIRED"
            db.add(StorageUsageLedger(organization_id=row.organization_id, event_id=row.event_id, operation="RELEASE", bytes=row.bytes))
            batch = db.get(UploadBatch, row.upload_batch_id)
            if batch and batch.status not in {"COMPLETE", "CANCELLED"}:
                batch.status = "CANCELLED"
                for record in batch.manifest or []:
                    storage.delete(record["storage_key"])
        db.commit()


if __name__ == "__main__":
    main()
