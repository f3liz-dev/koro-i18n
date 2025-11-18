# Backend-for-Frontend (BFF) — Concise API Reference (Updated, source-accurate)

This concise reference reflects the actual backend routes and behaviors in `src/routes/*`. All endpoints are rooted under the platform domain and use the `/api` prefix.

Auth summary
- Methods:
  - GitHub OAuth (web) — flow starts at `GET /api/auth/github`, finishes at `GET /api/auth/callback`.
  - JWT — issued by the server, stored in cookie `auth_token` (HttpOnly, maxAge=86400, SameSite=Lax, Secure in production) or sent as `Authorization: Bearer <token>`.
  - GitHub OIDC — used for CI/Actions uploads and cleanup.
- Common headers:
  - Authorization: Bearer <token> (JWT or OIDC)
  - Content-Type: application/json
  - If-None-Match: "<etag>" (for conditional requests)

Notes:
- OAuth callback sets `auth_token` cookie and redirects to `/dashboard`.
- `GET /api/auth/me` requires JWT and returns cached user info with Cache-Control.

Endpoints (concise, accurate)

1) Authentication
- GET /api/auth/github
  - Start GitHub OAuth; creates a short-lived state record in D1 and redirects to GitHub.
- GET /api/auth/callback?code=&state=
  - OAuth callback. Validates state, exchanges code, upserts user, issues JWT in `auth_token` cookie, redirects to UI.
- GET /api/auth/me
  - Auth: JWT required.
  - Response:
  ```json
  { "user": { "id": "uuid", "username": "github-username", "githubId": 123 } }
  ```
  - Cache: uses platform cache config for auth.
- POST /api/auth/logout
  - Clears `auth_token` cookie; returns `{ "success": true }`.

2) Projects
- GET /api/projects
  - Auth: JWT. Query: `includeLanguages=true` (optional; expensive).
  - Response: projects accessible to the user (owned => role `owner`, approved member => role `member`).
  - ETag: generated from project/member timestamps; returns `ETag` and Cache-Control. If client `If-None-Match` matches, server returns 304.
  - If `includeLanguages=true` backend queries R2 index and groups languages per repository (N+1 avoided via grouped query).
- GET /api/projects/all
  - Auth: JWT. Returns all projects with current user's membershipStatus (approved|pending|rejected|null). Supports ETag.
- POST /api/projects
  - Auth: JWT. If `ALLOWED_PROJECT_CREATORS` env var is set, only listed GitHub usernames can create projects.
  - Body:
  ```json
  { "name": "my-project", "repository": "owner/repo" }
  ```
  - Validation: `name` matches `/^[a-zA-Z0-9_-]+$/`; `repository` matches `owner/repo` format; name and repository must be unique.
  - Response: `{ "success": true, "id": "uuid", "name": "...", "repository": "..." }`
- GET /api/projects/:id
  - Auth: JWT. Project details.
- PATCH /api/projects/:id
  - Auth: JWT (owner only). Body example: `{ "accessControl": "whitelist" }`. Validates value.
- DELETE /api/projects/:id
  - Auth: JWT (owner only). Deletes project; returns `{ "success": true }`.
- POST /api/projects/:id/join
  - Auth: JWT. Create join request (status `pending`). Prevents duplicate requests.
- GET /api/projects/:id/members
  - Auth: JWT (owner only). Returns members list. Supports ETag based on member timestamps.
- POST /api/projects/:id/members/:memberId/approve
  - Auth: JWT (owner only). Body `{ "status": "approved"|"rejected" }`.
- DELETE /api/projects/:id/members/:memberId
  - Auth: JWT (owner only). Removes member.

3) Project file upload & cleanup (GitHub import)
- POST /api/projects/:projectName/upload
  - Auth: OIDC preferred (CI), JWT allowed as fallback in development.
  - Token may be sent in `Authorization` header or cookie `auth_token`.
  - Body fields:
    - `branch` (default: `main`)
    - `commitSha` (optional; default `upload-<timestamp>`)
    - `sourceLanguage` (optional; validated and updated on first chunk/non-chunk)
    - `files`: array of files (max 500 per chunk). Each file:
      - new/preferred: `packedData` (base64 MessagePack) optional (client pre-packed for zero CPU)
      - or fields: `lang`, `filename`, `contents` (JSON), `metadata` (base64 MessagePack), `sourceHash`
    - `chunked` (optional): `{ uploadId, chunkIndex, totalChunks, isLastChunk }`
    - `allSourceFiles` (for cleanup)
  - Auth verification:
    - `validateUploadAuth` tries OIDC (via verifyGitHubOIDCToken with PLATFORM_URL) and falls back to JWT verification in dev; repository must match OIDC claim.
  - Implementation notes:
    - Optional Rust compute worker (env `COMPUTE_WORKER_URL`) used for faster uploads and validation; fallback TypeScript code writes to R2 and updates D1.
    - D1 index updates use batch INSERT/UPSERT SQL for performance.
    - Only on last chunk (or non-chunked) the server runs expensive invalidation of outdated web translations; results returned in `invalidationResults`.
  - Response (summary):
  ```json
  {
    "success": true,
    "projectId": "owner/repo",
    "commitSha": "abc123",
    "filesUploaded": 10,
    "r2Keys": ["..."],
    "uploadedAt": "2024-01-01T00:00:00.000Z",
    "chunked": { "chunkIndex": 1, "totalChunks": 2, "isLastChunk": false },
    "invalidationResults": { "en/common.json": { "invalidated": 5, "checked": 10 } } // last chunk only
  }
  ```
  - Errors: 400 for validation, 401 missing token, 403 unauthorized, 404 project not found, 500 server error.
  - Limits: MAX_FILES = 500 per chunk.

