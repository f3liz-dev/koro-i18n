# koro-i18n

A lightweight internationalization (i18n) platform for managing translations. Built with a modern stack designed for simplicity and performance.

## Architecture

```
koro-i18n/
├── frontend/    # ReScript + Preact — deployed to Cloudflare Workers
└── server/      # Node.js + Hono — runs on VM server
```

### Backend (VM Server)

- **Runtime**: Node.js
- **Framework**: [Hono](https://hono.dev) — lightweight, fast web framework
- **Database**: SQLite via [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) — simple, zero-config, local data

The server runs on a VM and keeps a local SQLite copy of translation data for fast reads and simplified operations.

### Frontend (Cloudflare Workers)

- **Language**: [ReScript](https://rescript-lang.org) — type-safe, compiles to clean JavaScript
- **UI Library**: [Preact](https://preactjs.com) — fast 3kB React alternative
- **Build**: [Vite](https://vitejs.dev) — fast development and production builds
- **Hosting**: Cloudflare Workers/Pages for edge delivery
- **Bundle size**: ~20 KB (7.7 KB gzipped)

## Sync Workflow

### Uploading from a repository

Import translation files into the platform using the sync API. This handles JSON files with key-value entries from any source (manual edits, Crowdin, GitHub, etc.):

```bash
# Import a Japanese translation file with author credit
curl -X POST /api/projects/1/sync/import \
  -H 'Content-Type: application/json' \
  -d '{
    "locale": "ja",
    "source": "crowdin",
    "author_name": "Translator Name",
    "author_email": "translator@example.com",
    "file_path": "locales/ja/common.json",
    "entries": {
      "greeting": "こんにちは",
      "farewell": "さようなら"
    }
  }'
```

### Downloading to a repository

Export translations with contributor credit for git commits:

```bash
curl /api/projects/1/sync/export/ja
```

Returns:

```json
{
  "locale": "ja",
  "translations": {
    "greeting": "こんにちは",
    "farewell": "さようなら"
  },
  "coauthors": [
    "Co-authored-by: Translator Name <translator@example.com>"
  ],
  "count": 2
}
```

### Mixed translation sources

The platform tracks the `source` of each translation entry (`crowdin`, `github`, `platform`, `import`, etc.). When importing files that have entries from multiple translators, each entry preserves its original author and source. This means:

- Entries translated in **Crowdin** keep the Crowdin translator's credit
- Entries translated directly on **GitHub** keep the GitHub user's credit
- Entries translated on the **platform** keep the platform translator's credit

### Preserving credit in git

When exporting translations, the API returns `Co-authored-by` trailers that can be appended to git commit messages. This ensures translators appear as contributors on GitHub:

```bash
git commit -m "Update Japanese translations

Co-authored-by: Translator A <a@example.com>
Co-authored-by: Translator B <b@example.com>"
```

## Development

### Prerequisites

- Node.js >= 20
- npm

### Setup

```bash
# Install all dependencies
npm run setup

# Start development (both frontend and server)
npm run dev
```

### Individual Commands

```bash
# Frontend
cd frontend
npm run res:build   # Build ReScript
npm run dev         # Start Vite dev server + ReScript watch

# Server
cd server
npm run dev         # Start server with auto-reload
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/projects` | List projects (with key/locale counts) |
| POST | `/api/projects` | Create a project |
| GET | `/api/projects/:id` | Get project details (with contributors) |
| DELETE | `/api/projects/:id` | Delete a project |
| GET | `/api/projects/:id/keys` | List source keys |
| POST | `/api/projects/:id/keys` | Push source keys (batch upsert) |
| GET | `/api/projects/:id/translations` | Translation status overview |
| GET | `/api/projects/:id/translations/:locale` | Get translations for locale |
| PUT | `/api/projects/:id/translations/:locale` | Update translations (with author) |
| POST | `/api/projects/:id/sync/import` | Import translation file from repo |
| GET | `/api/projects/:id/sync/export/:locale` | Export translations with co-authors |
| GET | `/api/projects/:id/sync/contributors` | List project contributors |

## UI Design Principles (簡素なUI)

The frontend follows the principle: **簡素なUIとは、すべての要素が適切な階層に収まり、必要なときに必要なだけ現れる設計である。**

| Layer | Content | Principles |
|-------|---------|-----------|
| Always visible | Core actions — project list, key stats | Visual hierarchy, consistency, whitespace |
| One step deeper | Settings, details, advanced features | Progressive disclosure |
| On-demand only | Errors, confirmations, state changes | Minimal feedback, state visibility |

## License

MIT
