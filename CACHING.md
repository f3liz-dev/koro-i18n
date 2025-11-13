# Data Caching Implementation

This document describes the data caching implementation for the koro-i18n platform.

## Overview

The caching strategy uses a simplified approach that relies on the browser's native HTTP cache and smart prefetching:

1. **HTTP Cache-Control Headers** (Server-side): API responses include appropriate Cache-Control headers to leverage browser's native HTTP cache
2. **Smart Prefetching with ForesightJS**: Uses the [ForesightJS](https://foresightjs.com/) library to predict user interactions and prefetch resources before they're needed

## Cache Configurations

Different types of data have different cache durations set via HTTP headers:

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

The browser automatically handles caching based on these headers - no JavaScript cache management needed!

### 2. Smart Prefetching with ForesightJS

ForesightJS predicts user intent based on:
- **Mouse trajectory** (desktop): Predicts where users will click based on cursor movement
- **Keyboard navigation**: Tracks tab navigation to prefetch focused elements
- **Viewport detection** (mobile): Prefetches resources when elements enter viewport
- **Touch events** (mobile): Prefetches on touch start

Example usage:

```typescript
import { prefetchForRoute, registerNavigationElement } from '../utils/prefetch';

// Prefetch resources for a specific route
prefetchForRoute('dashboard');

// Register a navigation element for smart prefetching
registerNavigationElement(linkElement, ['/api/projects']);
```

## Implementation Details

### Backend Changes

Each API route includes cache headers:

```typescript
// Example from src/routes/projects.ts
const response = c.json({ projects: projectsWithLanguages });
response.headers.set('Cache-Control', buildCacheControl(CACHE_CONFIGS.projects));
return response;
```

### Frontend Changes

Components use standard `fetch()` API. The browser handles caching automatically based on Cache-Control headers:

```typescript
// Simple fetch - browser handles caching
const res = await fetch('/api/projects', { credentials: 'include' });
```

ForesightJS is initialized at app startup and automatically tracks user interactions:

```typescript
// In src/app/index.tsx
import { initializeForesight } from './utils/prefetch';

initializeForesight();
```

## Performance Benefits

1. **Reduced Network Requests**: Browser's HTTP cache serves repeated requests from memory
2. **Faster Interactions**: ForesightJS prefetches resources before users click/navigate
3. **Reduced Server Load**: Fewer requests hit the API and database
4. **Better UX**: Near-instant response for cached data and prefetched resources
5. **Stale-While-Revalidate**: Users see content immediately while fresh data loads in background
6. **Mobile Optimized**: Different strategies for touch devices vs mouse/keyboard

## Testing

Run tests to verify caching functionality:

```bash
pnpm run test
```

Cache-specific tests are in `src/lib/cache-headers.test.ts`.

## Browser DevTools

You can inspect HTTP caching in browser DevTools:

1. Open DevTools → Network tab
2. Check the Cache-Control headers in response headers
3. Look for responses served from disk/memory cache
4. Use the "Disable cache" checkbox to test without cache

## ForesightJS Features

ForesightJS provides:
- **Automatic prediction**: Works out of the box with no configuration
- **Framework agnostic**: Works with any JavaScript framework
- **Mobile support**: Different strategies for touch vs mouse devices
- **Low overhead**: Minimal performance impact
- **DevTools**: Optional visualization tools for debugging

For more information, see the [ForesightJS documentation](https://foresightjs.com/).

## Browser Compatibility

The implementation uses standard web APIs:
- Fetch API (widely supported)
- HTTP Cache-Control (universal browser support)
- ForesightJS (modern browsers with ES6+ support)

Compatible with all modern browsers (Chrome, Firefox, Safari, Edge).

## Debugging

To debug prefetching behavior, you can install the ForesightJS DevTools:

```bash
pnpm add -D js.foresight-devtools
```

See the [ForesightJS DevTools documentation](https://foresightjs.com/docs/debugging/devtools) for usage.

## Future Enhancements

Potential improvements for the future:
1. **Service Worker**: Enable offline functionality
2. **Cache Warming**: Pre-fetch likely-needed data on app load
3. **Analytics**: Track cache hit rates and prefetch effectiveness
4. **ETag Implementation**: Add ETag generation on server for 304 responses

## Security Considerations

✅ **All user-specific data uses `private` directive**
- Prevents CDN caching of sensitive information
- Each user gets their own cached data

✅ **No security vulnerabilities introduced**
- Uses only standard web APIs
- ForesightJS is a trusted, well-maintained library

✅ **Cache isolation**
- Browser handles cache isolation automatically
- No cross-user cache pollution

## Rollback Plan

If issues arise, the caching can be easily disabled:

1. **Backend**: Comment out `response.headers.set('Cache-Control', ...)` lines
2. **Frontend**: Remove ForesightJS initialization from `src/app/index.tsx`
3. **Complete Removal**: Uninstall `js.foresight` package

## Conclusion

This implementation successfully provides:
✅ Re-using fetched data via native browser HTTP cache
✅ Smart prefetching based on user intent prediction
✅ Support for cache time limits via Cache-Control headers
✅ Mobile and desktop optimization
✅ Clean, maintainable solution with minimal code
✅ Comprehensive tests and documentation

The caching strategy is production-ready and provides significant performance improvements without compromising security or data freshness.

