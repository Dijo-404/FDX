from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


@dataclass(frozen=True)
class Settings:
    database_url: str = os.getenv(
        "DATABASE_URL", "postgresql+psycopg://fdx:fdx@127.0.0.1:5432/fdx"
    )
    redis_url: str = os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0")
    kafka_bootstrap_servers: str = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "127.0.0.1:9092")
    kafka_topic: str = os.getenv("KAFKA_TOPIC", "fdx.photo.processing")
    jwt_secret: str = os.getenv("JWT_SECRET", "change-this-development-secret")
    jwt_issuer: str = os.getenv("JWT_ISSUER", "fdx-api")
    access_token_minutes: int = int(os.getenv("ACCESS_TOKEN_MINUTES", "480"))
    frontend_url: str = os.getenv("FRONTEND_URL", "http://127.0.0.1:8080")
    ml_service_url: str = os.getenv("ML_SERVICE_URL", "http://127.0.0.1:3000")
    storage_backend: str = os.getenv("STORAGE_BACKEND", "local")
    storage_root: Path = Path(os.getenv("STORAGE_ROOT", str(ROOT / "data" / "storage")))
    s3_bucket: str = os.getenv("S3_BUCKET", "")
    s3_region: str = os.getenv("AWS_REGION", "ap-south-1")
    email_provider: str = os.getenv("EMAIL_PROVIDER", "outbox")
    email_from: str = os.getenv("EMAIL_FROM", "FDX <noreply@fdx.local>")
    resend_api_key: str = os.getenv("RESEND_API_KEY", "")
    super_admin_email: str = os.getenv("FDX_SUPER_ADMIN_EMAIL", "superadmin@fdx.io")
    super_admin_password: str = os.getenv("FDX_SUPER_ADMIN_PASSWORD", "SuperAdmin@123")
    environment: str = os.getenv("FDX_ENVIRONMENT", "development")


settings = Settings()
