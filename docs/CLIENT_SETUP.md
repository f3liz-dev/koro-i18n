# Client Repository Setup

Quick guide to integrate koro-i18n with your project.

## 1. Configure Project

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

## 2. Add GitHub Action

Create `.github/workflows/i18n-upload.yml`:

The action automatically builds and uses the client library from the repository, so you don't need to install anything manually or publish to npm.

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
      
      - uses: f3liz-dev/koro-i18n/.github/actions/upload-translations@main
        with:
          project-name: my-project
```

## 3. Configure Secrets

No secrets needed! The action uses GitHub OIDC authentication automatically.

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
