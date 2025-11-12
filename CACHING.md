# Data Caching Implementation

This document describes the data caching implementation for the koro-i18n platform.

## Overview

The caching strategy uses a two-layer approach:

1. **HTTP Cache-Control Headers** (Server-side): API responses include appropriate Cache-Control headers to leverage browser's native HTTP cache
2. **Client-side Cache** (Frontend): In-memory cache with TTL and pattern-based invalidation

## Cache Configurations

Different types of data have different cache durations:

| Data Type | Cache Duration | SWR Duration | Rationale |
|-----------|---------------|--------------|-----------|
| Projects | 5 minutes | 1 minute | Changes infrequently |
| Project Files | 10 minutes | 2 minutes | Updated less frequently |
| Translations | 1 minute | 30 seconds | May change more frequently |
| User Data | 1 hour | - | Very stable data |
| Static Data | 24 hours | - | Rarely changes |

**SWR** (Stale-While-Revalidate): Allows serving stale content while fetching fresh data in the background.

## Features

### 1. Automatic Browser Caching

API responses include Cache-Control headers:

```
Cache-Control: max-age=300, stale-while-revalidate=60, private
```

- `max-age`: How long the response is fresh (in seconds)
- `stale-while-revalidate`: Additional time to serve stale content while revalidating
- `private`: Prevents CDN caching of user-specific data

### 2. Client-side Cache

The `cachedFetch()` function provides:

- **In-memory caching** with configurable TTL
- **Automatic cache key generation** based on URL and method
- **ETag support** for conditional requests (304 Not Modified responses)
- **Cache statistics** for debugging

Example usage:

```typescript
// Fetch with 5-minute cache
const response = await cachedFetch('/api/projects', { 
  credentials: 'include',
  cacheTTL: 300000 // 5 minutes in milliseconds
});
```

### 3. Cache Invalidation

The cache automatically clears when:

1. **Force reload**: User presses Ctrl+Shift+R (or Cmd+Shift+R on Mac)
2. **Manual invalidation**: Using `fetchCache.clear()` or `fetchCache.invalidatePattern()`
3. **After mutations**: Using the `mutate()` helper

Example of mutation with automatic cache invalidation:

```typescript
// Delete a project and invalidate related caches
await mutate(`/api/projects/${projectId}`, {
  method: 'DELETE',
  credentials: 'include',
});
// This automatically invalidates all caches matching /api\/projects/
```

### 4. Pattern-based Invalidation

The `mutate()` helper automatically invalidates related caches based on URL patterns:

- `/api/projects/*` mutations → invalidates all project-related caches
- `/api/translations/*` mutations → invalidates all translation-related caches
- `/api/projects/*/upload` mutations → invalidates all file-related caches

You can also manually invalidate caches:

```typescript
import { fetchCache } from './utils/cache';

// Invalidate all project caches
fetchCache.invalidatePattern(/GET:\/api\/projects/);

// Clear all caches
fetchCache.clear();
```

## Implementation Details

### Backend Changes

Each API route now includes cache headers:

```typescript
// Example from src/routes/projects.ts
const response = c.json({ projects: projectsWithLanguages });
response.headers.set('Cache-Control', buildCacheControl(CACHE_CONFIGS.projects));
return response;
```

### Frontend Changes

Components use `cachedFetch()` instead of `fetch()`:

```typescript
// Before
const res = await fetch('/api/projects', { credentials: 'include' });

// After
const res = await cachedFetch('/api/projects', { 
  credentials: 'include',
  cacheTTL: 300000, // Optional: override default TTL
});
```

Mutations use `mutate()` for automatic cache invalidation:

```typescript
// Before
await fetch(`/api/projects/${id}`, { method: 'DELETE', credentials: 'include' });

// After
await mutate(`/api/projects/${id}`, { method: 'DELETE', credentials: 'include' });
```

## Performance Benefits

1. **Reduced Network Requests**: Cached data is served from memory, eliminating network round-trips
2. **Faster Page Loads**: Cached data is available instantly
3. **Reduced Server Load**: Fewer requests to the API and database
4. **Better UX**: Instant response for frequently accessed data
5. **Stale-While-Revalidate**: Users see content immediately while fresh data loads in background

## Testing

Run tests to verify caching functionality:

```bash
npm run test
```

Cache-specific tests are in `src/lib/cache-headers.test.ts`.

## Debugging

To inspect cache state:

```typescript
import { fetchCache } from './utils/cache';

// Get cache statistics
console.log(fetchCache.getStats());
// Output: { size: 5, entries: [...] }
```

The cache also logs operations to the console:
- `[Cache HIT]`: Data served from cache
- `[Cache MISS]`: New request made
- `[Cache 304]`: Server returned 304 Not Modified
- `[Cache INVALIDATE]`: Cache entry cleared
- `[Cache CLEAR]`: All cache entries cleared

## Browser DevTools

You can also inspect HTTP caching in browser DevTools:

1. Open DevTools → Network tab
2. Look for responses with `X-Cache: HIT` or `X-Cache: 304` headers
3. Check the Cache-Control headers in response headers
