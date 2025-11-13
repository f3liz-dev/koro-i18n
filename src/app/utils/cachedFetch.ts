/**
 * Enhanced fetch utility that checks for cached responses before making network requests.
 * This works with ForesightJS prefetching to provide instant data when available.
 * 
 * The browser's HTTP cache is checked using cache: 'force-cache' first.
 * If cached data exists (from ForesightJS or previous requests), it's returned immediately.
 * Otherwise, falls back to normal fetch behavior.
 */

export interface CachedFetchOptions extends RequestInit {
  /**
   * If true, tries to get data from cache first before making a network request.
   * This provides instant loading when ForesightJS has prefetched the data.
   */
  tryCache?: boolean;
}

/**
 * Fetch data with cache-first strategy when enabled.
 * 
 * @param url - The URL to fetch
 * @param options - Fetch options with optional tryCache flag
 * @returns Promise resolving to the response
 * 
 * @example
 * ```typescript
 * // Try cache first (instant if prefetched)
 * const res = await cachedFetch('/api/projects', { 
 *   credentials: 'include',
 *   tryCache: true 
 * });
 * 
 * // Normal fetch (always network)
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
  
  // If tryCache is enabled, try to get from cache first
  if (tryCache) {
    try {
      // Try to get cached response using force-cache mode
      const cachedResponse = await fetch(url, {
        ...fetchOptions,
        cache: 'force-cache',
      });
      
      // If we got a response and it's successful, return it
      if (cachedResponse.ok) {
        console.log(`[CachedFetch] Cache HIT: ${url}`);
        return cachedResponse;
      }
    } catch (error) {
      // If cache fetch fails, continue to normal fetch
      console.log(`[CachedFetch] Cache MISS: ${url}`, error);
    }
  }
  
  // Fall back to normal fetch (which will still use HTTP cache if available)
  console.log(`[CachedFetch] Network fetch: ${url}`);
  return fetch(url, fetchOptions);
}

/**
 * Utility to check if a URL might be cached.
 * This is a best-effort check and doesn't guarantee cache availability.
 * 
 * @param url - The URL to check
 * @returns Promise resolving to true if data appears to be cached
 */
export async function isCached(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      cache: 'only-if-cached',
      mode: 'same-origin',
    });
    return response.ok;
  } catch {
    return false;
  }
}
