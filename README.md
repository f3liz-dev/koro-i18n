# koro-i18n

Lightweight i18n platform using Cloudflare Workers, D1, and R2.

## Features

- **R2 Storage** - GitHub imports stored in R2 (unlimited size)
- **Differential Upload** - Only upload changed files, skip duplicates
- **Automatic Cleanup** - Remove orphaned files from R2
- **Source Validation** - Auto-detect outdated translations
- **Git Integration** - Full git blame + commit info
- **Web Translations** - User translations in D1
- **Free Tier Optimized** - <1GB storage, minimal operations

## Quick Start

```bash
# Install
pnpm install

# Setup
pnpm run prisma:generate
wrangler r2 bucket create koro-i18n-translations
pnpm run prisma:migrate:local

# Develop
pnpm run dev:all

# Deploy
pnpm run deploy
```

## Architecture

```
GitHub → Client (preprocess) → Worker → R2 (files) + D1 (index)
Web UI → Worker → D1 (web translations)
Display → R2 API + D1 API → Merge in UI
```

**Key Concepts:**
- R2 files are mutable (overwrite on upload)
- Git history preserved in metadata
- Source validation via hash comparison
- Individual file storage: `[project]-[lang]-[filename]`

## Documentation

**Getting Started:**
- **[Setup Guide](docs/SETUP.md)** - Installation & configuration
- **[Client Setup](docs/CLIENT_SETUP.md)** - Repository integration
- **[Deployment](docs/DEPLOYMENT.md)** - Production deployment

**Backend Documentation:**
- **[Backend API Reference](docs/BACKEND_API.md)** - Complete API documentation with all endpoints
- **[Backend Internals](docs/BACKEND_INTERNALS.md)** - Implementation details and architecture
- **[Backend Deployment](docs/BACKEND_DEPLOYMENT.md)** - Step-by-step deployment guide
- **[Architecture](docs/ARCHITECTURE.md)** - System design & data flow
- **[Technical Flows](docs/FLOWS.md)** - Complete flow documentation

**Additional Resources:**
- **[Client Library](docs/CLIENT_LIBRARY.md)** - Client implementation details
- **[Prisma Guide](docs/PRISMA.md)** - Database schema and ORM usage
- **[Testing Guide](docs/TESTING.md)** - How to run and write tests

## Tech Stack

- Frontend: SolidJS + Vite + UnoCSS
- Backend: Cloudflare Workers + Hono
- Storage: D1 (SQLite) + R2 (Object Storage)
- ORM: Prisma
- Auth: GitHub OAuth + JWT
- Compression: MessagePack

## API Endpoints

### D1 API - Metadata & Web Translations
```
POST /api/projects/:project/upload
GET  /api/projects/:project/files/list
GET  /api/translations
POST /api/translations
```

### R2 API - GitHub Imports
```
GET /api/r2/:project/:lang/:filename
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

## Development

```bash
# Run frontend dev server
pnpm run dev

# Run worker dev server
pnpm run dev:workers

# Run both
pnpm run dev:all

# Build
pnpm run build

# Test
pnpm run test
```

## License

MIT
