# Deployment types

FDX has two intentionally separate deployment types.

| Type | Compose file | Intended use | Dependencies |
| --- | --- | --- | --- |
| Local | `compose.local.yml` | Development, acceptance testing, and demos | Docker only; all data and messaging services run locally |
| Cloud | `compose.cloud.yml` | Production | Prebuilt images plus managed PostgreSQL, Redis, Kafka, S3, SES, TLS, and secret management |

## Local/test/demo

From the repository root:

```sh
./run-platform.sh
```

The command creates `.env` with random local credentials on first use, builds every application image, and starts the complete stack. Only the web UI is published, on the loopback interface at `http://127.0.0.1:8080` by default. Persistent data remains in Docker volumes.

Stop the stack without deleting its data:

```sh
./stop-platform.sh
```

Use the explicit Compose file for other local operations:

```sh
docker compose --env-file .env -f compose.local.yml logs -f
docker compose --env-file .env -f compose.local.yml ps
```

## Cloud/production

The production runtime deliberately contains no local PostgreSQL, Redis, or Kafka container and has no local-storage or development-email fallback. Required production settings fail Compose validation when missing.

AWS is the supported cloud implementation. It provisions the managed dependencies and generates the runtime environment from Secrets Manager:

```sh
./deploy/aws/deploy.sh \
  --domain-url https://fdx.example.com \
  --certificate-arn arn:aws:acm:ap-south-1:123456789012:certificate/example \
  --email-from noreply@example.com
```

For a different cloud provider, provide the contract in `cloud.env.example`, mount both ONNX models at `/opt/fdx/face-processing/models`, and run:

```sh
docker compose --env-file /secure/path/fdx-production.env -f compose.cloud.yml up -d
```
