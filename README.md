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

## How It Works

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         Your Repository                                   │
│                                                                          │
│  locales/           .koro-i18n/                                          │
│    en/*.json   ──▶    koro-i18n.repo.generated.jsonl                     │
│    ja/*.json          store/*.jsonl                                       │
│                       source/*.jsonl                                      │
│                                                                          │
│  GitHub Action preprocesses translation files and generates metadata     │
└────────────────────────────────┬─────────────────────────────────────────┘
                                 │
                                 │ Platform reads metadata from GitHub
                                 ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                       Koro i18n Platform                                  │
│                                                                          │
│  • Reads preprocessed metadata from your repo (no storage needed)        │
│  • Stores only web-submitted translations in D1                          │
│  • Exports approved translations for sync back                           │
└────────────────────────────────┬─────────────────────────────────────────┘
                                 │
                                 │ GitHub Action applies approved translations
                                 ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                         Your Repository                                   │
│                                                                          │
│  locales/ja/*.json ◀── Updated with approved translations                │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### Flow Summary

1. **Push**: GitHub Action preprocesses translations → generates `.koro-i18n/` metadata → commits to repo
2. **Display**: Platform reads metadata directly from GitHub (no storage needed on Workers)
3. **Translate**: Contributors use the web UI to submit translations (stored in D1)
4. **Pull**: GitHub Action exports approved translations → updates your translation files → commits

## Features

- **Stateless Platform**: Cloudflare Workers with no persistent storage needed
- **Preprocessing on GitHub**: Metadata generation happens in your repo
- **OIDC Authentication**: No secrets to manage
- **Web UI**: Simple interface for translators
- **Git Integration**: Full attribution for translators

## CLI (Optional)

For local validation and metadata generation:

```bash
# Initialize config
npx @koro-i18n/client init

# Validate config
npx @koro-i18n/client validate

# Generate metadata locally (same as GitHub Action)
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

- Frontend: SolidJS + Vite
- Backend: Cloudflare Workers + Hono + D1
- Auth: GitHub OAuth + OIDC

## Documentation

See [docs/](docs/) for detailed documentation.

## License

MIT
