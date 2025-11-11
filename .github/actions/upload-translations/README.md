# Upload Translations Action

A GitHub Action to upload translation files to Koro i18n platform.

## Usage

### Basic Example (Structured Mode)

```yaml
name: Upload Translations

on:
  push:
    branches: [main]
    paths:
      - 'locales/**'
      - '.i18n-platform.toml'

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

### Direct JSON Upload Mode

For simpler setups where you just want to upload JSON files directly:

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
          mode: json
```

### Custom Platform URL

```yaml
- uses: f3liz-dev/koro-i18n/.github/actions/upload-translations@main
  with:
    platform-url: https://my-custom-instance.workers.dev
    api-key: ${{ secrets.I18N_PLATFORM_API_KEY }}
    project-name: my-project
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `platform-url` | URL of the i18n platform | No | `https://i18n-platform.workers.dev` |
| `api-key` | API key for authentication | Yes | - |
| `project-name` | Project name on the platform | Yes | - |
| `config-path` | Path to configuration file | No | `.i18n-platform.toml` |
| `mode` | Upload mode: `structured` or `json` | No | `structured` |

## Outputs

| Output | Description |
|--------|-------------|
| `files-uploaded` | Number of files uploaded |
| `upload-status` | Status of the upload operation |

## Modes

### Structured Mode (Default)

Uses the client library to process files according to `.i18n-platform.toml` configuration:
- Supports JSON and Markdown formats
- Flattens nested structures
- Configurable file patterns and output

Requires `.i18n-platform.toml`:

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

### JSON Mode

Direct JSON file upload without additional processing:
- Simple and fast
- No configuration file needed
- Automatically detects language from directory structure
- Best for basic JSON translation files

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

- API keys should always be stored in GitHub secrets
- The action uses HTTPS for all API communications
- Supports GitHub OIDC authentication when available

## License

MIT
