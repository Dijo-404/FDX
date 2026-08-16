import secrets
from datetime import date, timedelta
from types import SimpleNamespace

from app.auth import hash_password, new_opaque_token, token_pair, verify_password
from app.config import settings
from app.database import SessionLocal
from app.face_index import (
    cosine,
    decide_match,
    merge_centroid,
    refresh_enrollment_matches,
)
from app.integrations import storage
from app.main import app
from app.models import (
    Event,
    FaceDetection,
    FaceEnrollment,
    FaceMatch,
    Organization,
    OrganizationType,
    Participant,
    ParticipantEnrollmentToken,
    Photo,
    UniqueFace,
    UniqueFacePhoto,
    User,
    UserRole,
    utcnow,
)
from app.worker import image_content_type
from fastapi.testclient import TestClient
from sqlalchemy import delete, select

TEST_PASSWORD = f"Test-{secrets.token_urlsafe(24)}"


def test_argon2_password_round_trip():
    encoded = hash_password(TEST_PASSWORD)
    assert encoded.startswith("$argon2id$")
    assert verify_password(TEST_PASSWORD, encoded)
    assert not verify_password("wrong password", encoded)


def test_opaque_tokens_store_only_hashes():
    raw, digest = new_opaque_token()
    assert raw != digest
    assert len(digest) == 64
    assert raw not in digest


def test_cosine_similarity_is_bounded_for_normalized_embeddings():
    assert cosine([1.0, 0.0], [1.0, 0.0]) == 1.0
    assert cosine([1.0, 0.0], [0.0, 1.0]) == 0.0
    assert cosine([1.0, 0.0], [-1.0, 0.0]) == -1.0


def test_unique_face_centroid_stays_normalized_when_occurrences_are_added():
    centroid = merge_centroid([1.0, 0.0], 1, [0.8, 0.6])
    assert abs(sum(value * value for value in centroid) - 1.0) < 1e-9
    assert centroid[0] > centroid[1] > 0


def test_stored_embedding_match_uses_confidence_policy_without_image_processing():
    enrollment = SimpleNamespace(
        participant_id="participant-1",
        embedding=[1.0, 0.0],
        status="valid",
    )
    decision = decide_match([1.0, 0.0], [enrollment])
    assert decision.participant_id == "participant-1"
    assert decision.state == "high"
    assert decision.best_score == 1.0


def test_match_below_strict_threshold_stays_unknown_without_review():
    assert settings.match_auto_threshold >= 0.86
    assert settings.match_runner_up_margin >= 0.10
    enrollment = SimpleNamespace(
        participant_id="participant-1",
        embedding=[1.0, 0.0],
        status="valid",
    )
    decision = decide_match([0.85, 0.5267826876], [enrollment])
    assert decision.participant_id is None
    assert decision.state == "low"
    assert 0.849 < decision.best_score < 0.851


