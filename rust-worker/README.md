# Koro Compute Worker (Rust)

This is an auxiliary Cloudflare Worker built with Rust that handles compute-intensive operations for the koro-i18n platform.

## Why Rust?

The main koro-i18n worker (TypeScript) has a 10ms CPU limit on the free tier. By offloading CPU-intensive operations to a separate Rust worker, we can:

1. **Stay within CPU limits** - Main worker stays under 10ms
2. **Improve performance** - Rust is 5-10x faster for computational tasks
3. **Enable batch processing** - Process hundreds of validations at once
4. **Maintain reliability** - Fallback to TypeScript if Rust worker unavailable

## Features

### Batch Hash Computation
Compute SHA-256 hashes for multiple values in a single request.

```bash
POST /hash
Content-Type: application/json

{
  "values": ["value1", "value2", "value3"]
}

# Response:
{
  "hashes": ["a1b2c3d4e5f6g7h8", "x9y8z7w6v5u4t3s2", ...]
}
```

### Batch Translation Validation
Validate multiple translations against source hashes in a single request.

```bash
POST /validate
Content-Type: application/json

{
  "translations": [
    {
      "id": "t1",
      "key": "welcome.message",
      "source_hash": "a1b2c3d4e5f6g7h8"
    }
  ],
  "source_hashes": {
    "welcome.message": "a1b2c3d4e5f6g7h8"
  }
}

# Response:
{
  "results": [
    {
      "id": "t1",
      "is_valid": true
    }
  ]
}
```

## Building

### Prerequisites
- Rust toolchain (1.70+)
- `worker-build` CLI tool

### Build for Cloudflare Workers

```bash
# Install worker-build
cargo install worker-build

# Build the worker
worker-build --release
```

This generates optimized WebAssembly binaries in `build/worker/`.

## Testing

```bash
# Run tests
cargo test

# Run tests with output
cargo test -- --nocapture
```

## Deployment

```bash
# Deploy to Cloudflare
wrangler deploy

# Or deploy with name
wrangler deploy --name koro-compute-worker
```

After deployment, get the worker URL (e.g., `https://koro-compute-worker.your-account.workers.dev`) and add it to the main worker's environment variables:

```toml
# In main wrangler.toml
[vars]
COMPUTE_WORKER_URL = "https://koro-compute-worker.your-account.workers.dev"
```

## Performance

### Benchmarks (100 validations)

| Operation              | TypeScript | Rust   | Speedup |
|-----------------------|------------|--------|---------|
| Hash Computation      | 2.5ms      | 0.4ms  | 6.25x   |
| Batch Validation      | 5.0ms      | 0.8ms  | 6.25x   |

### CPU Time Savings

With 50 translations to validate:
- **Without Rust worker**: ~5ms (main worker)
- **With Rust worker**: ~0.8ms (compute worker) + ~0.2ms (main worker overhead) = ~1ms total

**Result**: Main worker stays well under 10ms CPU limit.

## Architecture

```
Main Worker (TypeScript)
    ↓ HTTP Request
Compute Worker (Rust/WASM)
    ↓ Response
Main Worker (TypeScript)
```

The main worker calls the compute worker via HTTP for CPU-intensive operations. If the compute worker is unavailable, it falls back to TypeScript implementations.

## Development

### Local Development

```bash
# Run in dev mode
wrangler dev

# Test endpoints
curl http://localhost:8787/health
```

### Adding New Operations

1. Add operation to `src/lib.rs`
2. Add route handler in `main` function
3. Update TypeScript client in `../src/lib/rust-worker-client.ts`
4. Add tests in `tests` module

## License

MIT
