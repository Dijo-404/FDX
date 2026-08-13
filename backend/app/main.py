from __future__ import annotations

import csv
import hashlib
import io
import json
import logging
import mimetypes
import secrets
import tempfile
import threading
import time
import uuid
import zipfile
from contextlib import asynccontextmanager
from datetime import date, datetime, timedelta, timezone
from pathlib import Path, PurePosixPath

import xlrd
from fastapi import Depends, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response, StreamingResponse
from openpyxl import load_workbook
from openpyxl.utils.exceptions import InvalidFileException
from PIL import Image, ImageOps
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import delete, func, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from starlette.background import BackgroundTask

from .auth import (
    check_login_rate_limit,
    current_user,
    find_user_by_email,
    hash_password,
    hash_token,
    new_opaque_token,
    require_org_admin,
    require_org_member,
    require_super_admin,
    token_pair,
    verify_password,
)
from .config import settings
from .database import Base, SessionLocal, engine, get_db
from .integrations import (
    cache_delete,
    dependency_health,
    dispatch_email,
    ml_embedding,
    publish_job,
    queue_email,
    storage,
)
from .models import (
    AuditLog,
    Consent,
    Delivery,
    EmailOutbox,
    Event,
    FaceDetection,
    FaceEnrollment,
    FaceMatch,
    ModelRegistry,
    Organization,
    OrganizationType,
    Participant,
    Photo,
    ProcessingJob,
    User,
    UserInvitation,
    UserRole,
    utcnow,
)
from .serializers import event_json, iso, organization_json, participant_json, user_json

GB = 1024**3
METRICS_LOCK = threading.Lock()
REQUEST_METRICS = {
    "requests": 0,
    "latency_seconds": 0.0,
    "responses_4xx": 0,
    "responses_5xx": 0,
    "rate_limited": 0,
    "auth_failures": 0,
}
# Reuse Uvicorn's configured service logger so JSON request records are emitted
# consistently in containers without installing a second handler.
logger = logging.getLogger("uvicorn.error")


class LoginInput(BaseModel):
    email: EmailStr
    password: str


class PasswordInput(BaseModel):
    password: str = Field(min_length=10)


class OrganizationInput(BaseModel):
    name: str = Field(min_length=2, max_length=180)
    type: OrganizationType
    contactName: str = ""
    contactEmail: EmailStr
    phone: str = ""
    storageLimitGB: float = Field(default=100, gt=0)
    retentionDays: int = Field(default=90, ge=1, le=3650)
    expiry: date | None = None


class OrganizationPatch(BaseModel):
    status: str | None = None
    storageLimitGB: float | None = Field(default=None, gt=0)
    retentionDays: int | None = Field(default=None, ge=1, le=3650)
    expiry: date | None = None
    contactName: str | None = None
    contactEmail: EmailStr | None = None
    phone: str | None = None


class UserInviteInput(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    organizationId: str


class StaffInviteInput(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr


class EventInput(BaseModel):
    name: str = Field(min_length=2, max_length=180)
    description: str = ""
    date: date
    location: str = ""
    retentionDays: int | None = Field(default=None, ge=1, le=3650)
    expiresAt: date | None = None


class MatchReviewInput(BaseModel):
    decision: str


class SettingsInput(BaseModel):
    contactName: str | None = None
    contactEmail: EmailStr | None = None
    phone: str | None = None


def audit(
    db: Session,
    user: User | None,
    action: str,
    details: str,
    level: str = "info",
    organization_id: str | None = None,
) -> None:
    db.add(
        AuditLog(
            organization_id=organization_id if organization_id is not None else user.organization_id if user else None,
            actor_user_id=user.id if user else None,
            actor=user.email if user else "system",
            action=action,
            details=details,
            level=level,
        )
    )


def bootstrap() -> None:
    if settings.environment == "production":
        if len(settings.jwt_secret) < 32:
            raise RuntimeError("Production requires a unique JWT_SECRET of at least 32 characters")
        if len(settings.super_admin_password) < 12:
            raise RuntimeError("Production requires FDX_SUPER_ADMIN_PASSWORD of at least 12 characters")
        if settings.email_provider in {"resend", "ses"} and len(settings.email_webhook_secret) < 32:
            raise RuntimeError("Production email providers require EMAIL_WEBHOOK_SECRET of at least 32 characters")
    # Production schema ownership belongs exclusively to reviewed Alembic
    # migrations. Local development keeps the convenience bootstrap.
    if settings.environment != "production":
        Base.metadata.create_all(engine)
    with SessionLocal() as db:
        existing = find_user_by_email(db, settings.super_admin_email)
        if not existing:
            db.add(
                User(
                    name="FDX Super Admin",
                    email=settings.super_admin_email.lower(),
                    password_hash=hash_password(settings.super_admin_password),
                    role=UserRole.SUPER_ADMIN,
                    status="active",
                )
            )
            db.add(
                AuditLog(
                    actor="system",
                    action="Platform initialized",
                    details="Initial Super Admin account created",
                    level="info",
                )
            )
            db.commit()
        if not db.scalar(select(ModelRegistry).where(ModelRegistry.active.is_(True))):
            db.add(
                ModelRegistry(
                    detector_name="retinaface-r50",
                    detector_version=settings.detector_model_version,
                    detector_sha256=settings.detector_model_sha256,
                    embedder_name="adaface-ir101-ms1mv2",
                    embedder_version=settings.embedder_model_version,
                    embedder_sha256=settings.embedder_model_sha256,
                    embedding_dimension=512,
                    metric="cosine",
                    threshold_profile_version=settings.threshold_profile_version,
                    active=True,
                )
            )
            db.commit()


@asynccontextmanager
async def lifespan(_: FastAPI):
    bootstrap()
    yield


app = FastAPI(title="FDX Platform API", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_url,
        "http://127.0.0.1:5173",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_context(request: Request, call_next):
    request.state.request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    request.state.correlation_id = request.headers.get("X-Correlation-ID") or request.state.request_id
    started = time.perf_counter()
    response = await call_next(request)
    elapsed = time.perf_counter() - started
    with METRICS_LOCK:
        REQUEST_METRICS["requests"] += 1
        REQUEST_METRICS["latency_seconds"] += elapsed
        if 400 <= response.status_code < 500:
            REQUEST_METRICS["responses_4xx"] += 1
        if response.status_code >= 500:
            REQUEST_METRICS["responses_5xx"] += 1
        if response.status_code == 429:
            REQUEST_METRICS["rate_limited"] += 1
        if response.status_code == 401 and request.url.path.startswith("/api"):
            REQUEST_METRICS["auth_failures"] += 1
    route = request.scope.get("route")
    logger.info(
        json.dumps(
            {
                "timestamp": utcnow().isoformat(),
                "level": "INFO",
                "service": "fdx-api",
                "request_id": request.state.request_id,
                "correlation_id": request.state.correlation_id,
                "method": request.method,
                "path": getattr(route, "path", "/redacted"),
                "status": response.status_code,
                "duration_ms": round(elapsed * 1000, 2),
            },
            separators=(",", ":"),
        )
    )
    response.headers["X-Request-ID"] = request.state.request_id
    response.headers["X-Correlation-ID"] = request.state.correlation_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(self)"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; img-src 'self' data: blob: https:; connect-src 'self' https:; style-src 'self' 'unsafe-inline'; script-src 'self'; frame-ancestors 'none'"
    )
    response.headers["X-Response-Time-Ms"] = f"{elapsed * 1000:.2f}"
    if settings.environment == "production":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


@app.exception_handler(HTTPException)
async def http_error(request: Request, exc: HTTPException):
    if not request.url.path.startswith("/api/v2"):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
            headers=exc.headers,
        )
    code = {
        400: "BAD_REQUEST",
        401: "AUTHENTICATION_REQUIRED",
        403: "FORBIDDEN",
        404: "RESOURCE_NOT_FOUND",
        409: "STATE_CONFLICT",
        413: "UPLOAD_TOO_LARGE",
        422: "VALIDATION_ERROR",
        429: "RATE_LIMITED",
        503: "DEPENDENCY_UNAVAILABLE",
    }.get(exc.status_code, "REQUEST_FAILED")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {"code": code, "message": str(exc.detail), "details": {}},
            "meta": {"request_id": request.state.request_id},
        },
        headers=exc.headers,
    )


