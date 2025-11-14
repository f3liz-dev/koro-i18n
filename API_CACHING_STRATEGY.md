# API Caching Strategy

This document describes the comprehensive caching strategy for all API endpoints in the koro-i18n platform.

## Overview

The platform uses a **dual-caching approach**:
1. **Browser HTTP Cache** (via Cache-Control headers) - reduces network requests
2. **SolidJS Store** (in-memory) - provides instant UI updates and optimistic rendering

Both systems work together to provide optimal performance without compromising data freshness.

## Cache Categories

### 1. Cacheable Endpoints (Long TTL)
These endpoints return data that changes infrequently and can be safely cached:

| Endpoint | Cache Duration | SWR | Rationale |
|----------|----------------|-----|-----------|
| GET /api/projects | 5 minutes | 1 minute | Project list changes only when users create/delete projects |
| GET /api/projects/all | 5 minutes | 1 minute | All projects list for public viewing |
| GET /api/projects/:id/members | 5 minutes | 1 minute | Member list changes only when approving/removing members |
| GET /api/projects/:projectName/download | 10 minutes | 2 minutes | File downloads are stable between uploads |
| GET /api/projects/:projectId/files | 10 minutes | 2 minutes | File contents stable between uploads |
| GET /api/projects/:projectId/files/summary | 10 minutes | 2 minutes | File metadata stable between uploads |

### 2. Short-Cache Endpoints
These endpoints return data that changes moderately during active use:

| Endpoint | Cache Duration | SWR | Rationale |
|----------|----------------|-----|-----------|
| GET /api/translations | 1 minute | 30 seconds | Translations change during active editing |
| GET /api/translations/history | 1 minute | 30 seconds | Translation history grows during active editing |

### 3. Real-Time Endpoints (No Cache)
These endpoints must always return fresh data and are never cached:

| Endpoint | Cache | Rationale |
|----------|-------|-----------|
| GET /api/auth/me | No cache | Authentication status must always be current for security |
| GET /api/translations/suggestions | No cache | Shows real-time pending/approved translations |
| GET /api/logs/history | No cache | Real-time translation logs |
| GET /api/prisma/users | No cache | Debug endpoint for development |

### 4. Static Endpoints (Long TTL)
These endpoints return data that rarely changes:

| Endpoint | Cache Duration | Rationale |
|----------|----------------|-----------|
| GET /health | 24 hours | Health check status rarely changes |

### 5. Mutation Endpoints (No Cache Headers)
These endpoints modify data and never include cache headers:

- POST /api/projects - Create project
- DELETE /api/projects/:id - Delete project
- PATCH /api/projects/:id - Update project
- POST /api/projects/:id/join - Request to join project
- POST /api/projects/:id/members/:memberId/approve - Approve/reject member
- DELETE /api/projects/:id/members/:memberId - Remove member
- POST /api/projects/:projectName/upload - Upload files
- POST /api/projects/:projectName/upload-json - Upload JSON files
- POST /api/translations - Create translation
- POST /api/translations/:id/approve - Approve translation
- DELETE /api/translations/:id - Delete translation
- POST /api/auth/logout - Logout user

## Cache-Control Header Format

### Cacheable Resources
```
Cache-Control: max-age=300, stale-while-revalidate=60, private
```
- `max-age`: How long the response is fresh (in seconds)
- `stale-while-revalidate`: Additional time to serve stale content while revalidating in background
- `private`: Prevents CDN caching of user-specific data

### No-Cache Resources
```
Cache-Control: max-age=0, must-revalidate, private
```
- `max-age=0`: Response is immediately stale
- `must-revalidate`: Must check with server before using cached copy
- `private`: User-specific data

### Static Resources
```
Cache-Control: max-age=86400, private
```
- `max-age=86400`: Cache for 24 hours
- `private`: Prevents CDN caching

## Frontend Integration

### SolidJS Store Cache
The frontend uses `dataStore.ts` to maintain in-memory caches:

```typescript
// Fetch projects - updates store in background
projectsCache.fetch();

// Get cached projects - returns immediately
const cached = projectsCache.get();
```

Benefits:
- Instant UI updates without loading states
- Optimistic rendering for better UX
- Background updates keep data fresh

### Browser HTTP Cache
The frontend relies on native browser HTTP caching:

```typescript
// Browser automatically uses HTTP cache based on Cache-Control headers
const res = await fetch('/api/projects', { credentials: 'include' });
```

Benefits:
- Reduces network requests automatically
- Works across page reloads
- No JavaScript cache management needed

### ForesightJS Prefetching
Smart prefetching predicts user actions and loads data before clicks:

```typescript
// Automatically prefetches when user hovers/focuses on links
registerNavigationElement(linkElement, ['/api/projects']);
```

Benefits:
- Near-instant page loads
- Predictive loading based on mouse/keyboard patterns
- Mobile-optimized strategies

## Security Considerations

✅ **All cache headers include `private` directive**
- Prevents CDN caching of user-specific data
- Each user gets their own isolated cache
- No cross-user data leakage

✅ **Authentication checks are never cached**
- `/api/auth/me` always uses no-cache
- Ensures real-time authentication status
- Prevents security vulnerabilities

✅ **Real-time data is never cached**
- Translation suggestions (collaborative editing)
- Translation logs (audit trail)
- Debug endpoints (development)

## Testing Cache Behavior

### Browser DevTools
1. Open DevTools → Network tab
2. Check Cache-Control headers in response
3. Look for responses served from disk/memory cache
4. Use "Disable cache" to test without cache

### Automated Tests
Run the test suite to verify caching:
```bash
pnpm test
```

Cache-specific tests are in `src/lib/cache-headers.test.ts`.

## Performance Benefits

1. **Reduced Network Requests**: Browser cache serves repeated requests from memory
2. **Faster Interactions**: Prefetching loads data before user clicks
3. **Reduced Server Load**: Fewer database queries and API calls
4. **Better UX**: Instant response for cached data
5. **Stale-While-Revalidate**: Users see content immediately while fresh data loads
6. **Mobile Optimized**: Different strategies for touch vs mouse devices

## Troubleshooting

### Cache Not Working
- Check Cache-Control headers in DevTools
- Verify credentials are included in fetch requests
- Ensure CORS allows credentials

### Stale Data Issues
- Check cache duration is appropriate for data type
- Use no-cache for real-time data
- Clear browser cache if needed

### Security Concerns
- Verify `private` directive is present
- Check authentication endpoints use no-cache
- Ensure mutations don't have cache headers

## Future Enhancements

Potential improvements:
1. **ETag Implementation**: Add ETag generation for 304 responses
2. **Service Worker**: Enable offline functionality
3. **Cache Warming**: Pre-fetch likely data on app load
4. **Analytics**: Track cache hit rates

## Rollback Plan

If caching causes issues:
1. Remove cache headers: Comment out `response.headers.set('Cache-Control', ...)` lines
2. Keep frontend store: The SolidJS store still provides instant updates
3. Gradual rollback: Can disable caching per endpoint

## Conclusion

This comprehensive caching strategy provides:
- ✅ Optimal performance via dual caching (HTTP + store)
- ✅ Real-time data where needed
- ✅ Security through proper cache isolation
- ✅ Clear documentation for maintenance
- ✅ Flexibility for future enhancements
