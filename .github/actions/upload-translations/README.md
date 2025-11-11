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
      - '.i18n-platform.toml'

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

For simpler setups where you just want to upload JSON files directly:

```yaml
name: Upload Translations

on:
  push:
    branches: [main]
    paths:
      - 'locales/**'

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
| `config-path` | Path to configuration file | No | `.i18n-platform.toml` |
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

- Uses GitHub OIDC tokens - no static secrets needed
- Tokens expire automatically in 10 minutes
- Platform verifies repository matches project
- The action uses HTTPS for all API communications
- Supports GitHub OIDC authentication (recommended)

## License

MIT
