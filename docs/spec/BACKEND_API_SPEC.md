# Backend API Specification

This document provides a complete specification of the koro-i18n backend API, built with Hono on Cloudflare Workers.

## Overview

The backend provides a RESTful API for managing i18n translation projects, user authentication, and GitHub integration.

**Base URL**: `/api`

## Authentication

The API supports three authentication methods:

### 1. GitHub OAuth (Web UI)
- Initiates OAuth flow via `/api/auth/github`
- Returns JWT token via cookie after successful authentication

### 2. JWT Token
- Passed via `Authorization: Bearer <token>` header
- Or via `session` cookie (HttpOnly, Secure)
- Token expiry: 24 hours

### 3. OIDC (GitHub Actions)
- For automated workflows
- Validates `ACTIONS_ID_TOKEN_REQUEST_TOKEN`
- Token expiry: 10 minutes

---

## Endpoints

### Authentication

#### `GET /api/auth/github`
Initiates GitHub OAuth flow.

**Response**: `302 Redirect` to GitHub OAuth authorization URL

---

#### `GET /api/auth/callback`
Handles OAuth callback from GitHub.

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `code` | string | OAuth authorization code |
| `state` | string | CSRF state parameter |

**Response**: `302 Redirect` to `/dashboard` with session cookie set

**Error Response** (400):
```json
{
  "error": "Invalid state parameter"
}
```

---

#### `GET /api/auth/me`
Returns current authenticated user.

**Headers**: Requires authentication

**Response** (200):
```json
{
  "user": {
    "id": "uuid",
    "username": "string",
    "githubId": 12345
  }
}
```

**Error Response** (401):
```json
{
  "error": "Unauthorized"
}
```

---

#### `POST /api/auth/logout`
Logs out the current user.

**Headers**: Requires authentication

**Response** (200):
```json
{
  "success": true
}
```

---

### Projects

#### `GET /api/projects`
Lists projects the user owns or is a member of.

**Headers**: Requires authentication

**Response** (200):
```json
{
  "projects": [
    {
      "id": "uuid",
      "name": "my-project",
      "repository": "owner/repo",
      "role": "owner" | "member",
      "createdAt": "ISO8601"
    }
  ]
}
```

**Caching**: ETag supported, 5-minute cache with stale-while-revalidate

---

#### `POST /api/projects`
Creates a new project.

**Headers**: Requires authentication

**Request Body**:
```json
{
  "name": "project-name",
  "repository": "owner/repo"
}
```

**Validation**:
- `name`: Must match `/^[a-zA-Z0-9_-]+$/`
- `repository`: Must match `owner/repo` format

**Response** (200):
```json
{
  "success": true,
  "id": "uuid",
  "name": "project-name",
  "projectName": "project-name",
  "repository": "owner/repo"
}
```

**Error Response** (400):
```json
{
  "error": "Project or repository already exists"
}
```

**Error Response** (403):
```json
{
  "error": "Permission denied"
}
```

---

#### `GET /api/projects/all`
Lists all projects for discovery.

**Headers**: Requires authentication

**Response** (200):
```json
{
  "projects": [
    {
      "id": "uuid",
      "name": "project-name",
      "repository": "owner/repo",
      "userId": "owner-id",
      "createdAt": "ISO8601",
      "membershipStatus": "pending" | "approved" | null
    }
  ]
}
```

---

#### `DELETE /api/projects/:projectName`
Deletes a project (owner only).

**Headers**: Requires authentication

**Response** (200):
```json
{
  "success": true
}
```

**Error Response** (403):
```json
{
  "error": "Forbidden"
}
```

---

#### `PATCH /api/projects/:projectName`
Updates project settings (owner only).

**Headers**: Requires authentication

**Request Body**:
```json
{
  "accessControl": "open" | "restricted"
}
```

**Response** (200):
```json
{
  "success": true
}
```

---

### Project Members

#### `POST /api/projects/:projectName/join`
Requests to join a project.

