# Final Architecture

## Push/Pull Model

### Client → Platform (Push)

**Client uploads processed translation files:**

```
Client Repository (GitHub Actions)
  ↓
@i18n-platform/client library
  ↓ Processes files
  ↓ Flattens nested structures
  ↓ Extracts metadata
  ↓
POST /api/projects/upload
  ↓
Platform API (Cloudflare Workers)
  ↓
D1 Database (project_files table)
```

**Data Format:**
```json
{
  "repository": "owner/repo",
  "branch": "main",
  "commit": "abc123",
  "files": [
    {
      "filetype": "json",
      "filename": "common.json",
      "lang": "en",
      "contents": {
        "key1": "value1",
        "nested.key2": "value2"
      },
      "metadata": {
        "size": 1024,
        "keys": 2
      }
    }
  ]
}
```

### Platform → Client (Pull)

**Platform commits translations back:**

```
Cron Job (every 5 min)
  ↓
Fetch approved translations from D1
  ↓
Group by project/language/file
  ↓
Read source file from D1
  ↓
Merge translations
  ↓
GitHub API (create commit)
  ↓
Client Repository
  ↓
GitHub Actions (re-upload)
```

## Database Schema

### project_files
```sql
CREATE TABLE project_files (
  id TEXT PRIMARY KEY,
  projectId TEXT NOT NULL,        -- "owner/repo"
  branch TEXT NOT NULL,            -- "main"
  commit TEXT NOT NULL,            -- "abc123..."
  filename TEXT NOT NULL,          -- "common.json"
  filetype TEXT NOT NULL,          -- "json" | "markdown"
  lang TEXT NOT NULL,              -- "en" | "ja" | "es"
  contents TEXT NOT NULL,          -- JSON: {"key": "value"}
  metadata TEXT,                   -- JSON: {"size": 1024, "keys": 10}
  uploadedAt DATETIME,
  UNIQUE(projectId, branch, filename, lang)
);
```

### translations
```sql
CREATE TABLE translations (
  id TEXT PRIMARY KEY,
  projectId TEXT NOT NULL,
  language TEXT NOT NULL,
  filename TEXT NOT NULL,          -- NEW: which file
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  userId TEXT NOT NULL,
  username TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  commitSha TEXT,
  createdAt DATETIME,
  updatedAt DATETIME
);
```

### translation_history
```sql
CREATE TABLE translation_history (
  id TEXT PRIMARY KEY,
  translationId TEXT NOT NULL,
  projectId TEXT NOT NULL,
  language TEXT NOT NULL,
  filename TEXT NOT NULL,          -- NEW: which file
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  userId TEXT NOT NULL,
  username TEXT NOT NULL,
  action TEXT NOT NULL,
  commitSha TEXT,
  createdAt DATETIME
);
```

## API Endpoints

### Client APIs

```http
# Upload files (client library)
POST /api/projects/upload
Authorization: Bearer API_KEY
Body: {repository, branch, commit, files[]}

# Get project files (web UI)
GET /api/projects/:projectId/files?branch=main&lang=en
Authorization: Bearer JWT_TOKEN
```

### Translation APIs

```http
# Submit translation
POST /api/translations
Body: {projectId, language, filename, key, value}

# List translations
GET /api/translations?projectId=owner/repo&language=ja&status=pending

# Get history
GET /api/translations/history?projectId=owner/repo&language=ja&filename=common.json&key=welcome

# Approve
POST /api/translations/:id/approve

# Delete
DELETE /api/translations/:id
```

## Workflow

### 1. Initial Upload

```bash
# Client repository
git push
  ↓
GitHub Actions runs
  ↓
i18n-upload processes files
  ↓
POST /api/projects/upload
  ↓
Files stored in D1
```

### 2. Translation

```
User opens platform
  ↓
GET /api/projects/owner%2Frepo/files
  ↓
Platform returns files from D1
  ↓
User translates "welcome" → "ようこそ"
  ↓
POST /api/translations
  ↓
Stored in D1 (status: pending)
```

### 3. Approval

```
Reviewer opens platform
  ↓
Sees pending translation
  ↓
POST /api/translations/:id/approve
  ↓
Status: approved
```

### 4. Commit

```
Cron runs (every 5 min)
  ↓
SELECT * FROM translations WHERE status='approved'
  ↓
Group by projectId, language, filename
  ↓
SELECT contents FROM project_files WHERE projectId=X AND lang=Y AND filename=Z
  ↓
Merge: {"welcome": "ようこそ"}
  ↓
GitHub API: Create commit
  ↓
Status: committed
```

### 5. Re-upload

```
GitHub commit triggers workflow
  ↓
i18n-upload runs again
  ↓
Uploads updated files
  ↓
Files in D1 now include "ようこそ"
```

## Benefits

### ✅ No Repository Cloning
- Platform never clones repositories
- All data via API or uploaded
- Faster, less resource intensive

### ✅ Always Up-to-Date
- Client pushes on every change
- No stale data
- No cache invalidation issues

### ✅ Simple Client
- Single npm package
- One command: `i18n-upload`
- Works in GitHub Actions

### ✅ Scalable
- D1 handles all storage
- No file system needed
- Edge deployment ready

### ✅ Secure
- API key authentication
- JWT for web UI
- Bot token for commits

## File Processing

### Input (JSON)
```json
{
  "welcome": "Welcome",
  "buttons": {
    "save": "Save",
    "cancel": "Cancel"
  }
}
```

### Processed (Flattened)
```json
{
  "welcome": "Welcome",
  "buttons.save": "Save",
  "buttons.cancel": "Cancel"
}
```

### Stored in D1
```json
{
  "filetype": "json",
  "filename": "common.json",
  "lang": "en",
  "contents": {
    "welcome": "Welcome",
    "buttons.save": "Save",
    "buttons.cancel": "Cancel"
  }
}
```

### After Translation
```json
{
  "filetype": "json",
  "filename": "common.json",
  "lang": "ja",
  "contents": {
    "welcome": "ようこそ",
    "buttons.save": "保存",
    "buttons.cancel": "キャンセル"
  }
}
```

### Committed Back (Nested)
```json
{
  "welcome": "ようこそ",
  "buttons": {
    "save": "保存",
    "cancel": "キャンセル"
  }
}
```

## Client Library

### Installation
```bash
npm install -g @i18n-platform/client
```

### Usage
```bash
export I18N_PLATFORM_API_KEY=your-key
i18n-upload
```

### What It Does
1. Reads `.i18n-platform.toml`
2. Finds files matching patterns
3. Parses JSON/Markdown
4. Flattens nested structures
5. Uploads to platform API

## Deployment

### Platform
```bash
wrangler deploy                      # Main API
wrangler deploy --config wrangler.cron.toml  # Cron
```

### Client Library
```bash
cd client-library
npm run build
npm publish
```

### Client Repository
```yaml
# .github/workflows/i18n-upload.yml
- run: npm install -g @i18n-platform/client
- run: i18n-upload
  env:
    I18N_PLATFORM_API_KEY: ${{ secrets.I18N_PLATFORM_API_KEY }}
```

## Summary

**Push:** Client uploads processed files → Platform stores in D1
**Pull:** Platform commits translations → Client re-uploads

**Result:** Always up-to-date, no cloning, fully scalable! 🚀
