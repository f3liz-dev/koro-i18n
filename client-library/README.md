# koro-i18n Client

Client library for koro-i18n platform - generates translation manifest for your repository.

## What It Does

The client library generates a manifest file (`.koro-i18n/koro-i18n.repo.generated.json`) that lists all translation files in your repository. The platform then uses this manifest to fetch files directly from GitHub using the user's access token.

## Installation

```bash
npm install -g @i18n-platform/client
```

## Usage

### In GitHub Actions

Since this package is not published to npm, you need to build it directly from the repository:

```yaml
- name: Checkout koro-i18n client library
  uses: actions/checkout@v4
  with:
    repository: f3liz-dev/koro-i18n
    path: .koro-i18n-client
    sparse-checkout: |
      client-library
    sparse-checkout-cone-mode: false

- name: Build and install I18n Platform Client
  run: |
    cd .koro-i18n-client/client-library
    npm install
    npm run build
    npm link
    cd ../..

- name: Generate manifest
  run: i18n-upload

- name: Commit manifest
  run: |
    git add .koro-i18n/koro-i18n.repo.generated.json
    git commit -m "Update translation manifest"
    git push
```

### Programmatically

```typescript
import { main } from '@i18n-platform/client';

// Generate manifest
await main();
```

## Configuration

Create `.koro-i18n.repo.config.toml` in your repository root:

```toml
[project]
name = "my-project"

[source]
language = "en"
include = ["locales/{lang}/**/*.json"]
exclude = ["**/node_modules/**"]
lang_marker = "([a-zA-Z0-9]+(-[a-zA-Z0-9]+)*)"

[target]
languages = ["ja", "es", "fr"]
```

## Generated Manifest

The tool generates `.koro-i18n/koro-i18n.repo.generated.json`:

```json
{
  "repository": "owner/repo",
  "sourceLanguage": "en",
  "configVersion": 1,
  "files": [
    {
      "filename": "locales/en/common.json",
      "sourceFilename": "locales/en/common.json",
      "lastUpdated": "2024-01-01T10:00:00Z",
      "commitHash": "abc123",
      "language": "en"
    }
  ]
}
```

This file should be committed to your repository. The platform will use it to fetch translation files directly from GitHub.

## Supported File Formats

### JSON

```json
{
  "welcome": "Welcome",
  "buttons": {
    "save": "Save",
    "cancel": "Cancel"
  }
}
```

Flattened to:
```json
{
  "welcome": "Welcome",
  "buttons.save": "Save",
  "buttons.cancel": "Cancel"
}
```

## License

MIT
