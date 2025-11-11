# GitHub Actions Integration

Koro i18n provides reusable GitHub Actions for easy integration with your repositories using OIDC authentication.

## Authentication

These actions use **GitHub OIDC tokens** for secure authentication:
- ✅ No API keys or secrets needed
- ✅ Tokens expire automatically in 10 minutes
- ✅ Repository is automatically verified
- ✅ Industry-standard security

### Required Permissions

Add to your workflows:

```yaml
permissions:
  id-token: write  # Required for OIDC authentication
  contents: read   # For upload action
  contents: write  # For download action (if auto-commit enabled)
```

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

permissions:
  id-token: write
  contents: read

jobs:
  upload:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: f3liz-dev/koro-i18n/.github/actions/upload-translations@main
        with:
          project-name: my-project
```

#### Upload Modes

**Structured Mode (Default):** Full-featured with configuration file support
```yaml
- uses: f3liz-dev/koro-i18n/.github/actions/upload-translations@main
  with:
    project-name: my-project
    mode: structured
```

**JSON Mode:** Simple direct JSON upload
```yaml
- uses: f3liz-dev/koro-i18n/.github/actions/upload-translations@main
  with:
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

permissions:
  id-token: write
  contents: write

jobs:
  download:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: f3liz-dev/koro-i18n/.github/actions/download-translations@main
        with:
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
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: actions/checkout@v4
      
      - uses: f3liz-dev/koro-i18n/.github/actions/upload-translations@main
        with:
          project-name: my-project

  # Download completed translations periodically
  download-translations:
    if: github.event_name == 'schedule' || github.event_name == 'workflow_dispatch'
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: write
    steps:
      - uses: actions/checkout@v4
      
      - uses: f3liz-dev/koro-i18n/.github/actions/download-translations@main
        with:
          project-name: my-project
          commit-message: 'chore: Update translations [skip ci]'
```

## API Endpoints

For custom integrations, you can use the API endpoints directly with OIDC tokens:

### Upload JSON Files

```bash
POST /api/projects/:projectName/upload-json
Authorization: Bearer <OIDC_TOKEN>
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
Authorization: Bearer <OIDC_TOKEN>
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

### 1. Create Project on Platform

1. Sign in to Koro i18n platform with GitHub
2. Create a new project
3. Set the repository to match your GitHub repository (e.g., `owner/repo`)
4. Note your project name

### 2. Create Workflow File

Create `.github/workflows/i18n.yml` with one of the examples above.

**No secrets needed!** The workflow uses OIDC authentication automatically.

### 3. Test

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
    project-name: my-project
    language: ja
```

### Custom Output Directory

```yaml
- uses: f3liz-dev/koro-i18n/.github/actions/download-translations@main
  with:
    project-name: my-project
    output-dir: src/locales
```

## Permissions

### Upload Action
- `id-token: write` - Required for OIDC
- `contents: read` - To read files

### Download Action
- `id-token: write` - Required for OIDC
- `contents: write` - Required for auto-commit

```yaml
jobs:
  download:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: write
    steps:
      # ...
```

## Troubleshooting

### Upload Fails

1. Check permissions include `id-token: write`
2. Verify project name matches platform
3. Verify repository in project matches GitHub repository
4. Check file patterns in configuration
5. Review GitHub Actions logs

### Download Fails

1. Ensure permissions include `id-token: write` and `contents: write`
2. Verify project has translations
3. Check branch name is correct
4. Verify repository in project matches GitHub repository
5. Review network/API logs

### No Changes Committed

This is normal if:
- No new translations available
- Translations haven't changed since last download
- Files are identical

### Authentication Errors

- Ensure workflow has `id-token: write` permission
- Verify repository matches project configuration on platform
- Check OIDC token audience matches platform URL

## Security Best Practices

1. **Use OIDC tokens** - Automatically used by the actions, no static secrets
2. **Repository verification** - Platform verifies repository matches project
3. **Use minimal permissions** - Only `contents: read` for upload, `contents: write` for download
4. **Use branch protection** - Protect main branch to review translation PRs
5. **Monitor actions** - Review action logs regularly

## Migration from Client Library

If you're using the client library directly:

**Before:**
```yaml
- run: npm install -g @i18n-platform/client
- run: i18n-upload
  env:
    I18N_PLATFORM_URL: ${{ secrets.I18N_PLATFORM_URL }}
    OIDC_TOKEN: ${{ steps.oidc.outputs.token }}
```

**After:**
```yaml
- uses: f3liz-dev/koro-i18n/.github/actions/upload-translations@main
  with:
    project-name: my-project
```

Benefits:
- Simpler configuration
- Better error handling
- Consistent versioning
- Automatic updates
- No need to manage OIDC token manually

## Support

For issues or questions:
- Open an issue: https://github.com/f3liz-dev/koro-i18n/issues
- Check documentation: https://github.com/f3liz-dev/koro-i18n/tree/main/docs
- Review examples: https://github.com/f3liz-dev/koro-i18n/tree/main/example-project
