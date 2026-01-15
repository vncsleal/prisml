#!/bin/bash
# Build and tag the PrisML trainer Docker image

set -e

echo "🐳 Building PrisML Trainer Docker image..."

docker build \
  -f Dockerfile.trainer \
  -t prisml/trainer:latest \
  -t prisml/trainer:1.0.0 \
  .

echo "✅ Docker image built successfully!"
echo ""
echo "Tagged as:"
echo "  - prisml/trainer:latest"
echo "  - prisml/trainer:1.0.0"
echo ""
echo "To push to Docker Hub:"
echo "  docker push prisml/trainer:latest"
echo "  docker push prisml/trainer:1.0.0"
