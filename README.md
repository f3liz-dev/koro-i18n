# koro-i18n

A lightweight, intuitive i18n platform powered by Cloudflare Workers.

## Quick Start

### 1. Add Configuration

Create `koro.config.json` in your repository:

```json
{
  "version": 1,
  "sourceLanguage": "en",
  "targetLanguages": ["ja", "es", "fr", "de"],
  "files": {
    "include": ["locales/{lang}/**/*.json"]
  }
}
```

### 2. Create a Project

1. Log in with GitHub at https://koro.f3liz.workers.dev
2. Create a new project and link it to your repository

### 3. Set Up GitHub Action

Create `.github/workflows/i18n.yml`:

```yaml
name: i18n Sync

on:
  push:
    branches: [main]
    paths:
      - 'locales/en/**'
  schedule:
    - cron: '0 */6 * * *'
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: write
    steps:
      - uses: actions/checkout@v4
      - uses: f3liz-dev/koro-i18n/.github/actions/sync@main
        with:
          project-name: your-project-name
```

That's it! Your translations will sync automatically.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Your Repository                                    │
│                                                                             │
│  koro.config.json              locales/                                      │
│  (configuration)               ├── en/common.json  (source)                 │
│                                └── ja/common.json  (target)                 │
│                                                                             │
│  Optional: .koro-i18n/translations.jsonl  (generated metadata)              │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                    GitHub Action runs `npx @koro-i18n/client generate`
                    to create metadata (optional, for advanced use cases)
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Koro i18n Platform (Backend)                           │
│                                                                             │
│  API Endpoints:                                                              │
│  • GET  /api/projects/:name/translations/file/:lang/:file                   │
│    → Returns source + target translations in one call                        │
│  • POST /api/projects/:name/translations                                     │
│    → Submit new translation                                                  │
│  • GET  /api/projects/:name/apply/export                                     │
│    → Export approved translations for GitHub Action                          │
│                                                                             │
│  Storage: D1 (web-submitted translations only)                               │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Web Frontend (SolidJS)                                 │
│                                                                             │
│  Translation Editor:                                                         │
│  • Fetches all data in single API call                                       │
│  • Side-by-side source/target view                                           │
│  • Submit, approve, reject translations                                      │
│  • Filter by status, search by key/value                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Fetch**: Frontend requests `/translations/file/:lang/:file`
   - Backend fetches source and target files from GitHub
   - Backend fetches web translations from D1
   - Returns unified response with all data

2. **Edit**: User submits translation via web UI
   - Stored in D1 as "pending" status
   - Owner can approve/reject

3. **Sync**: GitHub Action runs periodically
   - Calls `/apply/export` to get approved translations
   - Commits translations back to repository
   - Marks translations as "committed"

## CLI

```bash
# Initialize config
npx @koro-i18n/client init

# Validate config and find translation files
npx @koro-i18n/client validate

# Generate metadata (optional, for advanced use)
npx @koro-i18n/client generate
```

## Development

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Run locally
npm run dev:all

# Run tests
npm run test
```

## Tech Stack

- **Frontend**: Elm + Vite + Minimal CSS
- **Backend**: Cloudflare Workers + Hono + Prisma (D1)
- **Auth**: GitHub OAuth + OIDC (for GitHub Actions)

## API Reference

### Translation Endpoints

```
GET /api/projects/:name/translations/file/:lang/:file
  → { source, target, pending, approved, sourceLanguage, targetLanguage, filename, commitSha }

POST /api/projects/:name/translations
  Body: { language, filename, key, value }
  → { success: true, id }

PATCH /api/projects/:name/translations/:id
  Body: { status: "approved" | "rejected" }
  → { success: true }

DELETE /api/projects/:name/translations/:id
  → { success: true }
```

### Apply Endpoints (for GitHub Actions)

```
GET /api/projects/:name/apply/preview
  → { preview: { translations, files } }

GET /api/projects/:name/apply/export
  → { translations, files, contributors }

POST /api/projects/:name/apply/committed
  Body: { translationIds: [...] }
  → { success: true, count }
```

## Manual Merge Protocol

> **⚠️ Deprecation Notice:** Direct manual commits to translation files are discouraged. Use the Koro platform for proper attribution and workflow management.

If you must merge translations manually (e.g., from Crowdin exports), please follow these guidelines:

1. **Use the Export Endpoint First**: Before any manual merge, check `/api/projects/:name/apply/export` for pending translations to avoid conflicts.

2. **Proper Attribution**: Add `Co-authored-by` trailers to preserve contributor credits:
   ```
   Co-authored-by: Username <email@example.com>
   ```

3. **Mark as Committed**: After merging, notify the platform by calling `POST /api/projects/:name/apply/committed` with the translation IDs.

4. **Conflict Resolution**: The platform detects external changes. When the repository content differs from approved translations, contributors are prompted to resolve conflicts in the editor.

## License

MIT
