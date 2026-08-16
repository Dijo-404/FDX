import secrets
from datetime import date, timedelta

from app.auth import hash_password, new_opaque_token, token_pair
from app.config import settings
from app.database import SessionLocal
from app.main import app
from app.models import (
    AuditLog,
    Consent,
    Event,
    Organization,
    OrganizationType,
    Participant,
    User,
    UserRole,
    utcnow,
)
from fastapi.testclient import TestClient
from sqlalchemy import delete, select


TEST_PASSWORD = f"Test-{secrets.token_urlsafe(24)}"


def seed_settings_tenant() -> dict:
    suffix = new_opaque_token()[0][:12]
    raw_enrollment_token, enrollment_token_hash = new_opaque_token()
    with SessionLocal() as db:
        organization = Organization(
            name=f"Settings tenant {suffix}",
            type=OrganizationType.COMPANY,
            contact_email=f"contact-{suffix}@example.com",
        )
        db.add(organization)
        db.flush()
        admin = User(
            organization_id=organization.id,
            name="Settings Admin",
            email=f"admin-{suffix}@example.com",
            password_hash=hash_password(TEST_PASSWORD),
            role=UserRole.ORG_ADMIN,
            status="active",
        )
        staff = User(
            organization_id=organization.id,
            name="Settings Staff",
            email=f"staff-{suffix}@example.com",
            password_hash=hash_password(TEST_PASSWORD),
            role=UserRole.STAFF,
            status="active",
        )
        event = Event(
            organization_id=organization.id,
            name=f"Settings event {suffix}",
            event_date=date.today(),
            retention_days=30,
            expires_at=date.today() + timedelta(days=30),
            status="ENROLLMENT_OPEN",
        )
        db.add_all([admin, staff, event])
        db.flush()
        participant = Participant(
            organization_id=organization.id,
            event_id=event.id,
            name="Settings Participant",
            email=f"participant-{suffix}@example.com",
            enrollment_token_hash=enrollment_token_hash,
            enrollment_expires_at=utcnow() + timedelta(hours=24),
        )
        db.add(participant)
        db.commit()
        return {
            "organization_id": organization.id,
            "participant_id": participant.id,
            "admin_token": token_pair(admin)["access_token"],
            "staff_token": token_pair(staff)["access_token"],
            "enrollment_token": raw_enrollment_token,
        }


def cleanup_settings_tenant(seed: dict) -> None:
    with SessionLocal() as db:
        db.execute(
            delete(AuditLog).where(AuditLog.organization_id == seed["organization_id"])
        )
        db.execute(
            delete(Event).where(Event.organization_id == seed["organization_id"])
        )
        db.execute(delete(User).where(User.organization_id == seed["organization_id"]))
        db.execute(
            delete(Organization).where(Organization.id == seed["organization_id"])
        )
        db.commit()


def test_privacy_settings_are_persisted_versioned_and_exposed_to_enrollment():
    seed = seed_settings_tenant()
    admin_headers = {"Authorization": f"Bearer {seed['admin_token']}"}
    try:
        with TestClient(app) as client:
            updated = client.patch(
                "/api/organization/settings",
                headers=admin_headers,
                json={
                    "privacyContactEmail": "Privacy@example.com",
                    "participantPrivacyNotice": "Contact our privacy team for event-specific data questions.",
                },
            )
            assert updated.status_code == 200
            body = updated.json()
            assert body["privacyContactEmail"] == "privacy@example.com"
            assert body["privacyContactEmailEffective"] == "privacy@example.com"
            assert body["participantPrivacyNotice"].startswith(
                "Contact our privacy team"
            )
            assert body["privacyNoticeVersion"] == 2
            assert body["consentRequired"] is True
            assert body["consentPolicyVersion"] == settings.consent_policy_version

            unchanged = client.patch(
                "/api/organization/settings",
                headers=admin_headers,
                json={"participantPrivacyNotice": body["participantPrivacyNotice"]},
            )
            assert unchanged.status_code == 200
            assert unchanged.json()["privacyNoticeVersion"] == 2

            enrollment = client.get(
                f"/api/v2/public/enrollment/{seed['enrollment_token']}"
            )
            assert enrollment.status_code == 200
            enrollment_data = enrollment.json()["data"]
            assert enrollment_data["privacy_contact_email"] == "privacy@example.com"
            assert (
                enrollment_data["participant_privacy_notice"]
                == body["participantPrivacyNotice"]
            )
            assert (
                enrollment_data["consent_policy_version"]
                == f"{settings.consent_policy_version}:org-2"
            )

            consent = client.post(
                f"/api/v2/public/enrollment/{seed['enrollment_token']}/consent",
                data={"accepted": "true"},
            )
            assert consent.status_code == 201
            assert (
                consent.json()["data"]["policy_version"]
                == f"{settings.consent_policy_version}:org-2"
            )

        with SessionLocal() as db:
            record = db.scalar(
                select(Consent).where(Consent.participant_id == seed["participant_id"])
            )
            assert record.policy_version == f"{settings.consent_policy_version}:org-2"
            audit = db.scalar(
                select(AuditLog)
                .where(
                    AuditLog.organization_id == seed["organization_id"],
                    AuditLog.action == "Organization settings updated",
                )
                .order_by(AuditLog.created_at.desc())
            )
            assert audit is not None
            assert "participantPrivacyNotice" in audit.details
            assert body["participantPrivacyNotice"] not in audit.details
    finally:
        cleanup_settings_tenant(seed)


def test_settings_update_is_admin_only_and_rejects_invalid_payloads():
    seed = seed_settings_tenant()
    admin_headers = {"Authorization": f"Bearer {seed['admin_token']}"}
    staff_headers = {"Authorization": f"Bearer {seed['staff_token']}"}
    try:
        with TestClient(app) as client:
            assert (
                client.get(
                    "/api/organization/settings", headers=staff_headers
                ).status_code
                == 200
            )
            assert (
                client.patch(
                    "/api/organization/settings",
                    headers=staff_headers,
                    json={"participantPrivacyNotice": "Staff must not update this."},
                ).status_code
                == 403
            )
            for payload in (
                {},
                {"unknownSetting": True},
                {"contactName": None},
                {"phone": "1" * 41},
                {"participantPrivacyNotice": "x" * 2001},
            ):
                response = client.patch(
                    "/api/organization/settings",
                    headers=admin_headers,
                    json=payload,
                )
                assert response.status_code == 422, payload
    finally:
        cleanup_settings_tenant(seed)
