# Translation History & Schema Mapping Feature

## Overview

This feature enhances the koro-i18n platform with comprehensive git history tracking, structure mapping, and source validation for translations. It enables better collaboration through co-authored commits and helps maintain translation quality by tracking source changes.

## Key Features

### 1. Git History Tracking

The platform now tracks the git commit history for each translation value at both file and per-key levels, including:
- Commit SHA
- Author name and email
- Commit timestamp

#### Per-Key History Tracking

The system uses `git blame` to extract history for individual keys in JSON files:
- Each translation key is mapped to the line(s) where it appears in the source file
- Git blame provides commit information for each line
- Keys are associated with their specific last-modified commit

This enables granular tracking of who last modified each translation key, allowing for:
- More accurate contributor attribution
- Better understanding of when specific translations were changed
- Fine-grained audit trails for individual keys

**Example:** In a file with multiple keys like `welcome`, `goodbye`, and `hello`, each key can have a different commit author and timestamp if they were modified in separate commits.

This information is extracted during upload and stored in the `TranslationHistory` table with `commitAuthor` and `commitEmail` fields.

### 2. Structure Mapping

A structure map is generated for each file that tracks the relationship between:
- Original nested JSON structure
- Flattened dot-notation keys
- Source content hash for each value

This allows the platform to:
- Reconstruct original file structure on download
- Validate that translations are still valid when source changes

### 3. Source Content Validation

Each translation stores a hash of the source content it was translated from. When the source changes:
- The hash changes
- Platform can identify which translations need updating
- Validation endpoint shows which translations are outdated

### 4. Co-Authored Commits

When downloading translations and committing them back to the repository, the platform:
- Fetches the git history for each translation
- Adds co-author trailers to the commit message
- Properly attributes all contributors

## API Changes

### Upload Endpoint Enhancement

**Endpoint:** `POST /api/projects/:projectName/upload`

The upload endpoint now accepts additional fields in each file object:

```typescript
interface TranslationFile {
  // ... existing fields ...
  
  // Git history for the file
  history?: KeyHistory[];
  
  // Structure map for original → flattened mapping
  structureMap?: StructureMapEntry[];
  
  // Hash of the entire file content
  sourceHash?: string;
}

interface KeyHistory {
  key: string;  // Flattened key name (e.g., "welcome", "buttons.save") or '__file__' for file-level history
  commits: GitCommitInfo[];
}

interface GitCommitInfo {
  commitSha: string;
  author: string;
  email: string;
  timestamp: string;
}

interface StructureMapEntry {
  flattenedKey: string;      // e.g., "app.settings.theme"
  originalPath: string[];    // e.g., ["app", "settings", "theme"]
  sourceHash: string;        // Hash of this specific value
}
```

**Example Upload with Per-Key History:**

```json
{
  "branch": "main",
  "commitSha": "abc123",
  "sourceLanguage": "en",
  "files": [
    {
      "filetype": "json",
      "filename": "common.json",
      "lang": "en",
      "contents": {
        "welcome": "Welcome",
        "goodbye": "Goodbye",
        "app.title": "My App"
      },
      "history": [
        {
          "key": "welcome",
          "commits": [
            {
              "commitSha": "abc123",
              "author": "John Doe",
              "email": "john@example.com",
              "timestamp": "2024-01-01T00:00:00Z"
            }
          ]
        },
        {
          "key": "goodbye",
          "commits": [
            {
              "commitSha": "def456",
              "author": "Jane Smith",
              "email": "jane@example.com",
              "timestamp": "2024-01-02T00:00:00Z"
            }
          ]
        },
        {
          "key": "app.title",
          "commits": [
            {
              "commitSha": "ghi789",
              "author": "Bob Johnson",
              "email": "bob@example.com",
              "timestamp": "2024-01-03T00:00:00Z"
            }
          ]
        }
      ],
      "structureMap": [
        {
          "flattenedKey": "welcome",
          "originalPath": ["welcome"],
          "sourceHash": "hash1"
        },
        {
          "flattenedKey": "goodbye",
          "originalPath": ["goodbye"],
          "sourceHash": "hash2"
        },
        {
          "flattenedKey": "app.title",
          "originalPath": ["app", "title"],
          "sourceHash": "hash3"
        }
      ],
      "sourceHash": "filehash123"
    }
  ]
}
```

Note how each key (`welcome`, `goodbye`, `app.title`) has its own history entry with a specific commit and author. This allows the platform to track exactly who last modified each translation key.

### Download Endpoint Enhancement

**Endpoint:** `GET /api/projects/:projectName/download`

New query parameters:
- `unflatten=true` - Returns files in original nested structure using structure map
- `includeMetadata=true` - Includes metadata with sourceHash, commitSha, etc.

**Example Request:**

```
GET /api/projects/my-project/download?branch=main&unflatten=true&includeMetadata=true
```

**Example Response:**

