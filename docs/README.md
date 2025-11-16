# koro-i18n Documentation

Lightweight i18n platform using Cloudflare Workers, D1, and R2.

## Features

- **R2 Storage**: GitHub imports stored in R2 (unlimited size)
- **Source Validation**: Auto-detect outdated translations
- **Git Integration**: Full git blame + commit info preserved
- **Web Translations**: User translations stored in D1
- **Separate APIs**: R2 (GitHub imports) + D1 (web translations)
- **Free Tier Optimized**: <1GB storage, minimal operations

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

## Quick Start

```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm run prisma:generate

# Create R2 bucket
wrangler r2 bucket create koro-i18n-translations

# Apply migrations
pnpm run prisma:migrate:local

# Run development
pnpm run dev:all

# Deploy
pnpm run deploy
```

## Documentation

**Getting Started:**
- **[Setup Guide](SETUP.md)** - Installation & configuration
- **[Client Setup](CLIENT_SETUP.md)** - Repository integration
- **[Deployment](DEPLOYMENT.md)** - Production deployment

**Technical Documentation:**
- **[Architecture](ARCHITECTURE.md)** - System design & data flow
- **[Technical Flows](FLOWS.md)** - Complete flow documentation (frontend, backend, actions)
- **[Client Library](CLIENT_LIBRARY.md)** - Client implementation details

**Additional Guides:**
- **[Testing](TESTING.md)** - Testing guide
- **[Prisma](PRISMA.md)** - Database ORM guide
- **[Project Creation](PROJECT_CREATION_RESTRICTION.md)** - Project management
- **[Get JWT Token](GET_JWT_TOKEN.md)** - Development authentication

## Tech Stack

- **Frontend**: SolidJS + Vite + UnoCSS
- **Backend**: Cloudflare Workers + Hono
- **Storage**: D1 (SQLite) + R2 (Object Storage)
- **ORM**: Prisma
- **Auth**: GitHub OAuth + JWT
- **Compression**: MessagePack

## API Endpoints

### D1 API - Metadata & Web Translations
```
POST /api/projects/:project/upload          - Upload files to R2
GET  /api/projects/:project/files/list      - List files (metadata)
GET  /api/projects/:project/files/summary   - File summaries
GET  /api/translations                      - Get web translations
POST /api/translations                      - Create web translation
```

### R2 API - GitHub Imports
```
GET /api/r2/:project/:lang/:filename        - Get file from R2
GET /api/r2/by-key/:r2Key                   - Get by R2 key
```

## Performance

### Free Tier Usage
- R2 writes: ~100/month
- R2 reads: ~1000/month (cached)
- D1 writes: ~200/month
- D1 reads: ~10K/month
- Storage: <1GB total

### Optimizations
- In-memory caching (1 hour TTL)
- ETag support (304 Not Modified)
- MessagePack compression
- Individual file storage

## License

MIT
