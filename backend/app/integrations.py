from __future__ import annotations

import json
import logging
import mimetypes
from datetime import timedelta

import boto3
import httpx
from kafka import KafkaAdminClient, KafkaProducer
from kafka.errors import KafkaError
from redis import Redis
from redis.exceptions import RedisError
from sqlalchemy.orm import Session

from .config import settings
from .models import Delivery, EmailOutbox, utcnow

logger = logging.getLogger("fdx.integrations")


class Storage:
    def __init__(self):
        self.backend = settings.storage_backend
        self.root = settings.storage_root.resolve()
        self.root.mkdir(parents=True, exist_ok=True)
        self.s3 = boto3.client("s3", region_name=settings.s3_region) if self.backend == "s3" else None

    def put(self, key: str, content: bytes, content_type: str) -> None:
        if self.s3:
            self.s3.put_object(Bucket=settings.s3_bucket, Key=key, Body=content, ContentType=content_type)
            return
        target = (self.root / key).resolve()
        if self.root not in target.parents:
            raise ValueError("Invalid storage key")
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(content)

    def read(self, key: str) -> tuple[bytes, str]:
        if self.s3:
            response = self.s3.get_object(Bucket=settings.s3_bucket, Key=key)
            return response["Body"].read(), response.get("ContentType") or "application/octet-stream"
        target = (self.root / key).resolve()
        if self.root not in target.parents or not target.is_file():
            raise FileNotFoundError(key)
        return target.read_bytes(), mimetypes.guess_type(target.name)[0] or "application/octet-stream"

    def delete(self, key: str) -> None:
        if self.s3:
            self.s3.delete_object(Bucket=settings.s3_bucket, Key=key)
            return
        target = (self.root / key).resolve()
        if self.root in target.parents:
            target.unlink(missing_ok=True)


storage = Storage()


def publish_job(payload: dict) -> bool:
    try:
        producer = KafkaProducer(
            bootstrap_servers=settings.kafka_bootstrap_servers.split(","),
            security_protocol=settings.kafka_security_protocol,
            value_serializer=lambda value: json.dumps(value).encode(),
            request_timeout_ms=2500,
            api_version_auto_timeout_ms=2500,
        )
        producer.send(settings.kafka_topic, payload).get(timeout=5)
        producer.close()
        return True
    except KafkaError as exc:
        logger.error("Kafka publish failed: %s", exc)
        return False


def cache_delete(*keys: str) -> None:
    try:
        Redis.from_url(settings.redis_url, socket_connect_timeout=1).delete(*keys)
    except RedisError:
        pass


def queue_email(db: Session, organization_id: str | None, recipient: str, subject: str, html: str, delivery_id: str | None = None) -> EmailOutbox:
    item = EmailOutbox(
        organization_id=organization_id,
        delivery_id=delivery_id,
        recipient=recipient,
        subject=subject,
        html=html,
        provider=settings.email_provider,
    )
    db.add(item)
    db.flush()
    return item


def dispatch_email(db: Session, item: EmailOutbox) -> None:
    item.attempts += 1
    item.last_attempt_at = utcnow()
    try:
        if settings.email_provider == "resend":
            if not settings.resend_api_key:
                raise RuntimeError("RESEND_API_KEY is not configured")
            response = httpx.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {settings.resend_api_key}"},
                json={"from": settings.email_from, "to": [item.recipient], "subject": item.subject, "html": item.html},
                timeout=20,
            )
            response.raise_for_status()
            item.provider_id = response.json().get("id")
        elif settings.email_provider == "ses":
            response = boto3.client("sesv2", region_name=settings.s3_region).send_email(
                FromEmailAddress=settings.email_from,
                Destination={"ToAddresses": [item.recipient]},
                Content={"Simple": {"Subject": {"Data": item.subject}, "Body": {"Html": {"Data": item.html}}}},
            )
            item.provider_id = response.get("MessageId")
        else:
            # A persistent local outbox is the delivery adapter for development.
            item.provider_id = f"outbox:{item.id}"
        item.status = "sent"
        item.sent_at = utcnow()
        item.next_attempt_at = None
        item.error = None
        if item.delivery_id:
            delivery = db.get(Delivery, item.delivery_id)
            if delivery:
                delivery.status = "delivered"
                delivery.sent_at = item.sent_at
                delivery.participant.delivery_status = "delivered"
    except Exception as exc:  # provider failures remain visible and retryable
        item.status = "failed"
        item.error = str(exc)
        if item.delivery_id:
            delivery = db.get(Delivery, item.delivery_id)
            if delivery:
                delivery.status = "failed"
                delivery.sent_at = None
                delivery.participant.delivery_status = "failed"
        if item.attempts < settings.email_max_attempts:
            delay_minutes = min(60, 2 ** max(0, item.attempts - 1))
            item.next_attempt_at = utcnow() + timedelta(minutes=delay_minutes)
    db.flush()


