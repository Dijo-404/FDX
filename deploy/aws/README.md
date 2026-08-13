# AWS deployment

`platform.yml` provisions the complete production baseline used by FDX:

- a two-AZ VPC, HTTPS Application Load Balancer, EC2 Auto Scaling group, and SSM access;
- encrypted RDS PostgreSQL, TLS-enabled ElastiCache Redis, and TLS MSK Kafka in private subnets;
- private/versioned S3 media storage with Glacier Instant Retrieval and expiration lifecycle rules;
- ECR repositories, Secrets Manager bootstrap/JWT/database secrets, SES sender identity and least-privilege runtime IAM;
- a daily EventBridge/Lambda job that asks one worker host to run application-level retention cleanup.

## Prerequisites

Install AWS CLI v2 and Docker, configure an AWS account, place RetinaFace under `face-processing/models/detection/` and AdaFace under `face-processing/models/recognition/`, request an ACM certificate in the deployment region, and move the SES account out of sandbox when sending outside verified recipients.

Deploy the infrastructure, publish the images and models, and start the production instance refresh with one command:

```sh
./deploy/aws/deploy.sh \
  --domain-url https://fdx.example.com \
  --certificate-arn arn:aws:acm:ap-south-1:123456789012:certificate/example \
  --email-from noreply@example.com \
  --admin-email admin@example.com
```

AWS sends a verification message for `EmailFrom`; confirm it before expecting mail delivery. Point the application hostname at the `LoadBalancerDnsName` stack output.

To publish a new application version after the infrastructure exists:

```sh
./deploy/aws/publish.sh fdx-production ap-south-1
```

The publish command pushes the API/worker, web, and Gunicorn ML images, uploads `compose.cloud.yml` and both private models, and performs an Auto Scaling instance refresh. The API container applies Alembic migrations before it starts; workers do not race it.

RDS deletion protection is enabled and replacement/deletion preserves a final snapshot. Disable deletion protection explicitly before intentionally deleting the stack.