**Headers**: Requires authentication

**Response** (200):
```json
{
  "success": true,
  "status": "pending"
}
```

---

#### `GET /api/projects/:projectName/members`
Lists project members (owner only).

**Headers**: Requires authentication

**Response** (200):
```json
{
  "members": [
    {
      "id": "uuid",
      "userId": "uuid",
      "username": "string",
      "avatarUrl": "url",
      "status": "pending" | "approved",
      "role": "member",
      "createdAt": "ISO8601"
    }
  ]
}
```

---

#### `POST /api/projects/:projectName/members/:memberId/approve`
Approves or rejects a member request (owner only).

**Headers**: Requires authentication

**Request Body**:
```json
{
  "status": "approved" | "rejected"
}
```

**Response** (200):
```json
{
  "success": true
}
```

---

#### `DELETE /api/projects/:projectName/members/:memberId`
Removes a member (owner only).

**Headers**: Requires authentication

**Response** (200):
```json
{
  "success": true
}
```

---

### Project Files

#### `GET /api/projects/:projectName/files/manifest`
Gets the generated manifest from the repository.

**Headers**: Requires authentication

**Response** (200):
```json
{
  "manifest": {
    "files": [
      {
        "path": "locales/en/common.json",
        "language": "en",
        "type": "source"
      }
    ]
  }
}
```

---

#### `POST /api/projects/:projectName/files/fetch-from-manifest`
Fetches files using manifest (recommended).

**Headers**: Requires authentication

**Request Body**:
```json
{
  "branch": "main"
}
```

**Response** (200):
```json
{
  "files": [
    {
      "path": "locales/en/common.json",
      "contents": {...}
    }
  ]
}
```

---

### Translations

#### `POST /api/projects/:projectName/translations`
Creates a new translation.

**Headers**: Requires authentication

**Request Body**:
```json
{
  "language": "ja",
  "filename": "common.json",
  "key": "welcome",
  "value": "ようこそ"
}
```

**Response** (200):
```json
{
  "success": true,
  "id": "uuid"
}
```

**Error Response** (400):
```json
{
  "error": "This translation already exists in the repository."
}
```

---

#### `GET /api/projects/:projectName/translations`
Lists translations for a project.

**Headers**: Requires authentication

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `language` | string | - | Filter by language |
| `filename` | string | - | Filter by filename |
| `status` | string | "approved" | Filter by status |
| `isValid` | boolean | - | Filter by validity |

**Response** (200):
```json
{
  "translations": [
    {
      "id": "uuid",
      "projectName": "project",
      "language": "ja",
      "filename": "common.json",
      "key": "welcome",
      "value": "ようこそ",
      "userId": "uuid",
      "username": "contributor",
      "avatarUrl": "url",
      "status": "approved",
      "sourceHash": "abc123",
      "isValid": true,
      "createdAt": "ISO8601",
      "updatedAt": "ISO8601"
    }
  ]
}
```

---

#### `GET /api/projects/:projectName/translations/file/:language/:filename`
Gets all translation data for a file in one call.

**Headers**: Requires authentication

**Response** (200):
```json
{
  "source": {
    "key": "Source value"
  },
  "target": {
    "key": "Target value"
  },
  "pending": [],
  "approved": [],
  "reconciliation": {
    "key": {
      "status": "committed" | "redundant" | "waiting" | "conflict" | "external",
      "repoValue": "optional"
    }
  },
  "virtualSuggestions": [],
  "sourceLanguage": "en",
  "targetLanguage": "ja",
  "filename": "common.json",
  "commitSha": "abc123"
}
```

---

#### `GET /api/projects/:projectName/translations/counts`
Gets translation counts grouped by language and filename.

**Headers**: Requires authentication

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `language` | string | Filter by language |

**Response** (200):
```json
{
  "counts": [
    {
      "language": "ja",
      "filename": "common.json",
      "count": 42
    }
  ]
}
```

