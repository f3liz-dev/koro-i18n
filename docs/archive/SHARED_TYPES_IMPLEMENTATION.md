# Shared Types Implementation with io-ts ✅

## Overview

Implemented shared type definitions using **io-ts** for runtime validation across client, server, and frontend. This ensures type safety and consistency throughout the entire system.

## Structure

```
shared/
  └── types.ts          # Shared type definitions with io-ts codecs
client-library/
  └── src/index.ts      # Uses shared types
src/
  ├── lib/r2-storage.ts # Uses shared types
  └── app/utils/translationApi.ts  # Uses shared types
```

## Shared Types (`shared/types.ts`)

### Core Types

**LineCharPosition**: `[line, char]` tuple
**CharRange**: Start and end positions
**GitBlameInfo**: Git commit information
**R2Metadata**: Complete metadata structure
**R2FileData**: R2 file with metadata
**WebTranslation**: Web translation record
**MergedTranslation**: Combined R2 + D1 data

### Upload Types

**UploadFile**: Single file upload
**UploadPayload**: Complete upload request

### API Response Types

**R2FileResponse**: R2 file fetch response
**WebTranslationsResponse**: Web translations list
**UploadResponse**: Upload result

### Validation Helpers

```typescript
// Throws error if validation fails
validate(R2FileData, data, 'R2 file');

// Returns null if validation fails
validateSafe(WebTranslation, data);
```

## Usage

### Client Library

```typescript
import type { GitBlameInfo, R2Metadata } from '../../shared/types';

const metadata: R2Metadata = {
  gitBlame: { ... },
  charRanges: { ... },
  sourceHashes: { ... }
};
```

### Server

```typescript
import type { R2FileData } from '../../shared/types';
import { validate, UploadPayload } from '../../shared/types';

// Runtime validation
const payload = validate(UploadPayload, body, 'upload payload');
```

### Frontend

```typescript
import type { 
  R2FileData, 
  WebTranslation, 
  MergedTranslation 
} from '../../../shared/types';

// Type-safe API calls
const data: R2FileData = await response.json();
```

## Benefits

### 1. Type Safety
- Compile-time type checking (TypeScript)
- Runtime validation (io-ts)
- Consistent types across all layers

### 2. Single Source of Truth
- One definition for all components
- No type drift between client/server
- Easy to maintain and update

### 3. Runtime Validation
```typescript
// Validate API responses
const fileData = validate(R2FileData, response, 'R2 file');

// Validate user input
const translation = validateSafe(WebTranslation, input);
if (!translation) {
  throw new Error('Invalid translation data');
}
```

### 4. Documentation
- Types serve as documentation
- io-ts codecs are self-documenting
- Clear contracts between components

## Migration

### Before
```typescript
// Client
interface Metadata { ... }

// Server
interface R2FileData { ... }

// Frontend
interface R2FileData { ... }

// 3 separate definitions!
```

### After
```typescript
// shared/types.ts
export const R2FileData = t.type({ ... });
export type R2FileData = t.TypeOf<typeof R2FileData>;

// Client, Server, Frontend
import type { R2FileData } from 'shared/types';

// 1 definition, used everywhere!
```

## Examples

### Validate Upload Payload

```typescript
import { validate, UploadPayload } from '../../shared/types';

app.post('/upload', async (c) => {
  const body = await c.req.json();
  
  try {
    const payload = validate(UploadPayload, body, 'upload');
    // payload is now type-safe and validated
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});
```

### Validate API Response

```typescript
import { validateSafe, R2FileData } from '../../../shared/types';

const response = await fetch('/api/r2/...');
const data = await response.json();

const fileData = validateSafe(R2FileData, data);
if (!fileData) {
  throw new Error('Invalid R2 file data');
}

// fileData is type-safe
console.log(fileData.metadata.gitBlame);
```

### Type-Safe Merging

```typescript
import type { R2FileData, WebTranslation, MergedTranslation } from 'shared/types';

function merge(
  r2: R2FileData, 
  web: WebTranslation[]
): MergedTranslation[] {
  // TypeScript ensures all fields match
  return Object.entries(r2.raw).map(([key, value]) => ({
    key,
    sourceValue: value,
    currentValue: value,
    gitBlame: r2.metadata.gitBlame[key],
    charRange: r2.metadata.charRanges[key],
    webTranslation: web.find(w => w.key === key),
    isValid: true,
  }));
}
```

## Dependencies

```json
{
  "dependencies": {
    "io-ts": "^2.2.22",
    "fp-ts": "^2.16.11"
  }
}
```

## File Structure

```
shared/types.ts
├── Primitives (LineCharPosition, CharRange)
├── Git Blame (GitBlameInfo)
├── R2 Metadata (R2Metadata, R2FileData)
├── Upload (UploadFile, UploadPayload)
├── Web Translation (WebTranslation, WebTranslationStatus)
├── Merged (MergedTranslation)
├── API Responses (R2FileResponse, etc.)
└── Validation Helpers (validate, validateSafe)
```

## Summary

- ✅ Shared types with io-ts
- ✅ Runtime validation
- ✅ Single source of truth
- ✅ Used in client, server, frontend
- ✅ Type-safe and validated
- ✅ Easy to maintain

All components now share the same type definitions with runtime validation! 🎉
