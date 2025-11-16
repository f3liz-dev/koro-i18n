# Rust Worker Deployment Guide

This guide walks you through deploying the Rust compute worker to Cloudflare Workers.

## Prerequisites

1. **Rust toolchain** (1.70+)
2. **wrangler CLI** (already installed for main project)
3. **Cloudflare account** with Workers access

## Step 1: Install worker-build

The `worker-build` tool is required to compile Rust to WebAssembly for Cloudflare Workers.

```bash
cargo install -q worker-build
```

This may take a few minutes the first time.

## Step 2: Build the Rust Worker

```bash
cd rust-worker
worker-build --release
```

This will:
1. Compile Rust code to WebAssembly
2. Generate JavaScript bindings
3. Create optimized output in `build/worker/`

Expected output:
```
   Compiling koro_compute_worker v0.1.0
    Finished release [optimized] target(s) in X.XXs
   Generated build/worker/shim.mjs
```

## Step 3: Test Locally (Optional)

Before deploying, test the worker locally:

```bash
wrangler dev
```

In another terminal:
```bash
# Test health endpoint
curl http://localhost:8787/health

# Test hash endpoint
curl -X POST http://localhost:8787/hash \
  -H "Content-Type: application/json" \
  -d '{"values":["test1","test2"]}'

# Expected: {"hashes":["9f86d081884c7d65","60303ae22b998861"]}
```

## Step 4: Deploy to Cloudflare

```bash
wrangler deploy
```

Expected output:
```
Total Upload: XX.XX KiB / gzip: XX.XX KiB
Uploaded koro-compute-worker (X.XX sec)
Published koro-compute-worker (X.XX sec)
  https://koro-compute-worker.YOUR-SUBDOMAIN.workers.dev
```

**Important**: Save this URL! You'll need it for the main worker configuration.

## Step 5: Verify Deployment

Test the deployed worker:

```bash
# Replace with your actual worker URL
export WORKER_URL="https://koro-compute-worker.YOUR-SUBDOMAIN.workers.dev"

# Test health
curl $WORKER_URL/health

# Test hash computation
curl -X POST $WORKER_URL/hash \
  -H "Content-Type: application/json" \
  -d '{"values":["Hello","World"]}'
```

## Step 6: Configure Main Worker

Add the Rust worker URL to your main worker's environment:

### Option A: Via wrangler.toml (Recommended)

Edit `/wrangler.toml`:
```toml
[vars]
COMPUTE_WORKER_URL = "https://koro-compute-worker.YOUR-SUBDOMAIN.workers.dev"
```

Then redeploy the main worker:
```bash
cd ..
npm run deploy
```

### Option B: Via Cloudflare Dashboard

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to Workers & Pages
3. Select your main worker (e.g., "koro")
4. Go to Settings → Variables
5. Add environment variable:
   - Name: `COMPUTE_WORKER_URL`
   - Value: `https://koro-compute-worker.YOUR-SUBDOMAIN.workers.dev`
6. Save and redeploy

## Step 7: Test Integration

Upload a file to trigger translation validation:

```bash
# The main worker should now use the Rust worker
# Check logs for confirmation:
wrangler tail

# Expected log messages:
# [project-files] Rust compute worker enabled: https://koro-compute-worker...
# [invalidate] Using Rust worker for batch validation (X translations)
```

## Troubleshooting

### Build Fails: "worker-build not found"

```bash
# Install worker-build
cargo install worker-build

# Verify installation
worker-build --version
```

### Build Fails: Compilation errors

```bash
# Update Rust
rustup update

# Clean and rebuild
cargo clean
worker-build --release
```

### Deploy Fails: Authentication error

```bash
# Login to Cloudflare
wrangler login

# Verify authentication
wrangler whoami
```

### Deploy Fails: Name conflict

Edit `rust-worker/wrangler.toml` and change the worker name:
```toml
name = "koro-compute-worker-your-unique-name"
```

### Worker Returns 404

Check the URL is correct:
```bash
# List your workers
wrangler deployments list
```

### Main Worker Not Using Rust Worker

1. Verify `COMPUTE_WORKER_URL` is set correctly
2. Check Rust worker health: `curl $WORKER_URL/health`
3. Check main worker logs: `wrangler tail`
4. Verify Rust worker is accessible from main worker (network/CORS)

## Performance Monitoring

Monitor performance improvements:

```bash
# Watch logs during upload
wrangler tail

# Look for timing information:
# Before: "[upload] Validated 50 translations in 50ms"
# After:  "[upload] Validated 50 translations in 8ms (Rust)"
```

## Cost Estimation

Rust worker on Cloudflare Workers free tier:

- **Requests**: ~1 per file upload (batch operations)
- **CPU Time**: <1ms per request
- **Memory**: ~10MB per request
- **Storage**: ~500KB (compiled WASM)

Monthly estimates (1000 uploads):
- Requests: 1000 (well under 100K limit)
- CPU Time: ~800ms total (well under 10ms/request limit)
- Cost: **$0** (within free tier)

## Updating the Worker

When you update the Rust code:

```bash
cd rust-worker

# Run tests
cargo test

# Rebuild
worker-build --release

# Deploy
wrangler deploy
```

The main worker will automatically use the new version (no configuration change needed).

## Rolling Back

If issues occur, you can disable the Rust worker:

### Temporary Disable
Remove or comment out `COMPUTE_WORKER_URL` in main worker environment.
The system will automatically fall back to TypeScript implementations.

### Permanent Disable
```bash
cd rust-worker
wrangler delete koro-compute-worker
```

## Custom Domain (Optional)

To use a custom domain for the Rust worker:

1. In Cloudflare Dashboard, go to your worker
2. Go to Settings → Triggers
3. Add custom domain (e.g., `compute.your-domain.com`)
4. Update `COMPUTE_WORKER_URL` in main worker

## CI/CD Integration

To automate deployment:

```yaml
# .github/workflows/deploy-rust-worker.yml
name: Deploy Rust Worker

on:
  push:
    branches: [main]
    paths:
      - 'rust-worker/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
      
      - name: Install worker-build
        run: cargo install worker-build
      
      - name: Build Rust worker
        working-directory: rust-worker
        run: worker-build --release
      
      - name: Deploy to Cloudflare
        working-directory: rust-worker
        run: wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

## Next Steps

- Monitor performance in production
- Check logs for any errors or warnings
- Consider adding more operations to the Rust worker as needed
- Review cost dashboard after first month

## Support

If you encounter issues:
1. Check [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
2. Review [worker-rs GitHub](https://github.com/cloudflare/workers-rs)
3. Check main project logs for integration issues
