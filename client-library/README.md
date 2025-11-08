# @i18n-platform/client

Client library for I18n Platform - processes and uploads translation files from your repository.

## Installation

```bash
npm install -g @i18n-platform/client
```

## Usage

### In GitHub Actions

```yaml
- name: Install I18n Platform Client
  run: npm install -g @i18n-platform/client

- name: Upload translations
  env:
    I18N_PLATFORM_URL: https://i18n-platform.workers.dev
    I18N_PLATFORM_API_KEY: ${{ secrets.I18N_PLATFORM_API_KEY }}
  run: i18n-upload
```

### Programmatically

```typescript
import { processProject, uploadToPlatform } from '@i18n-platform/client';

const metadata = await processProject(
  'owner/repo',
  'main',
  'abc123...'
);

await uploadToPlatform(
  metadata,
  'https://i18n-platform.workers.dev',
  'your-api-key'
);
```

## Configuration

Create `.i18n-platform.toml` in your repository root:

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

- `I18N_PLATFORM_URL` - Platform API URL (default: https://i18n-platform.workers.dev)
- `I18N_PLATFORM_API_KEY` - Your API key (required)
- `GITHUB_REPOSITORY` - Repository name (auto-set in GitHub Actions)
- `GITHUB_REF_NAME` - Branch name (auto-set in GitHub Actions)
- `GITHUB_SHA` - Commit SHA (auto-set in GitHub Actions)

## API Key

Get your API key from the I18n Platform:
1. Sign in with GitHub
2. Go to Settings
3. Generate API key
4. Add to repository secrets as `I18N_PLATFORM_API_KEY`

## License

MIT
