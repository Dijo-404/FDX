# FDX

FDX is a multi-tenant event-photo delivery platform implementing the workflow in [`docs/workflow.md`](docs/workflow.md). A single JWT login routes Super Admins, Organization Admins, and restricted Staff users to role-scoped React dashboards.

## Architecture

- `webapp/` — React and Vite dashboards plus participant enrollment and private gallery pages.
- `backend/` — FastAPI API, PostgreSQL models/Alembic migrations, authentication, storage, email, retention, and Kafka worker.
- `face-processing/service/` — Gunicorn-hosted face-processing inference service.
- `face-processing/models/detection/` — RetinaFace face-detection weights.
- `face-processing/models/recognition/` — AdaFace face-recognition weights.
- `deploy/nginx/` — frontend hosting, reverse proxy, upload limits, and API rate limiting.
- `deploy/aws/` — production CloudFormation and publishing workflow.
- `tools/` — model integrity and end-to-end platform verification.

PostgreSQL is the source of truth, Redis provides login rate limiting and health caching, Kafka distributes processing jobs, and the worker retains a PostgreSQL fallback queue. Development media uses a Docker volume; production media uses private S3 storage with generated thumbnails.

## Required models

Place each ONNX model under the directory matching its role:

```text
face-processing/models/detection/retinaface-r50.onnx
face-processing/models/recognition/adaface-ir101-ms1mv2.onnx
```

Verify them with:

```sh
./tools/verify_models.sh
```

## Run locally

Docker with the Compose plugin is required.

```sh
./run-platform.sh
```

The first run creates `.env` from `.env.example`. Open `http://127.0.0.1:8080` and sign in with the Super Admin credentials configured in `.env`.

Stop without deleting persistent volumes:

```sh
./stop-platform.sh
```

## Application workflow

1. A Super Admin creates a college/company organization and invites its administrator.
2. The Organization Admin creates an event and may invite restricted operational Staff.
3. Participants are imported from CSV, XLS, XLSX, or XLSM and receive enrollment links.
4. Participants consent and submit a selfie; event photos arrive as files, a browser-selected folder, or ZIP.
5. Kafka workers run RetinaFace/AdaFace, apply confidence policy, and expose review results.
6. Approved matches are delivered through expiring private galleries with secure originals and generated thumbnails.
7. Event deletion or scheduled retention removes originals, thumbnails, embeddings, and derived records while releasing the exact storage usage.

Development uses the persistent email outbox. Production supports Resend or AWS SES; configure `EMAIL_PROVIDER`, `EMAIL_FROM`, and the relevant credentials/instance role.

## Verification

Run the live API, tenant-isolation, staff-permission, upload, email, event-detail, and deletion checks while the platform is running:

```sh
node tools/verify_platform.mjs
```

To include the real ML enrollment/matching/gallery path:

```sh
FDX_VERIFY_FACE_IMAGE=face-processing/service/assets/warmup/einstein.jpeg \
  node tools/verify_platform.mjs
```

Set `FDX_VERIFY_XLS=/path/to/participants.xls` to include legacy Excel verification.

Frontend checks:

```sh
cd webapp
npm ci
npm run lint
npm run build
```

## AWS deployment

`deploy/aws/platform.yml` provisions the production baseline: VPC, HTTPS ALB, EC2 Auto Scaling, RDS PostgreSQL, ElastiCache Redis, MSK Kafka, ECR, S3/Glacier, SES/IAM, Secrets Manager, SSM, and scheduled Lambda retention.

See [`deploy/aws/README.md`](deploy/aws/README.md) for deployment and image publishing commands.
