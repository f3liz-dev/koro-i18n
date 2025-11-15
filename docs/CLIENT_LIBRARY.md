# Client Library Implementation

## Overview

The client library preprocesses files before uploading to minimize worker CPU time.

## Required Preprocessing

### 1. Git Blame

Extract commit info for each line:

```javascript
import { execSync } from 'child_process';

function getGitBlame(filePath) {
  const blame = execSync(`git blame --line-porcelain "${filePath}"`, {
    encoding: 'utf-8'
  });
  
  // Parse blame output
  const blameData = [];
  // ... parse logic
  return blameData;
}
```

### 2. Source Hashes

Generate hash for each key's value:

```javascript
import crypto from 'crypto';

function hashValue(value) {
  return crypto.createHash('sha256')
    .update(String(value))
    .digest('hex')
    .substring(0, 16);
}

const sourceHashes = {};
for (const [key, value] of Object.entries(contents)) {
  sourceHashes[key] = hashValue(value);
}
```

### 3. Metadata Structure

```javascript
const metadata = {
  gitBlame: {
    "key1": {
      commit: "abc123",
      author: "John Doe",
      email: "john@example.com",
      date: "2024-01-01T00:00:00Z"
    }
  },
  charRanges: {
    "key1": {
      start: [10, 5],  // [line, char]
      end: [10, 25]
    }
  },
  sourceHashes: {
    "key1": "a1b2c3d4"
  }
};
```

### 4. MessagePack Compression

```javascript
import { encode } from '@msgpack/msgpack';

const metadataPacked = encode(metadata);
const metadataBase64 = Buffer.from(metadataPacked).toString('base64');
```

## Upload Format

### Single Upload (< 50 files)

```javascript
const payload = {
  branch: 'main',
  commitSha: getCurrentCommit(),
  sourceLanguage: 'en',
  files: [
    {
      lang: 'en',
      filename: 'common.json',
      contents: { "key1": "value1" }, // Flattened
      metadata: metadataBase64,       // Base64 MessagePack
      sourceHash: hashFile(file)      // Hash of entire file
    }
  ]
};

await fetch(`${platformUrl}/api/projects/${projectName}/upload`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(payload)
});
```

### Chunked Upload (200+ files)

For large file sets, the client library automatically chunks uploads:

```javascript
const payload = {
  branch: 'main',
  commitSha: getCurrentCommit(),
  sourceLanguage: 'en',
  files: [...], // Chunk of 50 files
  chunked: {
    uploadId: 'abc123-1234567890',
    chunkIndex: 1,
    totalChunks: 5,
    isLastChunk: false
  }
};
```

**Chunking behavior:**
- Default chunk size: 10 files (optimized for Cloudflare free tier)
- Configurable via `UPLOAD_CHUNK_SIZE` environment variable
- Progress reported for each chunk
- Pre-packed data (zero server CPU for encoding)
- D1 updates and translation invalidation only run on the last chunk
- Each chunk uploads independently with retry capability

**Example output:**
```
📦 Pre-packing files for optimized upload...
📤 Uploading 237 files (chunk size: 10)...
📤 Uploading chunk 1/24 (10 files)...
  ✓ Chunk 1/24 complete (4% total)
📤 Uploading chunk 2/24 (10 files)...
  ✓ Chunk 2/24 complete (8% total)
...
```

## Why Client Preprocessing?

1. **Worker CPU < 10ms**: No heavy processing on worker
2. **Free Tier Friendly**: Minimize worker execution time
3. **Git Integration**: Client has access to git history
4. **Scalability**: Parallel processing on client
5. **Chunked Uploads**: Handle 200+ files efficiently with progress tracking

## Server Optimization Strategy

To stay within Cloudflare's free tier (10ms CPU time), the server does ZERO encoding:

### Client-Side Pre-Packing
1. **Client packs data with MessagePack** - All encoding happens on GitHub Actions
2. **Server receives base64-encoded binary** - Ready for R2 storage
3. **Server just decodes base64 and writes to R2** - ~0.3ms CPU per file

### Chunked Upload Optimization
1. **Batched D1 writes** - Single INSERT for all files in chunk (~2ms total)
2. **Translation invalidation deferred** - Only runs on the last chunk
3. **Zero MessagePack encoding** - Client sends pre-packed data
4. **Ultra-fast R2 writes** - Direct binary upload

**Chunked upload flow (240 files, 10 per chunk):**
- Chunks 1-23: R2 write + Batched D1 insert (~5ms CPU each)
- Chunk 24 (last): R2 write + Batched D1 insert + Invalidate translations (~7ms CPU)
- **Total: ~122ms CPU across 24 requests** (well under free tier limit)

**CPU time breakdown per chunk:**
- Base64 decode: ~1ms
- R2 writes: ~2ms
- Batched D1 insert: ~2ms (for all 10 files!)
- **Total: ~5ms per chunk** ✅
- Last chunk adds: +2ms for invalidation = ~7ms ✅

This keeps the server under 10ms CPU per request, staying within the free tier.
