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
- Default chunk size: 50 files
- Configurable via `UPLOAD_CHUNK_SIZE` environment variable
- Progress reported for each chunk
- Translation invalidation only runs on the last chunk
- Each chunk uploads independently with retry capability

**Example output:**
```
📦 Uploading 237 files (chunk size: 50)...
📤 Uploading chunk 1/5 (50 files)...
  ✓ Chunk 1/5 complete (21% total)
📤 Uploading chunk 2/5 (50 files)...
  ✓ Chunk 2/5 complete (42% total)
...
```

## Why Client Preprocessing?

1. **Worker CPU < 10ms**: No heavy processing on worker
2. **Free Tier Friendly**: Minimize worker execution time
3. **Git Integration**: Client has access to git history
4. **Scalability**: Parallel processing on client
5. **Chunked Uploads**: Handle 200+ files efficiently with progress tracking
