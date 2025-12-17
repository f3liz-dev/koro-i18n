# koro-i18n

A lightweight, production-ready i18n platform powered by Elm and Cloudflare Workers.

## Architecture

- **Frontend**: Elm - Pure functional programming for a reliable, fast UI
- **Backend**: Cloudflare Workers + Hono - Edge-first, zero cold starts
- **Database**: D1 (SQLite) via Prisma - Serverless, no cost at rest
- **Auth**: GitHub OAuth + OIDC for GitHub Actions

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Your Repository                                    │
│                                                                             │
│  koro.config.json              locales/                                      │
│  (configuration)               ├── en/common.json  (source)                 │
│                                └── ja/common.json  (target)                 │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                    GitHub Action syncs translations
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Koro Platform (Cloudflare Workers)                     │
│                                                                             │
│  Elm Frontend (Static)          Hono API (Edge)                              │
│  • Pure functional UI           • GitHub OAuth                               │
│  • Type-safe views              • Translation CRUD                           │
│  • Fast, reliable               • Prisma + D1                                │
│                                 • OIDC for Actions                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

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

## Development

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Run locally (frontend + workers)
npm run dev:all

# Run tests
npm run test

# Type check
npm run type-check

# Build for production
npm run build

# Deploy to Cloudflare
npm run deploy
```

## Tech Stack

| Component | Technology | Why |
|-----------|------------|-----|
| Frontend | Elm | Type-safe, no runtime exceptions, fast |
| Backend | Cloudflare Workers | Edge computing, no cold starts, free tier |
| HTTP | Hono | Lightweight, fast, built for Workers |
| Database | D1 + Prisma | SQLite at the edge, type-safe queries |
| Auth | GitHub OAuth | Developer-first, secure |
| Styling | Vanilla CSS | Simple, no build step, performant |

## API Reference

### Translation Endpoints

```
GET /api/projects/:name/translations/file/:lang/:file
  → Source + target translations in one call

POST /api/projects/:name/translations
  → Submit new translation

PATCH /api/projects/:name/translations/:id
  → Approve or reject translation

DELETE /api/projects/:name/translations/:id
  → Delete translation
```

### Apply Endpoints (GitHub Actions)

```
GET /api/projects/:name/apply/preview
  → Preview pending translations

GET /api/projects/:name/apply/export
  → Export approved translations

POST /api/projects/:name/apply/committed
  → Mark translations as committed
```

## Design Principles

1. **Zero Cost at Rest**: D1 and Workers have generous free tiers
2. **Edge-First**: All computation happens at the edge, near users
3. **Type Safety**: Elm eliminates frontend runtime errors
4. **Minimal Dependencies**: Only essential, well-maintained libraries
5. **Developer Experience**: Easy setup, clear documentation

## License

MIT