def test_dashboard_counts_unique_faces_and_keeps_detection_total_separate():
    suffix = new_opaque_token()[0][:12]
    embedding = [1.0] + [0.0] * 511
    with SessionLocal() as db:
        organization = Organization(
            name=f"Unique face tenant {suffix}",
            type=OrganizationType.COMPANY,
            contact_email=f"faces-{suffix}@example.com",
        )
        db.add(organization)
        db.flush()
        user = User(
            organization_id=organization.id,
            name="Face Admin",
            email=f"face-admin-{suffix}@example.com",
            password_hash=hash_password(TEST_PASSWORD),
            role=UserRole.ORG_ADMIN,
            status="active",
        )
        event = Event(
            organization_id=organization.id,
            name=f"Face event {suffix}",
            event_date=date.today(),
            retention_days=30,
            expires_at=date.today() + timedelta(days=30),
        )
        db.add_all([user, event])
        db.flush()
        photo = Photo(
            organization_id=organization.id,
            event_id=event.id,
            filename="group.jpg",
            storage_key=f"tests/{suffix}/group.jpg",
            content_type="image/jpeg",
            size_bytes=1,
            sha256=(suffix * 6)[:64],
        )
        unique_face = UniqueFace(
            organization_id=organization.id,
            event_id=event.id,
            centroid_embedding=embedding,
            centroid_vector=embedding,
            occurrence_count=2,
        )
        db.add_all([photo, unique_face])
        db.flush()
        db.add(
            UniqueFacePhoto(
                organization_id=organization.id,
                event_id=event.id,
                unique_face_id=unique_face.id,
                photo_id=photo.id,
                detection_count=2,
            )
        )
        for face_index in range(2):
            detection = FaceDetection(
                organization_id=organization.id,
                event_id=event.id,
                photo_id=photo.id,
                unique_face_id=unique_face.id,
                box={"probability": 0.99},
                embedding=embedding,
                embedding_vector=embedding,
                detector_confidence=0.99,
                face_index=face_index,
            )
            db.add(detection)
            db.flush()
            db.add(
                FaceMatch(
                    organization_id=organization.id,
                    event_id=event.id,
                    detection_id=detection.id,
                    confidence=0.0,
                    state="low",
                )
            )
        db.commit()
        token = token_pair(user)["access_token"]
        organization_id = organization.id
        event_id = event.id

    headers = {"Authorization": f"Bearer {token}"}
    with TestClient(app) as client:
        matches = client.get("/api/organization/matches", headers=headers)
        assert matches.status_code == 200
        assert matches.json()["stats"]["uniqueFaces"] == 1
        assert matches.json()["stats"]["facesDetected"] == 1
        assert matches.json()["stats"]["faceDetections"] == 2
        assert matches.json()["stats"]["low"] == 1
        match_id = matches.json()["items"][0]["id"]
        assert (
            client.patch(
                f"/api/organization/matches/{match_id}",
                headers=headers,
                json={"decision": "approved"},
            ).status_code
            == 410
        )
        assert (
            client.post(
                f"/api/v2/events/{event_id}/matches/{match_id}/confirm",
                headers=headers,
            ).status_code
            == 410
        )
        processing = client.get("/api/organization/processing", headers=headers)
        assert processing.status_code == 200
        assert processing.json()["stats"]["uniqueFaces"] == 1
        assert processing.json()["stats"]["faceDetections"] == 2

    with SessionLocal() as db:
        db.execute(delete(Event).where(Event.id == event_id))
        db.execute(delete(User).where(User.organization_id == organization_id))
        db.execute(delete(Organization).where(Organization.id == organization_id))
        db.commit()


def test_enrollment_queries_stored_index_and_returns_matching_photo_count():
    suffix = new_opaque_token()[0][:12]
    embedding = [1.0] + [0.0] * 511
    with SessionLocal() as db:
        organization = Organization(
            name=f"Indexed enrollment tenant {suffix}",
            type=OrganizationType.COMPANY,
            contact_email=f"indexed-{suffix}@example.com",
        )
        db.add(organization)
        db.flush()
        event = Event(
            organization_id=organization.id,
            name=f"Indexed enrollment event {suffix}",
            event_date=date.today(),
            retention_days=30,
            expires_at=date.today() + timedelta(days=30),
        )
        db.add(event)
        db.flush()
        participant = Participant(
            organization_id=organization.id,
            event_id=event.id,
            name="Indexed Participant",
            email=f"participant-{suffix}@example.com",
            enrollment_token_hash=(suffix * 6)[:64],
            enrollment_expires_at=utcnow() + timedelta(days=1),
        )
        photo = Photo(
            organization_id=organization.id,
            event_id=event.id,
            filename="indexed.jpg",
            storage_key=f"tests/{suffix}/indexed.jpg",
            content_type="image/jpeg",
            size_bytes=1,
            sha256=(f"1{suffix}" * 6)[:64],
        )
        unique_face = UniqueFace(
            organization_id=organization.id,
            event_id=event.id,
            centroid_embedding=embedding,
            centroid_vector=embedding,
        )
        db.add_all([participant, photo, unique_face])
        db.flush()
        enrollment = FaceEnrollment(
            participant_id=participant.id,
            organization_id=organization.id,
            event_id=event.id,
            storage_key=f"tests/{suffix}/selfie.jpg",
            embedding=embedding,
            embedding_vector=embedding,
            detector_confidence=0.99,
            status="valid",
        )
        detection = FaceDetection(
            organization_id=organization.id,
            event_id=event.id,
            photo_id=photo.id,
            unique_face_id=unique_face.id,
            box={"probability": 0.99},
            embedding=embedding,
            embedding_vector=embedding,
            detector_confidence=0.99,
        )
        db.add_all([enrollment, detection])
        db.flush()
        db.add(
            FaceMatch(
                organization_id=organization.id,
                event_id=event.id,
                detection_id=detection.id,
                confidence=0.0,
                state="low",
            )
        )
        results = refresh_enrollment_matches(db, participant, embedding)
        assert results == {"unique_faces": 1, "photos": 1, "needs_review": 0}
        db.expire_all()
        persisted = db.scalar(select(FaceMatch).where(FaceMatch.detection_id == detection.id))
        assert persisted.participant_id == participant.id
        assert persisted.state == "high"
        db.rollback()


