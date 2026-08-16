from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .models import Photo


READY_PHOTO_STATUSES = ("ready", "completed")


def event_media_readiness(db: Session, event_id: str) -> tuple[int, int]:
    """Return total and successfully processed photo counts for an event."""
    total, ready = db.execute(
        select(
            func.count(Photo.id),
            func.count(Photo.id).filter(func.lower(Photo.processing_status).in_(READY_PHOTO_STATUSES)),
        ).where(Photo.event_id == event_id)
    ).one()
    return int(total or 0), int(ready or 0)

