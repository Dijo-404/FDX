#!/usr/bin/env sh
set -eu

STACK_NAME=${1:-fdx-production}
AWS_DEPLOY_REGION=${2:-${AWS_REGION:-ap-south-1}}
PROJECT_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)

stack_output() {
  aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$AWS_DEPLOY_REGION" \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" \
    --output text
}

API_REPOSITORY=$(stack_output ApiRepositoryUri)
WEB_REPOSITORY=$(stack_output WebRepositoryUri)
ML_REPOSITORY=$(stack_output MlRepositoryUri)
MEDIA_BUCKET=$(stack_output MediaBucketName)
AUTO_SCALING_GROUP=$(stack_output AutoScalingGroupName)
REGISTRY=${API_REPOSITORY%/*}

DETECTION_MODEL="$PROJECT_ROOT/face-processing/models/detection/retinaface-r50.onnx"
RECOGNITION_MODEL="$PROJECT_ROOT/face-processing/models/recognition/adaface-ir101-ms1mv2.onnx"

for model in "$DETECTION_MODEL" "$RECOGNITION_MODEL"; do
  if [ ! -f "$model" ]; then
    echo "Missing required model: ${model#"$PROJECT_ROOT"/}" >&2
    exit 1
  fi
done

aws ecr get-login-password --region "$AWS_DEPLOY_REGION" | docker login --username AWS --password-stdin "$REGISTRY"

docker build -f "$PROJECT_ROOT/backend/Dockerfile" -t "$API_REPOSITORY:latest" "$PROJECT_ROOT"
docker build -f "$PROJECT_ROOT/webapp/Dockerfile" -t "$WEB_REPOSITORY:latest" "$PROJECT_ROOT"
docker build -f "$PROJECT_ROOT/face-processing/service/Dockerfile" -t "$ML_REPOSITORY:latest" "$PROJECT_ROOT"
docker push "$API_REPOSITORY:latest"
docker push "$WEB_REPOSITORY:latest"
docker push "$ML_REPOSITORY:latest"

aws s3 cp "$PROJECT_ROOT/docker-compose.aws.yml" "s3://$MEDIA_BUCKET/deployments/docker-compose.aws.yml" --region "$AWS_DEPLOY_REGION"
aws s3 cp "$DETECTION_MODEL" "s3://$MEDIA_BUCKET/face-processing/models/detection/retinaface-r50.onnx" --region "$AWS_DEPLOY_REGION"
aws s3 cp "$RECOGNITION_MODEL" "s3://$MEDIA_BUCKET/face-processing/models/recognition/adaface-ir101-ms1mv2.onnx" --region "$AWS_DEPLOY_REGION"

aws autoscaling start-instance-refresh \
  --auto-scaling-group-name "$AUTO_SCALING_GROUP" \
  --preferences MinHealthyPercentage=0,InstanceWarmup=600 \
  --region "$AWS_DEPLOY_REGION"

echo "Published FDX images and deployment assets to stack $STACK_NAME."
