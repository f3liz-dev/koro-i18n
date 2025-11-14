# @i18n-platform/client

Client library for I18n Platform - processes and uploads translation files from your repository.

## ⚠️ Important Changes

### Upload Mode Deprecation

The `mode: json` option for uploads is **deprecated**. Please use `mode: structured` (default) for all new integrations.

**Why?** The structured mode now includes:
- Git commit history tracking for each translation
- Structure mapping to preserve original file structure
- Source content validation for translation quality
- Co-author attribution on download

See [TRANSLATION_HISTORY.md](../docs/TRANSLATION_HISTORY.md) for full details.

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

- name: Upload translations
  env:
    I18N_PLATFORM_URL: https://i18n-platform.workers.dev
    I18N_PLATFORM_API_KEY: ${{ secrets.I18N_PLATFORM_API_KEY }}
  run: i18n-upload
```

Alternatively, use the reusable action provided by koro-i18n:

```yaml
- name: Upload translations
  uses: f3liz-dev/koro-i18n/.github/actions/upload-translations@main
  with:
    project-name: my-project
    mode: structured
```

### Programmatically

The client library is not published to npm, but you can use it locally:

```typescript
// After building and linking the client library
import { processProject, uploadToPlatform } from '@i18n-platform/client';

const metadata = await processProject(
  'owner/repo',
  'main',
  'abc123...'
);

await uploadToPlatform(
  metadata,
  'https://koro.f3liz.workers.dev',
  'your-oidc-token'
);
```

**Note:** Most users should use the GitHub Actions integration instead. See the examples above.

## Configuration

Create `.koro-i18n.repo.config.toml` in your repository root:

```toml
sourceLanguage = "en"
targetLanguages = ["ja", "es", "fr"]

includePatterns = [
  "locales/**/*.json",
  "src/locales/**/*.json"
]

excludePatterns = [
  "**/node_modules/**",
  "**/dist/**"
]
```

## What It Does

1. **Reads** translation files from your repository
2. **Parses** JSON/Markdown files into key-value pairs
3. **Flattens** nested structures (e.g., `{a: {b: "c"}}` → `{"a.b": "c"}`)
4. **Uploads** to I18n Platform API

## File Format

The library uploads files in this format:

```json
{
  "repository": "owner/repo",
  "branch": "main",
  "commit": "abc123...",
  "sourceLanguage": "en",
  "targetLanguages": ["ja", "es"],
  "files": [
    {
      "filetype": "json",
      "filename": "common.json",
      "lang": "en",
      "contents": {
        "welcome": "Welcome",
        "buttons.save": "Save",
        "buttons.cancel": "Cancel"
      },
      "metadata": {
        "size": 1024,
        "keys": 3,
        "lastModified": "2024-01-01T10:00:00Z"
      }
    }
  ],
  "generatedAt": "2024-01-01T10:00:00Z"
}
```

## Supported Formats

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

### Markdown

```markdown
# Buttons
- save: Save
- cancel: Cancel

# Messages
- welcome: Welcome
```

Parsed to:
```json
{
  "buttons.save": "Save",
  "buttons.cancel": "Cancel",
  "messages.welcome": "Welcome"
}
```

## Environment Variables

- `I18N_PLATFORM_URL` - Platform API URL (default: https://koro.f3liz.workers.dev)
- `OIDC_TOKEN` - OIDC token for authentication (automatically provided in GitHub Actions)
- `GITHUB_REPOSITORY` - Repository name (auto-set in GitHub Actions)
- `GITHUB_REF_NAME` - Branch name (auto-set in GitHub Actions)
- `GITHUB_SHA` - Commit SHA (auto-set in GitHub Actions)

## Authentication

The client library uses OIDC tokens for authentication when used in GitHub Actions. The reusable actions handle this automatically.

## New Features

### Git History Tracking

The client library now automatically extracts git commit history for each file:
- Commit SHA, author, email, and timestamp
- Uses `git log --follow` and `git blame` for detailed tracking
- Stored in platform for co-author attribution on download

### Structure Mapping

Files are processed with structure mapping to preserve original nested structure:
- Maps flattened keys (e.g., `app.settings.theme`) back to original paths
- Enables faithful reconstruction on download
- Use `unflatten=true` parameter on download endpoint

### Source Validation

Each translation tracks the source content it was translated from:
- SHA-256 hash of source values
- Platform validates if source has changed
- Use `/validate` endpoint to check translation status

For detailed documentation, see [TRANSLATION_HISTORY.md](../docs/TRANSLATION_HISTORY.md).

## License

MIT
