# FDX V2 Specification Implementation Map

This document maps the authoritative requirements in [`specs.md`](specs.md) to executable FDX components. It separates implemented application behavior from release activities that require production accounts, real infrastructure, or approved data.

## Implemented application contract

| Specification area | Implementation |
| --- | --- |
| Single login, JWT, RBAC | `/api/v2/auth/*`, Argon2id passwords, 15-minute audience-bound access JWTs, hashed rotating refresh sessions in an HttpOnly `SameSite=Strict` cookie, logout/session revocation, invitation and password-reset flows. |
| Tenant isolation | Organization identity is taken only from the authenticated user. Tenant-owned event, participant, media, job, match, gallery, delivery, usage, and log queries include that tenant. The mandatory cross-tenant GET/PATCH/presign test is automated. |
| Organizations and users | Super Admin dashboard, organization lifecycle, storage/retention/account-expiry policy, administrator invitation, activation/suspension, job visibility, and audit views. |
| Events and participants | Backend event state machine; event lifecycle endpoints; CSV/XLS/XLSX/XLSM validation; invalid/duplicate preview; explicit idempotent confirmation; participant CRUD and invitation delivery. |
| Public enrollment | High-entropy hashed 24-hour reusable tokens, revocation, Redis/NGINX rate limits, explicit versioned consent record, browser-to-S3 presigned upload with a private local fallback, size/pixel/magic-byte/face-quality validation, RetinaFace/AdaFace enrollment, 512-value pgvector-compatible embedding, quota accounting, replacement cleanup, and an inline participant-scoped matched-photo gallery. |
| Uploads and private media | Storage reservation, quota lock, chunked manifests, checksum and type validation, bounded browser concurrency, single-part and multipart presigned S3 uploads (local authenticated fallback), completion verification, duplicate hash suppression, private object keys, asynchronous WebP thumbnails, signed reads, and usage ledger. |
| Kafka/outbox/jobs | Transactional outbox, versioned correlation envelope, idempotent locked consumers, PostgreSQL fallback queue, bounded exponential retry, heartbeat/progress, stuck-job recovery, cooperative event cancellation, dead-letter state, manual retry, and tenant/global job visibility. |
| ML and matching | RetinaFace R50 + AdaFace IR101, checksum/model registry, normalized 512-dimensional embeddings, cosine score, 86% automatic threshold, 10% runner-up margin, 91% low-resolution threshold, rejected-face policy, model/threshold reproducibility fields, and automatic-only gallery admission. |
| Galleries and delivery | Tenant-scoped gallery construction, expiring hashed gallery token, authorized per-photo signed download, provider-backed result email, delivery/webhook status, and worker-generated expiring private ZIP export. |
| Email | Provider adapter for Resend, SES, or persistent development outbox; invitation, enrollment, reminder, result, password reset, account/event-expiry warning, bounded retry, delivery-failure alert, and signed idempotent webhook ingestion. |
| Retention/deletion | Scheduled reservation expiry, orphaned multipart cleanup, event/account expiry, asynchronous event/organization deletion, immediate session/link invalidation through parent lifecycle, originals/thumbnails/exports/enrollments/pending uploads removal, periodic storage reconciliation, storage release, and audit trail. |
| Observability/security | Request/correlation IDs, redacted route-template JSON logs, Prometheus-format API counters, dependency probes, CSP/HSTS/content-type/referrer/permissions headers, CORS allowlist, and V2 error envelope. |
| Frontend | In-memory access token plus refresh cookie, one login and role routing, forgot/reset/invite pages, import preview/confirm, direct folder upload through V2, public V2 enrollment, private thumbnail gallery, per-photo download, and async Download All status. |
| Deployment | Dockerized web/API/worker/Gunicorn ML, CPU and NVIDIA CUDA ML images, NGINX routing/rate limits, pgvector PostgreSQL, local Compose, and AWS CloudFormation for ALB/ASG/EC2/RDS/ElastiCache/MSK/S3/Glacier/SES/Secrets Manager/IAM/EventBridge/Lambda. S3 enforces private access, TLS, encryption, browser CORS, multipart cleanup, and lifecycle policy. |
| CI and migrations | Forward Alembic migrations, pgvector migration service, Prettier and frontend lint/build/audit, Ruff lint/format/compile/tests/dependency audit, Compose/CloudFormation/ShellCheck validation, and container builds. Production does not auto-create schema. |

## Automated acceptance evidence

`tools/verify_v2.mjs` runs the production-shaped workflow against the live stack and fails on any contract violation. It verifies:

- refresh rotation, replay rejection, single-use invitations, and logout revocation;
- mandatory cross-tenant event GET, PATCH, and upload-reservation denial as `404`;
- invalid import preview and idempotent confirmation;
- consent, reusable 24-hour enrollment access, real 512-dimensional ML enrollment, and inline matched-photo access;
- checksummed direct upload and idempotent completion;
- bulk invitations and participant direct-upload enrollment;
- global job detail, match detail/filtering, queued-job cancellation, and the exact Download All contract;
- real detection/matching, private gallery isolation, signed download, and asynchronous ZIP output.

The 2026-08-13 verification run also passed Ruff lint/format, Python compilation, four backend security tests, Prettier, Oxlint, the Vite production build, npm audit, pip-audit, ShellCheck, shell syntax checks, Compose configuration, CloudFormation lint, migration `20260813_05`, both live workflow suites, and both ONNX checksum checks.
An automated OpenAPI comparison found every API method/path declared in sections 52–63 of `specs.md` (the apparent `POST /api/v2/auth/login]` mismatch is only the Markdown link-closing bracket) and 96 implemented V2 operations in total.

`tools/verify_platform.mjs` preserves regression coverage for the original dashboard API, restricted Staff permissions, Excel compatibility, secure thumbnails, email state, event details, deletion, and storage release. `backend/tests` runs unit and API tenant-isolation tests in CI.

## Production release gates

The code paths and infrastructure declarations are present, but the following cannot be truthfully completed inside a source checkout and must be evidenced in staging before production promotion:

1. Configure real DNS/ACM, RDS, ElastiCache, MSK, S3, SES or Resend, provider webhook secret, monitoring destination, and production secrets.
2. Run `tools/verify_models.sh` against the deployed ONNX artifacts and perform the genuine/impostor calibration described in `specs.md`; approve the threshold profile for the actual cameras and population.
3. Run the full V2 verifier against staging with private S3, managed Kafka/Redis/PostgreSQL, and real email delivery/webhooks.
4. Execute and record an RDS point-in-time restore drill and verify S3 non-current-version expiry against the biometric retention commitment.
5. Run load/security tests against the target capacity, confirm the documented latency goals, and approve consent/privacy wording through the appropriate organizational review.

These are release evidence requirements—not mock or alternate application implementations. Development intentionally uses the durable outbox and local private storage adapters when provider credentials are absent.