```json
{
  "project": "my-project",
  "repository": "owner/repo",
  "branch": "main",
  "files": {
    "en": {
      "common.json": {
        "welcome": "Welcome",
        "app": {
          "title": "My App"
        }
      }
    }
  },
  "metadata": {
    "en": {
      "common.json": {
        "sourceHash": "filehash123",
        "commitSha": "abc123",
        "uploadedAt": "2024-01-01T00:00:00Z",
        "structureMapAvailable": true
      }
    }
  }
}
```

### New Validation Endpoint

**Endpoint:** `GET /api/projects/:projectName/validate`

Query parameters:
- `branch` - Branch to validate (default: main)
- `language` - Specific language to validate (optional, validates all if not specified)

**Example Request:**

```
GET /api/projects/my-project/validate?branch=main&language=ja
```

**Example Response:**

```json
{
  "project": "my-project",
  "branch": "main",
  "sourceLanguage": "en",
  "validationResults": [
    {
      "filename": "common.json",
      "language": "ja",
      "status": "invalid",
      "totalKeys": 10,
      "validKeys": 8,
      "invalidKeys": 2,
      "missingKeys": 0,
      "invalidKeysList": ["welcome", "app.title"],
      "missingKeysList": []
    }
  ]
}
```

Validation status meanings:
- `valid` - All translations are up-to-date with source
- `invalid` - Some translations are outdated or missing
- `no_source` - Source file not found for this translation file

### Upload-JSON Deprecation

The `/upload-json` endpoint is now deprecated. While it still works, it logs a deprecation warning:

```
[DEPRECATED] /upload-json endpoint is deprecated. Please use /upload with structured format instead.
```

Users should migrate to the structured `/upload` endpoint which supports history tracking and structure mapping.

## Client Library Changes

### New Functions

The client library (`@i18n-platform/client`) now includes:

1. **`extractGitHistory(filePath)`** - Extracts git log history for a file (fallback method)
2. **`extractPerKeyGitHistory(filePath, keys)`** - **Primary method**: Extracts per-key history using git blame
   - Maps each flattened key to its line number in the source file
   - Uses git blame to get commit info for each line
   - Associates each key with its specific last-modified commit
   - Falls back to file-level history if key mapping fails
3. **`buildStructureMap(obj, sourceContent)`** - Generates structure map
4. **`calculateHash(content)`** - Calculates SHA-256 hash

### Updated `processFile` Function

```typescript
processFile(filePath: string, format: string, includeHistory = true): TranslationFile | null
```

Now includes:
- Git history extraction (when `includeHistory` is true)
- Structure map generation
- Source hash calculation

## GitHub Actions Changes

### Upload Action

The upload action continues to work as before but now sends history and structure map data automatically when using the client library.

### Download Action

Enhanced with:

1. **Server-side unflattening** - Uses `unflatten=true` parameter to get properly structured files
2. **Co-author attribution** - Fetches translation history and adds co-author trailers to commit messages

**Example commit message with co-authors:**

```
chore: Update translations from i18n platform

Co-authored-by: Alice <alice@example.com>
Co-authored-by: Bob <bob@example.com>
```

## Database Schema Changes

### ProjectFile Table

New fields:
- `sourceHash` (TEXT) - Hash of source file content
- `structureMap` (TEXT) - JSON string of structure mapping

### TranslationHistory Table

New fields:
- `sourceContent` (TEXT) - Source content hash at time of translation
- `commitAuthor` (TEXT) - Git commit author name
- `commitEmail` (TEXT) - Git commit author email

## Migration

A migration file has been created at `migrations/0003_add_history_and_structure_fields.sql` to add the new fields to existing databases.

For local development:
```bash
pnpm run prisma:migrate:local
```

For production:
```bash
pnpm run prisma:migrate:remote
```

## Usage Examples

### Uploading with History

When using the GitHub Actions, history is automatically included. For manual uploads:

```typescript
import { processProject, uploadToPlatform } from '@i18n-platform/client';

const metadata = await processProject(
  'owner/repo',
  'main',
  'abc123',
  '.koro-i18n.repo.config.toml'
);

// metadata.files now includes history and structureMap
await uploadToPlatform(
  'my-project',
  metadata,
  'https://koro.f3liz.workers.dev',
  token
);
```

### Downloading with Original Structure

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://koro.f3liz.workers.dev/api/projects/my-project/download?branch=main&unflatten=true&includeMetadata=true"
```

### Validating Translations

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://koro.f3liz.workers.dev/api/projects/my-project/validate?branch=main&language=ja"
```

## Benefits

1. **Better Attribution** - Contributors are properly credited through co-authored commits
2. **Source Validation** - Know which translations need updating when source changes
3. **Structure Preservation** - Original file structure is maintained on download
4. **Audit Trail** - Complete history of who changed what and when
5. **Quality Assurance** - Validation endpoint helps maintain translation quality

## Future Enhancements

Potential future improvements:
- ~~Per-key history tracking~~ ✅ **Implemented** - Each key now has individual history
- Automatic outdated translation notifications
- Translation quality scoring based on source changes
- Bulk validation across all projects
- History visualization in the UI
- Blame view showing who last modified each translation key in the UI
