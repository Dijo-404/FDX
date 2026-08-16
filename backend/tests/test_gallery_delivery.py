import io
import secrets
import zipfile
from datetime import date, timedelta
from unittest.mock import patch

from app.auth import hash_password, new_opaque_token, token_pair
from app.database import SessionLocal
from app.integrations import storage
from app.main import app
from app.models import (
    Delivery,
    EmailOutbox,
    Event,
    FaceDetection,
    FaceMatch,
    GalleryExport,
    Organization,
    OrganizationType,
    Participant,
    Photo,
    User,
    UserRole,
    utcnow,
)
from app.worker import process_gallery_export
from fastapi.testclient import TestClient
from sqlalchemy import delete, func, select


TEST_PASSWORD = f"Test-{secrets.token_urlsafe(24)}"


def seed_gallery(photo_statuses: list[str], *, match_all: bool = False):
    suffix = new_opaque_token()[0][:12]
    raw_gallery_token, gallery_token_hash = new_opaque_token()
    raw_enrollment_token, enrollment_token_hash = new_opaque_token()
    with SessionLocal() as db:
        organization = Organization(
            name=f"Gallery workflow tenant {suffix}",
            type=OrganizationType.COMPANY,
            contact_email=f"gallery-{suffix}@example.com",
        )
        db.add(organization)
        db.flush()
        user = User(
            organization_id=organization.id,
            name="Gallery Admin",
            email=f"gallery-admin-{suffix}@example.com",
            password_hash=hash_password(TEST_PASSWORD),
            role=UserRole.ORG_ADMIN,
            status="active",
        )
        event = Event(
            organization_id=organization.id,
            name=f"Gallery event {suffix}",
            event_date=date.today(),
            retention_days=30,
            expires_at=date.today() + timedelta(days=30),
            status="PROCESSING",
        )
        db.add_all([user, event])
        db.flush()
        participant = Participant(
            organization_id=organization.id,
            event_id=event.id,
            name="Gallery Participant",
            email=f"participant-{suffix}@example.com",
            enrollment_status="verified",
            enrollment_token_hash=enrollment_token_hash,
            enrollment_expires_at=utcnow() + timedelta(days=1),
        )
        db.add(participant)
        db.flush()
        delivery = Delivery(
            organization_id=organization.id,
            event_id=event.id,
            participant_id=participant.id,
            gallery_token_hash=gallery_token_hash,
            status="ready",
            expires_at=utcnow() + timedelta(days=7),
        )
        db.add(delivery)
        photo_ids = []
        storage_keys = []
        for index, status in enumerate(photo_statuses):
            storage_key = f"tests/{suffix}/photo-{index}.jpg"
            photo = Photo(
                organization_id=organization.id,
                event_id=event.id,
                filename=f"photo-{index}.jpg",
                storage_key=storage_key,
                content_type="image/jpeg",
                size_bytes=7,
                sha256=(f"{index}{suffix}" * 6)[:64],
                processing_status=status,
            )
            db.add(photo)
            db.flush()
            photo_ids.append(photo.id)
            storage_keys.append(storage_key)
            if index == 0 or match_all:
                detection = FaceDetection(
                    organization_id=organization.id,
                    event_id=event.id,
                    photo_id=photo.id,
                    box={"probability": 0.99},
                    embedding=[1.0] + [0.0] * 511,
                    embedding_vector=[1.0] + [0.0] * 511,
                    detector_confidence=0.99,
                )
                db.add(detection)
                db.flush()
                db.add(
                    FaceMatch(
                        organization_id=organization.id,
                        event_id=event.id,
                        detection_id=detection.id,
                        participant_id=participant.id,
                        confidence=0.99,
                        state="high",
                    )
                )
        db.commit()
        return {
            "organization_id": organization.id,
            "event_id": event.id,
            "participant_id": participant.id,
            "delivery_id": delivery.id,
            "photo_ids": photo_ids,
            "storage_keys": storage_keys,
            "raw_gallery_token": raw_gallery_token,
            "raw_enrollment_token": raw_enrollment_token,
            "access_token": token_pair(user)["access_token"],
        }


def cleanup_gallery(seed: dict) -> None:
    with SessionLocal() as db:
        export_keys = db.scalars(
            select(GalleryExport.storage_key).where(
                GalleryExport.event_id == seed["event_id"],
                GalleryExport.storage_key.is_not(None),
            )
        ).all()
        db.execute(delete(Event).where(Event.id == seed["event_id"]))
        db.execute(delete(User).where(User.organization_id == seed["organization_id"]))
        db.execute(delete(Organization).where(Organization.id == seed["organization_id"]))
        db.commit()
    for storage_key in [*seed["storage_keys"], *export_keys]:
        storage.delete(storage_key)


