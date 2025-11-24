# Migration Guide: Upload to GitHub Direct Access

This guide explains the changes made to deprecate the upload-based flow and transition to direct GitHub repository access.

## Overview of Changes

### What Changed

**Before (Deprecated):**
1. Client preprocesses translation files (git blame, MessagePack)
2. Client uploads files to `/api/projects/:project/files/upload`
3. Files stored in R2 bucket
4. Rust worker handles upload processing

**After (New):**
1. User authenticates with GitHub (OAuth with `public_repo` scope)
2. GitHub access token stored in D1
3. Platform fetches files directly from GitHub on-demand
4. No manual upload or R2 storage needed for source files
5. Metadata validation done client-side

### Benefits

- ✅ **Always up-to-date**: Files fetched directly from GitHub, no sync lag
- ✅ **No manual uploads**: System automatically gets latest files
- ✅ **Reduced complexity**: No client preprocessing needed
- ✅ **Lower storage costs**: No R2 storage for source files
- ✅ **Better security**: GitHub tokens control repository access

## For Platform Administrators

### Database Migration

Apply the new migration to add `githubAccessToken` field:

```bash
# Local development
wrangler d1 migrations apply koro-i18n-db --local

# Production
wrangler d1 migrations apply koro-i18n-db --remote
```

The migration adds:
- `githubAccessToken` column to `User` table (nullable)

### Existing Users

Existing users need to re-authenticate to grant the `public_repo` scope:
1. Log out from the platform
2. Log in again with GitHub OAuth
3. Approve the new `public_repo` permission

## For Repository Owners

### Using the New Flow

1. **Create a project** in the platform (links to your GitHub repository)

2. **Fetch files from GitHub** using the new endpoint:

```bash
curl -X POST https://koro.f3liz.workers.dev/api/projects/my-project/files/fetch-from-github \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "path": "locales",
    "branch": "main"
  }'
```

3. **Response** includes all translation files from your repository:

```json
{
  "success": true,
  "repository": "owner/repo",
  "branch": "main",
  "commitSha": "abc123",
  "filesFound": 5,
  "files": [
    {
      "lang": "en",
      "filename": "common.json",
      "contents": { "key": "value" },
      "sourceHash": "hash123",
      "commitSha": "abc123"
    }
  ]
}
```

### Directory Structure

The platform supports common directory structures:
- `locales/en/common.json`
- `translations/en/common.json`
- `i18n/en.json`
- Any nested structure with JSON files

Language codes are automatically extracted from the path.

## For Client Library Users

### Migration Path

The client library will be updated to use the new flow. Until then:

**Option 1: Continue using upload** (deprecated but still works)
- Existing CI workflows continue to function
- Add deprecation warnings to your logs

**Option 2: Migrate to new flow** (recommended)
- Remove upload-related GitHub Actions
- Platform automatically fetches files when needed
- Update UI to trigger fetch instead of upload

### Example: Remove Upload Action

**Before:**
```yaml
- name: Upload translations
  uses: f3liz-dev/koro-i18n/.github/actions/upload-translations@main
  with:
    platform-url: https://koro.f3liz.workers.dev
    project-name: my-project
```

**After:**
```yaml
# No action needed! Platform fetches automatically
# Or trigger fetch via API:
- name: Trigger fetch
  run: |
    curl -X POST https://koro.f3liz.workers.dev/api/projects/my-project/files/fetch-from-github \
      -H "Authorization: Bearer ${{ secrets.JWT_TOKEN }}"
```

## Deprecation Timeline

- **Now**: New `/fetch-from-github` endpoint available
- **Now**: Upload endpoints marked as deprecated with warnings
- **3 months**: Upload endpoints will show prominent deprecation notices
- **6 months**: Upload endpoints may be removed (TBD based on usage)

## FAQs

### Do I need to re-upload existing files?

No. Existing files in R2 remain accessible. New fetches will use GitHub directly.

### What about private repositories?

The `public_repo` scope allows access to both public and private repositories (if the OAuth app is configured correctly). For private repos, ensure your GitHub OAuth app requests appropriate permissions.

### Can I still use GitHub Actions OIDC tokens?

Yes, OIDC tokens still work for the deprecated upload endpoints. However, the new flow doesn't require OIDC tokens since files are fetched server-side using stored OAuth tokens.

### What about metadata (git blame, etc.)?

In the new flow, metadata validation should be done client-side. The platform focuses on fetching and serving the translation content. Git blame and other metadata can be retrieved separately using GitHub's API if needed.

### How often are files fetched?

Files are fetched on-demand. You can implement caching on the client side or trigger fetches periodically. The platform always fetches the latest commit from the specified branch.

## Troubleshooting

### "GitHub access token not found"

**Solution:** Re-authenticate with GitHub to grant the `public_repo` scope.

### "Failed to fetch files from GitHub"

**Possible causes:**
- Invalid repository format (must be `owner/repo`)
- Token expired or revoked
- Repository doesn't exist or user doesn't have access
- Path doesn't contain translation files

**Solution:** Check repository settings, re-authenticate if needed, verify the path contains JSON files.

### Files not updating

**Solution:** The platform always fetches the latest commit. If files aren't updating, check:
1. Branch name is correct
2. Changes are pushed to GitHub
3. Path is correct

## Support

For issues or questions:
- GitHub Issues: https://github.com/f3liz-dev/koro-i18n/issues
- Documentation: https://github.com/f3liz-dev/koro-i18n/tree/main/docs
