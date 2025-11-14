# koro-i18n Architecture

## Overview

koro-i18n is a lightweight i18n platform using Cloudflare Workers, D1, and R2.

## Core Architecture

### Storage Strategy

**R2 (GitHub Imports - Mutable)**
- Key format: `[project]-[lang]-[filename]`
- Files overwritten on each upload
- Git history preserved in metadata
- MessagePack compressed

**D1 (Metadata & Web Translations)**
- `R2File`: Lightweight index pointing to R2
- `WebTranslation`: User translations with validation
- `WebTranslationHistory`: Full audit trail

### Data Flow

```
GitHub Upload:
  Client (git blame + MessagePack) → Worker → R2 + D1 index

Web Translation:
  User → Worker → D1 only

Display:
  UI → R2 API (GitHub) + D1 API (Web) → Merge in UI
```

## APIs (Separated)

### D1 API - Metadata & Web Translations
- `POST /api/projects/:project/upload` - Upload files
- `GET /api/projects/:project/files/list` - List files
- `GET /api/translations/*` - Web translation CRUD

### R2 API - GitHub Imports
- `GET /api/r2/:project/:lang/:filename` - Get file from R2
- `GET /api/r2/by-key/:r2Key` - Get by R2 key

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

### Free Tier Usage
- R2 writes: ~100/month
- R2 reads: ~1000/month (cached)
- D1 writes: ~200/month
- D1 reads: ~10K/month
- Storage: <1GB

### Optimizations
- In-memory caching (1 hour TTL)
- ETag support (304 Not Modified)
- MessagePack compression
- Individual file storage

## Key Features

1. **Scalability**: R2 handles unlimited file sizes
2. **Validation**: Auto-detect outdated translations
3. **Git Integration**: Full blame + commit info
4. **Separation**: R2 (immutable) + D1 (mutable)
5. **Caching**: Aggressive caching strategy
