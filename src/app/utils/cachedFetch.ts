/**
 * Enhanced fetch utility that leverages browser HTTP cache for instant loading.
 * This works with ForesightJS prefetching to provide instant data when available.
 * 
 * When tryCache is true, the browser's HTTP cache is checked first.
 * If cached data exists (from ForesightJS or previous requests), it's returned immediately.
 * Otherwise, a normal network request is made.
 */

export interface CachedFetchOptions extends RequestInit {
  /**
   * If true, tries to get data from cache first before making a network request.
   * This provides instant loading when ForesightJS has prefetched the data.
   * Default: false
   */
  tryCache?: boolean;
}

/**
 * Fetch data with optional cache-first strategy.
 * 
 * When tryCache is enabled, this will:
 * 1. First try to get data from browser's HTTP cache (instant if available)
 * 2. Fall back to normal fetch if cache miss
 * 
 * This reduces loading time when ForesightJS has prefetched the data.
 * 
 * @param url - The URL to fetch
 * @param options - Fetch options with optional tryCache flag
 * @returns Promise resolving to the response
 * 
 * @example
 * ```typescript
 * // Try cache first (instant if prefetched by ForesightJS)
 * const res = await cachedFetch('/api/projects', { 
 *   credentials: 'include',
 *   tryCache: true 
 * });
 * 
 * // Normal fetch (always network, but browser cache still works)
 * const res = await cachedFetch('/api/projects', { 
 *   credentials: 'include' 
 * });
 * ```
 */
export async function cachedFetch(url: string, options: CachedFetchOptions = {}): Promise<Response> {
  const { tryCache = false, ...fetchOptions } = options;
  
  // For non-GET requests, always use normal fetch
  if (fetchOptions.method && fetchOptions.method !== 'GET') {
    return fetch(url, fetchOptions);
  }
  
  // When tryCache is true, use 'force-cache' mode to prefer cached responses
  // This will return cached data instantly if available (from ForesightJS prefetch)
  // and only make a network request if cache miss
  if (tryCache) {
    return fetch(url, {
      ...fetchOptions,
      cache: 'force-cache', // Prefer cache over network
    });
  }
  
  // Default behavior: normal fetch (browser will still use cache based on Cache-Control headers)
  return fetch(url, fetchOptions);
}

/**
 * Try to fetch data from cache only, without network fallback.
 * Returns null if data is not in cache.
 * This is useful for initializing component state without showing loading indicators.
 * 
 * @param url - The URL to fetch from cache
 * @param options - Fetch options
 * @returns Promise resolving to the response or null if not cached
 * 
 * @example
 * ```typescript
 * // Try to get cached data during component initialization
 * const cached = await tryGetCached('/api/projects', { credentials: 'include' });
 * if (cached) {
 *   const data = await cached.json();
 *   setInitialData(data);
 * }
 * ```
 */
export async function tryGetCached(url: string, options: RequestInit = {}): Promise<Response | null> {
  try {
    // Try to get data from cache only (no network request)
    const response = await fetch(url, {
      ...options,
      cache: 'only-if-cached',
      mode: 'same-origin',
    });
    
    if (response.ok) {
      return response;
    }
  } catch (error) {
    // Cache miss or error - this is expected
    console.log(`[CachedFetch] No cache for: ${url}`);
  }
  
  return null;
}

/**
 * Create a fetcher function for use with SolidJS createResource that checks cache first.
 * This is the recommended way to integrate cache-first loading with SolidJS resources.
 * 
 * @param options - Fetch options
 * @returns A fetcher function that checks cache before making network requests
 * 
 * @example
 * ```typescript
 * const [projects] = createResource(
 *   () => '/api/projects',
 *   createCachedFetcher({ credentials: 'include' })
 * );
 * ```
 */
export function createCachedFetcher<T>(options: RequestInit = {}) {
  return async (url: string): Promise<T> => {
    // First try cache-only (instant if available from ForesightJS)
    const cached = await tryGetCached(url, options);
    if (cached) {
      console.log(`[CachedFetch] Cache HIT: ${url}`);
      return cached.json();
    }
    
    // Cache miss, fetch from network with cache preference
    console.log(`[CachedFetch] Cache MISS, fetching: ${url}`);
    const response = await fetch(url, {
      ...options,
      cache: 'force-cache',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status}`);
    }
    
    return response.json();
  };
}

/**
 * Clear browser HTTP cache for specific URLs or patterns.
 * This uses the Cache Storage API to remove cached responses.
 * 
 * @param patterns - Array of URL patterns to clear. If not provided, clears all caches.
 * 
 * @example
 * ```typescript
 * // Clear specific API routes
 * await clearBrowserCache(['/api/auth/me', '/api/projects']);
 * 
 * // Clear all caches
 * await clearBrowserCache();
 * ```
 */
export async function clearBrowserCache(patterns?: string[]): Promise<void> {
  try {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      
      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        
        if (patterns && patterns.length > 0) {
          // Clear specific patterns
          const requests = await cache.keys();
          for (const request of requests) {
            const url = request.url;
            if (patterns.some(pattern => url.includes(pattern))) {
              await cache.delete(request);
              console.log(`[CachedFetch] Cleared cache for: ${url}`);
            }
          }
        } else {
          // Clear entire cache
          await caches.delete(cacheName);
          console.log(`[CachedFetch] Cleared cache: ${cacheName}`);
        }
      }
    }
  } catch (error) {
    console.error('[CachedFetch] Failed to clear browser cache:', error);
  }
}
