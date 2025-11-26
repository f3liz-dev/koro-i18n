# API Reference

Complete API reference for koro-i18n backend (Cloudflare Workers + Hono).

## Authentication

Three methods:
- **GitHub OAuth**: Web UI authentication, returns JWT
- **JWT**: API auth via cookie or `Authorization: Bearer <token>`
- **OIDC**: GitHub Actions auto-auth (validates `ACTIONS_ID_TOKEN_REQUEST_TOKEN`)

## Endpoints

### Auth
- `GET /auth/github` - Redirect to GitHub OAuth
- `GET /auth/callback` - OAuth callback, returns JWT
- `GET /auth/me` - Get current user info
- `POST /auth/logout` - Clear auth cookie

### Projects
- `GET /api/projects` - List user's projects
- `GET /api/projects/all` - List all projects (for discovery)
- `POST /api/projects` - Create project (requires permission)
- `DELETE /api/projects/:name` - Delete project
- `PATCH /api/projects/:name` - Update project settings
- `POST /api/projects/:name/join` - Request to join project
- `GET /api/projects/:name/members` - List members (owner only)
- `POST /api/projects/:name/members/:id/approve` - Approve/reject member
- `DELETE /api/projects/:name/members/:id` - Remove member

### Project Files (GitHub Integration)
- `GET /api/projects/:name/files/manifest` - Get generated manifest from repository
- `POST /api/projects/:name/files/fetch-from-manifest` - Fetch files using manifest (RECOMMENDED)
- `POST /api/projects/:name/files/fetch-from-github` - Fetch files with directory traversal (legacy)
- `GET /api/projects/:name/files` - List files for project
- `GET /api/projects/:name/files/:lang/:filename` - Get specific file content

### Apply Translations (Export for GitHub Action)
- `GET /api/projects/:name/apply/preview` - Preview approved translations to be applied
- `GET /api/projects/:name/apply/export` - Export approved translations for GitHub Action
- `POST /api/projects/:name/apply/committed` - Mark translations as committed after PR is created

### Translations
- `GET /api/translations` - List web translations (paginated)
- `POST /api/translations` - Create/update translation
- `GET /api/translations/:id` - Get translation by ID
- `DELETE /api/translations/:id` - Delete translation
- `GET /api/translations/key/:key` - Get translations by key
- `GET /api/translations/export` - Export translations as JSON
- `POST /api/translations/batch-validate` - Validate translations against source

### R2 Files
- `GET /api/r2/:project/:lang/:filename` - Get file from R2 (with cache)
- `GET /api/r2/by-key/:r2Key` - Get file by R2 key

### Health
- `GET /health` - Health check endpoint

## Request/Response Formats

### Common Patterns

**Error Response:**
```json
{
  "error": "Error message",
  "details": "Optional details"
}
```

**Success Response:**
```json
{
  "success": true,
  "data": { ... }
}
```

### Caching

All responses include appropriate caching headers:
- Projects: 5 min cache, revalidate
- Files: 1 hour cache, immutable
- Translations: 5 min cache, revalidate

ETags are used for 304 responses.

## Example Usage

### Fetch translations from GitHub

```bash
# Get manifest
curl https://platform.dev/api/projects/my-project/files/manifest \
  -H "Authorization: Bearer $TOKEN"

# Fetch files using manifest (recommended)
curl -X POST https://platform.dev/api/projects/my-project/files/fetch-from-manifest \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"branch": "main"}'
```

### Create web translation

```bash
curl -X POST https://platform.dev/api/translations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectName": "my-project",
    "lang": "ja",
    "filename": "common.json",
    "key": "welcome",
    "value": "ようこそ"
  }'
```

### Apply translations via GitHub Action (OIDC)

The API exports translation data that a GitHub Action in the client repository
uses to create the PR (since the OAuth token doesn't have write permissions).

**Authentication**: These endpoints support both JWT and OIDC authentication.
For GitHub Actions, OIDC is recommended as it requires no secrets.

```bash
# In GitHub Actions, get OIDC token:
TOKEN=$(curl -s -H "Authorization: bearer $ACTIONS_ID_TOKEN_REQUEST_TOKEN" \
  "$ACTIONS_ID_TOKEN_REQUEST_URL&audience=https://koro.f3liz.workers.dev" | jq -r .value)

# Preview what will be applied
curl https://koro.f3liz.workers.dev/api/projects/my-project/apply/preview \
  -H "Authorization: Bearer $TOKEN"

# Export translations for GitHub Action
curl https://koro.f3liz.workers.dev/api/projects/my-project/apply/export \
  -H "Authorization: Bearer $TOKEN"

# Mark translations as committed (called by GitHub Action after PR is created)
curl -X POST https://koro.f3liz.workers.dev/api/projects/my-project/apply/committed \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"translationIds": ["t1", "t2", "t3"]}'
```

See `docs/examples/koro-i18n-apply.yml` for a complete GitHub Action workflow.

For detailed implementation, see `src/routes/`.
