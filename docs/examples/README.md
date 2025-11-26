# Example GitHub Action for Applying Translations from koro-i18n

This directory contains example GitHub Action workflows that client repositories
can use to apply translations from the koro-i18n platform.

## Why a GitHub Action?

The koro-i18n platform uses OAuth tokens with read-only scope (`public_repo`).
This means the platform API cannot directly create branches or pull requests
in user repositories. Instead:

1. The API exports approved translations as JSON
2. A GitHub Action in the client repository fetches the export
3. The GitHub Action applies the translations and creates the PR
4. The GitHub Action notifies the API that translations were committed

## Setup

1. Copy `koro-i18n-apply.yml` to your repository's `.github/workflows/` directory
2. Set up the required secrets in your repository:
   - `KORO_I18N_TOKEN`: Your koro-i18n JWT token (from the web UI)
3. Trigger the workflow manually or on a schedule

## Workflow Files

- `koro-i18n-apply.yml` - Main workflow for applying translations
