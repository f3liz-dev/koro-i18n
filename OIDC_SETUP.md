# GitHub Actions OIDC Setup

## Overview

Use GitHub Actions OIDC tokens instead of static API keys for enhanced security.

## Benefits

✓ **No static secrets** - Tokens are generated on-demand by GitHub  
✓ **Short-lived** - Tokens expire in 10 minutes  
✓ **Automatic verification** - Repository is verified from the token  
✓ **No rate limits** - OIDC uploads are not rate limited  
✓ **Industry standard** - Same method used by AWS, Azure, GCP

## Setup

### 1. Update GitHub Actions Workflow

Add `id-token: write` permission and fetch the OIDC token:

```yaml
name: Upload Translations

on:
  push:
    branches: [main]

permissions:
  id-token: write  # Required for OIDC
  contents: read

jobs:
  upload:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Get OIDC Token
        id: oidc
        run: |
          TOKEN=$(curl -H "Authorization: bearer $ACTIONS_ID_TOKEN_REQUEST_TOKEN" \
            "$ACTIONS_ID_TOKEN_REQUEST_URL&audience=${{ secrets.PLATFORM_URL }}" | jq -r .value)
          echo "token=$TOKEN" >> $GITHUB_OUTPUT
      
      - name: Upload translations
        env:
          OIDC_TOKEN: ${{ steps.oidc.outputs.token }}
        run: |
          npx @i18n-platform/client upload \
            --oidc-token "$OIDC_TOKEN" \
            --platform-url ${{ secrets.PLATFORM_URL }}
```

### 2. Add Platform URL to Secrets

Add your platform URL as a GitHub secret:

```
PLATFORM_URL=https://i18n-platform.workers.dev
```

Or for development:

```
PLATFORM_URL=http://localhost:8787
```

### 3. Update Client Library Call

The client library should detect OIDC token and use it:

```typescript
await uploadTranslations(
  platformUrl,
  oidcToken, // Pass OIDC token instead of API key
  repository,
  branch,
  commitSha,
  files
);
```

## How It Works

1. **GitHub Actions generates token** - When workflow runs, GitHub creates a JWT token
2. **Token contains claims** - Repository, branch, commit SHA, actor, etc.
3. **Platform verifies token** - Checks signature against GitHub's public keys
4. **Upload proceeds** - If valid, files are uploaded

## Token Claims

The OIDC token contains:

```json
{
  "iss": "https://token.actions.githubusercontent.com",
  "sub": "repo:owner/repo:ref:refs/heads/main",
  "aud": "https://i18n-platform.workers.dev",
  "repository": "owner/repo",
  "repository_owner": "owner",
  "ref": "refs/heads/main",
  "sha": "abc123...",
  "workflow": "Upload Translations",
  "actor": "username",
  "run_id": "123456",
  "exp": 1234567890,
  "iat": 1234567880
}
```

## Comparison with API Keys

| Feature | API Keys | OIDC |
|---------|----------|------|
| Setup complexity | Simple | Medium |
| Security | Good | Excellent |
| Expiration | Never | 10 minutes |
| Rate limits | 100/hour | None |
| Works locally | ✓ | ✗ |
| Works in CI/CD | ✓ | ✓ (GitHub Actions only) |
| Revocation | Manual | Automatic |

## Troubleshooting

### "Invalid OIDC token"

- Check that `id-token: write` permission is set
- Verify audience matches your platform URL exactly
- Ensure token is not expired (10 min limit)

### "Repository mismatch"

- The repository in the token must match the upload request
- Check that you're uploading to the correct project

### "OIDC verification failed"

- GitHub's JWKS endpoint might be unreachable
- Token signature verification failed
- Check platform logs for details

## Fallback to API Keys

If OIDC setup is too complex, you can still use API keys:

```yaml
- name: Upload translations
  env:
    API_KEY: ${{ secrets.I18N_API_KEY }}
  run: |
    npx @i18n-platform/client upload \
      --api-key "$API_KEY" \
      --platform-url ${{ secrets.PLATFORM_URL }}
```

Both methods are supported simultaneously.
