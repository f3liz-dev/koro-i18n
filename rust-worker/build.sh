#!/bin/bash
set -e

echo "=== Building Rust Compute Worker ==="
echo ""

# Check if worker-build is installed
if ! command -v worker-build &> /dev/null; then
    echo "❌ worker-build not found. Installing..."
    cargo install worker-build
    echo "✅ worker-build installed"
fi

# Build the worker
echo "🔨 Building Rust worker..."
worker-build --release

echo ""
echo "✅ Build complete!"
echo ""
echo "Next steps:"
echo "  1. Test locally:  wrangler dev"
echo "  2. Deploy:        wrangler deploy"
echo ""
