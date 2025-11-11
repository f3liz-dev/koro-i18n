#!/bin/bash

set -e

echo "🚀 Deploying Koro I18n Platform to Cloudflare Workers..."

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Install with: npm install -g wrangler"
    exit 1
fi

# Build frontend
echo "📦 Building frontend..."
npm run build

# Deploy worker with assets
echo "🔧 Deploying worker with static assets..."
wrangler deploy

echo "✅ Deployment complete!"
echo ""
echo "🌐 Your app is live at: https://koro.f3liz.workers.dev"
echo ""
echo "Next steps:"
echo "1. Configure GitHub OAuth callback URLs"
echo "2. Set secrets: wrangler secret put GITHUB_CLIENT_ID"
echo "3. Test the deployment"
