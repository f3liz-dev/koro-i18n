# Upload Translations Action

A GitHub Action to upload translation files to Koro i18n platform using OIDC authentication.

## Usage

### Basic Example (Structured Mode)

```yaml
name: Upload Translations

on:
  push:
    branches: [main]
    paths:
      - 'locales/**'
      - '.koro-i18n.repo.config.toml'

permissions:
  id-token: write  # Required for OIDC
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

### Direct JSON Upload Mode

For simpler setups where you want to upload JSON files directly without structured processing:

```yaml
name: Upload Translations

on:
  push:
    branches: [main]
    paths:
      - 'locales/**'
      - '.koro-i18n.repo.config.toml'

permissions:
  id-token: write  # Required for OIDC
  contents: read

jobs:
  upload:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: f3liz-dev/koro-i18n/.github/actions/upload-translations@main
        with:
          project-name: my-project
          mode: json
```

**Note:** JSON mode still requires `.koro-i18n.repo.config.toml` to determine source language and file patterns.

### Custom Platform URL

```yaml
- uses: f3liz-dev/koro-i18n/.github/actions/upload-translations@main
  with:
    platform-url: https://my-custom-instance.workers.dev
    project-name: my-project
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `platform-url` | URL of the i18n platform | No | `https://i18n-platform.workers.dev` |
| `project-name` | Project name on the platform | Yes | - |
| `config-path` | Path to configuration file | Yes | `.koro-i18n.repo.config.toml` |
| `mode` | Upload mode: `structured` or `json` | No | `structured` |

## Outputs

| Output | Description |
|--------|-------------|
| `files-uploaded` | Number of files uploaded |
| `upload-status` | Status of the upload operation |

## Authentication

This action uses **GitHub OIDC tokens** for authentication. No API keys or secrets are required!

### Required Permissions

Add to your workflow:

```yaml
permissions:
  id-token: write  # Required for OIDC token
  contents: read   # Required to read repository files
```

### How It Works

1. The action automatically requests an OIDC token from GitHub
2. The token is scoped to your repository and expires in 10 minutes
3. The platform verifies the token and checks the repository matches your project
4. No long-lived secrets to manage!

## Modes

### Structured Mode (Default)

Uses the client library to process files according to `.koro-i18n.repo.config.toml` configuration:
- Supports JSON and Markdown formats
- Flattens nested structures
- Configurable file patterns and output

**Requires `.koro-i18n.repo.config.toml` (mandatory):**

```toml
sourceLanguage = "en"
targetLanguages = ["ja", "es", "fr"]

includePatterns = [
  "locales/**/*.json"
]

excludePatterns = [
  "**/node_modules/**"
]
```

**Important:** The configuration file `.koro-i18n.repo.config.toml` is **required** for structured mode. Make sure to:
1. Create this file in your repository root
2. Include it in your Git commits
3. Configure `includePatterns` to match all your translation JSON files
4. Trigger workflows when the config file changes (see examples above)

This ensures the platform has the current configuration to process your translation files correctly.

### JSON Mode

Direct JSON file upload without additional processing:
- Simple and fast
- Uses config file for source language and patterns
- Automatically detects language from directory structure
- Best for basic JSON translation files

**Also requires `.koro-i18n.repo.config.toml`:**

```toml
sourceLanguage = "en"
targetLanguages = ["ja", "es", "fr"]

includePatterns = [
  "locales/**/*.json"
]
```

Expects files in structure like:
```
locales/
  en/
    common.json
    auth.json
  ja/
    common.json
    auth.json
```

**Note:** JSON mode now reads the config file to determine the source language and file patterns, ensuring consistency across all upload modes.

## Checking Upload Status

After uploading translations, you can verify the current status:

### 1. Check GitHub Actions Logs

View the workflow run to see:
- Number of files uploaded
- Upload status
- Any errors encountered

```bash
gh run list --workflow=i18n-upload.yml
gh run view <run-id> --log
```

### 2. View on Platform Dashboard

1. Sign in to the Koro i18n platform
2. Navigate to your project
3. View uploaded files and their status
4. Check completion percentages by language

### 3. Ensure All Sources Are Uploaded

To verify all your translation files are being uploaded:

**For Structured Mode:**
1. Check `.koro-i18n.repo.config.toml` includes all source patterns
2. Review `includePatterns` to ensure it matches all JSON files
3. Test locally with the client library
4. Check workflow triggers include config file changes

**Example to catch all sources:**
```toml
includePatterns = [
  "locales/**/*.json",      # All locale JSON files
  "src/i18n/**/*.json",     # Alternative location
  "translations/**/*.json"  # Another common pattern
]
```

**For JSON Mode:**
- All JSON files in `locales/` directory are automatically included
- Check GitHub Actions logs to confirm file count matches expectations

## Getting Your API Key

1. Sign in to the Koro i18n platform with GitHub
2. Create or select your project
3. Go to project settings
4. Generate an API key
5. Add it to your repository secrets as `I18N_PLATFORM_API_KEY`

## Permissions

This action needs:
- `contents: read` - To read translation files from your repository

## Security

- Uses GitHub OIDC tokens - no static secrets needed
- Tokens expire automatically in 10 minutes
- Platform verifies repository matches project
- The action uses HTTPS for all API communications
- Supports GitHub OIDC authentication (recommended)

## License

MIT