@app.exception_handler(RequestValidationError)
async def validation_error(request: Request, exc: RequestValidationError):
    if not request.url.path.startswith("/api/v2"):
        return JSONResponse(status_code=422, content={"detail": exc.errors()})
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Request validation failed.",
                "details": {"errors": exc.errors()},
            },
            "meta": {"request_id": request.state.request_id},
        },
    )


@app.exception_handler(Exception)
async def unexpected_error(request: Request, exc: Exception):
    logger.exception("Unhandled API error", exc_info=exc)
    if not request.url.path.startswith("/api/v2"):
        return JSONResponse(status_code=500, content={"detail": "Internal server error"})
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "The request could not be completed.",
                "details": {},
            },
            "meta": {"request_id": request.state.request_id},
        },
    )


@app.get("/health")
@app.get("/api/health")
def health(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    services = [
        {
            "name": "API Gateway",
            "detail": "NGINX routing and rate limits",
            "status": "healthy",
        },
        {
            "name": "FastAPI",
            "detail": "Application service available",
            "status": "healthy",
        },
        {
            "name": "PostgreSQL",
            "detail": "Primary database connected",
            "status": "healthy",
        },
        *dependency_health(),
    ]
    return {
        "status": "healthy" if all(item["status"] == "healthy" for item in services) else "degraded",
        "services": services,
    }


@app.get("/health/live")
def health_live():
    return {"status": "alive"}


@app.get("/health/ready")
def health_ready(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"status": "ready"}


@app.get("/health/dependencies")
def health_dependencies(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    services = [{"name": "PostgreSQL", "status": "healthy"}, *dependency_health()]
    return {
        "status": "healthy" if all(item["status"] == "healthy" for item in services) else "degraded",
        "services": services,
    }


@app.get("/metrics", include_in_schema=False)
def metrics():
    """Small dependency-free Prometheus surface for API-level service metrics."""
    with METRICS_LOCK:
        snapshot = dict(REQUEST_METRICS)
    values = {
        "fdx_api_requests_total": snapshot["requests"],
        "fdx_api_request_duration_seconds_sum": snapshot["latency_seconds"],
        "fdx_api_responses_4xx_total": snapshot["responses_4xx"],
        "fdx_api_responses_5xx_total": snapshot["responses_5xx"],
        "fdx_api_rate_limited_total": snapshot["rate_limited"],
        "fdx_api_auth_failures_total": snapshot["auth_failures"],
    }
    body = "\n".join(f"# TYPE {name} counter\n{name} {value}" for name, value in values.items()) + "\n"
    return Response(content=body, media_type="text/plain; version=0.0.4")


@app.post("/api/auth/login")
def login(payload: LoginInput, request: Request, db: Session = Depends(get_db)):
    email = str(payload.email).lower()
    check_login_rate_limit(request, email)
    user = find_user_by_email(db, email)
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if user.status != "active":
        raise HTTPException(status_code=403, detail="Account is not active")
    if user.organization and (
        user.organization.status != "active"
        or (user.organization.expires_at and user.organization.expires_at < date.today())
    ):
        raise HTTPException(status_code=403, detail="Organization access is suspended or expired")
    user.last_active_at = utcnow()
    audit(db, user, "Signed in", "JWT session issued")
    result = token_pair(user)
    db.commit()
    return {**result, "user": user_json(user)}


@app.get("/api/auth/me")
def me(user: User = Depends(current_user)):
    return {"user": user_json(user)}


@app.post("/api/auth/invitations/{token}")
def accept_invitation(token: str, payload: PasswordInput, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.invite_token_hash == hash_token(token)))
    now = utcnow()
    if not user or not user.invite_expires_at or user.invite_expires_at < now:
        raise HTTPException(status_code=404, detail="Invitation is invalid or expired")
    user.password_hash = hash_password(payload.password)
    user.invite_token_hash = None
    user.invite_expires_at = None
    user.status = "active"
    audit(db, user, "Invitation accepted", f"{user.role.value} password created")
    db.commit()
    return {**token_pair(user), "user": user_json(user)}


@app.get("/api/admin/organizations")
def list_organizations(_: User = Depends(require_super_admin), db: Session = Depends(get_db)):
    return {
        "items": [
            organization_json(db, item)
            for item in db.scalars(select(Organization).order_by(Organization.created_at.desc())).all()
        ]
    }


@app.post("/api/admin/organizations", status_code=201)
def create_organization(
    payload: OrganizationInput,
    user: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    organization = Organization(
        name=payload.name.strip(),
        type=payload.type,
        contact_name=payload.contactName.strip(),
        contact_email=str(payload.contactEmail).lower(),
        phone=payload.phone.strip(),
        storage_limit_bytes=int(payload.storageLimitGB * GB),
        retention_days=payload.retentionDays,
        expires_at=payload.expiry,
        status="active",
    )
    db.add(organization)
    audit(
        db,
        user,
        "Organization created",
        f"{organization.name} ({organization.type.value})",
        organization_id=organization.id,
    )
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="An organization with this name already exists") from exc
    return organization_json(db, organization)


@app.patch("/api/admin/organizations/{organization_id}")
def update_organization(
    organization_id: str,
    payload: OrganizationPatch,
    user: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    organization = db.get(Organization, organization_id)
    if not organization:
        raise HTTPException(status_code=404, detail="Organization not found")
    values = payload.model_dump(exclude_unset=True)
    mapping = {
        "contactName": "contact_name",
        "contactEmail": "contact_email",
        "retentionDays": "retention_days",
        "expiry": "expires_at",
        "storageLimitGB": "storage_limit_bytes",
    }
    for key, value in values.items():
        attribute = mapping.get(key, key)
        if key == "storageLimitGB":
            value = int(value * GB)
            if value < organization.storage_used_bytes:
                raise HTTPException(
                    status_code=422,
                    detail="Quota cannot be below current storage usage",
                )
        if key == "status" and value not in {"active", "suspended"}:
            raise HTTPException(status_code=422, detail="Status must be active or suspended")
        setattr(organization, attribute, value)
    audit(
        db,
        user,
        "Organization updated",
        f"{organization.name}: {', '.join(values)}",
        organization_id=organization.id,
    )
    db.commit()
    cache_delete("fdx:admin:dashboard", f"fdx:org:{organization.id}:dashboard")
    return organization_json(db, organization)


@app.get("/api/admin/users")
def list_users(_: User = Depends(require_super_admin), db: Session = Depends(get_db)):
    users = db.scalars(
        select(User).where(User.role.in_([UserRole.ORG_ADMIN, UserRole.STAFF])).order_by(User.created_at.desc())
    ).all()
    return {
        "items": [
            {
                **user_json(item),
                "organization": item.organization.name if item.organization else None,
            }
            for item in users
        ]
    }


@app.post("/api/admin/users", status_code=201)
def invite_user(
    payload: UserInviteInput,
    user: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    organization = db.get(Organization, payload.organizationId)
    if not organization:
        raise HTTPException(status_code=404, detail="Organization not found")
    if find_user_by_email(db, str(payload.email)):
        raise HTTPException(status_code=409, detail="A user with this email already exists")
    raw_token, token_hash = new_opaque_token()
    invited = User(
        organization_id=organization.id,
        name=payload.name.strip(),
        email=str(payload.email).lower(),
        role=UserRole.ORG_ADMIN,
        status="invited",
        invite_token_hash=token_hash,
        invite_expires_at=utcnow() + timedelta(days=7),
    )
    db.add(invited)
    db.flush()
    db.add(
        UserInvitation(
            user_id=invited.id,
            token_hash=token_hash,
            expires_at=invited.invite_expires_at,
        )
    )
    invite_url = f"{settings.frontend_url}/accept-invite/{raw_token}"
    email = queue_email(
        db,
        organization.id,
        invited.email,
        "You have been invited to FDX",
        f"<p>Hello {invited.name},</p><p>You have been invited to manage {organization.name} in FDX.</p><p><a href='{invite_url}'>Set your password</a></p><p>This link expires in 7 days.</p>",
    )
    dispatch_email(db, email)
    audit(
        db,
        user,
        "Organization Admin invited",
        f"{invited.email} → {organization.name}",
        organization_id=organization.id,
    )
    db.commit()
    response = {**user_json(invited), "organization": organization.name}
    if settings.environment == "development":
        response["developmentInviteUrl"] = invite_url
    return response


@app.get("/api/organization/team")
def organization_team(user: User = Depends(require_org_admin), db: Session = Depends(get_db)):
    members = db.scalars(
        select(User).where(User.organization_id == user.organization_id).order_by(User.created_at.desc())
    ).all()
    return {"items": [user_json(member) for member in members]}


@app.post("/api/organization/team", status_code=201)
def invite_staff(
    payload: StaffInviteInput,
    user: User = Depends(require_org_admin),
    db: Session = Depends(get_db),
):
    if find_user_by_email(db, str(payload.email)):
        raise HTTPException(status_code=409, detail="A user with this email already exists")
    raw_token, token_hash = new_opaque_token()
    invited = User(
        organization_id=user.organization_id,
        name=payload.name.strip(),
        email=str(payload.email).lower(),
        role=UserRole.STAFF,
        status="invited",
        invite_token_hash=token_hash,
        invite_expires_at=utcnow() + timedelta(days=7),
    )
    db.add(invited)
    db.flush()
    db.add(
        UserInvitation(
            user_id=invited.id,
            token_hash=token_hash,
            expires_at=invited.invite_expires_at,
        )
    )
    invite_url = f"{settings.frontend_url}/accept-invite/{raw_token}"
    email = queue_email(
        db,
        user.organization_id,
        invited.email,
        f"You have been invited to {user.organization.name} on FDX",
        f"<p>Hello {invited.name},</p><p>You have been invited as event operations staff for {user.organization.name}.</p><p><a href='{invite_url}'>Set your password</a></p><p>This link expires in 7 days.</p>",
    )
    dispatch_email(db, email)
    audit(db, user, "Staff invited", invited.email)
    db.commit()
    response = user_json(invited)
    if settings.environment == "development":
        response["developmentInviteUrl"] = invite_url
    return response


@app.get("/api/admin/dashboard")
def admin_dashboard(_: User = Depends(require_super_admin), db: Session = Depends(get_db)):
    organizations = db.scalars(select(Organization).order_by(Organization.storage_used_bytes.desc())).all()
    jobs = (
        db.scalar(select(func.count(ProcessingJob.id)).where(ProcessingJob.status.in_(["queued", "processing"]))) or 0
    )
    failed_jobs = db.scalar(select(func.count(ProcessingJob.id)).where(ProcessingJob.status == "failed")) or 0
    email_total = db.scalar(select(func.count(EmailOutbox.id)).where(EmailOutbox.status == "sent")) or 0
    photo_total = db.scalar(select(func.count(Photo.id))) or 0
    services = health(db)["services"]
    return {
        "stats": {
            "organizations": len(organizations),
            "activeOrganizations": sum(item.status == "active" for item in organizations),
            "organizationUsers": db.scalar(
                select(func.count(User.id)).where(User.role.in_([UserRole.ORG_ADMIN, UserRole.STAFF]))
            )
            or 0,
            "events": db.scalar(select(func.count(Event.id))) or 0,
            "photos": photo_total,
            "storageUsedGB": round(sum(item.storage_used_bytes for item in organizations) / GB, 2),
            "storageLimitGB": round(sum(item.storage_limit_bytes for item in organizations) / GB, 2),
            "processingJobs": jobs,
            "failedJobs": failed_jobs,
            "emailsSent": email_total,
            "expiringData": db.scalar(
                select(func.count(Event.id)).where(
                    Event.expires_at <= date.today() + timedelta(days=30),
                    Event.status != "expired",
                )
            )
            or 0,
        },
        "organizations": [organization_json(db, item) for item in organizations],
        "services": services,
        "logs": log_items(db, None, 5),
    }


def log_items(db: Session, organization_id: str | None, limit: int = 200):
    statement = select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit)
    if organization_id:
        statement = statement.where(AuditLog.organization_id == organization_id)
    return [
        {
            "id": item.id,
            "timestamp": iso(item.created_at),
            "actor": item.actor,
            "action": item.action,
            "details": item.details,
            "level": item.level,
        }
        for item in db.scalars(statement).all()
    ]


@app.get("/api/admin/logs")
def admin_logs(_: User = Depends(require_super_admin), db: Session = Depends(get_db)):
    return {"items": log_items(db, None)}


@app.get("/api/admin/system")
def admin_system(_: User = Depends(require_super_admin), db: Session = Depends(get_db)):
    service_result = health(db)
    queue_counts = {
        status: count
        for status, count in db.execute(
            select(ProcessingJob.status, func.count(ProcessingJob.id)).group_by(ProcessingJob.status)
        ).all()
    }
    recent_emails = db.scalars(select(EmailOutbox).order_by(EmailOutbox.created_at.desc()).limit(25)).all()
    return {
        "status": service_result["status"],
        "services": service_result["services"],
        "queues": queue_counts,
        "emails": {
            status: count
            for status, count in db.execute(
                select(EmailOutbox.status, func.count(EmailOutbox.id)).group_by(EmailOutbox.status)
            ).all()
        },
        "recentEmails": [email_json(item) for item in recent_emails],
    }


def email_json(item: EmailOutbox) -> dict:
    return {
        "id": item.id,
        "deliveryId": item.delivery_id,
        "recipient": item.recipient,
        "subject": item.subject,
        "status": item.status,
        "provider": item.provider,
        "providerId": item.provider_id,
        "attempts": item.attempts,
        "error": item.error,
        "createdAt": iso(item.created_at),
        "sentAt": iso(item.sent_at),
        "nextAttemptAt": iso(item.next_attempt_at),
    }


def retry_email_item(db: Session, item: EmailOutbox, user: User) -> dict:
    item.status = "queued"
    item.attempts = 0
    item.next_attempt_at = None
    dispatch_email(db, item)
    audit(db, user, "Email retried", f"{item.subject} → {item.recipient}")
    db.commit()
    return email_json(item)


@app.post("/api/admin/emails/{email_id}/retry")
def admin_retry_email(
    email_id: str,
    user: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    item = db.get(EmailOutbox, email_id)
    if not item:
        raise HTTPException(status_code=404, detail="Email record not found")
    return retry_email_item(db, item, user)


@app.get("/api/organization/emails")
def organization_emails(user: User = Depends(require_org_admin), db: Session = Depends(get_db)):
    items = db.scalars(
        select(EmailOutbox)
        .where(EmailOutbox.organization_id == user.organization_id)
        .order_by(EmailOutbox.created_at.desc())
        .limit(100)
    ).all()
    return {"items": [email_json(item) for item in items]}


@app.post("/api/organization/emails/{email_id}/retry")
def organization_retry_email(
    email_id: str,
    user: User = Depends(require_org_admin),
    db: Session = Depends(get_db),
):
    item = db.scalar(
        select(EmailOutbox).where(
            EmailOutbox.id == email_id,
            EmailOutbox.organization_id == user.organization_id,
        )
    )
    if not item:
        raise HTTPException(status_code=404, detail="Email record not found")
    return retry_email_item(db, item, user)


def org_events(db: Session, organization_id: str) -> list[Event]:
    return db.scalars(
        select(Event).where(Event.organization_id == organization_id).order_by(Event.event_date.desc())
    ).all()


@app.get("/api/organization/events")
def list_events(user: User = Depends(require_org_member), db: Session = Depends(get_db)):
    return {"items": [event_json(db, item) for item in org_events(db, user.organization_id)]}


@app.get("/api/organization/events/{event_id}")
def event_detail(
    event_id: str,
    user: User = Depends(require_org_member),
    db: Session = Depends(get_db),
):
    event = db.scalar(select(Event).where(Event.id == event_id, Event.organization_id == user.organization_id))
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    result = event_json(db, event)
    result["participantsList"] = [
        participant_json(db, item)
        for item in db.scalars(
            select(Participant)
            .where(Participant.event_id == event.id)
            .order_by(Participant.created_at.desc())
            .limit(20)
        ).all()
    ]
    result["photosList"] = [
        {
            "id": item.id,
            "filename": item.filename,
            "status": item.processing_status,
            "thumbnailUrl": f"/api/media/{item.id}/thumbnail" if item.thumbnail_storage_key else None,
            "uploadedAt": iso(item.uploaded_at),
        }
        for item in db.scalars(
            select(Photo).where(Photo.event_id == event.id).order_by(Photo.uploaded_at.desc()).limit(20)
        ).all()
    ]
    result["matchCounts"] = {
        state: count
        for state, count in db.execute(
            select(FaceMatch.state, func.count(FaceMatch.id))
            .where(FaceMatch.event_id == event.id)
            .group_by(FaceMatch.state)
        ).all()
    }
    result["deliveryCounts"] = {
        status: count
        for status, count in db.execute(
            select(Delivery.status, func.count(Delivery.id))
            .where(Delivery.event_id == event.id)
            .group_by(Delivery.status)
        ).all()
    }
    return result


@app.post("/api/organization/events", status_code=201)
def create_event(
    payload: EventInput,
    user: User = Depends(require_org_admin),
    db: Session = Depends(get_db),
):
    retention = payload.retentionDays or user.organization.retention_days
    expires = payload.expiresAt or payload.date + timedelta(days=retention)
    if expires < payload.date:
        raise HTTPException(status_code=422, detail="Data expiry must be after the event date")
    event = Event(
        organization_id=user.organization_id,
        name=payload.name.strip(),
        description=payload.description.strip(),
        event_date=payload.date,
        location=payload.location.strip(),
        retention_days=retention,
        expires_at=expires,
        status="preparing",
    )
    db.add(event)
    audit(db, user, "Event created", event.name)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="This event already exists") from exc
    return event_json(db, event)


@app.delete("/api/organization/events/{event_id}", status_code=204)
def delete_event(
    event_id: str,
    user: User = Depends(require_org_admin),
    db: Session = Depends(get_db),
):
    event = db.scalar(select(Event).where(Event.id == event_id, Event.organization_id == user.organization_id))
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    photos = db.scalars(select(Photo).where(Photo.event_id == event.id)).all()
    enrollments = db.scalars(select(FaceEnrollment).join(Participant).where(Participant.event_id == event.id)).all()
    released = sum(photo.size_bytes + photo.thumbnail_size_bytes for photo in photos) + sum(
        enrollment.size_bytes for enrollment in enrollments
    )
    for photo in photos:
        storage.delete(photo.storage_key)
        if photo.thumbnail_storage_key:
            storage.delete(photo.thumbnail_storage_key)
    for enrollment in enrollments:
        storage.delete(enrollment.storage_key)
    event_name = event.name
    db.execute(delete(Event).where(Event.id == event.id))
    user.organization.storage_used_bytes = max(0, user.organization.storage_used_bytes - released)
    audit(
        db,
        user,
        "Event deleted",
        f"{event_name}: {len(photos)} photos and derived face data removed",
    )
    db.commit()
    return Response(status_code=204)


@app.get("/api/organization/participants")
def list_participants(
    eventId: str | None = None,
    user: User = Depends(require_org_member),
    db: Session = Depends(get_db),
):
    statement = (
        select(Participant)
        .where(Participant.organization_id == user.organization_id)
        .order_by(Participant.created_at.desc())
    )
    if eventId:
        statement = statement.where(Participant.event_id == eventId)
    return {"items": [participant_json(db, item) for item in db.scalars(statement).all()]}


def participant_rows(content: bytes, filename: str) -> tuple[list[dict], int]:
    if filename.lower().endswith(".csv"):
        try:
            text_content = content.decode("utf-8-sig")
        except UnicodeDecodeError as exc:
            raise HTTPException(status_code=422, detail="The CSV file must use UTF-8 encoding") from exc
        rows = list(csv.DictReader(io.StringIO(text_content)))
    elif filename.lower().endswith((".xlsx", ".xlsm")):
        try:
            sheet = load_workbook(io.BytesIO(content), read_only=True, data_only=True).active
        except (
            InvalidFileException,
            zipfile.BadZipFile,
            KeyError,
            OSError,
            ValueError,
        ) as exc:
            raise HTTPException(status_code=422, detail="The Excel workbook could not be read") from exc
        values = list(sheet.values)
        if not values:
            return [], 0
        headers = [str(value or "").strip() for value in values[0]]
        rows = [dict(zip(headers, values_row)) for values_row in values[1:]]
    elif filename.lower().endswith(".xls"):
        try:
            sheet = xlrd.open_workbook(file_contents=content).sheet_by_index(0)
        except xlrd.XLRDError as exc:
            raise HTTPException(status_code=422, detail="The legacy XLS workbook could not be read") from exc
        if sheet.nrows == 0:
            return [], 0
        headers = [str(sheet.cell_value(0, column)).strip() for column in range(sheet.ncols)]
        rows = [
            dict(
                zip(
                    headers,
                    [sheet.cell_value(row, column) for column in range(sheet.ncols)],
                )
            )
            for row in range(1, sheet.nrows)
        ]
    else:
        raise HTTPException(
            status_code=422,
            detail="Only CSV, XLS, XLSX and XLSM participant files are supported",
        )
    normalized = []
    for row in rows:
        lowered = {str(key).strip().lower().replace("-", "").replace("_", ""): value for key, value in row.items()}
        name = str(lowered.get("name") or "").strip()
        email = str(lowered.get("email") or lowered.get("emailid") or "").strip().lower()
        if name and "@" in email:
            normalized.append({"name": name, "email": email})
    return normalized, len(rows)


@app.post("/api/organization/participants/import")
def import_participants(
    event_id: str = Form(...),
    file: UploadFile = File(...),
    user: User = Depends(require_org_member),
    db: Session = Depends(get_db),
):
    event = db.scalar(select(Event).where(Event.id == event_id, Event.organization_id == user.organization_id))
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    rows, total_rows = participant_rows(file.file.read(), file.filename or "participants.csv")
    existing = set(db.scalars(select(Participant.email).where(Participant.event_id == event.id)).all())
    imported = 0
    duplicates = 0
    development_links = []
    for row in rows:
        if row["email"] in existing:
            duplicates += 1
            continue
        raw_token, token_hash = new_opaque_token()
        participant = Participant(
            organization_id=user.organization_id,
            event_id=event.id,
            name=row["name"],
            email=row["email"],
            enrollment_token_hash=token_hash,
            enrollment_expires_at=utcnow() + timedelta(days=14),
        )
        db.add(participant)
        db.flush()
        enrollment_url = f"{settings.frontend_url}/enroll/{raw_token}"
        email_item = queue_email(
            db,
            user.organization_id,
            participant.email,
            f"Find your photos from {event.name}",
            f"<p>Photos from {event.name} are being processed.</p><p>Verify your face securely to find photographs containing you.</p><p><a href='{enrollment_url}'>Find My Photos</a></p>",
        )
        dispatch_email(db, email_item)
        if settings.environment == "development":
            development_links.append(enrollment_url)
        existing.add(row["email"])
        imported += 1
    audit(
        db,
        user,
        "Participants imported",
        f"{event.name}: {imported} imported, {duplicates} duplicates",
    )
    db.commit()
    return {
        "imported": imported,
        "duplicates": duplicates,
        "invalid": max(0, total_rows - len(rows)),
        "developmentEnrollmentUrls": development_links,
    }


SUPPORTED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_ARCHIVE_FILES = 5_000
MAX_ARCHIVE_UNCOMPRESSED_BYTES = 2 * GB
MAX_IMAGE_BYTES = 100 * 1024 * 1024
Image.MAX_IMAGE_PIXELS = 100_000_000


def make_thumbnail(content: bytes) -> bytes:
    try:
        with Image.open(io.BytesIO(content)) as source:
            source.verify()
        with Image.open(io.BytesIO(content)) as source:
            image = ImageOps.exif_transpose(source).convert("RGB")
            image.thumbnail((640, 640), Image.Resampling.LANCZOS)
            output = io.BytesIO()
            image.save(output, format="JPEG", quality=82, optimize=True)
            return output.getvalue()
    except (OSError, SyntaxError, Image.DecompressionBombError) as exc:
        raise ValueError("image data is corrupt or unsafe") from exc


def upload_candidates(files: list[UploadFile]):
    """Yield image name, bytes and media type from image files or safe ZIP batches."""
    for item in files:
        filename = item.filename or "photo.jpg"
        if filename.lower().endswith(".zip"):
            try:
                with zipfile.ZipFile(item.file) as archive:
                    members = [entry for entry in archive.infolist() if not entry.is_dir()]
                    if len(members) > MAX_ARCHIVE_FILES:
                        raise HTTPException(
                            status_code=413,
                            detail=f"ZIP archives may contain at most {MAX_ARCHIVE_FILES} files",
                        )
                    if sum(entry.file_size for entry in members) > MAX_ARCHIVE_UNCOMPRESSED_BYTES:
                        raise HTTPException(
                            status_code=413,
                            detail="ZIP archive expands beyond the 2 GB safety limit",
                        )
                    for entry in members:
                        suffix = PurePosixPath(entry.filename).suffix.lower()
                        if suffix not in SUPPORTED_IMAGE_EXTENSIONS:
                            continue
                        if entry.flag_bits & 0x1:
                            raise HTTPException(
                                status_code=422,
                                detail="Encrypted ZIP archives are not supported",
                            )
                        if entry.file_size > MAX_IMAGE_BYTES:
                            yield PurePosixPath(entry.filename).name, b"", ""
                            continue
                        with archive.open(entry) as source:
                            content = source.read(MAX_IMAGE_BYTES + 1)
                        if len(content) > MAX_IMAGE_BYTES:
                            yield PurePosixPath(entry.filename).name, b"", ""
                            continue
                        yield (
                            PurePosixPath(entry.filename).name,
                            content,
                            mimetypes.guess_type(entry.filename)[0] or "application/octet-stream",
                        )
            except zipfile.BadZipFile as exc:
                raise HTTPException(status_code=422, detail=f"{filename} is not a valid ZIP archive") from exc
            continue
        content = item.file.read(MAX_IMAGE_BYTES + 1)
        suffix = Path(filename).suffix.lower()
        if (
            len(content) <= MAX_IMAGE_BYTES
            and (item.content_type or "").startswith("image/")
            and suffix in SUPPORTED_IMAGE_EXTENSIONS
        ):
            yield (
                filename,
                content,
                item.content_type or mimetypes.guess_type(filename)[0] or "application/octet-stream",
            )
        else:
            yield filename, b"", ""


@app.post("/api/organization/photos", status_code=201)
def upload_photos(
    event_id: str = Form(...),
    files: list[UploadFile] = File(...),
    user: User = Depends(require_org_member),
    db: Session = Depends(get_db),
):
    event = db.scalar(select(Event).where(Event.id == event_id, Event.organization_id == user.organization_id))
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    uploaded = []
    skipped = []
    total_added = 0
    jobs = []
    for filename, content, content_type in upload_candidates(files):
        if not content:
            skipped.append({"name": filename, "reason": "not a supported image"})
            continue
        try:
            thumbnail = make_thumbnail(content)
        except ValueError as exc:
            skipped.append({"name": filename, "reason": str(exc)})
            continue
        checksum = hashlib.sha256(content).hexdigest()
        if db.scalar(select(Photo).where(Photo.event_id == event.id, Photo.sha256 == checksum)):
            skipped.append({"name": filename, "reason": "duplicate"})
            continue
        object_bytes = len(content) + len(thumbnail)
        if user.organization.storage_used_bytes + total_added + object_bytes > user.organization.storage_limit_bytes:
            skipped.append({"name": filename, "reason": "storage quota would be exceeded"})
            continue
        photo_id = secrets.token_hex(16)
        safe_name = (
            "".join(character for character in filename if character.isalnum() or character in ".-_") or "photo.jpg"
        )
        key = f"organizations/{user.organization_id}/events/{event.id}/original/{photo_id}-{safe_name}"
        thumbnail_key = f"organizations/{user.organization_id}/events/{event.id}/thumbnails/{photo_id}.jpg"
        try:
            storage.put(key, content, content_type)
            storage.put(thumbnail_key, thumbnail, "image/jpeg")
        except Exception as exc:
            storage.delete(key)
            storage.delete(thumbnail_key)
            raise HTTPException(status_code=502, detail=f"Object storage failed for {safe_name}") from exc
        photo = Photo(
            id=photo_id,
            organization_id=user.organization_id,
            event_id=event.id,
            filename=safe_name,
            storage_key=key,
            thumbnail_storage_key=thumbnail_key,
            content_type=content_type,
            size_bytes=len(content),
            thumbnail_size_bytes=len(thumbnail),
            sha256=checksum,
            processing_status="queued",
        )
        job = ProcessingJob(
            organization_id=user.organization_id,
            event_id=event.id,
            photo_id=photo.id,
            job_type="face_pipeline",
            status="queued",
        )
        db.add_all([photo, job])
        db.flush()
        uploaded.append(
            {
                "id": photo.id,
                "filename": photo.filename,
                "sizeBytes": photo.size_bytes,
                "status": photo.processing_status,
            }
        )
        jobs.append(job.id)
        total_added += object_bytes
    user.organization.storage_used_bytes += total_added
    if uploaded:
        event.status = "processing"
    audit(
        db,
        user,
        "Photo batch uploaded",
        f"{event.name}: {len(uploaded)} accepted, {len(skipped)} skipped",
    )
    db.commit()
    published = sum(publish_job({"job_id": job_id}) for job_id in jobs)
    return {"uploaded": uploaded, "skipped": skipped, "jobsPublished": published}


@app.get("/api/organization/uploads")
def list_uploads(user: User = Depends(require_org_member), db: Session = Depends(get_db)):
    photos = db.scalars(
        select(Photo).where(Photo.organization_id == user.organization_id).order_by(Photo.uploaded_at.desc()).limit(200)
    ).all()
    return {
        "items": [
            {
                "id": item.id,
                "eventId": item.event_id,
                "event": item.event.name,
                "filename": item.filename,
                "sizeBytes": item.size_bytes,
                "thumbnailUrl": f"/api/media/{item.id}/thumbnail" if item.thumbnail_storage_key else None,
                "status": item.processing_status,
                "uploadedAt": iso(item.uploaded_at),
            }
            for item in photos
        ]
    }


@app.get("/api/organization/processing")
def processing(user: User = Depends(require_org_member), db: Session = Depends(get_db)):
    jobs = db.scalars(
        select(ProcessingJob)
        .where(ProcessingJob.organization_id == user.organization_id)
        .order_by(ProcessingJob.created_at.desc())
        .limit(200)
    ).all()
    counts = {
        status: count
        for status, count in db.execute(
            select(ProcessingJob.status, func.count(ProcessingJob.id))
            .where(ProcessingJob.organization_id == user.organization_id)
            .group_by(ProcessingJob.status)
        ).all()
    }
    faces = (
        db.scalar(select(func.count(FaceDetection.id)).where(FaceDetection.organization_id == user.organization_id))
        or 0
    )
    return {
        "stats": {
            "activeJobs": counts.get("queued", 0) + counts.get("processing", 0),
            "failedJobs": counts.get("failed", 0),
            "facesDetected": faces,
        },
        "items": [
            {
                "id": item.id,
                "eventId": item.event_id,
                "photoId": item.photo_id,
                "type": item.job_type,
                "status": item.status,
                "progress": item.progress,
                "worker": item.worker or "queued",
                "error": item.error,
                "createdAt": iso(item.created_at),
            }
            for item in jobs
        ],
    }


@app.get("/api/organization/matches")
def matches(
    state: str | None = None,
    user: User = Depends(require_org_member),
    db: Session = Depends(get_db),
):
    statement = (
        select(FaceMatch).where(FaceMatch.organization_id == user.organization_id).order_by(FaceMatch.created_at.desc())
    )
    if state and state != "all":
        statement = statement.where(FaceMatch.state == state)
    rows = db.scalars(statement.limit(500)).all()
    counts = {
        match_state: count
        for match_state, count in db.execute(
            select(FaceMatch.state, func.count(FaceMatch.id))
            .where(FaceMatch.organization_id == user.organization_id)
            .group_by(FaceMatch.state)
        ).all()
    }
    total_faces = (
        db.scalar(select(func.count(FaceDetection.id)).where(FaceDetection.organization_id == user.organization_id))
        or 0
    )
    return {
        "stats": {
            "facesDetected": total_faces,
            "high": counts.get("high", 0) + counts.get("approved", 0),
            "review": counts.get("review", 0),
            "low": counts.get("low", 0) + counts.get("rejected", 0),
        },
        "items": [
            {
                "id": row.id,
                "event": row.detection.photo.event.name,
                "participant": row.participant.name if row.participant else "Unknown",
                "participantId": row.participant_id,
                "confidence": row.confidence,
                "photo": row.detection.photo.filename,
                "photoId": row.detection.photo_id,
                "state": row.state,
                "matchedAt": iso(row.created_at),
            }
            for row in rows
        ],
    }


@app.patch("/api/organization/matches/{match_id}")
def review_match(
    match_id: str,
    payload: MatchReviewInput,
    user: User = Depends(require_org_admin),
    db: Session = Depends(get_db),
):
    row = db.scalar(
        select(FaceMatch).where(FaceMatch.id == match_id, FaceMatch.organization_id == user.organization_id)
    )
    if not row:
        raise HTTPException(status_code=404, detail="Match not found")
    if payload.decision not in {"approved", "rejected"}:
        raise HTTPException(status_code=422, detail="Decision must be approved or rejected")
    row.state = payload.decision
    row.reviewed_by = user.id
    row.reviewed_at = utcnow()
    audit(db, user, "Face match reviewed", f"{row.id}: {payload.decision}")
    db.commit()
    return {"id": row.id, "state": row.state}


def delivery_json(db: Session, row: Delivery) -> dict:
    photos = (
        db.scalar(
            select(func.count(FaceMatch.id)).where(
                FaceMatch.participant_id == row.participant_id,
                FaceMatch.event_id == row.event_id,
                FaceMatch.state.in_(["high", "approved"]),
            )
        )
        or 0
    )
    return {
        "id": row.id,
        "participant": row.participant.name,
        "participantId": row.participant_id,
        "event": row.event.name,
        "eventId": row.event_id,
        "photos": photos,
        "status": row.status,
        "expires": iso(row.expires_at),
        "sentAt": iso(row.sent_at),
    }


@app.get("/api/organization/deliveries")
def deliveries(user: User = Depends(require_org_member), db: Session = Depends(get_db)):
    rows = db.scalars(
        select(Delivery).where(Delivery.organization_id == user.organization_id).order_by(Delivery.created_at.desc())
    ).all()
    counts = {
        status: count
        for status, count in db.execute(
            select(Delivery.status, func.count(Delivery.id))
            .where(Delivery.organization_id == user.organization_id)
            .group_by(Delivery.status)
        ).all()
    }
    return {"stats": counts, "items": [delivery_json(db, item) for item in rows]}


@app.post("/api/organization/deliveries/{participant_id}/send")
def send_delivery(
    participant_id: str,
    user: User = Depends(require_org_admin),
    db: Session = Depends(get_db),
):
    participant = db.scalar(
        select(Participant).where(
            Participant.id == participant_id,
            Participant.organization_id == user.organization_id,
        )
    )
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")
    match_count = (
        db.scalar(
            select(func.count(FaceMatch.id)).where(
                FaceMatch.participant_id == participant.id,
                FaceMatch.state.in_(["high", "approved"]),
            )
        )
        or 0
    )
    if not match_count:
        raise HTTPException(status_code=409, detail="No approved photos are available")
    raw_token, token_hash = new_opaque_token()
    delivery = db.scalar(
        select(Delivery).where(
            Delivery.participant_id == participant.id,
            Delivery.event_id == participant.event_id,
        )
    )
    if not delivery:
        delivery = Delivery(
            organization_id=user.organization_id,
            event_id=participant.event_id,
            participant_id=participant.id,
            gallery_token_hash=token_hash,
            expires_at=datetime.combine(participant.event.expires_at, datetime.min.time(), timezone.utc),
        )
        db.add(delivery)
    else:
        delivery.gallery_token_hash = token_hash
    db.flush()
    gallery_url = f"{settings.frontend_url}/gallery/{raw_token}"
    email_item = queue_email(
        db,
        user.organization_id,
        participant.email,
        f"Your photos from {participant.event.name} are ready",
        f"<p>Hello {participant.name},</p><p>We found {match_count} photos containing you.</p><p><a href='{gallery_url}'>View My Photos</a></p><p>This private link expires {participant.event.expires_at.isoformat()}.</p>",
        delivery_id=delivery.id,
    )
    dispatch_email(db, email_item)
    audit(
        db,
        user,
        "Gallery delivered",
        f"{participant.event.name}: {participant.email} ({match_count} photos)",
    )
    db.commit()
    result = delivery_json(db, delivery)
    if settings.environment == "development":
        result["developmentGalleryUrl"] = gallery_url
    return result


@app.get("/api/organization/logs")
def organization_logs(user: User = Depends(require_org_member), db: Session = Depends(get_db)):
    return {"items": log_items(db, user.organization_id)}


@app.get("/api/organization/settings")
def organization_settings(user: User = Depends(require_org_member), db: Session = Depends(get_db)):
    return organization_json(db, user.organization)


@app.patch("/api/organization/settings")
def update_settings(
    payload: SettingsInput,
    user: User = Depends(require_org_admin),
    db: Session = Depends(get_db),
):
    values = payload.model_dump(exclude_unset=True)
    for key, value in values.items():
        setattr(
            user.organization,
            {"contactName": "contact_name", "contactEmail": "contact_email"}.get(key, key),
            value,
        )
    audit(db, user, "Organization profile updated", ", ".join(values))
    db.commit()
    return organization_json(db, user.organization)


@app.get("/api/organization/dashboard")
def organization_dashboard(user: User = Depends(require_org_member), db: Session = Depends(get_db)):
    events = org_events(db, user.organization_id)
    return {
        "organization": organization_json(db, user.organization),
        "events": [event_json(db, item) for item in events],
        "stats": {
            "events": len(events),
            "photos": db.scalar(select(func.count(Photo.id)).where(Photo.organization_id == user.organization_id)) or 0,
            "participants": db.scalar(
                select(func.count(Participant.id)).where(Participant.organization_id == user.organization_id)
            )
            or 0,
            "enrolled": db.scalar(
                select(func.count(Participant.id)).where(
                    Participant.organization_id == user.organization_id,
                    Participant.enrollment_status == "verified",
                )
            )
            or 0,
            "matched": db.scalar(
                select(func.count(func.distinct(FaceMatch.participant_id))).where(
                    FaceMatch.organization_id == user.organization_id,
                    FaceMatch.participant_id.is_not(None),
                    FaceMatch.state.in_(["high", "approved"]),
                )
            )
            or 0,
            "delivered": db.scalar(
                select(func.count(Delivery.id)).where(
                    Delivery.organization_id == user.organization_id,
                    Delivery.status == "delivered",
                )
            )
            or 0,
        },
    }


@app.get("/api/media/{photo_id}")
def media(
    photo_id: str,
    user: User = Depends(require_org_member),
    db: Session = Depends(get_db),
):
    photo = db.scalar(select(Photo).where(Photo.id == photo_id, Photo.organization_id == user.organization_id))
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    content, content_type = storage.read(photo.storage_key)
    return Response(
        content,
        media_type=content_type,
        headers={"Cache-Control": "private, max-age=300"},
    )


@app.get("/api/media/{photo_id}/thumbnail")
def media_thumbnail(
    photo_id: str,
    user: User = Depends(require_org_member),
    db: Session = Depends(get_db),
):
    photo = db.scalar(select(Photo).where(Photo.id == photo_id, Photo.organization_id == user.organization_id))
    if not photo or not photo.thumbnail_storage_key:
        raise HTTPException(status_code=404, detail="Thumbnail not found")
    content, _ = storage.read(photo.thumbnail_storage_key)
    return Response(
        content,
        media_type="image/jpeg",
        headers={"Cache-Control": "private, max-age=3600"},
    )


@app.get("/api/public/enroll/{token}")
def enrollment_info(token: str, db: Session = Depends(get_db)):
    participant = db.scalar(select(Participant).where(Participant.enrollment_token_hash == hash_token(token)))
    if not participant or participant.enrollment_expires_at < utcnow():
        raise HTTPException(status_code=404, detail="Enrollment link is invalid or expired")
    return {
        "participant": participant.name,
        "event": participant.event.name,
        "organization": participant.event.organization.name,
        "status": participant.enrollment_status,
        "expiresAt": iso(participant.enrollment_expires_at),
    }


@app.post("/api/public/enroll/{token}")
def enroll_face(
    token: str,
    request: Request,
    consent: bool = Form(...),
    selfie: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    participant = db.scalar(select(Participant).where(Participant.enrollment_token_hash == hash_token(token)))
    if not participant or participant.enrollment_expires_at < utcnow():
        raise HTTPException(status_code=404, detail="Enrollment link is invalid or expired")
    if not consent:
        raise HTTPException(status_code=422, detail="Consent is required")
    content = selfie.file.read()
    if not content or not (selfie.content_type or "").startswith("image/"):
        raise HTTPException(status_code=422, detail="A valid selfie image is required")
    try:
        result = ml_embedding(
            content,
            selfie.filename or "selfie.jpg",
            selfie.content_type or "image/jpeg",
        )
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"A clear face could not be enrolled: {exc}") from exc
    key = f"organizations/{participant.organization_id}/events/{participant.event_id}/enrollments/{participant.id}.jpg"
    previous_size = participant.enrollment.size_bytes if participant.enrollment else 0
    added_size = len(content) - previous_size
    if (
        participant.event.organization.storage_used_bytes + added_size
        > participant.event.organization.storage_limit_bytes
    ):
        raise HTTPException(status_code=413, detail="Organization storage quota would be exceeded")
    storage.put(key, content, selfie.content_type or "image/jpeg")
    enrollment = participant.enrollment or FaceEnrollment(
        participant_id=participant.id,
        organization_id=participant.organization_id,
        event_id=participant.event_id,
        storage_key=key,
        embedding=result["embedding"],
        detector_confidence=result["box"]["probability"],
        expires_at=datetime.combine(participant.event.expires_at, datetime.min.time(), timezone.utc),
    )
    enrollment.storage_key = key
    enrollment.size_bytes = len(content)
    enrollment.embedding = result["embedding"]
    enrollment.embedding_vector = result["embedding"]
    enrollment.detector_confidence = result["box"]["probability"]
    db.add(enrollment)
    participant.enrollment_status = "verified"
    participant.consented_at = utcnow()
    db.add(
        Consent(
            organization_id=participant.organization_id,
            event_id=participant.event_id,
            participant_id=participant.id,
            consent_type="face_enrollment",
            policy_version=settings.consent_policy_version,
            accepted=True,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )
    )
    participant.event.organization.storage_used_bytes += added_size
    audit(
        db,
        None,
        "Face enrollment completed",
        f"{participant.event.name}: {participant.email}",
        organization_id=participant.organization_id,
    )
    db.commit()
    return {
        "status": "verified",
        "message": "Your face was enrolled securely. We will email you when your private gallery is ready.",
    }


@app.get("/api/public/gallery/{token}")
def public_gallery(token: str, db: Session = Depends(get_db)):
    delivery = db.scalar(select(Delivery).where(Delivery.gallery_token_hash == hash_token(token)))
    if not delivery or delivery.expires_at < utcnow():
        raise HTTPException(status_code=404, detail="Gallery link is invalid or expired")
    matches = db.scalars(
        select(FaceMatch).where(
            FaceMatch.participant_id == delivery.participant_id,
            FaceMatch.event_id == delivery.event_id,
            FaceMatch.state.in_(["high", "approved"]),
        )
    ).all()
    photos = {row.detection.photo.id: row.detection.photo for row in matches}
    return {
        "participant": delivery.participant.name,
        "event": delivery.event.name,
        "organization": delivery.event.organization.name,
        "expiresAt": iso(delivery.expires_at),
        "photos": [
            {
                "id": photo.id,
                "filename": photo.filename,
                "url": f"/api/public/gallery/{token}/photos/{photo.id}",
                "thumbnailUrl": f"/api/public/gallery/{token}/photos/{photo.id}/thumbnail"
                if photo.thumbnail_storage_key
                else f"/api/public/gallery/{token}/photos/{photo.id}",
            }
            for photo in photos.values()
        ],
    }


@app.get("/api/public/gallery/{token}/photos/{photo_id}")
def public_gallery_photo(token: str, photo_id: str, db: Session = Depends(get_db)):
    delivery = db.scalar(select(Delivery).where(Delivery.gallery_token_hash == hash_token(token)))
    if not delivery or delivery.expires_at < utcnow():
        raise HTTPException(status_code=404, detail="Gallery link is invalid or expired")
    permitted = db.scalar(
        select(FaceMatch)
        .join(FaceDetection)
        .where(
            FaceMatch.participant_id == delivery.participant_id,
            FaceMatch.event_id == delivery.event_id,
            FaceDetection.photo_id == photo_id,
            FaceMatch.state.in_(["high", "approved"]),
        )
    )
    if not permitted:
        raise HTTPException(status_code=404, detail="Photo not found")
    content, content_type = storage.read(permitted.detection.photo.storage_key)
    return Response(
        content,
        media_type=content_type,
        headers={
            "Cache-Control": "private, max-age=300",
            "Content-Disposition": f'inline; filename="{permitted.detection.photo.filename}"',
        },
    )


@app.get("/api/public/gallery/{token}/photos/{photo_id}/thumbnail")
def public_gallery_thumbnail(token: str, photo_id: str, db: Session = Depends(get_db)):
    delivery = db.scalar(select(Delivery).where(Delivery.gallery_token_hash == hash_token(token)))
    if not delivery or delivery.expires_at < utcnow():
        raise HTTPException(status_code=404, detail="Gallery link is invalid or expired")
    permitted = db.scalar(
        select(FaceMatch)
        .join(FaceDetection)
        .where(
            FaceMatch.participant_id == delivery.participant_id,
            FaceMatch.event_id == delivery.event_id,
            FaceDetection.photo_id == photo_id,
            FaceMatch.state.in_(["high", "approved"]),
        )
    )
    if not permitted or not permitted.detection.photo.thumbnail_storage_key:
        raise HTTPException(status_code=404, detail="Thumbnail not found")
    content, _ = storage.read(permitted.detection.photo.thumbnail_storage_key)
    return Response(
        content,
        media_type="image/jpeg",
        headers={"Cache-Control": "private, max-age=3600"},
    )


@app.get("/api/public/gallery/{token}/download")
def public_gallery_download(token: str, photoIds: str | None = None, db: Session = Depends(get_db)):
    delivery = db.scalar(select(Delivery).where(Delivery.gallery_token_hash == hash_token(token)))
    if not delivery or delivery.expires_at < utcnow():
        raise HTTPException(status_code=404, detail="Gallery link is invalid or expired")
    matches = db.scalars(
        select(FaceMatch).where(
            FaceMatch.participant_id == delivery.participant_id,
            FaceMatch.event_id == delivery.event_id,
            FaceMatch.state.in_(["high", "approved"]),
        )
    ).all()
    permitted = {row.detection.photo.id: row.detection.photo for row in matches}
    requested = {value for value in (photoIds or "").split(",") if value}
    photos = [photo for photo_id, photo in permitted.items() if not requested or photo_id in requested]
    if not photos:
        raise HTTPException(status_code=404, detail="No selected photos are available")
    archive_buffer = tempfile.SpooledTemporaryFile(max_size=32 * 1024 * 1024)
    with zipfile.ZipFile(archive_buffer, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for photo in photos:
            content, _ = storage.read(photo.storage_key)
            archive.writestr(f"{photo.id[:8]}-{photo.filename}", content)
    archive_buffer.seek(0)
    base_name = (
        "".join(
            character
            for character in delivery.event.name.lower().replace(" ", "-")
            if character.isalnum() or character in "-_"
        )
        or "event"
    )

    def chunks():
        while content := archive_buffer.read(1024 * 1024):
            yield content

    return StreamingResponse(
        chunks(),
        media_type="application/zip",
        headers={
            "Cache-Control": "no-store",
            "Content-Disposition": f'attachment; filename="{base_name}-photos.zip"',
        },
        background=BackgroundTask(archive_buffer.close),
    )


from .v2 import router as v2_router  # noqa: E402

app.include_router(v2_router)
