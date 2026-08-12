# AWS deployment

FDX runs as Docker containers behind NGINX on an EC2 host. Production should use RDS PostgreSQL, ElastiCache Redis, and MSK Kafka endpoints; event media is stored privately in S3 and archived by lifecycle policy to Glacier Instant Retrieval. The FastAPI worker enforces the application retention date and deletes expired database/media records.

1. Deploy `storage.yml`, attach the output instance profile to the EC2 host, and use the output bucket as `S3_BUCKET`.
2. Provision PostgreSQL, Redis, and Kafka in private subnets and permit access only from the EC2 security group.
3. Set `DATABASE_URL`, `REDIS_URL`, `KAFKA_BOOTSTRAP_SERVERS`, `STORAGE_BACKEND=s3`, `S3_BUCKET`, `EMAIL_PROVIDER=ses`, `FRONTEND_URL`, and long random bootstrap/JWT secrets in the host environment or AWS Systems Manager Parameter Store.
4. Terminate TLS at an Application Load Balancer or CloudFront and allow inbound traffic to NGINX only from that layer.
5. Run `docker compose up --build -d`. For more throughput, run additional worker instances against the same Kafka consumer group.

The template does not create networking or data services because those settings depend on the target AWS account’s VPC, availability, backup, and recovery requirements. S3 public access is blocked; galleries are served only after the API validates their hashed, expiring token.
