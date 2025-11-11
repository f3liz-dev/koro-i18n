# GitHub Actions Integration

Koro i18n provides reusable GitHub Actions for easy integration with your repositories.

## Available Actions

### 1. Upload Translations Action

Upload source translation files to the platform.

**Location:** `f3liz-dev/koro-i18n/.github/actions/upload-translations`

[Full Documentation](./.github/actions/upload-translations/README.md)

#### Quick Start

```yaml
name: Upload Translations

on:
  push:
    branches: [main]
    paths:
      - 'locales/**'

jobs:
  upload:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: f3liz-dev/koro-i18n/.github/actions/upload-translations@main
        with:
          api-key: ${{ secrets.I18N_PLATFORM_API_KEY }}
          project-name: my-project
```

#### Upload Modes

**Structured Mode (Default):** Full-featured with configuration file support
```yaml
- uses: f3liz-dev/koro-i18n/.github/actions/upload-translations@main
  with:
    api-key: ${{ secrets.I18N_PLATFORM_API_KEY }}
    project-name: my-project
    mode: structured
```

**JSON Mode:** Simple direct JSON upload
```yaml
- uses: f3liz-dev/koro-i18n/.github/actions/upload-translations@main
  with:
    api-key: ${{ secrets.I18N_PLATFORM_API_KEY }}
    project-name: my-project
    mode: json
```

### 2. Download Translations Action

Download completed translations and apply them to your repository.

**Location:** `f3liz-dev/koro-i18n/.github/actions/download-translations`

[Full Documentation](./.github/actions/download-translations/README.md)

#### Quick Start

```yaml
name: Download Translations

on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:

jobs:
  download:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
      
      - uses: f3liz-dev/koro-i18n/.github/actions/download-translations@main
        with:
          api-key: ${{ secrets.I18N_PLATFORM_API_KEY }}
          project-name: my-project
```

## Complete Workflow Example

A bidirectional sync workflow:

```yaml
name: i18n Sync

on:
  push:
    branches: [main]
    paths:
      - 'locales/en/**'  # Source language
  schedule:
    - cron: '0 */6 * * *'  # Download translations every 6 hours
  workflow_dispatch:

jobs:
  # Upload source files when English translations change
  upload-source:
    if: github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: f3liz-dev/koro-i18n/.github/actions/upload-translations@main
        with:
          api-key: ${{ secrets.I18N_PLATFORM_API_KEY }}
          project-name: my-project

  # Download completed translations periodically
  download-translations:
    if: github.event_name == 'schedule' || github.event_name == 'workflow_dispatch'
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
      
      - uses: f3liz-dev/koro-i18n/.github/actions/download-translations@main
        with:
          api-key: ${{ secrets.I18N_PLATFORM_API_KEY }}
          project-name: my-project
          commit-message: 'chore: Update translations [skip ci]'
```

## API Endpoints

For custom integrations, you can use the API endpoints directly:

### Upload JSON Files

```bash
POST /api/projects/:projectName/upload-json
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "branch": "main",
  "commitSha": "abc123...",
  "language": "en",
  "files": {
    "common.json": {
      "welcome": "Welcome",
      "buttons": {
        "save": "Save",
        "cancel": "Cancel"
      }
    }
  }
}
```

### Download Translations

```bash
GET /api/projects/:projectName/download?branch=main&language=ja
Authorization: Bearer YOUR_API_KEY
```

Response:
```json
{
  "project": "my-project",
  "repository": "owner/repo",
  "branch": "main",
  "files": {
    "ja": {
      "common.json": {
        "buttons.save": "保存",
        "buttons.cancel": "キャンセル"
      }
    }
  },
  "generatedAt": "2024-01-01T10:00:00Z"
}
```

## Setup Instructions

### 1. Get Your API Key

1. Sign in to Koro i18n platform with GitHub
2. Create or select your project
3. Go to Settings → API Keys
4. Generate a new API key
5. Copy the key (you won't see it again)

### 2. Add to Repository Secrets

1. Go to your repository on GitHub
2. Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Name: `I18N_PLATFORM_API_KEY`
5. Value: Paste your API key
6. Click "Add secret"

### 3. Create Workflow File

Create `.github/workflows/i18n.yml` with one of the examples above.

### 4. Test

- Push to trigger upload
- Or use "Run workflow" button for manual testing

## Advanced Usage

### Custom Configuration

Create `.i18n-platform.toml` in your repository root:

```toml
sourceLanguage = "en"
targetLanguages = ["ja", "es", "fr", "de"]

includePatterns = [
  "locales/**/*.json",
  "src/i18n/**/*.md"
]

excludePatterns = [
  "**/node_modules/**",
  "**/dist/**"
]

outputPattern = "locales/{lang}/{file}"
```

### Language-Specific Downloads

Download only specific languages:

```yaml
- uses: f3liz-dev/koro-i18n/.github/actions/download-translations@main
  with:
    api-key: ${{ secrets.I18N_PLATFORM_API_KEY }}
    project-name: my-project
    language: ja
```

### Custom Output Directory

```yaml
- uses: f3liz-dev/koro-i18n/.github/actions/download-translations@main
  with:
    api-key: ${{ secrets.I18N_PLATFORM_API_KEY }}
    project-name: my-project
    output-dir: src/locales
```

## Permissions

### Upload Action
- `contents: read` (default)

### Download Action
- `contents: write` (required for auto-commit)

```yaml
jobs:
  download:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      # ...
```

## Troubleshooting

### Upload Fails

1. Check API key is correct in secrets
2. Verify project name matches platform
3. Check file patterns in configuration
4. Review GitHub Actions logs

### Download Fails

1. Ensure API key has correct permissions
2. Verify project has translations
3. Check branch name is correct
4. Review network/API logs

### No Changes Committed

This is normal if:
- No new translations available
- Translations haven't changed since last download
- Files are identical

### Authentication Errors

- Regenerate API key on platform
- Update repository secret
- Ensure secret name is `I18N_PLATFORM_API_KEY`

## Security Best Practices

1. **Never commit API keys** - Always use secrets
2. **Use minimal permissions** - Only `contents: read` for upload, `contents: write` for download
3. **Rotate keys regularly** - Generate new keys periodically
4. **Use branch protection** - Protect main branch to review translation PRs
5. **Monitor actions** - Review action logs regularly

## Migration from Client Library

If you're using the client library directly:

**Before:**
```yaml
- run: npm install -g @i18n-platform/client
- run: i18n-upload
  env:
    I18N_PLATFORM_API_KEY: ${{ secrets.I18N_PLATFORM_API_KEY }}
```

**After:**
```yaml
- uses: f3liz-dev/koro-i18n/.github/actions/upload-translations@main
  with:
    api-key: ${{ secrets.I18N_PLATFORM_API_KEY }}
    project-name: my-project
```

Benefits:
- Simpler configuration
- Better error handling
- Consistent versioning
- Automatic updates

## Support

For issues or questions:
- Open an issue: https://github.com/f3liz-dev/koro-i18n/issues
- Check documentation: https://github.com/f3liz-dev/koro-i18n/tree/main/docs
- Review examples: https://github.com/f3liz-dev/koro-i18n/tree/main/example-project
