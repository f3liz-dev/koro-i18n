#!/bin/bash

echo "🚀 Starting I18n Platform in development mode..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from .env.example..."
    cp .env.example .env
    echo "📝 Please edit .env with your credentials"
    exit 1
fi

# Check if node_modules exists
if [ ! -d node_modules ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Ask which mode
echo ""
echo "Choose development mode:"
echo "1) Cloudflare Workers (recommended)"
echo "2) Node.js Server"
read -p "Enter choice [1-2]: " choice

case $choice in
    1)
        echo "🔧 Starting Cloudflare Workers..."
        echo "📝 Make sure you've run: wrangler d1 migrations apply koro-i18n-db --local"
        echo ""
        echo "Starting worker on http://localhost:8787"
        echo "Frontend will be on http://localhost:5173"
        echo ""
        wrangler dev &
        WORKER_PID=$!
        sleep 3
        npm run dev:frontend
        kill $WORKER_PID
        ;;
    2)
        echo "🔧 Starting Node.js Server..."
        npm run dev
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac
