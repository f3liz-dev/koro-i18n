# Client Library Implementation

## Overview

The client library preprocesses files before uploading to minimize worker CPU time.

**For complete flow documentation**, see [FLOWS.md](FLOWS.md#upload-flow)

## Quick Reference

### Required Preprocessing

1. **Git Blame** - Extract commit info for each line
2. **Source Hashes** - Generate hash for each key's value (SHA256, 16 chars)
3. **Metadata Structure** - Organize git blame, character ranges, and hashes
4. **MessagePack Compression** - Compress metadata for efficient transfer

### Upload Format

**Single Upload** (< UPLOAD_CHUNK_SIZE files):
```json
{
  "branch": "main",
  "commitSha": "abc123",
  "sourceLanguage": "en",
  "files": [
    {
      "lang": "en",
      "filename": "common.json",
      "contents": { "key": "value" },
      "metadata": "<base64-msgpack>",
      "sourceHash": "file-hash"
    }
  ],
  "allSourceFiles": ["en/common.json", "ja/common.json"]
}
```

**Chunked Upload** (> UPLOAD_CHUNK_SIZE files):
```json
{
  "branch": "main",
  "commitSha": "abc123",
  "sourceLanguage": "en",
  "files": [...],
  "chunked": {
    "uploadId": "abc123-1234567890",
    "chunkIndex": 1,
    "totalChunks": 24,
    "isLastChunk": false
  },
  "allSourceFiles": ["en/common.json", ...]
}
```

## Key Features

### 1. Differential Upload

Automatically skips unchanged files:
- Fetches existing files from platform
- Compares sourceHash values
- Uploads only changed files
- Reduces upload time by 90%+ for typical updates

### 2. Automatic Cleanup

Removes orphaned files:
- Tracks all source files
- Identifies files in R2 but not in source
- Deletes from both R2 and D1
- Runs after upload completes

### 3. Chunked Upload

Handles large file sets efficiently:
- Default chunk size: 10 files (free tier optimized)
- Configurable via `UPLOAD_CHUNK_SIZE` environment variable
- Progress reporting per chunk
- D1 updates and invalidation only on last chunk

### 4. CPU Optimization

Client-side pre-packing keeps server under 10ms CPU:
- **Client**: MessagePack encode + base64 (~0.6ms per file)
- **Server**: Base64 decode + R2 write (~0.3ms per file)
- **Result**: <5ms CPU per chunk ✅

## Why Client Preprocessing?

1. **Worker CPU < 10ms**: No heavy processing on worker
2. **Free Tier Friendly**: Minimize worker execution time
3. **Git Integration**: Client has access to git history
4. **Scalability**: Parallel processing on client
5. **Chunked Uploads**: Handle 200+ files efficiently with progress tracking
6. **Differential Upload**: Only upload changed files
7. **Automatic Cleanup**: Remove orphaned files from R2

## Server Optimization Strategy

To stay within Cloudflare's free tier (10ms CPU time), the server does ZERO encoding:

**Client-Side Pre-Packing**:
1. Client packs data with MessagePack
2. Server receives base64-encoded binary
3. Server just decodes base64 and writes to R2

**Chunked Upload Optimization**:
1. Batched D1 writes - Single INSERT for all files (~2ms total)
2. Translation invalidation deferred - Only runs on last chunk
3. Zero MessagePack encoding - Client sends pre-packed data
4. Ultra-fast R2 writes - Direct binary upload

**CPU Time Breakdown** (per chunk, 10 files):
- Base64 decode: ~1ms
- R2 writes: ~2ms
- Batched D1 insert: ~2ms
- **Total: ~5ms per chunk** ✅
- **Last chunk**: +2ms for invalidation = ~7ms ✅

**Example**: 240 files with 10 per chunk
- 23 chunks × 5ms = 115ms
- 1 last chunk × 7ms = 7ms
- **Total: ~122ms CPU across 24 requests** (well under free tier limit)

## Configuration

**Default Settings** (Free Tier Optimized):
```bash
UPLOAD_CHUNK_SIZE=10  # Default
```

**Paid Tier** (Higher Limits):
```bash
UPLOAD_CHUNK_SIZE=50  # For paid plans with higher CPU limits
```

## Implementation Files

- `client-library/src/index.ts` - Pre-packing logic
- `src/lib/r2-storage.ts` - Zero-encoding storage
- `src/routes/project-files.ts` - Deferred D1/invalidation
- `.github/actions/upload-translations/action.yml` - Default chunk size

## See Also

- [FLOWS.md](FLOWS.md) - Complete technical flow documentation
- [CLIENT_SETUP.md](CLIENT_SETUP.md) - Repository integration guide
- [ARCHITECTURE.md](ARCHITECTURE.md) - System design overview

