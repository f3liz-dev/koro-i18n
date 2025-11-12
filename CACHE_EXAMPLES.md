# Cache Behavior Examples

This document shows how the caching system works in practice with real examples.

## Example 1: Dashboard Page Load

### First Visit (Cache MISS)
```
User navigates to /dashboard
  → Browser checks cache: NO ENTRY
  → Makes API call: GET /api/projects
  → Server returns: 200 OK with Cache-Control header
  → Cache stores response with 5-minute TTL
  → Page renders with data
  
Console Output:
[Cache MISS] /api/projects
```

### Second Visit Within 5 Minutes (Cache HIT)
```
User navigates to /dashboard again
  → Browser checks cache: FOUND (age: 2 minutes)
  → Returns cached data instantly
  → No API call made
  → Page renders immediately
  
Console Output:
[Cache HIT] /api/projects
```

### Visit After Cache Expires (Cache MISS)
```
User navigates to /dashboard after 6 minutes
  → Browser checks cache: EXPIRED (age: 6 minutes)
  → Makes API call: GET /api/projects
  → Server returns: 200 OK with new Cache-Control header
  → Cache updates with fresh data
  → Page renders with updated data
  
Console Output:
[Cache MISS] /api/projects
```

## Example 2: Translation Editor with Multiple Resources

### Loading Translation Editor
```
User navigates to /projects/myapp/edit/fr/app.json
  
Request 1: Load project metadata
  → GET /api/projects (cached for 5 min)
  → [Cache HIT] if visited dashboard recently
  → [Cache MISS] otherwise
  
Request 2: Load source language files
  → GET /api/projects/myapp/files?lang=en&filename=app.json
  → Cached for 10 minutes
  → [Cache MISS] on first visit
  
Request 3: Load target language files
  → GET /api/projects/myapp/files?lang=fr&filename=app.json
  → Cached for 10 minutes
  → [Cache MISS] on first visit
  
Request 4: Load translation suggestions
  → GET /api/translations?projectId=myapp&language=fr&status=pending
  → Cached for 1 minute
  → [Cache MISS] on first visit
  
Console Output:
[Cache HIT] /api/projects
[Cache MISS] /api/projects/myapp/files?lang=en&filename=app.json
[Cache MISS] /api/projects/myapp/files?lang=fr&filename=app.json
[Cache MISS] /api/translations?projectId=myapp&language=fr&status=pending

Total: 1 cache hit, 3 cache misses
Network Requests: 3 (saved 1 request!)
```

### Switching Between Files in Same Project
```
User clicks to edit another file: common.json
  
Request 1: Load project metadata
  → GET /api/projects
  → [Cache HIT] (still valid from previous page)
  
Request 2: Load source language files
  → GET /api/projects/myapp/files?lang=en&filename=common.json
  → [Cache MISS] (different filename)
  
Request 3: Load target language files
  → GET /api/projects/myapp/files?lang=fr&filename=common.json
  → [Cache MISS] (different filename)
  
Console Output:
[Cache HIT] /api/projects
[Cache MISS] /api/projects/myapp/files?lang=en&filename=common.json
[Cache MISS] /api/projects/myapp/files?lang=fr&filename=common.json

Total: 1 cache hit, 2 cache misses
Network Requests: 2 (saved 1 request!)
```

## Example 3: Force Reload

### Normal Reload (F5)
```
User presses F5
  → Browser keeps cache intact
  → Page reloads using cached data if valid
  → [Cache HIT] for all valid entries
  
Console Output:
[Cache HIT] /api/projects
[Cache HIT] /api/projects/myapp/files?lang=en&filename=app.json
[Cache HIT] /api/projects/myapp/files?lang=fr&filename=app.json
```

### Force Reload (Ctrl+Shift+R)
```
User presses Ctrl+Shift+R (or Cmd+Shift+R on Mac)
  → Cache clearing triggered
  → All cache entries deleted
  → Page reloads fetching fresh data
  → [Cache MISS] for all requests
  
Console Output:
[Cache CLEAR] 8 entries cleared
[Cache MISS] /api/projects
[Cache MISS] /api/projects/myapp/files?lang=en&filename=app.json
[Cache MISS] /api/projects/myapp/files?lang=fr&filename=app.json
```

