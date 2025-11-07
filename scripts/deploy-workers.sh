#!/bin/bash

# Cloudflare Workers deployment script
# Implements serverless deployment with environment variable handling

set -e

echo "🚀 Deploying I18n Platform to Cloudflare Workers..."

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Please install it first:"
    echo "npm install -g wrangler"
    exit 1
fi

# Check if user is logged in to Cloudflare
if ! wrangler whoami &> /dev/null; then
    echo "❌ Not logged in to Cloudflare. Please run:"
    echo "wrangler login"
    exit 1
fi

# Build the project
echo "📦 Building project..."
npm run build:workers

# Check if required secrets are set
echo "🔐 Checking required secrets..."

REQUIRED_SECRETS=("GITHUB_CLIENT_ID" "GITHUB_CLIENT_SECRET" "JWT_SECRET")
MISSING_SECRETS=()

for secret in "${REQUIRED_SECRETS[@]}"; do
    if ! wrangler secret list | grep -q "$secret"; then
        MISSING_SECRETS+=("$secret")
    fi
done

if [ ${#MISSING_SECRETS[@]} -ne 0 ]; then
    echo "❌ Missing required secrets. Please set them using:"
    for secret in "${MISSING_SECRETS[@]}"; do
        echo "wrangler secret put $secret"
    done
    echo ""
    echo "For GitHub OAuth:"
    echo "1. Create a GitHub OAuth App at https://github.com/settings/applications/new"
    echo "2. Set Authorization callback URL to: https://your-worker-domain.workers.dev/api/auth/callback"
    echo "3. Use the Client ID and Client Secret as GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET"
    echo ""
    echo "For JWT_SECRET, generate a secure random string:"
    echo "openssl rand -base64 32"
    exit 1
fi

# Deploy based on environment
ENVIRONMENT=${1:-production}

case $ENVIRONMENT in
    "development"|"dev")
        echo "🔧 Deploying to development environment..."
        wrangler deploy --env development
        ;;
    "staging")
        echo "🔧 Deploying to staging environment..."
        wrangler deploy --env staging
        ;;
    "production"|"prod")
        echo "🔧 Deploying to production environment..."
        wrangler deploy
        ;;
    *)
        echo "❌ Invalid environment: $ENVIRONMENT"
        echo "Valid options: development, staging, production"
        exit 1
        ;;
esac

echo "✅ Deployment completed successfully!"
echo ""
echo "🌐 Your I18n Platform is now running on Cloudflare Workers"
echo "📊 Monitor your deployment at: https://dash.cloudflare.com/"
echo "📝 View logs with: wrangler tail"