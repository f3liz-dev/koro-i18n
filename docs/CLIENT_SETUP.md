# Client Repository Setup

Quick guide to integrate koro-i18n with your project.

## 1. Configure Project

Create `.koro-i18n.repo.config.toml`:

### Simple Mode (Direct File Paths)

```toml
[project]
name = "my-project"
platform_url = "https://koro.workers.dev"

[source]
language = "en"
files = [
  "locales/en/common.json",
  "locales/ja/common.json",
  "locales/es/common.json"
]

[target]
languages = ["ja", "es", "fr"]
```

### Advanced Mode (Glob Patterns with {lang} Marker)

```toml
[project]
name = "my-project"
platform_url = "https://koro.workers.dev"

[source]
language = "en"
# Use {lang} to mark where the language code appears
include = ["locales/{lang}/**/*.json", "i18n/{lang}/messages.json"]
# Optional: custom regex for {lang} marker (default: ([a-z]{2}(-[A-Z]{2})?))
# lang_marker = "([a-z]{2,3})"
# Glob patterns to exclude
exclude = ["**/node_modules/**", "**/*.test.json"]
# Regex patterns to exclude (prefix with 'regex:')
# exclude = ["regex:.*\\.backup\\.json$", "regex:.*/temp/.*"]

[target]
languages = ["ja", "es", "fr"]
```

### Configuration Options

- `source.language`: The source language code (e.g., "en")
- `source.files`: Array of direct file paths (no glob) - use this OR include/exclude
- `source.include`: Glob patterns with `{lang}` marker - use this OR files
- `source.exclude`: Glob or regex patterns to exclude (optional)
  - Glob: `"**/node_modules/**"`, `"**/*.test.json"`
  - Regex: `"regex:.*\\.backup\\.json$"`, `"regex:.*/temp/.*"`
- `source.lang_marker`: Regex pattern for `{lang}` marker (optional, default: `([a-z]{2}(-[A-Z]{2})?)`)
- `target.languages`: Array of target language codes

### Language Detection with {lang} Marker

Use `{lang}` in your include patterns to mark where the language code appears:

```toml
[source]
language = "en"
# Standard directory structure
include = ["locales/{lang}/**/*.json"]
# → locales/en/common.json, locales/ja/messages.json

# Language prefix
include = ["{lang}-translations/*.json"]
# → en-translations/app.json, ja-translations/app.json

# Language suffix
include = ["translations/{lang}.json"]
# → translations/en.json, translations/ja.json

# Multiple patterns
include = ["locales/{lang}/**/*.json", "i18n/{lang}/messages.json"]
```

The `{lang}` marker is replaced with a regex pattern (default: `([a-zA-Z0-9]+(-[a-zA-Z0-9]+)*)`) that matches:
- 2-letter codes: `en`, `ja`, `es`
- Region codes: `en-US`, `zh-CN`, `pt-BR`
- Custom variants: `ja-JP-mac`, `en-US-posix`
- Private use: `ja-JP-x-kansai`, `en-US-x-custom`
- Script codes: `sr-Latn-RS`, `zh-Hans-CN`

Customize with `lang_marker`:
```toml
# Match 2-3 letter codes only
lang_marker = "([a-z]{2,3})"
# Match uppercase codes
lang_marker = "([A-Z]{2})"
# Strict BCP 47 pattern
lang_marker = "([a-z]{2,3}(-[A-Z][a-z]{3})?(-[A-Z]{2})?(-x(-[a-z0-9]+)+)?)"
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

# Configure chunk size for large uploads (default: 50)
UPLOAD_CHUNK_SIZE=100 JWT_TOKEN=<your-token> node upload-dev.js
```

## Large File Sets (200+ files)

The client library automatically handles large uploads efficiently:

- **Automatic Chunking**: Files are split into chunks (default: 50 files per chunk)
- **Progress Reporting**: Real-time progress for each chunk
- **Configurable**: Set `UPLOAD_CHUNK_SIZE` environment variable
- **Reliable**: Each chunk uploads independently with retry capability

Example output for 237 files:
```
📦 Uploading 237 files (chunk size: 50)...
📤 Uploading chunk 1/5 (50 files)...
  ✓ Chunk 1/5 complete (21% total)
📤 Uploading chunk 2/5 (50 files)...
  ✓ Chunk 2/5 complete (42% total)
...
✅ Upload successful
```

## Client Library Requirements

The client must preprocess files before upload:

1. **Git Blame**: Extract commit info for each line
2. **Source Hashes**: Generate hash for each key's value
3. **Char Ranges**: Calculate character positions
4. **MessagePack**: Compress metadata

See [CLIENT_LIBRARY.md](CLIENT_LIBRARY.md) for implementation details.
