# Backend Internals Documentation

Deep dive into the koro-i18n backend implementation, covering internal libraries, design patterns, and implementation details.

## Table of Contents

- [Worker Architecture](#worker-architecture)
- [Authentication System](#authentication-system)
- [Database Layer](#database-layer)
- [Storage Layer](#storage-layer)
- [Caching System](#caching-system)
- [Validation System](#validation-system)
- [Middleware Pipeline](#middleware-pipeline)
- [Performance Optimizations](#performance-optimizations)

---

## Worker Architecture

### Entry Point (`src/workers.ts`)

The main worker file exports a Cloudflare Workers handler that routes requests to either the API or static assets.

```typescript
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    // Route API requests to Hono app
    if (url.pathname.startsWith('/api') || url.pathname === '/health') {
      const app = createWorkerApp(env);
      return await app.fetch(request, env, ctx);
    }
    
    // Serve static assets (SPA)
    if (env.ASSETS) {
      return await serveStatic(request, env);
    }
    
    return new Response('Frontend not built', { status: 503 });
  }
}
```

### Environment Interface

```typescript
interface Env {
  DB: D1Database;                    // D1 database binding
  TRANSLATION_BUCKET: R2Bucket;      // R2 bucket binding
  GITHUB_CLIENT_ID: string;          // OAuth client ID
  GITHUB_CLIENT_SECRET: string;      // OAuth client secret
  JWT_SECRET: string;                // JWT signing secret
  ENVIRONMENT: string;               // "development" | "production"
  PLATFORM_URL?: string;             // Platform URL for OIDC
  ASSETS?: Fetcher;                  // Static asset binding
}
```

### Hono Application Structure

```typescript
export function createWorkerApp(env: Env) {
  const app = new Hono();
  const prisma = initializePrisma(env.DB);
  
  // Global middleware
  app.use('*', logger());           // Request logging
  app.use('*', secureHeaders());    // Security headers
  app.use('*', cors({...}));        // CORS configuration
  
  // ETag middleware for API routes
  app.use('/api/*', etagMiddleware);
  app.use('/health', etagMiddleware);
  
  // Route mounting
  app.route('/api/auth', createAuthRoutes(prisma, env));
  app.route('/api/translations', createTranslationRoutes(prisma, env));
  app.route('/api/projects', createProjectRoutes(prisma, env));
  app.route('/api/projects', createProjectFileRoutes(prisma, env));
  app.route('/api/r2', createR2FileRoutes(prisma, env));
  
  // Health check
  app.get('/health', (c) => c.json({ status: 'ok' }));
  
  return app;
}
```

### Static Asset Serving

The worker serves the SPA with proper routing:

```typescript
async function serveStatic(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  let path = url.pathname;
  
  // Check if static asset (has extension or in /assets/)
  const isStaticAsset = 
    path.startsWith('/assets/') || 
    /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/i.test(path);
  
  // For SPA routes, serve index.html
  if (path === '/' || (!path.startsWith('/api') && !isStaticAsset)) {
    path = '/index.html';
  }
  
  // Fetch from ASSETS binding
  return env.ASSETS.fetch(new URL(path, request.url));
}
```

---

## Authentication System

### JWT Authentication (`src/lib/auth.ts`)

#### Token Creation

```typescript
export async function createJWT(
  user: { id: string; username: string; githubId: number },
  accessToken: string,
  secret: string
): Promise<string> {
  const encoder = new TextEncoder();
  const secretKey = encoder.encode(secret);
  
  return await new SignJWT({ 
    userId: user.id, 
    username: user.username, 
    githubId: user.githubId,
    accessToken 
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secretKey);
}
```

**Algorithm**: HS256 (HMAC with SHA-256)  
**Expiration**: 24 hours  
**Payload**: userId, username, githubId, accessToken

#### Token Verification

```typescript
export async function verifyJWT(
  token: string, 
  secret: string
): Promise<AuthPayload | null> {
  try {
    const encoder = new TextEncoder();
    const secretKey = encoder.encode(secret);
    
    const { payload } = await jwtVerify(token, secretKey);
    return payload as unknown as AuthPayload;
  } catch {
    return null;  // Invalid or expired
  }
}
```

#### Token Extraction

Tokens can be sent via cookie or Authorization header:

```typescript
export function extractToken(c: Context): string | undefined {
  // Try cookie first
  const cookieToken = getCookie(c, 'auth_token');
  if (cookieToken) return cookieToken;
  
  // Try Authorization header
  const authHeader = c.req.header('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  return undefined;
}
```

#### Authentication Middleware

```typescript
export async function requireAuth(
  c: Context, 
  secret: string
): Promise<AuthPayload | Response> {
  const token = extractToken(c);
  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const payload = await verifyJWT(token, secret);
  if (!payload) {
    deleteCookie(c, 'auth_token');
    return c.json({ error: 'Invalid token' }, 401);
  }
  
  return payload;
}
```

**Usage in routes:**
```typescript
app.get('/api/projects', async (c) => {
  const payload = await requireAuth(c, env.JWT_SECRET);
  if (payload instanceof Response) return payload;
  
  // payload is AuthPayload, proceed with authenticated logic
  const projects = await prisma.project.findMany({
    where: { userId: payload.userId }
  });
  
  return c.json({ projects });
});
```

### OIDC Authentication (`src/oidc.ts`)

#### JWKS Caching

GitHub's OIDC public keys are cached to avoid repeated fetches:

```typescript
let jwksCache: { keys: JWK[], timestamp: number } | null = null;
const CACHE_TTL = 3600000; // 1 hour

async function fetchGitHubJWKS(): Promise<{ keys: JWK[] }> {
  // Return cached JWKS if still valid
  if (jwksCache && Date.now() - jwksCache.timestamp < CACHE_TTL) {
    return jwksCache;
  }
  
  const response = await fetch(
    'https://token.actions.githubusercontent.com/.well-known/jwks'
  );
  const jwks = await response.json() as { keys: JWK[] };
  
  // Update cache
  jwksCache = { keys: jwks.keys, timestamp: Date.now() };
  
  return jwks;
}
```

#### Token Verification

```typescript
export async function verifyGitHubOIDCToken(
  token: string,
  expectedAudience?: string,
  expectedRepo?: string
): Promise<GitHubOIDCToken> {
  // 1. Decode header to get kid and alg
  const header = decodeProtectedHeader(token);
  const { kid, alg } = header;
  
  // 2. Fetch and find matching public key
  const jwk = await findMatchingKey(kid, alg);
  
  // 3. Verify JWT signature and claims
  const { payload } = await jwtVerify(token, jwk, {
    issuer: 'https://token.actions.githubusercontent.com',
    audience: expectedAudience
  });
  
  const oidcPayload = payload as unknown as GitHubOIDCToken;
  
  // 4. Verify repository match if provided
  if (expectedRepo && oidcPayload.repository !== expectedRepo) {
    throw new Error(`Repository mismatch`);
  }
  
  return oidcPayload;
}
```

#### Upload Authentication

Upload endpoints support both OIDC and JWT (development):

```typescript
async function validateUploadAuth(
  token: string,
  projectId: string,
  repository: string,
  jwtSecret: string
) {
  // Try OIDC first
  try {
    const oidcPayload = await verifyGitHubOIDCToken(
      token,
      env.PLATFORM_URL,
      repository
    );
    
    return {
      authorized: true,
      method: 'OIDC',
      repository: oidcPayload.repository,
      actor: oidcPayload.actor
    };
  } catch (oidcError) {
    // Fallback to JWT in development
    if (env.ENVIRONMENT === 'development') {
      const jwtPayload = await verifyJWT(token, jwtSecret);
      if (jwtPayload) {
        const hasAccess = await checkProjectAccess(
          prisma, 
          projectId, 
          jwtPayload.userId
        );
        if (hasAccess) {
          return { authorized: true, method: 'JWT' };
        }
      }
    }
    
    return { 
      authorized: false, 
      error: `Authentication failed: ${oidcError.message}` 
    };
  }
}
```

---

## Database Layer

### Prisma Initialization (`src/lib/database.ts`)

The platform uses Prisma with D1 adapter:

```typescript
import { PrismaClient } from '../generated/prisma/';
import { PrismaD1 } from '@prisma/adapter-d1';

export function initializePrisma(database: D1Database): PrismaClient {
  const adapter = new PrismaD1(database);
  return new PrismaClient({ adapter });
}
```

**Why D1 Adapter?**
- Cloudflare D1 uses SQLite dialect
- Adapter translates Prisma queries to D1 API calls
- Enables full Prisma feature set with D1

### Helper Functions

#### Translation History Logging

```typescript
export async function logTranslationHistory(
  prisma: PrismaClient,
  translationId: string,
  projectId: string,
  language: string,
  key: string,
  value: string,
  userId: string,
  action: string,
  commitSha?: string,
  sourceContent?: string,
  commitAuthor?: string,
  commitEmail?: string
) {
  await prisma.translationHistory.create({
    data: {
      id: crypto.randomUUID(),
      translationId,
      projectId,
      language,
      key,
      value,
      userId,
      action,
      commitSha: commitSha || null,
      sourceContent: sourceContent || null,
      commitAuthor: commitAuthor || null,
      commitEmail: commitEmail || null,
    },
  });
}
```

#### Project Access Control

```typescript
export async function checkProjectAccess(
  prisma: PrismaClient,
  projectId: string,
  userId: string
): Promise<boolean> {
  const result = await prisma.$queryRaw<Array<{ exists: number }>>`
    SELECT 1 as exists FROM ProjectMember 
    WHERE projectId = ${projectId} 
      AND userId = ${userId} 
      AND status = 'approved'
    UNION
    SELECT 1 as exists FROM Project 
    WHERE id = ${projectId} 
      AND userId = ${userId}
    LIMIT 1
  `;
  
  return result.length > 0;
}
```

**Logic**: User has access if they are:
1. An approved project member, OR
2. The project owner

#### Object Flattening

Used for flattening translation JSON:

```typescript
export function flattenObject(
  obj: any, 
  prefix = ''
): Record<string, string> {
  const result: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Recursively flatten nested objects
      Object.assign(result, flattenObject(value, newKey));
    } else {
      result[newKey] = String(value);
    }
  }
  
  return result;
}
```

**Example:**
```javascript
flattenObject({
  common: {
    welcome: "Welcome",
    goodbye: "Goodbye"
  },
  errors: {
    notFound: "Not found"
  }
})
// Returns:
// {
//   "common.welcome": "Welcome",
//   "common.goodbye": "Goodbye",
//   "errors.notFound": "Not found"
// }
```

### Database Schema

See `prisma/schema.prisma` for complete schema. Key models:

**User** - GitHub OAuth users
```prisma
model User {
  id        String   @id
  githubId  Int      @unique
  username  String
  email     String
  avatarUrl String?
  createdAt DateTime @default(now())
}
```

**Project** - Translation projects
```prisma
model Project {
  id             String   @id
  userId         String
  name           String   @unique
  repository     String   @unique
  accessControl  String   @default("whitelist")
  sourceLanguage String   @default("en")
  createdAt      DateTime @default(now())
}
```

**R2File** - Index of R2-stored files
```prisma
model R2File {
  id          String   @id
  projectId   String
  branch      String
  commitSha   String
  lang        String
  filename    String
  r2Key       String
  sourceHash  String
  totalKeys   Int
  uploadedAt  DateTime @default(now())
  lastUpdated DateTime @updatedAt
  
  @@unique([projectId, branch, lang, filename])
}
```

**WebTranslation** - User-submitted translations
```prisma
model WebTranslation {
  id         String   @id
  projectId  String
  language   String
  filename   String
  key        String
  value      String
  userId     String
  status     String   @default("pending")
  sourceHash String?
  isValid    Boolean  @default(true)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}
```

---

## Storage Layer

### R2 Storage (`src/lib/r2-storage.ts`)

#### R2 Key Format

Files are stored with a simple key format:

```typescript
export function generateR2Key(
  projectId: string,
  lang: string,
  filename: string
): string {
  // Sanitize filename (remove path separators)
  const sanitizedFilename = filename.replace(/[\/\\]/g, '-');
  return `${projectId}-${lang}-${sanitizedFilename}`;
}
```

**Example**: `owner-repo-en-common.json`

**Why this format?**
- No commit hash - files are mutable (overwritten)
- Git history preserved in file metadata
- Simple and predictable
- Easy to generate from components

#### File Storage

```typescript
export async function storeFile(
  bucket: R2Bucket,
  projectId: string,
  lang: string,
  filename: string,
  commitSha: string,
  contents: Record<string, any>,
  metadataBase64: string,
  sourceHash: string,
  packedData?: string  // Optional pre-packed optimization
): Promise<string> {
  const r2Key = generateR2Key(projectId, lang, filename);
  const uploadedAt = new Date().toISOString();
  
  let dataToStore: Uint8Array;
  
  if (packedData) {
    // ZERO CPU: Client sent pre-packed data
    dataToStore = Buffer.from(packedData, 'base64');
  } else {
    // Fallback: Pack on server
    const fileData = {
      raw: contents,
      metadataBase64,
      sourceHash,
      commitSha,
      uploadedAt,
    };
    dataToStore = encode(fileData);  // MessagePack
  }
  
  // Store to R2 (overwrites previous version)
  await bucket.put(r2Key, dataToStore, {
    httpMetadata: {
      contentType: 'application/msgpack',
      cacheControl: 'public, max-age=3600',
    },
    customMetadata: {
      project: projectId,
      lang,
      filename,
      commitSha,
      sourceHash,
      uploadedAt,
    },
  });
  
  return r2Key;
}
```

**MessagePack Encoding**: Binary format, much smaller than JSON

**Custom Metadata**: Queryable metadata stored alongside object

#### File Retrieval with Caching

```typescript
const r2Cache = new Map<string, { data: R2FileData; expires: number }>();
const CACHE_TTL = 3600000; // 1 hour

export async function getFile(
  bucket: R2Bucket,
  r2Key: string
): Promise<R2FileData | null> {
  // Check in-memory cache
  const cached = r2Cache.get(r2Key);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }
  
  // Fetch from R2
  const object = await bucket.get(r2Key);
  if (!object) return null;
  
  // Decode MessagePack
  const buffer = await object.arrayBuffer();
  const rawData = decode(new Uint8Array(buffer));
  
  // Handle format: new (metadataBase64) or old (metadata object)
  let data: R2FileData;
  if (rawData.metadataBase64) {
    const metadataBuffer = Buffer.from(rawData.metadataBase64, 'base64');
    const metadata = decode(new Uint8Array(metadataBuffer));
    
    data = {
      raw: rawData.raw,
      metadata: metadata as any,
      sourceHash: rawData.sourceHash,
      commitSha: rawData.commitSha,
      uploadedAt: rawData.uploadedAt,
    };
  } else {
    data = rawData as R2FileData;
  }
  
  // Cache for 1 hour
  r2Cache.set(r2Key, {
    data,
    expires: Date.now() + CACHE_TTL,
  });
  
  return data;
}
```

**Cache Benefits**:
- ~90% reduction in R2 reads
- Faster response times
- Reduced costs
- Automatic invalidation after TTL

#### Orphaned File Cleanup

```typescript
export async function cleanupOrphanedFiles(
  bucket: R2Bucket,
  prisma: any,
  projectId: string,
  branch: string,
  sourceFileKeys: Set<string>
): Promise<{ deleted: number; files: string[] }> {
  // Get all files from D1 for this project/branch
  const existingFiles = await prisma.r2File.findMany({
    where: { projectId, branch },
    select: { id: true, lang: true, filename: true, r2Key: true },
  });
  
  const deletedFiles: string[] = [];
  
  for (const file of existingFiles) {
    const fileKey = `${file.lang}/${file.filename}`;
    
    // If file not in current source, delete it
    if (!sourceFileKeys.has(fileKey)) {
      await bucket.delete(file.r2Key);
      await prisma.r2File.delete({ where: { id: file.id } });
      
      deletedFiles.push(fileKey);
    }
  }
  
  return {
    deleted: deletedFiles.length,
    files: deletedFiles,
  };
}
```

**When used**: After upload completes or as separate cleanup step

---

## Caching System

### Cache Headers (`src/lib/cache-headers.ts`)

#### Configuration Structure

```typescript
interface CacheConfig {
  maxAge: number;           // seconds
  swr?: number;            // stale-while-revalidate seconds
  noCache?: boolean;       // no-cache directive
  noStore?: boolean;       // no-store directive
  mustRevalidate?: boolean;
}
```

#### Predefined Configurations

```typescript
export const CACHE_CONFIGS = {
  auth: { maxAge: 300, swr: 60 },              // 5 min
  projects: { maxAge: 300, swr: 60 },           // 5 min
  projectFiles: { maxAge: 600, swr: 120 },      // 10 min
  translations: { maxAge: 60, swr: 30 },        // 1 min
  translationSuggestions: { maxAge: 30, swr: 10 }, // 30 sec
  user: { maxAge: 3600 },                      // 1 hour
  api: { maxAge: 60, swr: 30 },               // 1 min
  noCache: { maxAge: 0, noCache: true, mustRevalidate: true },
  noStore: { maxAge: 0, noStore: true },
  static: { maxAge: 86400 },                  // 24 hours
} as const;
```

#### Header Generation

```typescript
export function buildCacheControl(config: CacheConfig): string {
  const parts: string[] = [];
  
  if (config.maxAge !== undefined) {
    parts.push(`max-age=${config.maxAge}`);
  }
  
  if (config.swr !== undefined && config.swr > 0) {
    parts.push(`stale-while-revalidate=${config.swr}`);
  }
  
  if (config.noStore) parts.push('no-store');
  if (config.noCache) parts.push('no-cache');
  if (config.mustRevalidate) parts.push('must-revalidate');
  
  // Always private for user-specific data
  parts.push('private');
  
  return parts.join(', ');
}
```

**Example output**: `max-age=300, stale-while-revalidate=60, private`

### ETag System

#### Content-Based ETags (`src/lib/etag.ts`)

For responses where content is the source of truth:

```typescript
async function generateHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => 
    b.toString(16).padStart(2, '0')
  ).join('');
  return hashHex;
}

export async function generateETag(content: string): Promise<string> {
  const hash = await generateHash(content);
  return `"${hash.substring(0, 16)}"`;  // First 16 chars
}
```

#### Database-Based ETags (`src/lib/etag-db.ts`)

More efficient - based on timestamps instead of hashing:

```typescript
export function generateETagFromTimestamp(
  ...timestamps: (Date | string | null | undefined)[]
): string {
  // Filter and convert to timestamps
  const validTimestamps = timestamps
    .filter((t): t is Date | string => t != null)
    .map(t => {
      if (typeof t === 'string') return new Date(t).getTime();
      return t.getTime();
    });
  
  if (validTimestamps.length === 0) {
    return `"${Date.now()}"`;  // Fallback
  }
  
  // Use most recent timestamp
  const maxTimestamp = Math.max(...validTimestamps);
  const hash = maxTimestamp.toString(36);  // Base36 encoding
  
  return `"${hash}"`;
}
```

**Specialized generators:**

```typescript
export function generateProjectsETag(
  projectCreatedAts: (Date | string)[],
  memberUpdatedAts?: (Date | string)[]
): string {
  return generateETagFromTimestamp(
    ...projectCreatedAts, 
    ...(memberUpdatedAts || [])
  );
}

export function generateTranslationsETag(
  translationUpdatedAts: (Date | string)[]
): string {
  return generateETagFromTimestamp(...translationUpdatedAts);
}
```

#### ETag Middleware (`src/lib/etag-middleware.ts`)

Automatically adds ETags to GET responses:

```typescript
export async function etagMiddleware(c: Context, next: Next) {
  // Only for GET requests
  if (c.req.method !== 'GET') {
    return next();
  }
  
  // Process request
  await next();
  
  // Only for successful JSON responses
  const response = c.res;
  if (!response || response.status !== 200) return;
  
  const contentType = response.headers.get('Content-Type');
  if (!contentType?.includes('application/json')) return;
  
  // Generate ETag from body
  const clonedResponse = response.clone();
  const body = await clonedResponse.text();
  const etag = await generateETag(body);
  
  // Check if client has matching ETag
  if (checkIfNoneMatch(c.req.raw, etag)) {
    // Return 304 Not Modified
    const headers: Record<string, string> = { 'ETag': etag };
    const cacheControl = response.headers.get('Cache-Control');
    if (cacheControl) headers['Cache-Control'] = cacheControl;
    
    c.res = new Response(null, { status: 304, headers });
    return;
  }
  
  // Add ETag to response
  response.headers.set('ETag', etag);
}
```

**Applied to**: All `/api/*` and `/health` routes

---

## Validation System

### Source Hash Tracking (`src/lib/translation-validation.ts`)

#### Hash Generation

```typescript
export function hashValue(value: string): string {
  return crypto
    .createHash('sha256')
    .update(value)
    .digest('hex')
    .substring(0, 16);  // 16 chars for brevity
}
```

#### Translation Validation

```typescript
export async function validateTranslation(
  bucket: R2Bucket,
  projectId: string,
  sourceLanguage: string,
  translation: {
    language: string;
    filename: string;
    key: string;
    sourceHash?: string | null;
  }
): Promise<{
  isValid: boolean;
  reason?: string;
  currentSourceHash?: string;
}> {
  // 1. Get current source file from R2
  const sourceFile = await getFileByComponents(
    bucket,
    projectId,
    sourceLanguage,
    translation.filename
  );
  
  if (!sourceFile) {
    return {
      isValid: false,
      reason: 'Source file not found',
    };
  }
  
  // 2. Get current source value for this key
  const currentSourceValue = sourceFile.raw[translation.key];
  
  if (currentSourceValue === undefined) {
    return {
      isValid: false,
      reason: 'Key no longer exists in source',
    };
  }
  
  // 3. Get current source hash
  const currentSourceHash = 
    sourceFile.metadata.sourceHashes?.[translation.key] ||
    hashValue(String(currentSourceValue));
  
  // 4. Check if translation has source tracking
  if (!translation.sourceHash) {
    return {
      isValid: false,
      reason: 'Translation missing source tracking',
      currentSourceHash,
    };
  }
  
  // 5. Compare hashes
  if (translation.sourceHash !== currentSourceHash) {
    return {
      isValid: false,
      reason: 'Source value changed',
      currentSourceHash,
    };
  }
  
  return {
    isValid: true,
    currentSourceHash,
  };
}
```

#### Automatic Invalidation

Called after uploading new source files:

```typescript
export async function invalidateOutdatedTranslations(
  prisma: PrismaClient,
  bucket: R2Bucket,
  projectId: string,
  sourceLanguage: string,
  filename: string
): Promise<{ invalidated: number; checked: number }> {
  // Get all approved web translations for this file
  const translations = await prisma.webTranslation.findMany({
    where: {
      projectId,
      filename,
      status: 'approved',
      isValid: true,  // Only check currently valid ones
    },
  });
  
  let invalidated = 0;
  const checked = translations.length;
  
  for (const translation of translations) {
    const validation = await validateTranslation(
      bucket,
      projectId,
      sourceLanguage,
      translation
    );
    
    if (!validation.isValid) {
      // Mark as invalid
      await prisma.webTranslation.update({
        where: { id: translation.id },
        data: { isValid: false },
      });
      
      // Log to history
      await prisma.webTranslationHistory.create({
        data: {
          id: crypto.randomUUID(),
          translationId: translation.id,
          projectId: translation.projectId,
          language: translation.language,
          filename: translation.filename,
          key: translation.key,
          value: translation.value,
          userId: translation.userId,
          action: 'invalidated',
          sourceHash: validation.currentSourceHash,
        },
      });
      
      invalidated++;
    }
  }
  
  return { invalidated, checked };
}
```

**When triggered**: Only on last chunk of upload (or non-chunked)

---

## Middleware Pipeline

The request flows through multiple middleware layers:

```
Request
  ↓
logger() - Request logging
  ↓
secureHeaders() - Security headers (CSP, X-Frame-Options, etc.)
  ↓
cors() - CORS configuration
  ↓
etagMiddleware - Automatic ETag generation (for /api/* and /health)
  ↓
Route Handler - Actual endpoint logic
  ↓
Response
```

### Logger Middleware

From Hono, logs all requests:

```
[2024-01-01T00:00:00.000Z] GET /api/projects 200 - 42.31ms
```

### Secure Headers Middleware

Adds security headers automatically:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: no-referrer
```

### CORS Middleware

Configures CORS based on environment:

```typescript
cors({
  origin: env.ENVIRONMENT === 'development' 
    ? ['http://localhost:5173', 'http://localhost:8787', 'http://localhost:3000']
    : ['https://koro.f3liz.workers.dev'],
  credentials: true,
})
```

---

## Performance Optimizations

### 1. Client-Side Pre-Packing

**Problem**: Cloudflare Workers free tier has 10ms CPU limit per request

**Solution**: Client encodes MessagePack metadata, server just decodes base64

```typescript
// Client (unlimited CPU):
const metadataPacked = encode(metadata);      // ~0.5ms per file
const metadataBase64 = Buffer.from(metadataPacked).toString('base64');

// Server (10ms limit):
const dataToStore = Buffer.from(packedData, 'base64');  // ~0.1ms per file
```

**Result**: 5x reduction in server CPU time

### 2. Batched D1 Operations

**Problem**: Individual database operations are slow

**Solution**: Single SQL statement for multiple inserts

```typescript
// ❌ Slow: 10 individual inserts (~10ms)
for (const file of files) {
  await prisma.r2File.create({ data: { ...file } });
}

// ✅ Fast: 1 batch insert (~2ms)
const values = files.map(file => 
  `('${file.id}', '${file.lang}', ...)`
).join(',');

await prisma.$executeRawUnsafe(`
  INSERT INTO R2File (...) VALUES ${values}
  ON CONFLICT(...) DO UPDATE SET ...
`);
```

**Result**: 5x faster for batch operations

### 3. Deferred Translation Invalidation

**Problem**: Validation is CPU-intensive

**Solution**: Only validate on last chunk

```typescript
if (!chunked || chunked.isLastChunk) {
  await invalidateOutdatedTranslations(...);
}
```

**Result**: Spreads CPU cost across multiple requests

### 4. In-Memory R2 Caching

**Problem**: R2 reads are slow (100-200ms) and costly

**Solution**: 1-hour in-memory cache

```typescript
const r2Cache = new Map<string, { data: R2FileData; expires: number }>();
const CACHE_TTL = 3600000; // 1 hour

// Check cache before R2 fetch
const cached = r2Cache.get(r2Key);
if (cached && cached.expires > Date.now()) {
  return cached.data;
}
```

**Result**: ~90% reduction in R2 reads

### 5. ETag-Based Caching

**Problem**: Unnecessary data transfer for unchanged resources

**Solution**: ETags enable 304 Not Modified responses

```typescript
// Generate ETag from timestamps
const etag = generateETagFromTimestamp(...timestamps);

// Check if client has current version
if (checkETagMatch(request, etag)) {
  return create304Response(etag, cacheControl);
}
```

**Result**: Reduced bandwidth and faster responses

### 6. Differential Upload

**Problem**: Uploading unchanged files wastes time and resources

**Solution**: Client compares source hashes, skips unchanged files

```typescript
// Client:
const existingFiles = await fetchFileList();
const changedFiles = localFiles.filter(file => {
  const existing = existingFiles.find(f => 
    f.lang === file.lang && f.filename === file.filename
  );
  return !existing || existing.sourceHash !== file.sourceHash;
});

// Only upload changed files
await uploadFiles(changedFiles);
```

**Result**: 90%+ reduction for typical updates

### 7. Chunked Uploads

**Problem**: Large projects may have hundreds of files

**Solution**: Split into chunks of 10 files

```typescript
const CHUNK_SIZE = 10;
const chunks = [];

for (let i = 0; i < files.length; i += CHUNK_SIZE) {
  chunks.push(files.slice(i, i + CHUNK_SIZE));
}

for (let i = 0; i < chunks.length; i++) {
  await uploadChunk({
    files: chunks[i],
    chunked: {
      chunkIndex: i + 1,
      totalChunks: chunks.length,
      isLastChunk: i === chunks.length - 1
    }
  });
}
```

**Benefits**:
- Stays under CPU limits
- Progress reporting
- Easier error recovery

---

## Testing

### Running Tests

```bash
npm test
```

Tests are written with Vitest and cover:

- ETag generation and middleware
- Cache header configuration
- Authentication flows
- Translation validation
- OIDC token verification

### Example Test

```typescript
import { describe, it, expect } from 'vitest';
import { generateETagFromTimestamp } from '../src/lib/etag-db';

describe('etag-db', () => {
  it('generates consistent ETags from timestamps', () => {
    const date1 = new Date('2024-01-01T00:00:00Z');
    const date2 = new Date('2024-01-01T00:00:00Z');
    
    const etag1 = generateETagFromTimestamp(date1);
    const etag2 = generateETagFromTimestamp(date2);
    
    expect(etag1).toBe(etag2);
  });
  
  it('uses most recent timestamp', () => {
    const old = new Date('2024-01-01T00:00:00Z');
    const recent = new Date('2024-01-02T00:00:00Z');
    
    const etag = generateETagFromTimestamp(old, recent);
    const recentEtag = generateETagFromTimestamp(recent);
    
    expect(etag).toBe(recentEtag);
  });
});
```

---

## Debugging

### Console Logging

Add debug logs in development:

```typescript
if (env.ENVIRONMENT === 'development') {
  console.log('[debug]', { variable, data });
}
```

### View Logs

```bash
npm run logs
# or
wrangler tail
```

### Common Debug Points

```typescript
// Upload flow
console.log('[upload] Storing files:', files.length);
console.log('[upload] R2 key:', r2Key);
console.log('[upload] D1 batch insert completed');

// Authentication
console.log('[auth] OIDC verification:', oidcPayload);
console.log('[auth] JWT payload:', jwtPayload);

// Caching
console.log('[cache] ETag match:', clientETag === serverETag);
console.log('[cache] R2 cache hit:', !!cached);
```

---

## Best Practices

### 1. Always Use Parameterized Queries

```typescript
// ✅ Good - parameterized
await prisma.user.findUnique({
  where: { id: userId }
});

// ❌ Bad - SQL injection risk
await prisma.$executeRawUnsafe(
  `SELECT * FROM User WHERE id = '${userId}'`
);
```

### 2. Handle Errors Gracefully

```typescript
try {
  const result = await riskyOperation();
  return c.json({ success: true, result });
} catch (error) {
  console.error('[operation] Error:', error);
  return c.json(
    { 
      error: 'Operation failed',
      details: env.ENVIRONMENT === 'development' ? error.message : undefined
    },
    500
  );
}
```

### 3. Use TypeScript Strictly

```typescript
// ✅ Good - typed
interface UploadRequest {
  branch: string;
  commitSha: string;
  files: Array<{
    lang: string;
    filename: string;
    contents: Record<string, any>;
  }>;
}

// ❌ Bad - untyped
const uploadRequest: any = await c.req.json();
```

### 4. Validate Input

```typescript
if (!projectName || !/^[a-zA-Z0-9_-]+$/.test(projectName)) {
  return c.json({ error: 'Invalid project name' }, 400);
}
```

### 5. Use Appropriate Cache Durations

```typescript
// Frequently changing data - short cache
response.headers.set('Cache-Control', 
  buildCacheControl(CACHE_CONFIGS.translations)
);

// Stable data - longer cache
response.headers.set('Cache-Control',
  buildCacheControl(CACHE_CONFIGS.projectFiles)
);
```

### 6. Include ETags for Cacheable Responses

```typescript
const etag = generateETagFromTimestamp(...timestamps);

if (checkETagMatch(request, etag)) {
  return create304Response(etag, cacheControl);
}

response.headers.set('ETag', etag);
```

### 7. Clean Up Resources

```typescript
// Clear caches when appropriate
export function clearR2Cache(): void {
  r2Cache.clear();
}

export function clearJWKSCache(): void {
  jwksCache = null;
}
```

### 8. Monitor Performance

```typescript
const startTime = Date.now();
await expensiveOperation();
const duration = Date.now() - startTime;

if (duration > 100) {
  console.warn('[perf] Slow operation:', duration, 'ms');
}
```

---

## Future Improvements

Potential optimizations and features:

1. **Rate Limiting**
   - Per-IP or per-user limits
   - DDoS protection

2. **Query Optimization**
   - Database indexes for common queries
   - Reduce N+1 queries

3. **Compression**
   - Gzip/Brotli for API responses
   - Further optimize MessagePack encoding

4. **Metrics**
   - Track upload times
   - Monitor cache hit rates
   - Database query performance

5. **Webhooks**
   - Notify on translation changes
   - Integration with external services

6. **API Versioning**
   - Support multiple API versions
   - Gradual deprecation path

7. **Bulk Operations**
   - Batch approve translations
   - Bulk translation import/export
