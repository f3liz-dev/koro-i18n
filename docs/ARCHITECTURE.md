# koro-i18n Architecture

## Overview

koro-i18n is a lightweight i18n platform using Cloudflare Workers, D1, and R2.

**Related Documentation:**
- **[Backend API Documentation](BACKEND_API.md)** - Complete API reference with all endpoints
- **[Backend Internals](BACKEND_INTERNALS.md)** - Deep dive into implementation details
- **[Technical Flows](FLOWS.md)** - Detailed flow documentation for all operations

## Core Architecture

### Storage Strategy

**GitHub Direct Access (Recommended - NEW)**
- Files fetched on-demand from GitHub using user's OAuth token
- No R2 storage needed for source files
- Metadata validation done client-side
- Always up-to-date with repository

**R2 (Web Translations & Legacy GitHub Imports)**
- Key format: `[project]-[lang]-[filename]`
- Primarily used for web translations
- MessagePack compressed
- ⚠️ GitHub imports via R2 are deprecated

**D1 (Metadata & Web Translations)**
- `R2File`: Lightweight index (primarily for web translations)
- `WebTranslation`: User translations with validation
- `WebTranslationHistory`: Full audit trail
- `User`: Stores `githubAccessToken` for repository access

### Data Flow

```
GitHub Source Files (NEW):
  UI → Worker (with user token) → GitHub API → Parse & Return
  
Legacy GitHub Upload (DEPRECATED):
  Client (git blame + MessagePack) → Worker → R2 + D1 index

Web Translation:
  User → Worker → D1 only

Display:
  UI → GitHub API (source) + D1 API (web translations) → Merge in UI
```

**For detailed flow documentation**, see [FLOWS.md](FLOWS.md)

## Backend Technology Stack

**Runtime & Framework:**
- Cloudflare Workers (V8 isolates, edge computing)
- Hono (lightweight HTTP framework)

**Data Layer:**
- Cloudflare D1 (SQLite, serverless SQL database)
- Prisma ORM with D1 adapter
- Cloudflare R2 (S3-compatible object storage)

**Authentication:**
- GitHub OAuth for web UI (with `public_repo` scope)
- GitHub access tokens stored in D1 for repository access
- JWT tokens (HS256, 24-hour expiration)
- GitHub OIDC for Actions (10-minute tokens, no secrets) - ⚠️ Still supported but not required

**Serialization:**
- MessagePack for R2 files (binary format, smaller than JSON)
- JSON for API responses

## API Architecture

The backend separates concerns into distinct API layers:

### Authentication API (`/api/auth`)
- GitHub OAuth flow (login, callback, logout)
- JWT token generation and verification
- User session management

### Project Management API (`/api/projects`)
- Project CRUD operations
- Member management (invitations, approvals)
- Access control (whitelist/blacklist)

### File Access API (`/api/projects/:project/files`)
- **NEW:** Fetch files directly from GitHub using user's token
- ⚠️ DEPRECATED: Chunked file uploads with OIDC authentication
- Differential upload (skip unchanged files)
- Automatic cleanup of orphaned files

### R2 File API (`/api/r2`)
- Direct R2 file retrieval
- In-memory caching (1-hour TTL)
- MessagePack decoding
- Git metadata exposure

### Translation API (`/api/translations`)
- Web translation CRUD
- Translation suggestions and approvals
- Translation history tracking
- Source hash validation

**Complete API documentation:** [BACKEND_API.md](BACKEND_API.md)

## Validation System

### Source Hash Tracking
- Each translation stores `sourceHash` (16 chars)
- Hash of source value at time of translation
- Auto-invalidation when source changes

### Validation Flow
```
1. Source: "Welcome" → hash: "a1b2c3d4"
2. Translation: "ようこそ" with sourceHash: "a1b2c3d4" ✅
3. Source updated: "Welcome!" → hash: "x9y8z7w6"
4. System detects mismatch → isValid = false ⚠️
```

## R2 File Structure

```typescript
{
  raw: { "key1": "value1" },
  metadata: {
    gitBlame: {
      "key1": { commit, author, email, date }
    },
    charRanges: {
      "key1": { start: [line, char], end: [line, char] }
    },
    sourceHashes: {
      "key1": "a1b2c3d4" // For validation
    }
  },
  sourceHash: "file-hash",
  commitSha: "abc123",
  uploadedAt: "2024-01-01T00:00:00Z"
}
```

## Performance

### Backend Performance Characteristics

**Response Times (from Cloudflare edge):**
- Health check: <10ms
- Auth endpoints: 50-100ms (includes GitHub API call)
- Project queries: 20-50ms (D1 with ETag)
- File listing: 30-60ms (D1 index)
- R2 file retrieval: 20-50ms (cached) / 100-200ms (uncached)
- Translation queries: 20-40ms (D1)
- File upload (per chunk): 200-500ms (R2 + D1 batch)

**Worker CPU Time:**
- File upload (10 files): ~5ms (well under 10ms limit)
- Translation CRUD: ~2ms
- File retrieval: <1ms (cached)
- ETag generation: <0.5ms

**Key Optimizations:**
1. **Client-side pre-packing** - MessagePack encoding on client (5x CPU reduction)
2. **Batched D1 operations** - Single SQL for multiple inserts (5x faster)
3. **In-memory R2 caching** - 1-hour TTL (90% read reduction)
4. **Differential uploads** - Skip unchanged files (90%+ upload reduction)
5. **Deferred invalidation** - Validation only on last chunk
6. **ETag-based caching** - 304 responses for unchanged data

**Read [BACKEND_INTERNALS.md](BACKEND_INTERNALS.md) for detailed optimization strategies.**

## Key Features

1. **Scalability**: R2 handles unlimited file sizes
2. **Validation**: Auto-detect outdated translations
3. **Git Integration**: Full blame + commit info
4. **Separation**: R2 (immutable) + D1 (mutable)
5. **Caching**: Aggressive caching strategy