- POST /api/projects/:projectName/cleanup
  - Auth: OIDC (CI) or JWT (dev).
  - Body: `{ "branch": "main", "allSourceFiles": ["en/common.json", ...] }`
  - Removes orphaned files from R2 and D1; returns `cleanupResult`.

- GET /api/projects/:projectName/files/list
  - Auth: JWT (web UI). Query: `branch`, `language` (special value `source-language` resolves to project's sourceLanguage).
  - Returns file metadata from D1. Supports ETag: server uses latest `lastUpdated` timestamp as ETag (`"<timestamp>"`). If client `If-None-Match` equals server ETag, returns 304.
  - Note: use `list-oidc` variant for OIDC token access (CI).

- GET /api/projects/:projectId/files/summary
  - Auth: JWT. Query: `branch`, `lang` (supports `source-language`), `filename`.
  - Returns per-file translation progress: `translatedKeys` is 0 for source files, equal to `totalKeys` for target files imported from GitHub.
  - Uses ETag based on file timestamps.

- GET /api/projects/:projectId/files
  - Auth: JWT. Lightweight metadata. Note: actual file content is retrieved from R2 endpoints.

4) R2 file retrieval
- GET /api/r2/:projectId/:lang/:filename
  - Auth: JWT. Query `branch` optional.
  - Resolves project name to repository id when necessary.
  - Reads D1 index to find r2Key and lastUpdated; returns 404 if not indexed.
  - Response:
  ```json
  {
    "raw": { "key1": "value1", ... },
    "metadata": { "gitBlame": {...}, "charRanges": {...}, "sourceHashes": {...} },
    "sourceHash": "file-content-hash",
    "commitSha": "abc123",
    "uploadedAt": "2024-01-01T00:00:00.000Z",
    "totalKeys": 42
  }
  ```
  - ETag returned based on lastUpdated timestamp; supports `If-None-Match`.

- GET /api/r2/by-key/:r2Key
  - Auth: JWT. Returns same structure for a given r2Key. Sets ETag when uploadedAt available.

5) Translations (web translation CRUD and suggestions)
- POST /api/translations
  - Auth: JWT required.
  - Body:
  ```json
  {
    "projectId": "project-name-or-uuid",
    "language": "ja",
    "filename": "common.json",
    "key": "key1",
    "value": "翻訳値"
  }
  ```
  - Creates `webTranslation` with `status: "pending"`, sets `isValid: true` initially, logs history entry.
  - Attempts to fetch source hash from R2 source file (if available) and stores it on the translation.

- GET /api/translations
  - Auth: JWT. Query: `projectId` (required), `language`, `filename`, `status` (default `approved`), `isValid`.
  - Returns up to 500 results. Uses ETag generated from translation timestamps.

- GET /api/translations/history
  - Auth: JWT. Query: `projectId`, `language`, `filename`, `key` (all required).
  - Returns full history entries, ETag based on history timestamps.

- GET /api/translations/suggestions
  - Auth: JWT. Query: `projectId` required; optional `language`, `filename`, `key`.
  - Returns pending/approved suggestions (status != deleted), up to 500 results. Uses dedicated Cache-Control for suggestions.

- POST /api/translations/:id/approve
  - Auth: JWT.
  - Flow: sets other pending/approved translations for same key to `rejected`, sets selected translation to `approved`, logs history.

- DELETE /api/translations/:id
  - Auth: JWT. Soft-deletes translation (status -> `deleted`) and logs history.

6) Health check
- GET /health
  - No auth. Returns `{ "status": "ok", "runtime": "cloudflare-workers" }`.

Common behavior & integrations
- ETag + Cache-Control: many endpoints return ETag (usually based on relevant timestamps) and Cache-Control values defined in `src/lib/cache-headers`. Clients should send `If-None-Match` to receive 304 responses when data is unchanged.
- Error responses follow `{ "error": "message" }` and standard HTTP statuses: 200, 304, 400, 401, 403, 404, 500.
- Limits:
  - File upload: max 500 files per chunk
  - List/translations: max 500 results
- Date format: ISO 8601 (UTC).
- Rust compute worker: optional optimization for uploads and validation; if configured, backend delegates heavy work to it and falls back to TypeScript code on failure.

Integration tips for frontend
- Use `GET /api/auth/me` to verify session and fetch user info.
- For CI/Actions imports use OIDC tokens to call `/api/projects/:projectName/upload` and `/api/projects/:projectName/cleanup`.
- For web UI: use JWT (cookie or Authorization header) and `GET /api/projects`, `GET /api/projects/:projectName/files/list`, `GET /api/r2/:projectId/:lang/:filename`, and translation CRUD endpoints.
- Prefer ETag-aware requests to reduce bandwidth and avoid unnecessary re-fetches.

This file is a compact, implementation-accurate reference for frontend engineers. See `src/routes/*` and `docs/BACKEND_API.md` for full flows and developer-focused details.
