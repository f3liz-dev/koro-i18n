# koro-i18n

Lightweight i18n platform powered by Cloudflare Workers, D1, and R2.

## Features

- **R2 Storage** - GitHub imports stored in R2 (unlimited size)
- **Differential Upload** - Only upload changed files, skip duplicates
- **Automatic Cleanup** - Remove orphaned files from R2
- **Source Validation** - Auto-detect outdated translations
- **Git Integration** - Full git blame + commit info
- **Web Translations** - User translations in D1
- **Free Tier Optimized** - <1GB storage, minimal operations

## Quick start

1. Install dependencies and generate Prisma client:

```pwsh
pnpm install
pnpm run prisma:generate
```

2. Create R2 *and* D1 (Cloudflare) resources and apply migrations:

```pwsh
wrangler r2 bucket create koro-i18n-translations
pnpm run prisma:migrate:local
```

3. Run locally:

```pwsh
pnpm run dev:all    # frontend + workers + rust (if enabled)
```

4. Build & deploy:

```pwsh
pnpm run build
pnpm run deploy
```

## Architecture

**New Flow (Recommended):** GitHub → Worker (fetch with user token) → Process & Validate → D1 (metadata). Web UI queries Worker → D1 for web translations.

**Legacy Flow (Deprecated):** GitHub → Client (preprocess) → Worker → R2 (files) + D1 (index). Web UI queries Worker → D1 for web translations.

**Key Concepts:**
- **Direct GitHub Access:** Files are fetched on-demand from GitHub using user's OAuth token with `public_repo` scope
- **Client-side Validation:** Metadata validation is done on the client side
- **No Manual Upload:** The system automatically fetches the latest files from the repository
- **R2 for Web Translations Only:** R2 storage is now primarily used for user-submitted web translations
- Git history preserved in metadata
- Source validation via hash comparison

## Documentation

Concise docs are in `docs/` — key ones:
- `docs/SETUP.md` — install + Cloudflare setup
- `docs/FRONTEND.md` — frontend notes
- `docs/FRONTEND_ARCHITECTURE.md` — architecture and patterns
- `docs/RUST_WORKER.md` — compute worker details
- `docs/BACKEND_API.md` — endpoints and examples

**Frontend Documentation:**
- **[Frontend Guide](docs/FRONTEND.md)** - Complete frontend documentation (SolidJS, routing, state management)
- **[Frontend Architecture](docs/FRONTEND_ARCHITECTURE.md)** - Deep dive into architectural decisions and patterns

**Backend Documentation:**
- **[Backend API Reference](docs/BACKEND_API.md)** - Complete API documentation with all endpoints
- **[Backend Internals](docs/BACKEND_INTERNALS.md)** - Implementation details and architecture
- **[Backend Deployment](docs/BACKEND_DEPLOYMENT.md)** - Step-by-step deployment guide
- **[Architecture](docs/ARCHITECTURE.md)** - System design & data flow
- **[Technical Flows](docs/FLOWS.md)** - Complete flow documentation
- **[Rust Worker](docs/RUST_WORKER.md)** - Auxiliary compute worker for CPU-intensive operations
- **[Computation Strategy](docs/COMPUTATION_STRATEGY.md)** - How computation is distributed across components
- **[Computation Flow](docs/COMPUTATION_FLOW.md)** - Visual diagrams and decision matrices

**Additional Resources:**
- **[Client Library](docs/CLIENT_LIBRARY.md)** - Client implementation details
- **[Prisma Guide](docs/PRISMA.md)** - Database schema and ORM usage
- **[Testing Guide](docs/TESTING.md)** - How to run and write tests

## Tech Stack

- Frontend: SolidJS + Vite + UnoCSS
- Backend: Cloudflare Workers + Hono
- Compute: Rust Worker (for CPU-intensive operations)
- Storage: D1 (SQLite) + R2 (Object Storage)
- ORM: Prisma
- Auth: GitHub OAuth + JWT
- Compression: MessagePack

## API Endpoints

### GitHub Integration (New)
```
GET  /api/projects/:project/files/manifest              # Get generated manifest
POST /api/projects/:project/files/fetch-from-manifest  # Fetch files using manifest (RECOMMENDED)
POST /api/projects/:project/files/fetch-from-github    # Legacy: Fetch files with directory traversal
```

### D1 API - Metadata & Web Translations
```
POST /api/projects/:project/upload  # DEPRECATED: Use fetch-from-manifest instead
GET  /api/projects/:project/files/list
GET  /api/translations
POST /api/translations
```

### R2 API - Web Translations Only
```
GET /api/r2/:project/:lang/:filename  # Primarily for web translations
GET /api/r2/by-key/:r2Key
```

## Performance

**Free Tier Usage:**
- R2: ~100 writes/month, ~1K reads/month
- D1: ~200 writes/month, ~10K reads/month
- Storage: <1GB total

**Optimizations:**
- In-memory caching (1 hour TTL)
- ETag support (304 Not Modified)
- MessagePack compression
- Individual file storage

## Development commands

Run components individually or together:

```pwsh
pnpm run dev          # frontend
pnpm run dev:workers  # wrangler dev
pnpm run dev:all      # run all services together
pnpm run test         # run vitest
```

## License

MIT
