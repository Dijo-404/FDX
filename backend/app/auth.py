from __future__ import annotations

import base64
import hashlib
import hmac
import os
import secrets
from datetime import date, datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from redis import Redis
from redis.exceptions import RedisError
from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import settings
from .database import get_db
from .models import User, UserRole


bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    if len(password) < 10:
        raise ValueError("Password must contain at least 10 characters")
    salt = os.urandom(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1, dklen=64)
    return f"scrypt$16384$8$1${base64.b64encode(salt).decode()}${base64.b64encode(digest).decode()}"


def verify_password(password: str, encoded: str | None) -> bool:
    if not encoded:
        return False
    try:
        _, n, r, p, salt, digest = encoded.split("$", 5)
        candidate = hashlib.scrypt(
            password.encode(), salt=base64.b64decode(salt), n=int(n), r=int(r), p=int(p), dklen=64
        )
        return hmac.compare_digest(candidate, base64.b64decode(digest))
    except (ValueError, TypeError):
        return False


def token_pair(user: User) -> dict:
    now = datetime.now(timezone.utc)
    expires = now + timedelta(minutes=settings.access_token_minutes)
    token = jwt.encode(
        {
            "sub": user.id,
            "role": user.role.value,
            "organization_id": user.organization_id,
            "iat": now,
            "exp": expires,
            "iss": settings.jwt_issuer,
            "jti": secrets.token_hex(12),
        },
        settings.jwt_secret,
        algorithm="HS256",
    )
    return {"token": token, "expiresAt": expires.isoformat()}


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
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired session") from exc
    user = db.get(User, payload.get("sub"))
    if not user or user.status != "active":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Account is not active")
    return user


def require_super_admin(user: User = Depends(current_user)) -> User:
    if user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Super Admin permission required")
    return user


def require_org_admin(user: User = Depends(current_user)) -> User:
    if user.role != UserRole.ORG_ADMIN or not user.organization_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Organization Admin permission required")
    if not user.organization or user.organization.status != "active" or (user.organization.expires_at and user.organization.expires_at < date.today()):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Organization is suspended or expired")
    return user


def require_org_member(user: User = Depends(current_user)) -> User:
    if user.role not in {UserRole.ORG_ADMIN, UserRole.STAFF} or not user.organization_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Organization membership required")
    if not user.organization or user.organization.status != "active" or (user.organization.expires_at and user.organization.expires_at < date.today()):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Organization is suspended or expired")
    return user


def check_login_rate_limit(request: Request, email: str) -> None:
    key = f"fdx:login:{request.client.host if request.client else 'unknown'}:{email.lower()}"
    try:
        redis = Redis.from_url(settings.redis_url, decode_responses=True, socket_connect_timeout=1)
        attempts = redis.incr(key)
        if attempts == 1:
            redis.expire(key, 60)
        if attempts > 10:
            raise HTTPException(status_code=429, detail="Too many login attempts. Try again in one minute.")
    except RedisError:
        # Database auth remains available during a cache outage; health exposes the failure.
        return


def find_user_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == email.strip().lower()))