def test_completed_enrollment_link_remains_available_and_serves_matched_photos():
    suffix = new_opaque_token()[0][:12]
    raw_token, token_hash = new_opaque_token()
    storage_key = f"tests/{suffix}/matched.jpg"
    thumbnail_key = f"tests/{suffix}/matched.webp"
    photo_bytes = b"matched-event-photo"
    thumbnail_bytes = b"RIFF0000WEBPVP8 "
    storage.put(storage_key, photo_bytes, "image/jpeg")
    storage.put(thumbnail_key, thumbnail_bytes, "image/webp")
    with SessionLocal() as db:
        organization = Organization(
            name=f"Reusable enrollment tenant {suffix}",
            type=OrganizationType.COMPANY,
            contact_email=f"reusable-{suffix}@example.com",
        )
        db.add(organization)
        db.flush()
        event = Event(
            organization_id=organization.id,
            name=f"Reusable enrollment event {suffix}",
            event_date=date.today(),
            retention_days=30,
            expires_at=date.today() + timedelta(days=30),
        )
        db.add(event)
        db.flush()
        participant = Participant(
            organization_id=organization.id,
            event_id=event.id,
            name="Reusable Participant",
            email=f"reusable-participant-{suffix}@example.com",
            enrollment_status="verified",
            enrollment_token_hash=token_hash,
            enrollment_expires_at=utcnow() + timedelta(days=1),
        )
        photo = Photo(
            organization_id=organization.id,
            event_id=event.id,
            filename="matched.jpg",
            storage_key=storage_key,
            thumbnail_storage_key=thumbnail_key,
            content_type="image/jpeg",
            size_bytes=len(photo_bytes),
            sha256=(f"2{suffix}" * 6)[:64],
            processing_status="completed",
        )
        db.add_all([participant, photo])
        db.flush()
        db.add(
            ParticipantEnrollmentToken(
                participant_id=participant.id,
                token_hash=token_hash,
                expires_at=participant.enrollment_expires_at,
                opened_at=utcnow(),
                consumed_at=utcnow(),
            )
        )
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
        organization_id = organization.id
        event_id = event.id
        photo_id = photo.id

    with TestClient(app) as client:
        response = client.get(f"/api/v2/public/enrollment/{raw_token}")
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["status"] == "verified"
        assert data["matching_results"] == {"photos": 1}
        assert data["photos"] == [
            {
                "id": photo_id,
                "filename": "matched.jpg",
                "thumbnail_url": f"/api/v2/public/enrollment/{raw_token}/photos/{photo_id}/thumbnail",
                "download_url": f"/api/v2/public/enrollment/{raw_token}/photos/{photo_id}/download",
            }
        ]
        thumbnail = client.get(data["photos"][0]["thumbnail_url"])
        assert thumbnail.status_code == 200
        assert thumbnail.headers["content-type"] == "image/webp"
        assert thumbnail.content == thumbnail_bytes

    with SessionLocal() as db:
        db.execute(delete(Event).where(Event.id == event_id))
        db.execute(delete(Organization).where(Organization.id == organization_id))
        db.commit()
    storage.delete(storage_key)
    storage.delete(thumbnail_key)


def test_mpo_phone_photos_use_the_jpeg_inference_path():
    image = type("ImageStub", (), {"format": "MPO"})()
    assert image_content_type(image) == "image/jpeg"


def test_cross_tenant_event_endpoints_return_not_found():
    suffix = new_opaque_token()[0][:12]
    with SessionLocal() as db:
        tenant_a = Organization(
            name=f"Tenant A {suffix}",
            type=OrganizationType.COMPANY,
            contact_email=f"a-{suffix}@example.com",
        )
        tenant_b = Organization(
            name=f"Tenant B {suffix}",
            type=OrganizationType.COMPANY,
            contact_email=f"b-{suffix}@example.com",
        )
        db.add_all([tenant_a, tenant_b])
        db.flush()
        user_a = User(
            organization_id=tenant_a.id,
            name="Admin A",
            email=f"admin-a-{suffix}@example.com",
            password_hash=hash_password(TEST_PASSWORD),
            role=UserRole.ORG_ADMIN,
            status="active",
        )
        event_b = Event(
            organization_id=tenant_b.id,
            name=f"Private event {suffix}",
            event_date=date.today(),
            retention_days=30,
            expires_at=date.today() + timedelta(days=30),
            status="DRAFT",
        )
        db.add_all([user_a, event_b])
        db.commit()
        token = token_pair(user_a)["access_token"]
        event_id = event_b.id
        tenant_a_id = tenant_a.id

    headers = {"Authorization": f"Bearer {token}"}
    with TestClient(app) as client:
        assert client.get(f"/api/v2/events/{event_id}", headers=headers).status_code == 404
        assert (
            client.patch(
                f"/api/v2/events/{event_id}",
                headers=headers,
                json={"name": "Forbidden"},
            ).status_code
            == 404
        )
        assert (
            client.post(
                f"/api/v2/events/{event_id}/upload-batches",
                headers=headers,
                json={"expected_files": 1, "reserved_bytes": 1024},
            ).status_code
            == 404
        )

    with SessionLocal() as db:
        tenant_b_id = db.get(Event, event_id).organization_id
        db.execute(delete(Event).where(Event.id == event_id))
        db.execute(delete(User).where(User.organization_id.in_([tenant_a_id, tenant_b_id])))
        db.execute(delete(Organization).where(Organization.id.in_([tenant_a_id, tenant_b_id])))
        db.commit()