def ml_embedding(content: bytes, filename: str, content_type: str) -> dict:
    response = httpx.post(
        f"{settings.ml_service_url}/find_faces",
        params={"face_plugins": "calculator", "det_prob_threshold": 0.8, "limit": 1, "input_mode": "cropped"},
        files={"file": (filename, content, content_type)},
        timeout=300,
    )
    response.raise_for_status()
    return response.json()["result"][0]


def ml_faces(content: bytes, filename: str, content_type: str) -> list[dict]:
    response = httpx.post(
        f"{settings.ml_service_url}/find_faces",
        params={"face_plugins": "calculator", "det_prob_threshold": 0.6},
        files={"file": (filename, content, content_type)},
        timeout=300,
    )
    if response.status_code == 400:
        return []
    response.raise_for_status()
    return response.json().get("result", [])


def dependency_health() -> list[dict]:
    services = []
    if settings.email_provider == "resend":
        configured = bool(settings.resend_api_key and "@" in settings.email_from)
        email_detail = "Resend API credentials configured" if configured else "Resend credentials are incomplete"
    elif settings.email_provider == "ses":
        configured = bool(settings.email_from and "@" in settings.email_from)
        email_detail = f"AWS SES configured in {settings.s3_region}" if configured else "AWS SES sender is incomplete"
    else:
        configured = settings.environment != "production"
        email_detail = "Persistent development outbox" if configured else "Production cannot use the local outbox provider"
    services.append({"name": "Email", "detail": email_detail, "status": "healthy" if configured else "degraded"})
    redis = None
    try:
        redis = Redis.from_url(settings.redis_url, socket_connect_timeout=1, decode_responses=True)
        redis.ping()
        services.append({"name": "Redis", "detail": "Cache and rate limiting available", "status": "healthy"})
    except RedisError as exc:
        services.append({"name": "Redis", "detail": str(exc), "status": "degraded"})
    if redis:
        try:
            cached = redis.get("fdx:health:dependencies")
            if cached:
                return [*services, *json.loads(cached)]
        except (RedisError, json.JSONDecodeError):
            pass
    dependencies = []
    try:
        response = httpx.get(f"{settings.ml_service_url}/healthcheck", timeout=2)
        response.raise_for_status()
        provider = response.json().get("execution_provider", "available")
        dependencies.append({"name": "ML Workers", "detail": provider, "status": "healthy"})
    except Exception as exc:
        dependencies.append({"name": "ML Workers", "detail": str(exc), "status": "degraded"})
    try:
        admin = KafkaAdminClient(bootstrap_servers=settings.kafka_bootstrap_servers.split(","), security_protocol=settings.kafka_security_protocol, request_timeout_ms=2000, api_version_auto_timeout_ms=2000)
        topics = admin.list_topics()
        admin.close()
        dependencies.append({"name": "Kafka", "detail": f"{len(topics)} topics available", "status": "healthy"})
    except Exception as exc:
        dependencies.append({"name": "Kafka", "detail": str(exc), "status": "degraded"})
    if redis:
        try:
            redis.setex("fdx:health:dependencies", 10, json.dumps(dependencies))
        except RedisError:
            pass
    return [*services, *dependencies]
