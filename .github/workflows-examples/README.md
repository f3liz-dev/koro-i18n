# GitHub Actions Workflow Examples

This directory contains example workflows for using the Koro i18n GitHub Actions in your repository.

## Available Workflows

### 1. Sync Translations (`sync-translations.yml`)

Full bidirectional sync that both pushes source keys and pulls approved translations.

**Use when:**
- You want automatic synchronization
- You want translations to be updated regularly

**Triggers:**
- Push to source language files
- Every 6 hours (schedule)
- Manual dispatch

### 2. Push Only (`push-only.yml`)

Only pushes source language keys to the platform without pulling translations back.

**Use when:**
- You want to update the platform with new keys
- You prefer to pull translations manually or on a different schedule

**Triggers:**
- Push to source language files
- Manual dispatch

### 3. Pull Only (`pull-only.yml`)

Only pulls approved translations from the platform without pushing source keys.

**Use when:**
- Source keys are pushed separately
- You only need to retrieve approved translations

**Triggers:**
- Every 6 hours (schedule)
- Manual dispatch

### 4. Generate Metadata (`generate-metadata.yml`)

Generates translation metadata for legacy workflows.

**Use when:**
- You need the legacy `.koro-i18n/translations.jsonl` file
- You're using GitHub-based translation reading

**Triggers:**
- Push to translation files
- Manual dispatch

## Getting Started

1. Copy the workflow file(s) you need to your `.github/workflows/` directory
2. Update the `project-name` input to match your project on the platform
3. Adjust file paths to match your repository structure
4. Commit and push to enable the workflow

## Configuration

All workflows require:

### Repository Permissions

In your workflow file, ensure you have:

```yaml
permissions:
  id-token: write    # Required for OIDC authentication with the platform
  contents: write    # Required if committing translation changes
```

### Inputs

Common inputs across workflows:

- `project-name` **(required)**: Your project name on the Koro i18n platform
- `platform-url`: Platform URL (default: `https://koro.f3liz.workers.dev`)
- `action`: What to do (`push`, `pull`, or `sync`)
- `commit-changes`: Whether to commit translation updates (default: `true`)
- `commit-message`: Custom commit message

## Repository Setup

### 1. Create Configuration File

Create `.koro-i18n.repo.config.toml` in your repository root:

```toml
[project]
name = "your-project-name"
platform_url = "https://koro.f3liz.workers.dev"

[source]
language = "en"
include = [
  "locales/{lang}/**/*.json"
]
exclude = [
  "**/node_modules/**"
]

[target]
languages = ["ja", "es", "fr", "de"]
```

### 2. Project Structure

Organize your translation files:

```
your-repo/
├── .github/
│   └── workflows/
│       └── sync-translations.yml
├── .koro-i18n.repo.config.toml
└── locales/
    ├── en/           # Source language
    │   ├── common.json
    │   └── auth.json
    ├── ja/           # Target languages
    ├── es/
    ├── fr/
    └── de/
```

### 3. Register Project

1. Visit https://koro.f3liz.workers.dev
2. Sign in with GitHub
3. Create a new project
4. Link it to your repository

## Authentication

The workflows use **GitHub Actions OIDC** for secure authentication with the Koro i18n platform.

No secrets or tokens are required - the platform verifies the workflow using GitHub's OIDC provider.

## Advanced Usage

### Custom Schedule

Modify the `cron` schedule:

```yaml
on:
  schedule:
    - cron: '0 8,20 * * *'  # Run at 8am and 8pm UTC
```

### Conditional Execution

Only run on specific branches:

```yaml
on:
  push:
    branches: [main, develop]
    paths:
      - 'locales/en/**'
```

### Manual Approval

Add a manual approval step before pulling translations:

```yaml
jobs:
  approve:
    runs-on: ubuntu-latest
    steps:
      - name: Wait for approval
        uses: trstringer/manual-approval@v1
        with:
          approvers: user1,user2
  
  pull:
    needs: approve
    runs-on: ubuntu-latest
    # ... rest of workflow
```

## Troubleshooting

### Workflow not running

- Check that `id-token: write` permission is set
- Verify the project name matches your platform project
- Ensure config file exists at the correct path

### Commit conflicts

If you see merge conflicts from the translation commits:

1. Pull the latest changes: `git pull`
2. The workflow will automatically retry

### OIDC authentication fails

- Ensure your repository has GitHub Actions enabled
- Verify the platform URL is correct
- Check that the workflow has `id-token: write` permission

## Support

For issues or questions:
- Platform: https://koro.f3liz.workers.dev
- Documentation: https://github.com/f3liz-dev/koro-i18n
