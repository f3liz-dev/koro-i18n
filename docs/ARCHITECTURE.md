# koro-i18n Architecture

## Overview

koro-i18n is a lightweight i18n platform using Cloudflare Workers, D1, and GitHub integration.

**Related Documentation:**
- **[API Reference](API.md)** - Complete API reference with all endpoints
- **[Setup Guide](SETUP.md)** - Getting started with development

## Backend Structure

The backend is built with Hono on Cloudflare Workers with a clean, typed architecture:

### Core Modules

```
src/
├── workers.ts           # Main worker entry point
├── lib/
│   ├── context.ts       # Typed context system (Env, Variables)
│   ├── schemas.ts       # Validation schemas using valibot
│   ├── responses.ts     # Response utilities (error, success, ETag)
│   ├── middleware.ts    # Auth and project middleware
│   ├── cache-headers.ts # Caching configuration
│   └── github-repo-fetcher.ts  # GitHub API integration
├── routes/
│   ├── auth.ts          # OAuth and session management
│   ├── projects.ts      # Project CRUD and member management
│   ├── files.ts         # File streaming from GitHub
│   ├── project-translations.ts  # Translation CRUD
│   └── apply.ts         # Export translations for GitHub Actions
└── generated/prisma/    # Prisma client
```

### Type System

The backend uses a unified typed context system (`src/lib/context.ts`):

```typescript
// Environment bindings
interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  GITHUB_CLIENT_ID: string;
  // ...
}

// Context variables set by middleware
interface Variables {
  user: AuthUser;        // From auth middleware
  project: ProjectContext;  // From project middleware
  github: GitHubContext;    // Octokit client when needed
}
```

### Validation

Uses valibot for simple, intuitive schema validation (`src/lib/schemas.ts`):

```typescript
const CreateProjectSchema = v.object({
  name: v.pipe(v.string(), v.regex(/^[a-zA-Z0-9_-]+$/)),
  repository: v.pipe(v.string(), v.regex(/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+$/)),
});

// Usage in routes
app.post('/', validateJson(CreateProjectSchema), async (c) => {
  const { name, repository } = c.req.valid('json');
  // ...
});
```

## Core Architecture

### Storage Strategy

**GitHub Direct Access (Primary)**
- Files fetched on-demand from GitHub using user's OAuth token
- No R2 storage needed for source files
- Metadata validation done client-side
- Always up-to-date with repository

**D1 (Metadata & Web Translations)**
- `WebTranslation`: User translations with validation
- `WebTranslationHistory`: Full audit trail
- `User`: Stores `githubAccessToken` for repository access
- `Project`: Project configuration and settings

### Data Flow

```
GitHub Source Files:
  UI → Worker (with user token) → GitHub API → Parse & Return

Web Translation:
  User → Worker → D1 only

Apply Translation:
  1. Preview → GET /apply/preview → D1 approved translations
  2. Export → GET /apply/export → Full translation data for GitHub Action
  3. GitHub Action (client repo) → Fetch export → Apply changes → Create PR
  4. Mark Committed → POST /apply/committed → Update D1 status

Display:
  UI → GitHub API (source) + D1 API (web translations) → Merge in UI
```

## Backend Technology Stack

**Runtime & Framework:**
- Cloudflare Workers (V8 isolates, edge computing)
- Hono (lightweight HTTP framework)
- valibot (schema validation)

**Data Layer:**
- Cloudflare D1 (SQLite, serverless SQL database)
- Prisma ORM with D1 adapter

**Authentication:**
- GitHub OAuth for web UI
- GitHub access tokens stored in D1 for repository access
- JWT tokens (HS256, 24-hour expiration)
- GitHub OIDC for Actions (10-minute tokens, no secrets)

## API Architecture

The backend separates concerns into distinct route modules:

### Authentication (`/api/auth`)
- GitHub OAuth flow (login, callback, logout)
- JWT token generation and verification
- User session management

### Projects (`/api/projects`)
- Project CRUD operations
- Member management (invitations, approvals)
- Access control

### Files (`/api/projects/:project/files`)
- Stream files directly from GitHub
- Manifest-based file listing
- Translation progress summary

### Translations (`/api/projects/:project/translations`)
- Translation CRUD
- Translation suggestions and approvals
- Translation history tracking
- Source hash validation

### Apply (`/api/projects/:project/apply`)
- Export approved translations for GitHub Actions
- Mark translations as committed

See [API.md](API.md) for complete API reference.

## Validation System

### Source Hash Tracking
- Each translation stores `sourceHash` (16 chars)
- Hash of source value at time of translation
- Auto-invalidation when source changes

### Validation Flow
```
1. Source: "Welcome" → hash: "a1b2c3d4"
2. Translation: "ようこそ" with sourceHash: "a1b2c3d4" ✅
3. Source updated: "Welcome!" → hash: "x9y8z7w6"
4. System detects mismatch → isValid = false ⚠️
```

## Performance

### Backend Performance Characteristics

**Response Times (from Cloudflare edge):**
- Health check: <10ms
- Auth endpoints: 50-100ms (includes GitHub API call)
- Project queries: 20-50ms (D1 with ETag)
- File listing: 30-60ms (GitHub manifest)
- File streaming: 20-100ms (direct from GitHub)
- Translation queries: 20-40ms (D1)

**Key Optimizations:**
1. **Streaming responses** - Files streamed directly from GitHub, not buffered
2. **ETag-based caching** - 304 responses for unchanged data
3. **Batched D1 operations** - Single SQL for multiple inserts

## Key Features

1. **GitHub Integration**: Direct file access with OAuth
2. **Validation**: Auto-detect outdated translations via source hash
3. **Caching**: ETag-based caching with stale-while-revalidate
4. **Type Safety**: Fully typed context and validation
