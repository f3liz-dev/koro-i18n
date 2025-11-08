#!/bin/bash

echo "🧹 Cleaning up old Wrangler cache and build artifacts..."

# Remove Wrangler cache
if [ -d ".wrangler" ]; then
    echo "Removing .wrangler/ directory..."
    rm -rf .wrangler
fi

# Remove node_modules (optional - uncomment if needed)
# if [ -d "node_modules" ]; then
#     echo "Removing node_modules/ directory..."
#     rm -rf node_modules
# fi

# Remove dist
if [ -d "dist" ]; then
    echo "Removing dist/ directory..."
    rm -rf dist
fi

echo "✅ Cleanup complete!"
echo ""
echo "Next steps:"
echo "1. Run: wrangler dev"
echo "2. Or: npm run dev:workers"
