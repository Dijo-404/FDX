#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$repo_root"

if [[ ! -f face-processing/models/detection/retinaface-r50.onnx || ! -f face-processing/models/recognition/adaface-ir101-ms1mv2.onnx ]]; then
  echo "FDX model files are missing. Run ./tools/verify_models.sh for details." >&2
  exit 1
fi

if [[ ! -f .env ]]; then
  if ! command -v openssl >/dev/null 2>&1; then
    echo "OpenSSL is required to generate local development secrets." >&2
    exit 1
  fi
  umask 077
  cp .env.example .env
  postgres_password="$(openssl rand -hex 24)"
  jwt_secret="$(openssl rand -hex 48)"
  super_admin_password="Fdx-$(openssl rand -hex 20)"
  verification_password="FdxVerify-$(openssl rand -hex 20)"
  email_webhook_secret="$(openssl rand -hex 48)"
  sed -i \
    -e "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$postgres_password/" \
    -e "s/^JWT_SECRET=.*/JWT_SECRET=$jwt_secret/" \
    -e "s/^FDX_SUPER_ADMIN_PASSWORD=.*/FDX_SUPER_ADMIN_PASSWORD=$super_admin_password/" \
    -e "s/^FDX_VERIFICATION_PASSWORD=.*/FDX_VERIFICATION_PASSWORD=$verification_password/" \
    -e "s/^EMAIL_WEBHOOK_SECRET=.*/EMAIL_WEBHOOK_SECRET=$email_webhook_secret/" \
    .env
  unset postgres_password jwt_secret super_admin_password verification_password email_webhook_secret
  echo "Created .env with generated local credentials. Keep this file private."
fi

docker compose --env-file .env -f compose.local.yml up --build -d
docker compose --env-file .env -f compose.local.yml ps
web_address="$(docker compose --env-file .env -f compose.local.yml port web 80)"
echo "FDX is available at http://$web_address"