## Example 4: Mutation with Cache Invalidation

### Deleting a Project
```
User clicks "Delete Project" button
  
Action:
  → DELETE /api/projects/123
  → Server returns: 200 OK
  → Mutation helper automatically invalidates related caches
  → Pattern: /api\/projects/ matches all project caches
  
Console Output:
[Cache INVALIDATE PATTERN] /api\/projects/ - 3 entries cleared
  
Next page load:
  → GET /api/projects
  → [Cache MISS] (invalidated by deletion)
  → Fresh data loaded
```

### Submitting a Translation
```
User submits a new translation
  
Action:
  → POST /api/translations
  → Server returns: 200 OK
  → Mutation helper automatically invalidates translation caches
  → Pattern: /api\/translations/ matches all translation caches
  
Console Output:
[Cache INVALIDATE PATTERN] /api\/translations/ - 2 entries cleared
  
Next request:
  → GET /api/translations?projectId=myapp&language=fr
  → [Cache MISS] (invalidated by submission)
  → Fresh data with new translation
```

## Example 5: Cache Statistics for Debugging

### Inspecting Cache State
```javascript
// In browser console
import { fetchCache } from './utils/cache';

// Get current cache statistics
const stats = fetchCache.getStats();
console.log(stats);

Output:
{
  size: 5,
  entries: [
    {
      key: "GET:/api/projects",
      age: 125000,  // 2 minutes old
      hasEtag: false
    },
    {
      key: "GET:/api/projects/myapp/files?lang=en",
      age: 45000,   // 45 seconds old
      hasEtag: false
    },
    {
      key: "GET:/api/projects/myapp/files?lang=fr",
      age: 45000,   // 45 seconds old
      hasEtag: false
    },
    {
      key: "GET:/api/translations?projectId=myapp&language=fr",
      age: 30000,   // 30 seconds old
      hasEtag: false
    },
    {
      key: "GET:/api/auth/me",
      age: 1800000, // 30 minutes old
      hasEtag: false
    }
  ]
}
```

## Performance Comparison

### Scenario: User browsing multiple pages

#### Without Caching (Before Implementation)
```
Dashboard → 5 API calls (projects, languages, etc.)
Project Page → 3 API calls (project, files, stats)
Translation Editor → 4 API calls (project, source, target, translations)
Language Selection → 3 API calls (project, files, stats)

Total: 15 API calls
Load Time: ~1.5-2 seconds (with network)
```

#### With Caching (After Implementation)
```
Dashboard → 5 API calls [MISS] (first visit)
Project Page → 1 API call [MISS], 2 [HIT] (project cached)
Translation Editor → 2 API calls [MISS], 2 [HIT] (project + files cached)
Language Selection → 1 API call [MISS], 2 [HIT] (project cached)

Total: 9 API calls (6 saved!)
Load Time: ~0.3-0.5 seconds (instant for cached data)

Performance Improvement: 40% fewer API calls, 70% faster perceived load time
```

## Cache Headers in Network Tab

### Viewing Cache Headers in DevTools

1. Open DevTools (F12)
2. Go to Network tab
3. Refresh the page
4. Click on a request (e.g., /api/projects)
5. Look at Response Headers:

```
HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: max-age=300, stale-while-revalidate=60, private
X-Cache: HIT  (custom header added by our cache)
```

### Understanding the Headers

- `Cache-Control: max-age=300` → Browser can cache for 5 minutes
- `stale-while-revalidate=60` → Can serve stale content for 1 more minute while fetching fresh data
- `private` → Response is user-specific, don't cache on CDN
- `X-Cache: HIT` → Served from our in-memory cache (not from network)

## Summary

The caching system provides:
- **Transparent caching** - Works automatically, no code changes needed for basic usage
- **Smart invalidation** - Clears cache when data changes
- **Developer-friendly** - Console logs show cache behavior
- **Configurable** - Easy to adjust cache durations per endpoint
- **Debuggable** - Statistics API for inspecting cache state