def test_collaborator_can_create_metadata_but_cannot_access_private_data():
    suffix = new_opaque_token()[0][:12]
    with SessionLocal() as db:
        organization = Organization(
            name=f"Collaborator target {suffix}",
            type=OrganizationType.COMPANY,
            contact_email=f"target-{suffix}@example.com",
            status="active",
        )
        collaborator = User(
            name="Restricted Collaborator",
            email=f"collaborator-{suffix}@example.com",
            password_hash=hash_password(TEST_PASSWORD),
            role=UserRole.COLLABORATOR,
            status="active",
        )
        db.add_all([organization, collaborator])
        db.flush()
        existing_event = Event(
            organization_id=organization.id,
            name=f"Existing private event {suffix}",
            event_date=date.today(),
            retention_days=30,
            expires_at=date.today() + timedelta(days=30),
            status="preparing",
        )
        db.add(existing_event)
        db.commit()
        token = token_pair(collaborator)["access_token"]
        collaborator_id = collaborator.id
        organization_id = organization.id
        existing_event_id = existing_event.id

    headers = {"Authorization": f"Bearer {token}"}
    created_organization_id = None
    created_event_id = None
    with TestClient(app) as client:
        organizations = client.get("/api/collaborator/organizations", headers=headers)
        assert organizations.status_code == 200
        target = next(item for item in organizations.json()["items"] if item["id"] == organization_id)
        assert set(target) == {"id", "name", "type", "status"}

        created_organization = client.post(
            "/api/collaborator/organizations",
            headers=headers,
            json={
                "name": f"Created by collaborator {suffix}",
                "type": "COLLEGE",
                "contactName": "New Contact",
                "contactEmail": f"new-{suffix}@example.com",
                "phone": "",
            },
        )
        assert created_organization.status_code == 201
        assert set(created_organization.json()) == {"id", "name", "type", "status"}
        created_organization_id = created_organization.json()["id"]

        created_event = client.post(
            "/api/collaborator/events",
            headers=headers,
            json={
                "organizationId": organization_id,
                "name": f"Collaborator event {suffix}",
                "description": "Metadata only",
                "date": date.today().isoformat(),
                "location": "Chennai",
            },
        )
        assert created_event.status_code == 201
        created_event_id = created_event.json()["id"]
        assert set(created_event.json()) == {
            "id",
            "organizationId",
            "organization",
            "name",
            "date",
            "location",
            "status",
            "createdAt",
        }

        own_events = client.get("/api/collaborator/events", headers=headers)
        assert own_events.status_code == 200
        assert [item["id"] for item in own_events.json()["items"]] == [created_event_id]

        restricted_paths = [
            "/api/admin/organizations",
            "/api/organization/dashboard",
            "/api/organization/events",
            "/api/organization/participants",
            "/api/organization/uploads",
            "/api/organization/matches",
            "/api/organization/deliveries",
            "/api/organization/logs",
            f"/api/v2/events/{existing_event_id}",
            f"/api/v2/events/{existing_event_id}/participants",
            f"/api/v2/events/{existing_event_id}/media",
            f"/api/v2/events/{existing_event_id}/matches",
        ]
        for path in restricted_paths:
            assert client.get(path, headers=headers).status_code == 403
        assert (
            client.post(
                f"/api/v2/events/{created_event_id}/upload-batches",
                headers=headers,
                json={"expected_files": 1, "reserved_bytes": 1024},
            ).status_code
            == 403
        )

    with SessionLocal() as db:
        db.execute(delete(Event).where(Event.id.in_([existing_event_id, created_event_id])))
        db.execute(delete(User).where(User.id == collaborator_id))
        db.execute(delete(Organization).where(Organization.id.in_([organization_id, created_organization_id])))
        db.commit()
