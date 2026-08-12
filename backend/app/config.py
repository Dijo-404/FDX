from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


@dataclass(frozen=True)
class Settings:
    database_url: str = os.getenv("DATABASE_URL", "postgresql+psycopg://fdx:fdx@127.0.0.1:5432/fdx")
    redis_url: str = os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0")
    kafka_bootstrap_servers: str = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "127.0.0.1:9092")
    kafka_topic: str = os.getenv("KAFKA_TOPIC", "fdx.photo.processing")
    kafka_security_protocol: str = os.getenv("KAFKA_SECURITY_PROTOCOL", "PLAINTEXT")
    jwt_secret: str = os.getenv("JWT_SECRET", "change-this-development-secret")
    jwt_issuer: str = os.getenv("JWT_ISSUER", "fdx-api")
    jwt_audience: str = os.getenv("JWT_AUDIENCE", "fdx-web")
    access_token_minutes: int = int(os.getenv("ACCESS_TOKEN_MINUTES", "15"))
    refresh_token_days: int = int(os.getenv("REFRESH_TOKEN_DAYS", "7"))
    invitation_token_hours: int = int(os.getenv("INVITATION_TOKEN_HOURS", "72"))
    password_reset_minutes: int = int(os.getenv("PASSWORD_RESET_MINUTES", "30"))
    enrollment_token_days: int = int(os.getenv("ENROLLMENT_TOKEN_DAYS", "7"))
    gallery_token_days: int = int(os.getenv("GALLERY_TOKEN_DAYS", "7"))
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
    retention_scheduler_enabled: bool = os.getenv("RETENTION_SCHEDULER_ENABLED", "true").lower() in {"1", "true", "yes"}
    retention_poll_seconds: int = int(os.getenv("RETENTION_POLL_SECONDS", "60"))
    email_poll_seconds: int = int(os.getenv("EMAIL_POLL_SECONDS", "5"))
    email_max_attempts: int = int(os.getenv("EMAIL_MAX_ATTEMPTS", "5"))
    consent_policy_version: str = os.getenv("CONSENT_POLICY_VERSION", "2026-08-13")
    upload_reservation_minutes: int = int(os.getenv("UPLOAD_RESERVATION_MINUTES", "60"))
    max_upload_bytes: int = int(os.getenv("MAX_UPLOAD_BYTES", str(100 * 1024**3)))
    max_media_file_bytes: int = int(os.getenv("MAX_MEDIA_FILE_BYTES", str(100 * 1024**2)))
    max_enrollment_bytes: int = int(os.getenv("MAX_ENROLLMENT_BYTES", str(15 * 1024**2)))
    max_image_pixels: int = int(os.getenv("MAX_IMAGE_PIXELS", "100000000"))
    multipart_threshold_bytes: int = int(os.getenv("MULTIPART_THRESHOLD_BYTES", str(20 * 1024**2)))
    multipart_part_bytes: int = int(os.getenv("MULTIPART_PART_BYTES", str(8 * 1024**2)))
    match_auto_threshold: float = float(os.getenv("MATCH_AUTO_THRESHOLD", "0.85"))
    match_review_threshold: float = float(os.getenv("MATCH_REVIEW_THRESHOLD", "0.65"))
    match_runner_up_margin: float = float(os.getenv("MATCH_RUNNER_UP_MARGIN", "0.08"))
    minimum_face_size: int = int(os.getenv("MINIMUM_FACE_SIZE", "40"))
    low_resolution_face_size: int = int(os.getenv("LOW_RESOLUTION_FACE_SIZE", "80"))
    minimum_detector_confidence: float = float(os.getenv("MINIMUM_DETECTOR_CONFIDENCE", "0.60"))
    low_resolution_threshold_boost: float = float(os.getenv("LOW_RESOLUTION_THRESHOLD_BOOST", "0.05"))
    threshold_profile_version: str = os.getenv("THRESHOLD_PROFILE_VERSION", "default-v1")
    detector_model_version: str = os.getenv("FDX_DETECTOR_MODEL_VERSION", "retinaface-r50-v1")
    embedder_model_version: str = os.getenv("FDX_EMBEDDER_MODEL_VERSION", "adaface-ir101-ms1mv2-v1")
    detector_model_sha256: str = os.getenv(
        "FDX_DETECTOR_MODEL_SHA256",
        "a607583ad9913b3a54f1b750752ae3f451fe324777df5542921e4b0b8e596a87",
    )
    embedder_model_sha256: str = os.getenv(
        "FDX_EMBEDDER_MODEL_SHA256",
        "c594643ebe011c2534dd870d4abb0635ec27ce58e50b53f40b8d888a395e575e",
    )
    resend_webhook_secret: str = os.getenv("RESEND_WEBHOOK_SECRET", "")
    email_webhook_secret: str = os.getenv("EMAIL_WEBHOOK_SECRET", "")


settings = Settings()
