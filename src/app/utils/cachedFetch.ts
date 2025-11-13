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
