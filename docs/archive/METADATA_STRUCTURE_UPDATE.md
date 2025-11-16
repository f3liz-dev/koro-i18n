# Metadata Structure Update - Line Ranges ✅

## Changes Made

### Client Library (`client-library/src/index.ts`)

**Updated `buildMetadata()` function:**
- ✅ Format-aware (JSON, Markdown, etc.)
- ✅ Tracks both start and end line numbers
- ✅ Supports multi-line values (for future formats)
- ✅ Optimized for JSON (single-line values)

**Metadata Structure:**
```typescript
{
  gitBlame: {
    "key": {
      commit: "abc123",
      author: "John Doe",
      email: "john@example.com",
      date: "2024-01-01T00:00:00Z"
    }
  },
  charRanges: {
    "key": {
      start: [lineNum, charPos],  // Start position
      end: [lineNum, charPos]     // End position (can be different line)
    }
  },
  sourceHashes: {
    "key": "hash123"  // For validation
  }
}
```

### Server (`src/lib/r2-storage.ts`)

**Updated `R2FileData` interface:**
```typescript
interface R2FileData {
  raw: Record<string, any>;
  metadata: {
    gitBlame: Record<string, GitBlameInfo>;
    charRanges: Record<string, {
      start: [number, number]; // [line, char]
      end: [number, number];   // [line, char] - can be different line
    }>;
    sourceHashes: Record<string, string>;
  };
  sourceHash: string;
  commitSha: string;
  uploadedAt: string;
}
```

### Frontend (`src/app/utils/translationApi.ts`)

**Updated interfaces:**
```typescript
interface R2FileData {
  // ... includes charRanges
}

interface MergedTranslation {
  key: string;
  sourceValue: string;
  currentValue: string;
  gitBlame?: GitBlameInfo;
  charRange?: {
    start: [number, number];
    end: [number, number];
  };
  webTranslation?: WebTranslation;
  isValid: boolean;
}
```

**Updated `mergeTranslations()`:**
- Includes `charRange` in merged data
- Available for UI display

## Format Support

### JSON (Current)
```json
{
  "welcome": "Welcome to our app",
  "goodbye": "See you later"
}
```
- Single-line values
- `start` and `end` on same line
- Efficient and accurate

### Markdown (Future)
```markdown
## Section
- welcome: Welcome to our app!
  This is a multi-line
  description.
- goodbye: See you later!
```
- Multi-line values supported
- `start` and `end` can be different lines
- Full range tracking

## Use Cases

### 1. Git Blame Display
```typescript
// Show which lines were modified
const range = translation.charRange;
console.log(`Lines ${range.start[0]} to ${range.end[0]}`);
```

### 2. Source Highlighting
```typescript
// Highlight the exact range in source file
const startLine = charRange.start[0];
const endLine = charRange.end[0];
// Highlight lines startLine through endLine
```

### 3. Diff Display
```typescript
// Show what changed in git
if (charRange.start[0] === charRange.end[0]) {
  console.log('Single-line change');
} else {
  console.log(`Multi-line change (${charRange.end[0] - charRange.start[0] + 1} lines)`);
}
```

## Benefits

### Flexibility
- Supports current JSON format
- Ready for future multi-line formats (Markdown, YAML, etc.)
- Extensible structure

### Accuracy
- Precise line tracking
- Character-level positioning
- Git blame per line

### Performance
- Format-specific optimizations
- Efficient for JSON (most common)
- Scalable for larger formats

## Migration

### No Breaking Changes
- Existing data structure extended
- Backward compatible
- Optional fields

### Data Flow
```
Client (preprocess) → MessagePack → R2 (store) → Frontend (display)
```

All components updated:
- ✅ Client library
- ✅ Server types
- ✅ Frontend types
- ✅ Merge logic

## Summary

The metadata structure now properly supports:
- **Line ranges**: Both start and end positions
- **Multi-line values**: Ready for future formats
- **Format-aware**: Optimized per file type
- **Backward compatible**: No breaking changes

Ready for both current JSON and future Markdown/YAML formats! 🎉
