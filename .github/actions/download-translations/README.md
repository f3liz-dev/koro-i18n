# Download Translations Action

A GitHub Action to download translated files from Koro i18n platform and apply them to your repository using OIDC authentication.

## Usage

### Basic Example

```yaml
name: Download Translations

on:
  schedule:
    # Run every 6 hours
    - cron: '0 */6 * * *'
  workflow_dispatch:

permissions:
  id-token: write   # Required for OIDC
  contents: write   # Required to commit changes

jobs:
  download:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: f3liz-dev/koro-i18n/.github/actions/download-translations@main
        with:
          project-name: my-project
```

### Download Specific Language

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

### Without Auto-Commit

If you want to review changes before committing:

```yaml
- uses: f3liz-dev/koro-i18n/.github/actions/download-translations@main
  with:
    project-name: my-project
    commit-changes: 'false'

- name: Review and commit
  run: |
    git status
    # Add your custom logic here
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `platform-url` | URL of the i18n platform | No | `https://i18n-platform.workers.dev` |
| `project-name` | Project name on the platform | Yes | - |
| `branch` | Branch to download from | No | `main` |
| `language` | Specific language to download | No | (all) |
| `output-dir` | Directory to output files | No | `locales` |
| `commit-changes` | Auto-commit and push | No | `true` |
| `commit-message` | Commit message | No | `chore: Update translations from i18n platform` |

## Outputs

| Output | Description |
|--------|-------------|
| `files-downloaded` | Number of files downloaded |
| `languages-updated` | Languages that were updated |

## Features

- **Automatic flattening reversal**: Converts flattened keys back to nested structure
- **Smart commits**: Only commits if there are actual changes
- **Language filtering**: Download specific languages or all at once
- **Flexible output**: Configure output directory for your project structure

## Complete Workflow Example

A complete workflow that uploads source files and downloads translations:

```yaml
name: i18n Sync

on:
  push:
    branches: [main]
    paths:
      - 'locales/en/**'
  schedule:
    - cron: '0 */6 * * *'
  workflow_dispatch:

jobs:
  upload-source:
    if: github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: f3liz-dev/koro-i18n/.github/actions/upload-translations@main
        with:
          api-key: ${{ secrets.I18N_PLATFORM_API_KEY }}
          project-name: my-project

  download-translations:
    if: github.event_name == 'schedule' || github.event_name == 'workflow_dispatch'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: f3liz-dev/koro-i18n/.github/actions/download-translations@main
        with:
          api-key: ${{ secrets.I18N_PLATFORM_API_KEY }}
          project-name: my-project
```

## File Structure

The action expects translations to be organized by language:

```
locales/
  en/
    common.json
    auth.json
  ja/
    common.json
    auth.json
  es/
    common.json
    auth.json
```

Downloaded files will maintain this structure and convert flattened keys back to nested objects:

**Platform storage (flattened):**
```json
{
  "buttons.save": "Save",
  "buttons.cancel": "Cancel"
}
```

**Downloaded file (nested):**
```json
{
  "buttons": {
    "save": "Save",
    "cancel": "Cancel"
  }
}
```

## Permissions

This action needs:
- `id-token: write` - To get OIDC token from GitHub
- `contents: write` - To commit and push translation updates

Add to your workflow:
```yaml
permissions:
  id-token: write
  contents: write
```

## Setup

### 1. Create Project on Platform

1. Sign in to the Koro i18n platform with GitHub
2. Create a new project
3. Set the repository to match your GitHub repository (e.g., `owner/repo`)
4. Note your project name

### 2. Add Workflow

No secrets needed! Just add the workflow file.

## Security

- Uses GitHub OIDC tokens - no static secrets needed
- Tokens expire automatically in 10 minutes
- Platform verifies repository matches project
- Commits are made with the `github-actions[bot]` identity

## License

MIT
