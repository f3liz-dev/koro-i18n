#!/bin/bash

# Traditional Node.js server deployment script
# Implements containerized deployment with resource monitoring

set -e

ENVIRONMENT=${1:-production}
WITH_MONITORING=${2:-false}
BUILD=${3:-true}

echo "🚀 Deploying I18n Platform Traditional Server..."

# Check if Docker is installed and running
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! docker info &> /dev/null; then
    echo "❌ Docker is not running. Please start Docker daemon."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not available. Please install Docker Compose."
    echo "Visit: https://docs.docker.com/compose/install/"
    exit 1
fi

# Validate environment file
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        echo "⚠️  .env file not found. Creating from .env.example..."
        cp .env.example .env
        echo "📝 Please edit .env file with your configuration before continuing."
        echo "Required variables: GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, JWT_SECRET"
        exit 1
    else
        echo "❌ No .env or .env.example file found."
        exit 1
    fi
fi

# Build the application if requested
if [ "$BUILD" = "true" ]; then
    echo "📦 Building application..."
    npm run build:server
fi

# Build Docker image
echo "🐳 Building Docker image..."
docker-compose build

# Determine compose profiles
PROFILE_ARGS=""
if [ "$WITH_MONITORING" = "true" ]; then
    PROFILE_ARGS="--profile monitoring"
    echo "📊 Enabling monitoring services (Prometheus + Grafana)..."
fi

# Start services
echo "🚀 Starting services..."
docker-compose $PROFILE_ARGS up -d

echo "✅ Deployment completed successfully!"
echo ""
echo "🌐 I18n Platform API: http://localhost:3000"
echo "🏥 Health Check: http://localhost:3000/health"
echo "📊 Metrics: http://localhost:3000/api/monitoring/metrics"

if [ "$WITH_MONITORING" = "true" ]; then
    echo "📈 Prometheus: http://localhost:9090"
    echo "📊 Grafana: http://localhost:3001 (admin/admin)"
fi

echo ""
echo "📝 Useful commands:"
echo "  View logs: docker-compose logs -f i18n-platform"
echo "  Stop services: docker-compose down"
echo "  Restart: docker-compose restart i18n-platform"
echo "  View metrics: docker stats"