---

#### `GET /api/projects/:projectName/translations/history`
Gets translation history for a specific key.

**Headers**: Requires authentication

**Query Parameters** (required):
| Parameter | Type | Description |
|-----------|------|-------------|
| `language` | string | Language code |
| `filename` | string | Filename |
| `key` | string | Translation key |

**Response** (200):
```json
{
  "history": [
    {
      "id": "uuid",
      "translationId": "uuid",
      "action": "submitted" | "approved" | "rejected" | "deleted",
      "value": "translation value",
      "userId": "uuid",
      "username": "contributor",
      "createdAt": "ISO8601"
    }
  ]
}
```

---

#### `GET /api/projects/:projectName/translations/suggestions`
Gets translation suggestions (non-deleted translations).

**Headers**: Requires authentication

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `language` | string | Filter by language |
| `filename` | string | Filter by filename |
| `key` | string | Filter by key |

**Response** (200):
```json
{
  "suggestions": [...]
}
```

---

#### `GET /api/projects/:projectName/translations/:id`
Gets a single translation by ID.

**Headers**: Requires authentication

**Response** (200):
```json
{
  "translation": {...}
}
```

---

#### `PATCH /api/projects/:projectName/translations/:id`
Approves or rejects a translation.

**Headers**: Requires authentication (project owner or moderator)

**Request Body**:
```json
{
  "status": "approved" | "rejected"
}
```

**Response** (200):
```json
{
  "success": true,
  "translation": {...}
}
```

---

#### `DELETE /api/projects/:projectName/translations/:id`
Deletes a translation.

**Headers**: Requires authentication (project owner or moderator)

**Response** (200):
```json
{
  "success": true
}
```

---

### Apply Translations (GitHub Action Export)

#### `GET /api/projects/:projectName/apply/preview`
Previews approved translations to be applied.

**Headers**: Requires authentication (JWT or OIDC)

**Response** (200):
```json
{
  "translations": [...],
  "summary": {
    "total": 10,
    "byLanguage": {
      "ja": 5,
      "es": 5
    }
  }
}
```

---

#### `GET /api/projects/:projectName/apply/export`
Exports approved translations for GitHub Action.

**Headers**: Requires authentication (JWT or OIDC)

**Response** (200):
```json
{
  "translations": [...],
  "repository": "owner/repo",
  "commitMessage": "feat(i18n): Update translations"
}
```

---

#### `POST /api/projects/:projectName/apply/committed`
Marks translations as committed after PR is created.

**Headers**: Requires authentication (JWT or OIDC)

**Request Body**:
```json
{
  "translationIds": ["id1", "id2", "id3"]
}
```

**Response** (200):
```json
{
  "success": true,
  "updated": 3
}
```

---

### Health

#### `GET /health`
Health check endpoint.

**Response** (200):
```json
{
  "status": "ok",
  "runtime": "cloudflare-workers"
}
```

---

## Error Responses

All error responses follow this format:

```json
{
  "error": "Error message",
  "details": "Optional additional details"
}
```

**Common HTTP Status Codes**:
- `400` - Bad Request (validation error)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

---

## Caching

The API uses ETag-based caching:

| Resource | Cache Duration | Strategy |
|----------|---------------|----------|
| Projects | 5 minutes | stale-while-revalidate |
| Files | 1 hour | immutable |
| Translations | 5 minutes | stale-while-revalidate |
| Health | No cache | max-age=0 |

ETags are used for 304 Not Modified responses.

---

## Rate Limiting

Rate limits are applied per user:
- Authentication endpoints: 10 requests/minute
- API endpoints: 100 requests/minute
- File fetching: 30 requests/minute

---

## CORS

CORS is configured for:
- Development: `http://localhost:5173`, `http://localhost:8787`, `http://localhost:3000`
- Production: `https://koro.f3liz.workers.dev`

Credentials (cookies) are included in cross-origin requests.
