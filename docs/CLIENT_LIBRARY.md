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

## Why Client Preprocessing?

1. **Worker CPU < 10ms**: No heavy processing on worker
2. **Free Tier Friendly**: Minimize worker execution time
3. **Git Integration**: Client has access to git history
4. **Scalability**: Parallel processing on client
