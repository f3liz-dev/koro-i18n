# Backend API Documentation

Complete API reference for the koro-i18n backend, built with Cloudflare Workers and Hono framework.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Authentication](#authentication)
- [API Endpoints](#api-endpoints)
  - [Authentication Routes](#authentication-routes)
  - [Project Routes](#project-routes)
  - [Project File Routes](#project-file-routes)
  - [R2 File Routes](#r2-file-routes)
  - [Translation Routes](#translation-routes)
  - [Health Check](#health-check)
- [Error Handling](#error-handling)
- [Request/Response Formats](#requestresponse-formats)
- [Caching Strategy](#caching-strategy)

---

## Architecture Overview

### Technology Stack

- **Runtime**: Cloudflare Workers (V8 isolates)
- **Framework**: Hono (lightweight HTTP framework)
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare R2 (S3-compatible object storage)
- **ORM**: Prisma with D1 adapter
- **Serialization**: MessagePack (for R2 files)
- **Authentication**: GitHub OAuth + JWT + OIDC

### Application Structure

```
src/
├── workers.ts              # Main worker entry point
├── oidc.ts                 # GitHub OIDC verification
├── lib/
│   ├── auth.ts            # JWT authentication
│   ├── database.ts        # Prisma initialization & helpers
│   ├── r2-storage.ts      # R2 operations with caching
│   ├── etag.ts            # ETag generation utilities
│   ├── etag-db.ts         # Database-based ETag generation
│   ├── etag-middleware.ts # Automatic ETag middleware
│   ├── cache-headers.ts   # Cache-Control configuration
│   └── translation-validation.ts # Source hash validation
└── routes/
    ├── auth.ts            # Authentication endpoints
    ├── projects.ts        # Project management
    ├── project-files.ts   # File upload & listing
    ├── r2-files.ts        # R2 file retrieval
    └── translations.ts    # Web translation CRUD
```

### Environment Variables

Required configuration in `wrangler.toml` and secrets:

```toml
[env.production]
vars = { ENVIRONMENT = "production", PLATFORM_URL = "https://koro.f3liz.workers.dev" }

[[env.production.r2_buckets]]
binding = "TRANSLATION_BUCKET"
bucket_name = "koro-i18n-translations"

[[env.production.d1_databases]]
binding = "DB"
database_name = "koro-i18n-db"
database_id = "your-database-id"
```

Secrets (set with `wrangler secret put`):
- `GITHUB_CLIENT_ID` - GitHub OAuth app client ID
- `GITHUB_CLIENT_SECRET` - GitHub OAuth app client secret  
- `JWT_SECRET` - Secret for signing JWT tokens
- `ALLOWED_PROJECT_CREATORS` (optional) - Comma-separated list of GitHub usernames allowed to create projects

---

## Authentication

### Authentication Methods

The platform supports three authentication methods:

1. **GitHub OAuth** (Web UI)
   - User signs in with GitHub account
   - Server exchanges OAuth code for access token
   - Returns JWT token to client
   - Used for: Web UI authentication

2. **JWT Tokens** (API & Web)
   - Stateless tokens with 24-hour expiration
   - Contains: userId, username, githubId, accessToken
   - Sent via: Cookie (`auth_token`) or Authorization header
   - Used for: API calls from authenticated users

3. **OIDC Tokens** (GitHub Actions)
   - Issued by GitHub Actions automatically
   - Short-lived (10 minutes)
   - Contains: repository, ref, sha, actor, workflow
   - Used for: Automated uploads from GitHub Actions

### JWT Token Structure

```typescript
interface AuthPayload {
  userId: string;       // Internal user ID
  username: string;     // GitHub username
  githubId: number;     // GitHub user ID
  accessToken?: string; // GitHub API access token
  iat: number;         // Issued at (Unix timestamp)
  exp: number;         // Expires at (Unix timestamp)
}
```

### OIDC Token Claims

```typescript
interface GitHubOIDCToken {
  repository: string;        // e.g., "owner/repo"
  repository_owner: string;  // e.g., "owner"
  ref: string;              // e.g., "refs/heads/main"
  sha: string;              // Commit SHA
  workflow: string;         // Workflow name
  actor: string;            // GitHub username
  run_id: string;          // Workflow run ID
  iss: string;             // "https://token.actions.githubusercontent.com"
  aud: string;             // Platform URL
}
```

---

## API Endpoints

### Authentication Routes

Base path: `/api/auth`

#### `GET /api/auth/github`

Initiate GitHub OAuth flow.

**Request:**
- No parameters required

**Response:**
- Redirects to GitHub OAuth authorization page

**Flow:**
1. Generates random state token
2. Stores state in D1 with 10-minute expiration
3. Redirects to `https://github.com/login/oauth/authorize`

---

#### `GET /api/auth/callback`

GitHub OAuth callback endpoint.

**Query Parameters:**
- `code` (required): OAuth authorization code
- `state` (required): State token from authorization request

**Response:**
- Redirects to `/dashboard` with auth cookie set

**Flow:**
1. Validates state token (must exist and not expired)
2. Exchanges code for GitHub access token
3. Fetches user profile from GitHub API
4. Creates/updates user in database
5. Generates JWT token
6. Sets `auth_token` HttpOnly cookie
7. Redirects to dashboard

**Errors:**
- `400` - Missing code or state
- `400` - Invalid or expired state
- `500` - OAuth exchange failed

---

#### `GET /api/auth/me`

Get current authenticated user info.

**Authentication:** Required (JWT)

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "username": "github-username",
    "githubId": 12345678
  }
}
```

**Cache:** 5 minutes (`max-age=300, stale-while-revalidate=60`)

**Errors:**
- `401` - No token or invalid token

---

#### `POST /api/auth/logout`

Logout current user.

**Authentication:** Optional

**Response:**
```json
{
  "success": true
}
```

**Effect:** Clears `auth_token` cookie

---

### Project Routes

Base path: `/api/projects`

#### `POST /api/projects`

Create a new project.

**Authentication:** Required (JWT)

**Request Body:**
```json
{
  "name": "my-project",        // Project identifier (alphanumeric, -, _)
  "repository": "owner/repo"   // GitHub repository (owner/repo format)
}
```

**Response:**
```json
{
  "success": true,
  "id": "uuid",
  "name": "my-project",
  "repository": "owner/repo"
}
```

**Validation:**
- `name`: Must match `/^[a-zA-Z0-9_-]+$/`
- `repository`: Must match `/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+$/`
- Name must be unique across platform
- Repository must not already be registered
- User must be in `ALLOWED_PROJECT_CREATORS` list (if configured)

**Errors:**
- `400` - Invalid name or repository format
- `400` - Name already taken
- `400` - Repository already registered
- `403` - User not allowed to create projects

---

#### `GET /api/projects`

Get projects accessible to current user (owned or member).

**Authentication:** Required (JWT)

**Query Parameters:**
- `includeLanguages` (optional): Set to `"true"` to include available languages (expensive)

**Response:**
```json
{
  "projects": [
    {
      "id": "uuid",
      "name": "my-project",
      "repository": "owner/repo",
      "userId": "owner-uuid",
      "accessControl": "whitelist",
      "sourceLanguage": "en",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "role": "owner",
      "languages": ["en", "ja", "es"]  // Only if includeLanguages=true
    }
  ]
}
```

**Cache:** 5 minutes with ETag

**Roles:**
- `owner` - Project creator
- `member` - Approved project member

---

#### `GET /api/projects/all`

Get all projects on the platform with current user's membership status.

**Authentication:** Required (JWT)

**Response:**
```json
{
  "projects": [
    {
      "id": "uuid",
      "name": "my-project",
      "repository": "owner/repo",
      "userId": "owner-uuid",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "membershipStatus": "approved" | "pending" | "rejected" | null
    }
  ]
}
```

**Cache:** 5 minutes with ETag

---

#### `DELETE /api/projects/:id`

Delete a project (owner only).

**Authentication:** Required (JWT)

**Response:**
```json
{
  "success": true
}
```

**Errors:**
- `404` - Project not found or not owned by user

---

#### `PATCH /api/projects/:id`

Update project settings.

**Authentication:** Required (JWT, owner only)

**Request Body:**
```json
{
  "accessControl": "whitelist" | "blacklist"
}
```

**Response:**
```json
{
  "success": true
}
```

**Errors:**
- `400` - Invalid accessControl value
- `404` - Project not found or not owned by user

---

#### `POST /api/projects/:id/join`

Request to join a project.

**Authentication:** Required (JWT)

**Response:**
```json
{
  "success": true,
  "status": "pending"
}
```

**Errors:**
- `404` - Project not found
- `400` - Already a member or request exists

---

#### `GET /api/projects/:id/members`

Get project members (owner only).

**Authentication:** Required (JWT, owner only)

**Response:**
```json
{
  "members": [
    {
      "id": "member-uuid",
      "userId": "user-uuid",
      "username": "github-username",
      "avatarUrl": "https://avatars.githubusercontent.com/...",
      "status": "pending" | "approved" | "rejected",
      "role": "member" | "owner",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

**Cache:** 5 minutes with ETag

---

#### `POST /api/projects/:id/members/:memberId/approve`

Approve or reject member request.

**Authentication:** Required (JWT, owner only)

**Request Body:**
```json
{
  "status": "approved" | "rejected"
}
```

**Response:**
```json
{
  "success": true
}
```

**Errors:**
- `400` - Invalid status
- `403` - Not project owner
- `404` - Project not found

---

#### `DELETE /api/projects/:id/members/:memberId`

Remove project member.

**Authentication:** Required (JWT, owner only)

**Response:**
```json
{
  "success": true
}
```

---

### Project File Routes

Base path: `/api/projects/:projectName/files`

#### `POST /api/projects/:projectName/files/fetch-from-github` ⭐ NEW RECOMMENDED

Fetch translation files directly from a GitHub repository using the user's stored access token.

**Authentication:** Required (JWT)

**Authorization Header:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**
```json
{
  "path": "locales",  // Optional, default: "locales"
  "branch": "main"    // Optional, default: "main"
}
```

**Response:**
```json
{
  "success": true,
  "repository": "owner/repo",
  "branch": "main",
  "commitSha": "abc123def456",
  "filesFound": 5,
  "files": [
    {
      "lang": "en",
      "filename": "common.json",
      "contents": {
        "key1": "value1",
        "key2": "value2"
      },
      "sourceHash": "file-content-hash",
      "commitSha": "abc123def456"
    }
  ],
  "message": "Files fetched successfully from GitHub. Metadata validation should be done client-side."
}
```

**Error Responses:**
- `401 Unauthorized` - GitHub access token not found or expired
- `404 Not Found` - Project or files not found
- `500 Internal Server Error` - Failed to fetch from GitHub

**Notes:**
- This endpoint automatically uses the latest commit from the specified branch
- Files are fetched on-demand, not stored in R2
- The user must have re-authenticated after the `public_repo` scope was added
- Metadata validation is done client-side

---

#### `POST /api/projects/:projectName/files/upload` ⚠️ DEPRECATED

> **Warning:** This endpoint is deprecated. Use `/fetch-from-github` instead to fetch files directly from GitHub.

Upload translation files to R2 (GitHub imports).

**Authentication:** Required (OIDC or JWT in development)

**Authorization Header:**
```
Authorization: Bearer <OIDC_TOKEN>
```

**Request Body:**
```json
{
  "branch": "main",
  "commitSha": "abc123def456",
  "sourceLanguage": "en",
  "files": [
    {
      "lang": "en",
      "filename": "common.json",
      "contents": {
        "key1": "value1",
        "key2": "value2"
      },
      "metadata": "<base64-encoded-msgpack>",
      "sourceHash": "file-content-hash",
      "packedData": "<base64-encoded-msgpack-file>"  // Optional optimization
    }
  ],
  "chunked": {  // Optional, for chunked uploads
    "uploadId": "uuid",
    "chunkIndex": 1,
    "totalChunks": 10,
    "isLastChunk": false
  },
  "allSourceFiles": ["en/common.json", "ja/common.json"]  // For cleanup
}
```

**Metadata Format:**
The `metadata` field should be base64-encoded MessagePack containing:
```typescript
{
  gitBlame: {
    [key: string]: {
      commit: string;
      author: string;
      email: string;
      date: string;
    }
  },
  charRanges: {
    [key: string]: {
      start: [line: number, char: number];
      end: [line: number, char: number];
    }
  },
  sourceHashes: {
    [key: string]: string;  // 16-char hash for validation
  }
}
```

**Response:**
```json
{
  "success": true,
  "projectId": "owner/repo",
  "commitSha": "abc123def456",
  "filesUploaded": 10,
  "r2Keys": ["project-en-common.json", ...],
  "uploadedAt": "2024-01-01T00:00:00.000Z",
  "chunked": {
    "chunkIndex": 1,
    "totalChunks": 10,
    "isLastChunk": false
  },
  "invalidationResults": {  // Only on last chunk
    "en/common.json": {
      "invalidated": 5,
      "checked": 10
    }
  }
}
```

**Flow:**
1. Verify OIDC token or JWT (dev mode)
2. Validate project access
3. Store files to R2 with MessagePack encoding
4. Batch update D1 index (single SQL operation)
5. On last chunk: Invalidate outdated web translations
6. Return upload result

**Limits:**
- Max 500 files per chunk
- Each file stored individually in R2
- Files overwrite previous versions

**Errors:**
- `400` - Missing required fields or invalid format
- `401` - No authorization token
- `403` - Invalid token or repository mismatch
- `404` - Project not found
- `500` - Upload failed

---

#### `POST /api/projects/:projectName/cleanup`

Clean up orphaned files from R2 and D1.

**Authentication:** Required (OIDC or JWT in development)

**Request Body:**
```json
{
  "branch": "main",
  "allSourceFiles": ["en/common.json", "ja/common.json"]
}
```

**Response:**
```json
{
  "success": true,
  "cleanupResult": {
    "deleted": 3,
    "files": ["en/old-file.json", "ja/removed.json", "es/deleted.json"]
  }
}
```

**Flow:**
1. Query existing files from D1
2. Compare with provided source file list
3. Delete orphaned files from R2 and D1
4. Return deletion results

---

#### `GET /api/projects/:projectName/files/list`

List files for a project (JWT auth - web UI).

**Authentication:** Required (JWT)

**Query Parameters:**
- `branch` (optional): Branch name, default "main"
- `language` (optional): Filter by language code or "source-language"

**Response:**
```json
{
  "project": "my-project",
  "repository": "owner/repo",
  "branch": "main",
  "files": [
    {
      "lang": "en",
      "filename": "common.json",
      "commitSha": "abc123",
      "r2Key": "owner-repo-en-common.json",
      "sourceHash": "file-hash",
      "totalKeys": 42,
      "uploadedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "generatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Cache:** 10 minutes with ETag

---

#### `GET /api/projects/:projectName/files/list-oidc`

List files for a project (OIDC auth - GitHub Actions).

**Authentication:** Required (OIDC)

Same as `/files/list` but uses OIDC token authentication.

---

#### `GET /api/projects/:projectName/files/summary`

Get file summary with translation progress.

**Authentication:** Required (JWT)

**Query Parameters:**
- `branch` (optional): Branch name, default "main"
- `lang` (optional): Filter by language or "source-language"
- `filename` (optional): Filter by filename

**Response:**
```json
{
  "files": [
    {
      "filename": "common.json",
      "lang": "ja",
      "commitSha": "abc123",
      "totalKeys": 42,
      "translatedKeys": 42,  // 0 for source language, totalKeys for targets
      "sourceHash": "file-hash",
      "uploadedAt": "2024-01-01T00:00:00.000Z",
      "r2Key": "project-ja-common.json"
    }
  ]
}
```

**Cache:** 10 minutes with ETag

**Note:** `translatedKeys` is always 0 for source language files, and equals `totalKeys` for target language files (since GitHub imports are complete).

---

#### `GET /api/projects/:projectName/files`

Get file metadata (lightweight version without progress info).

**Authentication:** Required (JWT)

**Query Parameters:**
- `branch` (optional): Branch name, default "main"
- `lang` (optional): Filter by language or "source-language"
- `filename` (optional): Filter by filename

**Response:**
```json
{
  "files": [
    {
      "id": "uuid",
      "filename": "common.json",
      "lang": "en",
      "commitSha": "abc123",
      "r2Key": "project-en-common.json",
      "sourceHash": "file-hash",
      "totalKeys": 42,
      "uploadedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "note": "Use /api/r2/:projectName/:lang/:filename to get actual file contents"
}
```

**Cache:** 10 minutes with ETag

---

### R2 File Routes

Base path: `/api/r2`

#### `GET /api/r2/:projectName/:lang/:filename`

Get file contents from R2 (GitHub import only, no web translations).

**Authentication:** Required (JWT)

**Query Parameters:**
- `branch` (optional): Branch name, default "main"

**Response:**
```json
{
  "raw": {
    "key1": "value1",
    "key2": "value2"
  },
  "metadata": {
    "gitBlame": {
      "key1": {
        "commit": "abc123",
        "author": "John Doe",
        "email": "john@example.com",
        "date": "2024-01-01"
      }
    },
    "charRanges": {
      "key1": {
        "start": [1, 0],
        "end": [1, 20]
      }
    },
    "sourceHashes": {
      "key1": "hash123"
    }
  },
  "sourceHash": "file-content-hash",
  "commitSha": "abc123def456",
  "uploadedAt": "2024-01-01T00:00:00.000Z",
  "totalKeys": 42
}
```

**Cache:** 10 minutes with ETag, in-memory cache (1 hour TTL)

**Errors:**
- `404` - File not found in D1 index or R2

---

#### `GET /api/r2/by-key/:r2Key`

Get file by R2 key directly.

**Authentication:** Required (JWT)

**Response:** Same as above endpoint

**Cache:** 10 minutes

---

### Translation Routes

Base path: `/api/translations`

#### `POST /api/translations`

Create a web translation.

**Authentication:** Required (JWT)

**Request Body:**
```json
{
  "projectId": "project-name-or-uuid",
  "language": "ja",
  "filename": "common.json",
  "key": "key1",
  "value": "翻訳値"
}
```

**Response:**
```json
{
  "success": true,
  "id": "translation-uuid"
}
```

**Flow:**
1. Resolve projectId (accepts name or UUID)
2. Fetch source hash from R2 file
3. Create translation with status "pending"
4. Set `isValid` to true initially
5. Create history entry

**Errors:**
- `400` - Missing required fields
- `404` - Project not found

---

#### `GET /api/translations`

Get web translations with filters.

**Authentication:** Required (JWT)

**Query Parameters:**
- `projectId` (required): Project name or UUID
- `language` (optional): Filter by language
- `filename` (optional): Filter by filename
- `status` (optional): Filter by status, default "approved"
- `isValid` (optional): Filter by validation status ("true" or "false")

**Response:**
```json
{
  "translations": [
    {
      "id": "uuid",
      "projectId": "project-uuid",
      "language": "ja",
      "filename": "common.json",
      "key": "key1",
      "value": "翻訳値",
      "userId": "user-uuid",
      "username": "translator",
      "avatarUrl": "https://...",
      "status": "approved",
      "sourceHash": "hash123",
      "isValid": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

**Cache:** 1 minute with ETag

**Limits:** Max 500 results

---

#### `GET /api/translations/history`

Get translation history for a specific key.

**Authentication:** Required (JWT)

**Query Parameters:**
- `projectId` (required): Project name or UUID
- `language` (required): Language code
- `filename` (required): Filename
- `key` (required): Translation key

**Response:**
```json
{
  "history": [
    {
      "id": "uuid",
      "translationId": "translation-uuid",
      "projectId": "project-uuid",
      "language": "ja",
      "filename": "common.json",
      "key": "key1",
      "value": "翻訳値",
      "userId": "user-uuid",
      "username": "translator",
      "avatarUrl": "https://...",
      "action": "submitted" | "approved" | "rejected" | "deleted" | "invalidated",
      "sourceHash": "hash123",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

**Cache:** 1 minute with ETag

**Errors:**
- `400` - Missing required parameters
- `404` - Project not found

---

#### `GET /api/translations/suggestions`

Get translation suggestions (pending/approved translations).

**Authentication:** Required (JWT)

**Query Parameters:**
- `projectId` (required): Project name or UUID
- `language` (optional): Filter by language
- `filename` (optional): Filter by filename
- `key` (optional): Filter by key

**Response:**
```json
{
  "suggestions": [
    {
      "id": "uuid",
      "projectId": "project-uuid",
      "language": "ja",
      "filename": "common.json",
      "key": "key1",
      "value": "翻訳値",
      "userId": "user-uuid",
      "username": "translator",
      "avatarUrl": "https://...",
      "status": "pending" | "approved",
      "sourceHash": "hash123",
      "isValid": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

**Cache:** 30 seconds with ETag

**Limits:** Max 500 results

---

#### `POST /api/translations/:id/approve`

Approve a translation.

**Authentication:** Required (JWT)

**Response:**
```json
{
  "success": true
}
```

**Flow:**
1. Find translation
2. Reject other pending/approved translations for same key
3. Approve this translation
4. Create history entry

**Errors:**
- `404` - Translation not found

---

#### `DELETE /api/translations/:id`

Delete a translation (soft delete).

**Authentication:** Required (JWT)

**Response:**
```json
{
  "success": true
}
```

**Flow:**
1. Find translation
2. Set status to "deleted"
3. Create history entry

**Errors:**
- `404` - Translation not found

---

### Health Check

#### `GET /health`

Health check endpoint for monitoring.

**Authentication:** Not required

**Response:**
```json
{
  "status": "ok",
  "runtime": "cloudflare-workers"
}
```

**Cache:** No cache (`max-age=0, no-cache`)

---

## Error Handling

### Error Response Format

All errors follow a consistent format:

```json
{
  "error": "Human-readable error message"
}
```

In development mode, additional details may be included:

```json
{
  "error": "Human-readable error message",
  "details": "Stack trace or detailed error information"
}
```

### HTTP Status Codes

- `200` - Success
- `304` - Not Modified (ETag match)
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing or invalid auth)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

### Common Error Scenarios

1. **Missing Authentication**
   ```json
   { "error": "Unauthorized" }
   ```

2. **Invalid Token**
   ```json
   { "error": "Invalid token" }
   ```

3. **Access Denied**
   ```json
   { "error": "Access denied to this project" }
   ```

4. **Validation Error**
   ```json
   { "error": "Invalid project name. Use only letters, numbers, hyphens, and underscores" }
   ```

5. **Resource Not Found**
   ```json
   { "error": "Project not found" }
   ```

6. **OIDC Verification Failed**
   ```json
   { "error": "GitHub OIDC token verification failed: token expired" }
   ```

---

## Request/Response Formats

### Content Types

- **Request**: `application/json` (except file uploads which may use MessagePack)
- **Response**: `application/json` (or `application/msgpack` for R2 files)

### Headers

**Common Request Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
If-None-Match: "<etag>"  // For conditional requests
```

**Common Response Headers:**
```
Content-Type: application/json
Cache-Control: private, max-age=300, stale-while-revalidate=60
ETag: "abc123"
Access-Control-Allow-Origin: https://koro.f3liz.workers.dev
Access-Control-Allow-Credentials: true
```

### Date Formats

All dates are in ISO 8601 format:
```
2024-01-01T00:00:00.000Z
```

---

## Caching Strategy

### Overview

The platform uses a multi-layer caching strategy optimized for SPAs:

1. **Browser Cache** - HTTP Cache-Control headers
2. **ETag Validation** - 304 Not Modified responses
3. **In-Memory Cache** - Worker-level caching (R2 files)

### Cache Configurations

Different endpoints have different cache durations based on data volatility:

| Endpoint Type | Max Age | SWR | Rationale |
|--------------|---------|-----|-----------|
| Auth | 5 min | 1 min | Changes infrequently, cleared on 401 |
| Projects | 5 min | 1 min | Stable data, updates rare |
| Project Files | 10 min | 2 min | GitHub imports are immutable |
| Translations | 1 min | 30 sec | May change during editing |
| Suggestions | 30 sec | 10 sec | Real-time collaborative editing |
| Health Check | 0 | - | Always fresh |

**SWR** (stale-while-revalidate): Browser serves stale content while revalidating in background.

### ETag Generation

Two strategies for ETag generation:

1. **Content-Based** (for static responses)
   - SHA-256 hash of response body (first 16 chars)
   - Generated by `etagMiddleware` for generic endpoints

2. **Timestamp-Based** (for database responses)
   - Based on most recent `updatedAt` or `createdAt` timestamp
   - More efficient - no need to serialize full response
   - Generated per-endpoint using `generateETagFromTimestamp()`

### In-Memory Caching

R2 files are cached in-memory at the worker level:
- **TTL**: 1 hour
- **Scope**: Per worker instance
- **Invalidation**: Automatic after TTL expires
- **Benefit**: ~90% reduction in R2 reads

### Cache Headers by Endpoint

```typescript
// Example cache configurations
{
  auth: { maxAge: 300, swr: 60 },           // 5 min
  projects: { maxAge: 300, swr: 60 },        // 5 min
  projectFiles: { maxAge: 600, swr: 120 },   // 10 min
  translations: { maxAge: 60, swr: 30 },     // 1 min
  translationSuggestions: { maxAge: 30, swr: 10 }, // 30 sec
  noCache: { maxAge: 0, noCache: true, mustRevalidate: true }
}
```

### Client Implementation

Frontend should:
1. Send `If-None-Match` header with cached ETag
2. Handle 304 responses by using cached data
3. Clear cache on 401 errors (authentication)
4. Implement SolidJS store for instant UI updates

---

## Performance Characteristics

### Free Tier Usage

Estimated usage for 200 files project with weekly updates:

**R2:**
- Writes: ~200/month (or ~10 with differential upload)
- Reads: ~100/month (with caching)
- Storage: <1GB

**D1:**
- Writes: ~400/month (uploads + translations)
- Reads: ~10K/month (API calls)
- Storage: <100MB

**Worker CPU:**
- Upload (per chunk): ~5ms
- Translation CRUD: ~2ms
- File retrieval: <1ms (cached)
- Well under 10ms free tier limit

### Response Times

Typical response times from Cloudflare edge:

- **Health check**: <10ms
- **Auth endpoints**: 50-100ms (GitHub API call)
- **Project list**: 20-50ms (D1 query + ETag check)
- **File list**: 30-60ms (D1 query)
- **R2 file retrieval**: 
  - Cached: 20-50ms
  - Uncached: 100-200ms (R2 fetch + MessagePack decode)
- **Translation queries**: 20-40ms (D1 query)
- **File upload** (per chunk): 200-500ms (R2 write + D1 batch insert)

### Optimizations

1. **Batched D1 Operations**
   - Single SQL statement for multiple file inserts
   - 5x faster than individual operations
   - Uses `ON CONFLICT DO UPDATE` for upserts

2. **Client-Side Pre-Packing**
   - Client encodes MessagePack and base64
   - Server just decodes base64
   - Reduces worker CPU from ~2ms to ~0.3ms per file

3. **Deferred Invalidation**
   - Translation validation only on last chunk
   - Spreads CPU cost across multiple requests

4. **Differential Upload**
   - Client compares source hashes
   - Skips unchanged files
   - 90%+ reduction in typical uploads

5. **In-Memory Caching**
   - R2 files cached for 1 hour
   - 90% reduction in R2 reads
   - Automatic cache invalidation

---

## Security

### Authentication Security

- **JWT Tokens**: HS256 algorithm, 24-hour expiration
- **OIDC Tokens**: Verified against GitHub's public keys
- **Cookies**: HttpOnly, SameSite=Lax, Secure in production
- **CORS**: Restricted to platform domain

### Data Access Control

- **Projects**: Only owner can delete/modify settings
- **Members**: Owner must approve member requests
- **Translations**: All authenticated users can create
- **Approvals**: Any authenticated user can approve

### Upload Authentication

- **OIDC**: Repository verification ensures uploads only from correct repository
- **JWT**: Only for development mode, requires project member access

### Rate Limiting

Currently no rate limiting (relies on Cloudflare Workers built-in protections).

### Input Validation

- Project names: Alphanumeric, hyphens, underscores only
- Repository format: Must match `owner/repo`
- File uploads: Max 500 files per chunk
- SQL injection: Protected by Prisma parameterization

---

## Development & Testing

### Local Development

```bash
# Start worker in development mode
npm run dev:workers

# Environment automatically set to "development"
# Enables JWT fallback for uploads
# Includes detailed error messages
```

### Testing Uploads

Use the client library for development testing:

```bash
# With OIDC (requires GitHub Actions environment)
node client-library/dist/cli.js

# With JWT (development only)
JWT_TOKEN="<your-token>" node upload-dev.js
```

### Database Migrations

```bash
# Apply migrations locally
npm run prisma:migrate:local

# Apply migrations to production
npm run prisma:migrate:remote
```

### Monitoring

```bash
# Tail worker logs
npm run logs

# Or with wrangler
wrangler tail
```

---

## Deployment

### Prerequisites

1. Cloudflare account with Workers, D1, and R2 enabled
2. GitHub OAuth app configured
3. D1 database created and migrated
4. R2 bucket created

### Deployment Steps

```bash
# 1. Build frontend and worker
npm run build

# 2. Deploy to Cloudflare
npm run deploy
```

### Environment Configuration

Set secrets:
```bash
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET
wrangler secret put JWT_SECRET
wrangler secret put ALLOWED_PROJECT_CREATORS  # Optional
```

Configure `wrangler.toml`:
```toml
name = "koro-i18n"
main = "dist/index.js"
compatibility_date = "2024-01-01"

[env.production]
vars = { 
  ENVIRONMENT = "production",
  PLATFORM_URL = "https://koro.f3liz.workers.dev"
}

[[env.production.r2_buckets]]
binding = "TRANSLATION_BUCKET"
bucket_name = "koro-i18n-translations"

[[env.production.d1_databases]]
binding = "DB"
database_name = "koro-i18n-db"
database_id = "your-db-id"

[[env.production.assets]]
binding = "ASSETS"
directory = "./dist"
```

---

## Troubleshooting

### Common Issues

**Issue: "Project not found"**
- Check project name is correct (case-sensitive)
- Verify project exists in database
- Ensure user has access (owner or approved member)

**Issue: "Invalid OIDC token"**
- Verify workflow has `id-token: write` permission
- Check audience matches PLATFORM_URL
- Ensure repository matches project repository

**Issue: "CPU limit exceeded"**
- Reduce chunk size (currently 500 files)
- Verify client is sending pre-packed data
- Check for expensive queries in D1

**Issue: "File not found in R2"**
- Check D1 index and R2 are in sync
- Verify R2 key format: `[project]-[lang]-[filename]`
- Re-upload file if missing

**Issue: "Translation marked invalid"**
- Source file has changed
- Re-submit translation with updated source

### Debug Logging

Enable debug logging in development:

```typescript
// In workers.ts
console.log('[debug]', data);
```

View logs:
```bash
npm run logs
```

### Health Monitoring

Check platform health:
```bash
curl https://your-platform.workers.dev/health
```

Expected response:
```json
{
  "status": "ok",
  "runtime": "cloudflare-workers"
}
```
