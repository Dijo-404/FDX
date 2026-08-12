from datetime import date, timedelta

from app.auth import hash_password, new_opaque_token, token_pair, verify_password
from app.database import SessionLocal
from app.main import app
from app.models import Event, Organization, OrganizationType, User, UserRole
from app.worker import cosine
from fastapi.testclient import TestClient
from sqlalchemy import delete


def test_argon2_password_round_trip():
    encoded = hash_password("Correct Horse Battery Staple")
    assert encoded.startswith("$argon2id$")
    assert verify_password("Correct Horse Battery Staple", encoded)
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


def test_cross_tenant_event_endpoints_return_not_found():
    suffix = new_opaque_token()[0][:12]
    with SessionLocal() as db:
        tenant_a = Organization(name=f"Tenant A {suffix}", type=OrganizationType.COMPANY, contact_email=f"a-{suffix}@example.com")
        tenant_b = Organization(name=f"Tenant B {suffix}", type=OrganizationType.COMPANY, contact_email=f"b-{suffix}@example.com")
        db.add_all([tenant_a, tenant_b])
        db.flush()
        user_a = User(organization_id=tenant_a.id, name="Admin A", email=f"admin-a-{suffix}@example.com", password_hash=hash_password("Correct Horse Battery Staple"), role=UserRole.ORG_ADMIN, status="active")
        event_b = Event(organization_id=tenant_b.id, name=f"Private event {suffix}", event_date=date.today(), retention_days=30, expires_at=date.today() + timedelta(days=30), status="DRAFT")
        db.add_all([user_a, event_b])
        db.commit()
        token = token_pair(user_a)["access_token"]
        event_id = event_b.id
        tenant_a_id = tenant_a.id

    headers = {"Authorization": f"Bearer {token}"}
    with TestClient(app) as client:
        assert client.get(f"/api/v2/events/{event_id}", headers=headers).status_code == 404
        assert client.patch(f"/api/v2/events/{event_id}", headers=headers, json={"name": "Forbidden"}).status_code == 404
        assert client.post(f"/api/v2/events/{event_id}/upload-batches", headers=headers, json={"expected_files": 1, "reserved_bytes": 1024}).status_code == 404

    with SessionLocal() as db:
        tenant_b_id = db.get(Event, event_id).organization_id
        db.execute(delete(Event).where(Event.id == event_id))
        db.execute(delete(User).where(User.organization_id.in_([tenant_a_id, tenant_b_id])))
        db.execute(delete(Organization).where(Organization.id.in_([tenant_a_id, tenant_b_id])))
        db.commit()