def test_gallery_email_waits_for_every_event_photo_to_be_ready():
    seed = seed_gallery(["ready", "queued"])
    headers = {"Authorization": f"Bearer {seed['access_token']}"}
    try:
        with TestClient(app) as client:
            legacy = client.post(
                f"/api/organization/deliveries/{seed['participant_id']}/send",
                headers=headers,
            )
            assert legacy.status_code == 409
            legacy_body = legacy.json()
            legacy_message = legacy_body.get("detail") or legacy_body["error"]["message"]
            assert "1/2 ready" in legacy_message

            versioned = client.post(
                f"/api/v2/events/{seed['event_id']}/deliveries/send",
                headers=headers,
            )
            assert versioned.status_code == 409
            assert "1/2 ready" in versioned.json()["error"]["message"]

        with SessionLocal() as db:
            email_count = db.scalar(
                select(func.count(EmailOutbox.id)).where(EmailOutbox.delivery_id == seed["delivery_id"])
            )
            assert email_count == 0
            assert db.get(Delivery, seed["delivery_id"]).status == "ready"
    finally:
        cleanup_gallery(seed)


def test_gallery_email_can_send_after_every_event_photo_is_ready():
    seed = seed_gallery(["ready", "ready"])
    headers = {"Authorization": f"Bearer {seed['access_token']}"}
    try:
        with patch("app.main.dispatch_email") as dispatch:
            with TestClient(app) as client:
                response = client.post(
                    f"/api/organization/deliveries/{seed['participant_id']}/send",
                    headers=headers,
                )
                assert response.status_code == 200
            dispatch.assert_called_once()

        with SessionLocal() as db:
            emails = db.scalars(
                select(EmailOutbox).where(EmailOutbox.delivery_id == seed["delivery_id"])
            ).all()
            assert len(emails) == 1
            assert emails[0].status == "queued"
            assert db.get(Delivery, seed["delivery_id"]).status == "ready"
    finally:
        cleanup_gallery(seed)


def test_selected_gallery_export_contains_only_authorized_requested_photos():
    seed = seed_gallery(["ready", "ready"], match_all=True)
    for index, storage_key in enumerate(seed["storage_keys"]):
        storage.put(storage_key, f"photo-{index}".encode(), "image/jpeg")
    token = seed["raw_gallery_token"]
    try:
        with TestClient(app) as client:
            enrollment_download = client.post(
                f"/api/v2/public/enrollment/{seed['raw_enrollment_token']}/download",
                json={"media_ids": seed["photo_ids"]},
            )
            assert enrollment_download.status_code == 200
            with zipfile.ZipFile(io.BytesIO(enrollment_download.content)) as archive:
                assert len(archive.namelist()) == 2

            first = client.post(
                f"/api/v2/public/gallery/{token}/exports",
                json={"media_ids": [seed["photo_ids"][0]]},
            )
            assert first.status_code == 202
            first_export_id = first.json()["data"]["export_id"]

            repeated = client.post(
                f"/api/v2/public/gallery/{token}/exports",
                json={"media_ids": [seed["photo_ids"][0], seed["photo_ids"][0]]},
            )
            assert repeated.status_code == 202
            assert repeated.json()["data"]["export_id"] == first_export_id

            second = client.post(
                f"/api/v2/public/gallery/{token}/exports",
                json={"media_ids": [seed["photo_ids"][1]]},
            )
            assert second.status_code == 202
            assert second.json()["data"]["export_id"] != first_export_id

            missing = client.post(
                f"/api/v2/public/gallery/{token}/exports",
                json={"media_ids": ["not-an-authorized-photo"]},
            )
            assert missing.status_code == 404

        with SessionLocal() as db:
            first_export = db.get(GalleryExport, first_export_id)
            assert first_export.photo_ids == [seed["photo_ids"][0]]
            first_job_id = first_export.processing_job_id

        process_gallery_export(first_job_id)

        with SessionLocal() as db:
            first_export = db.get(GalleryExport, first_export_id)
            assert first_export.status == "READY"
            content, _ = storage.read(first_export.storage_key)
        with zipfile.ZipFile(io.BytesIO(content)) as archive:
            names = archive.namelist()
            assert len(names) == 1
            assert names[0].endswith("photo-0.jpg")
    finally:
        cleanup_gallery(seed)
