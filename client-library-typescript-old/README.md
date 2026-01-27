# Koro i18n Client

CLI for managing translations with the Koro i18n platform.

## Quick Start

```bash
# Initialize config
npx @koro-i18n/client init

# Validate config and find translation files
npx @koro-i18n/client validate

# Generate metadata (for GitHub Action preprocessing)
npx @koro-i18n/client generate
```

## Configuration

Create `koro.config.json` in your repository root:

```json
{
  "version": 1,
  "sourceLanguage": "en",
  "targetLanguages": ["ja", "es", "fr", "de"],
  "files": {
    "include": ["locales/{lang}/**/*.json"],
    "exclude": ["**/node_modules/**"]
  }
}
```

### Legacy TOML Config

The CLI also supports the legacy `.koro-i18n.repo.config.toml` format:

```toml
[project]
name = "my-project"

[source]
language = "en"
include = ["locales/{lang}/**/*.json"]

[target]
languages = ["ja", "es", "fr"]
```

## Commands

### `init`
Create a new `koro.config.json` file with sensible defaults.

### `validate`
Validate your config and list all translation files found.

### `generate`
Generate the `.koro-i18n/` metadata files that the platform reads. This is typically run by the GitHub Action, not manually.

## GitHub Action Integration

The recommended way to use this is through the sync action:

```yaml
- uses: f3liz-dev/koro-i18n/.github/actions/sync@main
  with:
    project-name: my-project
```

This will automatically:
1. Run the CLI to generate metadata
2. Commit the metadata to your repository
3. Pull approved translations from the platform

## Generated Files

The CLI generates these files in `.koro-i18n/`:

- `koro-i18n.repo.generated.jsonl` - Manifest listing all translation files
- `store/{lang}.jsonl` - Translation status for each target language
- `source/{lang}.jsonl` - Source keys and positions
- `progress-translated/{lang}.jsonl` - Translation progress

These files should be committed to your repository. The platform reads them directly from GitHub.

## License

MIT
