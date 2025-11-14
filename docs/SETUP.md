# Setup Guide

## Prerequisites

- Node.js 18+
- pnpm
- Cloudflare account
- GitHub OAuth app

## Installation

```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm run prisma:generate
```

## Configuration

### 1. Create R2 Bucket

```bash
wrangler r2 bucket create koro-i18n-translations
wrangler r2 bucket create koro-i18n-translations-preview
```

### 2. Create D1 Database

```bash
wrangler d1 create koro-i18n-db
```

Update `wrangler.toml` with the database ID.

### 3. Apply Migrations

```bash
# Local
pnpm run prisma:migrate:local

# Remote
pnpm run prisma:migrate:remote
```

### 4. GitHub OAuth

1. Create GitHub OAuth app: https://github.com/settings/developers
2. Set callback URL: `https://your-domain.workers.dev/api/auth/callback`
3. Add secrets to Cloudflare:

```bash
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET
wrangler secret put JWT_SECRET
```

## Development

```bash
# Run frontend dev server
pnpm run dev

# Run worker dev server
pnpm run dev:workers

# Run both
pnpm run dev:all
```

## Deployment

```bash
pnpm run deploy
```

## Client Setup

### 1. Configure Project

Create `.koro-i18n.repo.config.toml`:

```toml
[project]
name = "my-project"
platform_url = "https://koro.workers.dev"

[source]
language = "en"
files = ["locales/en/**/*.json"]

[target]
languages = ["ja", "es", "fr"]
```

### 2. Add GitHub Action

The action automatically builds and uses the client library from the repository:

```yaml
name: Upload Translations
on:
  push:
    branches: [main]
    paths: ['locales/**']

jobs:
  upload:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: f3liz-dev/koro-i18n/.github/actions/upload-translations@main
        with:
          project-name: my-project
```

## Get JWT Token (Development)

1. Open http://localhost:5173 and sign in
2. Open DevTools Console
3. Run:
```javascript
document.cookie.split("; ").find(row => row.startsWith("auth_token=")).split("=")[1]
```
4. Copy the token
5. Use for development uploads:
```bash
JWT_TOKEN=<token> node upload-dev.js
```
