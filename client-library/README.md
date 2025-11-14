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

## CLI Options

### `--chunk-size <number>`

Configure the number of files to upload in each batch (default: 30).

When uploading a large number of translation files (e.g., 234 files), the upload process splits them into smaller chunks to avoid exceeding Cloudflare Worker time limits.

**Examples:**

```bash
# Use default chunk size (30 files per request)
i18n-upload --oidc-token "$OIDC_TOKEN" --project-name "my-project"

# Upload with smaller chunks (20 files per request)
i18n-upload --oidc-token "$OIDC_TOKEN" --project-name "my-project" --chunk-size 20

# Upload with larger chunks (50 files per request) - use carefully
i18n-upload --oidc-token "$OIDC_TOKEN" --project-name "my-project" --chunk-size 50
```

**When to adjust chunk size:**
- **Decrease** (e.g., 20) if you still get timeout errors with default settings
- **Increase** (e.g., 50) if your files are small and you want faster uploads
- The default of 30 works well for most projects

**Progress reporting:**
```
Uploading 234 files in chunks of 30...
Uploading chunk 1/8 (30 files)...
Chunk 1/8 uploaded successfully (30 files, 1245 keys)
Uploading chunk 2/8 (30 files)...
Chunk 2/8 uploaded successfully (30 files, 1189 keys)
...
All chunks uploaded successfully! Total: 234 files, 9876 keys
```

## Authentication

The client library uses OIDC tokens for authentication when used in GitHub Actions. The reusable actions handle this automatically.

## New Features

### Git History Tracking

The client library now automatically extracts git commit history for each translation key:
- **Per-key tracking**: Uses `git blame` to map each key to its last-modified commit
- Commit SHA, author, email, and timestamp for each key
- Falls back to file-level history using `git log --follow` if key mapping fails
- Stored in platform for co-author attribution on download

**How it works:**
1. Reads the JSON file and maps each flattened key to its line number
2. Uses `git blame --line-porcelain` to get commit info for each line
3. Associates each key with its specific last-modified commit
4. Example: In a file with `welcome`, `goodbye`, and `hello` keys, each can have a different author and timestamp

This enables granular contributor attribution and audit trails for individual translation keys.

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
