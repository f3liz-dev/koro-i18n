#!/bin/bash

set -e

echo "🚀 Deploying I18n Platform to Cloudflare..."

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Install with: npm install -g wrangler"
    exit 1
fi

# Build frontend
echo "📦 Building frontend..."
npm run build

# Deploy main worker
echo "🔧 Deploying main API worker..."
wrangler deploy

# Deploy cron worker
echo "⏰ Deploying cron worker..."
wrangler deploy --config wrangler.cron.toml

# Deploy frontend to Pages
echo "🌐 Deploying frontend to Cloudflare Pages..."
wrangler pages deploy dist/frontend --project-name=i18n-platform

echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Configure GitHub OAuth callback URLs"
echo "2. Set up GitHub Actions secrets for log generation"
echo "3. Test the deployment"
