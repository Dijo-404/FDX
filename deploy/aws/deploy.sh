#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
project_root="$(cd "$script_dir/../.." && pwd)"

stack_name="fdx-production"
aws_deploy_region="${AWS_REGION:-ap-south-1}"
domain_url=""
certificate_arn=""
email_from=""
super_admin_email="superadmin@fdx.io"

usage() {
  cat <<'EOF'
Usage: ./deploy/aws/deploy.sh [options]

Required:
  --domain-url URL          Public HTTPS origin, e.g. https://fdx.example.com
  --certificate-arn ARN     ACM certificate ARN for the public origin
  --email-from ADDRESS      SES sender address

Optional:
  --stack-name NAME         CloudFormation stack (default: fdx-production)
  --region REGION           AWS region (default: AWS_REGION or ap-south-1)
  --admin-email ADDRESS     Initial Super Admin email
  -h, --help                Show this help
EOF
}

while (($#)); do
  case "$1" in
    --domain-url) domain_url="${2:-}"; shift 2 ;;
    --certificate-arn) certificate_arn="${2:-}"; shift 2 ;;
    --email-from) email_from="${2:-}"; shift 2 ;;
    --stack-name) stack_name="${2:-}"; shift 2 ;;
    --region) aws_deploy_region="${2:-}"; shift 2 ;;
    --admin-email) super_admin_email="${2:-}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 2 ;;
  esac
done

if [[ -z "$domain_url" || -z "$certificate_arn" || -z "$email_from" ]]; then
  echo "--domain-url, --certificate-arn, and --email-from are required." >&2
  usage >&2
  exit 2
fi

if [[ "$domain_url" != https://* ]]; then
  echo "--domain-url must use HTTPS." >&2
  exit 2
fi

for command_name in aws docker; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "$command_name is required for the production deployment." >&2
    exit 1
  fi
done

aws cloudformation deploy \
  --stack-name "$stack_name" \
  --template-file "$project_root/deploy/aws/platform.yml" \
  --capabilities CAPABILITY_IAM \
  --region "$aws_deploy_region" \
  --parameter-overrides \
    "DomainName=$domain_url" \
    "CertificateArn=$certificate_arn" \
    "EmailFrom=$email_from" \
    "SuperAdminEmail=$super_admin_email"

"$script_dir/publish.sh" "$stack_name" "$aws_deploy_region"

application_url="$(aws cloudformation describe-stacks \
  --stack-name "$stack_name" \
  --region "$aws_deploy_region" \
  --query "Stacks[0].Outputs[?OutputKey=='ApplicationUrl'].OutputValue" \
  --output text)"

echo "FDX production deployment started for $application_url"
