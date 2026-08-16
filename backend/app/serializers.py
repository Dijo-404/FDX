from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .models import (
    Delivery,
    Event,
    FaceMatch,
    Organization,
    Participant,
    Photo,
    UniqueFace,
    User,
)

GB = 1024**3


def iso(value):
    return value.isoformat() if value else None


def user_json(user: User) -> dict:
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role.value,
        "status": user.status,
        "organizationId": user.organization_id,
        "organizationName": user.organization.name if user.organization else None,
        "organizationType": user.organization.type.value if user.organization else None,
        "lastActive": iso(user.last_active_at),
        "invite": "accepted" if user.password_hash else "pending",
        "createdAt": iso(user.created_at),
    }


def organization_json(db: Session, organization: Organization) -> dict:
    users = db.scalar(select(func.count(User.id)).where(User.organization_id == organization.id)) or 0
    events = db.scalar(select(func.count(Event.id)).where(Event.organization_id == organization.id)) or 0
    next_expiry = db.scalar(
        select(func.min(Event.expires_at)).where(Event.organization_id == organization.id, Event.status != "expired")
    )
    return {
        "id": organization.id,
        "name": organization.name,
        "type": organization.type.value,
        "status": organization.status,
        "users": users,
        "events": events,
        "storageUsedBytes": organization.storage_used_bytes,
        "storageLimitBytes": organization.storage_limit_bytes,
        "storageUsedGB": round(organization.storage_used_bytes / GB, 2),
        "storageLimitGB": round(organization.storage_limit_bytes / GB, 2),
        "retentionDays": organization.retention_days,
        "expiry": iso(organization.expires_at),
        "nextDataExpiry": iso(next_expiry),
        "contactName": organization.contact_name,
        "contactEmail": organization.contact_email,
        "phone": organization.phone,
        "privacyContactEmail": organization.privacy_contact_email or "",
        "privacyContactEmailEffective": organization.privacy_contact_email or organization.contact_email,
        "participantPrivacyNotice": organization.participant_privacy_notice,
        "privacyNoticeVersion": organization.privacy_notice_version,
        "createdAt": iso(organization.created_at),
    }


def event_json(db: Session, event: Event) -> dict:
    photos = db.scalar(select(func.count(Photo.id)).where(Photo.event_id == event.id)) or 0
    faces = db.scalar(select(func.count(UniqueFace.id)).where(UniqueFace.event_id == event.id)) or 0
    participants = db.scalar(select(func.count(Participant.id)).where(Participant.event_id == event.id)) or 0
    enrolled = (
        db.scalar(
            select(func.count(Participant.id)).where(
                Participant.event_id == event.id,
                Participant.enrollment_status == "verified",
            )
        )
        or 0
    )
    matched = (
        db.scalar(
            select(func.count(func.distinct(FaceMatch.participant_id))).where(
                FaceMatch.event_id == event.id,
                FaceMatch.participant_id.is_not(None),
                FaceMatch.state == "high",
            )
        )
        or 0
    )
    delivered = (
        db.scalar(select(func.count(Delivery.id)).where(Delivery.event_id == event.id, Delivery.status == "delivered"))
        or 0
    )
    return {
        "id": event.id,
        "name": event.name,
        "description": event.description,
        "date": iso(event.event_date),
        "location": event.location,
        "retentionDays": event.retention_days,
        "expiresAt": iso(event.expires_at),
        "status": event.status,
        "photos": photos,
        "facesDetected": faces,
        "participants": participants,
        "enrolled": enrolled,
        "matched": matched,
        "delivered": delivered,
        "createdAt": iso(event.created_at),
    }


def participant_json(db: Session, participant: Participant) -> dict:
    matches = (
        db.scalar(
            select(func.count(FaceMatch.id)).where(
                FaceMatch.participant_id == participant.id,
                FaceMatch.state == "high",
            )
        )
        or 0
    )
    return {
        "id": participant.id,
        "eventId": participant.event_id,
        "event": participant.event.name,
        "name": participant.name,
        "email": participant.email,
        "enrollment": participant.enrollment_status,
        "delivery": participant.delivery_status,
        "matches": matches,
        "uploadedAt": iso(participant.created_at),
    }
