from __future__ import annotations

import hashlib
import hmac
import secrets
from datetime import date, datetime, timedelta, timezone

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from redis import Redis
from redis.exceptions import RedisError
from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import settings
from .database import get_db
from .models import RefreshSession, User, UserRole, utcnow

bearer = HTTPBearer(auto_error=False)
password_hasher = PasswordHasher(time_cost=3, memory_cost=65536, parallelism=4)


def hash_password(password: str) -> str:
    if len(password) < 10:
        raise ValueError("Password must contain at least 10 characters")
    return password_hasher.hash(password)


def verify_password(password: str, encoded: str | None) -> bool:
    if not encoded:
        return False
    if encoded.startswith("$argon2id$"):
        try:
            return password_hasher.verify(encoded, password)
        except (VerificationError, InvalidHashError):
            return False
    # Existing scrypt hashes remain valid and are upgraded after a successful login.
    try:
        import base64

        _, n, r, p, salt, digest = encoded.split("$", 5)
        candidate = hashlib.scrypt(
            password.encode(),
            salt=base64.b64decode(salt),
            n=int(n),
            r=int(r),
            p=int(p),
            dklen=64,
        )
        return hmac.compare_digest(candidate, base64.b64decode(digest))
    except (ValueError, TypeError):
        return False


def access_token(user: User, session_id: str | None = None) -> dict:
    now = datetime.now(timezone.utc)
    expires = now + timedelta(minutes=settings.access_token_minutes)
    token = jwt.encode(
        {
            "sub": user.id,
            "role": user.role.value,
            "organization_id": user.organization_id,
            "session_id": session_id,
            "iat": now,
            "exp": expires,
            "iss": settings.jwt_issuer,
            "aud": settings.jwt_audience,
            "jti": secrets.token_hex(12),
        },
        settings.jwt_secret,
        algorithm="HS256",
    )
    return {
        "token": token,
        "access_token": token,
        "expiresAt": expires.isoformat(),
        "expires_in": settings.access_token_minutes * 60,
    }


def create_refresh_session(db: Session, user: User, request: Request) -> tuple[str, RefreshSession]:
    raw_token, token_hash = new_opaque_token()
    session = RefreshSession(
        user_id=user.id,
        refresh_token_hash=token_hash,
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
        expires_at=utcnow() + timedelta(days=settings.refresh_token_days),
    )
    db.add(session)
    db.flush()
    return raw_token, session


def rotate_refresh_session(db: Session, raw_token: str, request: Request) -> tuple[User, str, RefreshSession]:
    session = db.scalar(
        select(RefreshSession).where(RefreshSession.refresh_token_hash == hash_token(raw_token)).with_for_update()
    )
    now = utcnow()
    if not session or session.revoked_at or session.expires_at <= now:
        raise HTTPException(status_code=401, detail="Refresh session is invalid or expired")
    user = db.get(User, session.user_id)
    if not user or user.status != "active":
        raise HTTPException(status_code=401, detail="Account is not active")
    session.revoked_at = now
    session.last_used_at = now
    next_token, next_session = create_refresh_session(db, user, request)
    return user, next_token, next_session


def token_pair(user: User, session_id: str | None = None) -> dict:
    """Compatibility alias used by the original API."""
    return access_token(user, session_id)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def new_opaque_token() -> tuple[str, str]:
    token = secrets.token_urlsafe(32)
    return token, hash_token(token)


def current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.jwt_secret,
            algorithms=["HS256"],
            issuer=settings.jwt_issuer,
            audience=settings.jwt_audience,
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session",
        ) from exc
    user = db.get(User, payload.get("sub"))
    if not user or user.status != "active":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Account is not active")
    session_id = payload.get("session_id")
    if session_id:
        session = db.get(RefreshSession, session_id)
        if not session or session.revoked_at or session.expires_at <= utcnow():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session has been revoked",
            )
    return user


def require_super_admin(user: User = Depends(current_user)) -> User:
    if user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super Admin permission required",
        )
    return user


def require_collaborator(user: User = Depends(current_user)) -> User:
    if user.role != UserRole.COLLABORATOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Collaborator permission required",
        )
    return user


def require_org_admin(user: User = Depends(current_user)) -> User:
    if user.role != UserRole.ORG_ADMIN or not user.organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Organization Admin permission required",
        )
    if (
        not user.organization
        or user.organization.status != "active"
        or (user.organization.expires_at and user.organization.expires_at < date.today())
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Organization is suspended or expired",
        )
    return user


def require_org_member(user: User = Depends(current_user)) -> User:
    if user.role not in {UserRole.ORG_ADMIN, UserRole.STAFF} or not user.organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Organization membership required",
        )
    if (
        not user.organization
        or user.organization.status != "active"
        or (user.organization.expires_at and user.organization.expires_at < date.today())
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Organization is suspended or expired",
        )
    return user


def check_login_rate_limit(request: Request, email: str) -> None:
    key = f"fdx:login:{request.client.host if request.client else 'unknown'}:{email.lower()}"
    try:
        redis = Redis.from_url(settings.redis_url, decode_responses=True, socket_connect_timeout=1)
        attempts = redis.incr(key)
        if attempts == 1:
            redis.expire(key, 60)
        if attempts > 10:
            raise HTTPException(
                status_code=429,
                detail="Too many login attempts. Try again in one minute.",
            )
    except RedisError:
        # Database auth remains available during a cache outage; health exposes the failure.
        return


def check_public_rate_limit(request: Request, scope: str, identity: str, limit: int, window_seconds: int = 60) -> None:
    """Bound anonymous token workflows without putting their durable state in Redis."""
    client = request.client.host if request.client else "unknown"
    identity_hash = hashlib.sha256(identity.encode()).hexdigest()[:20]
    key = f"fdx:rate:{scope}:{client}:{identity_hash}"
    try:
        redis = Redis.from_url(settings.redis_url, decode_responses=True, socket_connect_timeout=1)
        attempts = redis.incr(key)
        if attempts == 1:
            redis.expire(key, window_seconds)
        if attempts > limit:
            raise HTTPException(
                status_code=429,
                detail="Too many requests. Try again later.",
                headers={"Retry-After": str(window_seconds)},
            )
    except RedisError:
        # Public links remain backed by high-entropy, expiring, hashed tokens. NGINX
        # provides the coarse fallback when Redis is temporarily unavailable.
        return


def find_user_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == email.strip().lower()))
