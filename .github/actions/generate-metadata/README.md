# Generate koro-i18n Metadata Action

A GitHub Action that generates the `.koro-i18n/koro-i18n.repo.generated.json` metadata file, enabling your GitHub repository to be used as a realtime translation source for the koro-i18n platform.

## Usage

### Basic Example

```yaml
name: Generate i18n Metadata

on:
  push:
    branches: [main]
    paths:
      - 'locales/**'
      - '.koro-i18n.repo.config.toml'
  workflow_dispatch:

permissions:
  contents: write  # Required to commit the generated metadata

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history for git blame

      - uses: f3liz-dev/koro-i18n/.github/actions/generate-metadata@main
```

### Custom Configuration Path

```yaml
- uses: f3liz-dev/koro-i18n/.github/actions/generate-metadata@main
  with:
    config-path: 'config/i18n.toml'
```

### Without Auto-Commit

If you want to handle the commit yourself:

```yaml
- uses: f3liz-dev/koro-i18n/.github/actions/generate-metadata@main
  with:
    commit-changes: 'false'

- name: Custom commit logic
  run: |
    # Your custom commit logic here
    git add .koro-i18n/
    git commit -m "Update translations metadata"
```

### Custom Commit Message

```yaml
- uses: f3liz-dev/koro-i18n/.github/actions/generate-metadata@main
  with:
    commit-message: 'docs: Regenerate i18n metadata'
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `config-path` | Path to `.koro-i18n.repo.config.toml` | No | `.koro-i18n.repo.config.toml` |
| `commit-changes` | Auto-commit and push metadata | No | `true` |
| `commit-message` | Commit message | No | `chore: Update koro-i18n metadata [skip ci]` |

## Outputs

| Output | Description |
|--------|-------------|
| `metadata-path` | Path to the generated metadata file |
| `files-count` | Number of translation files in metadata |

## Configuration File

Create a `.koro-i18n.repo.config.toml` file in your repository root:

```toml
[project]
name = "my-project"

[source]
language = "en"

# Glob patterns with {lang} marker for language extraction
include = ["locales/{lang}/**/*.json"]

# Optional: exclude patterns
# exclude = ["**/node_modules/**"]

[target]
languages = ["ja", "es", "fr", "de"]
```

## Generated Metadata

All metadata files are generated in [JSON Lines](https://jsonlines.org/) (JSONL) format for efficient streaming. This enables progressive loading and chunked transfer without loading entire files into memory.

### Manifest File

The action generates `.koro-i18n/koro-i18n.repo.generated.jsonl`:

```jsonl
{"type":"header","repository":"owner/repo","sourceLanguage":"en","configVersion":1,"totalFiles":2}
{"type":"file","entry":{"filename":"common.json","sourceFilename":"locales/en/common.json","lastUpdated":"2024-01-01T00:00:00.000Z","commitHash":"abc123...","language":"en"}}
{"type":"file","entry":{"filename":"errors.json","sourceFilename":"locales/en/errors.json","lastUpdated":"2024-01-01T00:00:00.000Z","commitHash":"def456...","language":"en"}}
```

The first line is always a header with metadata, and subsequent lines are file entries.

### Progress Translated Files

The action generates `.koro-i18n/progress-translated/[lang].jsonl` files for each target language. These files pre-calculate which keys have been translated:

```jsonl
{"type":"header","language":"ja","totalFiles":2}
{"type":"file","filepath":"locales/<lang>/common.json","keys":["welcome","goodbye","buttons.save","buttons.cancel"]}
{"type":"file","filepath":"locales/<lang>/errors.json","keys":["error.network","error.auth"]}
```

The filepath uses `<lang>` as a placeholder for the language code, and `keys` is an array of translated key names in dot notation.

### Store Files

The action generates `.koro-i18n/store/[lang].jsonl` files for each target language. These files track git commit hashes for source and target translations:

```jsonl
{"type":"header","language":"ja","totalFiles":2}
{"type":"file","filepath":"locales/<lang>/common.json","entries":{"welcome":{"src":"abc1234","tgt":"def5678","updated":1732521600,"status":"verified"},"buttons.save":{"src":"abc1234","tgt":"def5678","updated":1732521600,"status":"verified"}}}
```

Each entry contains:
- `src`: Short git commit hash (7 chars) of the source line
- `tgt`: Short git commit hash (7 chars) of the target/translated line
- `updated`: Unix timestamp from git blame
- `status`: Translation status - `"verified"`, `"outdated"`, or `"pending"`

When the source commit changes but target hasn't been updated, the status is marked as `"outdated"`. When target is updated after source, status returns to `"verified"`.

## How It Works

1. Reads your `.koro-i18n.repo.config.toml` configuration
2. Scans for translation files matching the configured patterns
3. Generates metadata including file paths, languages, and commit hashes
4. Generates progress-translated files for each target language
5. Generates store files with git commit tracking for translation validation
6. Commits the metadata files to your repository (if enabled)

The koro-i18n platform can then fetch this metadata to use your GitHub repository as a realtime translation source.

## Permissions

This action requires:
- `contents: write` - To commit and push the generated metadata file

Add to your workflow:
```yaml
permissions:
  contents: write
```

## Requirements

- Node.js 20+ (automatically set up by the action)
- A `.koro-i18n.repo.config.toml` configuration file
- Translation files matching the configured patterns

## License

MIT
