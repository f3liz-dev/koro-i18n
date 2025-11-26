# Example GitHub Action for Applying Translations from koro-i18n

This directory contains example GitHub Action workflows that client repositories
can use to apply translations from the koro-i18n platform.

## Why a GitHub Action?

The koro-i18n platform uses OAuth tokens with read-only scope (`public_repo`).
This means the platform API cannot directly create branches or pull requests
in user repositories. Instead:

1. The API exports approved translations as JSON
2. A GitHub Action in the client repository fetches the export using OIDC
3. The GitHub Action applies the translations and creates the PR
4. The GitHub Action notifies the API that translations were committed

## Authentication with OIDC

The workflow uses GitHub OIDC (OpenID Connect) for authentication - **no secrets required!**

- GitHub Actions automatically provides OIDC tokens
- The token contains your repository information
- koro-i18n validates the token and checks the repository matches the project
- Tokens are short-lived (10 minutes) for security

This is the same authentication method used by the deprecated upload API.

## Setup

1. Copy `koro-i18n-apply.yml` to your repository's `.github/workflows/` directory
2. Update `PROJECT_NAME` to match your project name in koro-i18n
3. That's it! No secrets needed.

## Required Permissions

The workflow needs these permissions:
- `contents: write` - To commit translation changes
- `pull-requests: write` - To create the pull request
- `id-token: write` - To request OIDC tokens for authentication

## Workflow Files

- `koro-i18n-apply.yml` - Main workflow for applying translations using OIDC
