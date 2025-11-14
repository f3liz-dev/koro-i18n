# Client Repository Setup

Quick guide to integrate koro-i18n with your project.

## 1. Install Client Library

```bash
npm install @koro-i18n/client
```

## 2. Configure Project

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

## 3. Add GitHub Action

Create `.github/workflows/i18n-upload.yml`:

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
      id-token: write  # For OIDC
      contents: read
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history for git blame
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install client
        run: npm install -g @koro-i18n/client
      
      - name: Upload translations
        run: koro-i18n upload
        env:
          I18N_PLATFORM_URL: ${{ secrets.I18N_PLATFORM_URL }}
```

## 4. Configure Secrets

Add to GitHub repository secrets:
- `I18N_PLATFORM_URL`: Your platform URL

## Development Upload

For local testing:

```bash
# Get JWT token (see GET_JWT_TOKEN.md)
JWT_TOKEN=<your-token> node upload-dev.js
```

## Client Library Requirements

The client must preprocess files before upload:

1. **Git Blame**: Extract commit info for each line
2. **Source Hashes**: Generate hash for each key's value
3. **Char Ranges**: Calculate character positions
4. **MessagePack**: Compress metadata

See [CLIENT_LIBRARY.md](CLIENT_LIBRARY.md) for implementation details.
