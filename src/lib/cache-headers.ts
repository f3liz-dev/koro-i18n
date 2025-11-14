/**
 * Cache configuration for different types of API responses
 * 
 * NEW STRATEGY: All APIs use max-age=0, no-cache to force revalidation.
 * Caching is managed through:
 * - ETag headers: Enable 304 Not Modified responses for unchanged content
 * - Frontend Store: SolidJS store provides instant UI updates and in-memory caching
 * 
 * This approach ensures:
 * 1. Browser always checks server for fresh data (max-age=0)
 * 2. Server can respond with 304 if content unchanged (via ETag)
 * 3. Frontend provides instant UI from store cache
 * 4. No stale data issues from long TTL caching
 */

export interface CacheConfig {
  maxAge: number; // seconds
  noCache?: boolean; // add no-cache directive
  noStore?: boolean; // add no-store directive (prevents any caching)
  mustRevalidate?: boolean;
}

/**
 * All API endpoints now use max-age=0, no-cache strategy.
 * Caching relies on ETag for conditional requests and frontend Store for instant UI.
 * 
 * This eliminates stale data issues while maintaining performance through:
 * - 304 Not Modified responses (via ETag)
 * - Frontend in-memory store (instant UI updates)
 * - Prefetching with ForesightJS (predictive loading)
 */
export const CACHE_CONFIGS = {
  // All API data uses max-age=0, no-cache
  // Cache validation relies on ETag headers
  api: { maxAge: 0, noCache: true }, // Always revalidate with server
  
  // Kept for backward compatibility, but all now use same strategy
  projects: { maxAge: 0, noCache: true },
  projectFiles: { maxAge: 0, noCache: true },
  translations: { maxAge: 0, noCache: true },
  translationSuggestions: { maxAge: 0, noCache: true },
  user: { maxAge: 0, noCache: true },
  noCache: { maxAge: 0, noCache: true, mustRevalidate: true },
  noStore: { maxAge: 0, noStore: true }, // Prevents any caching - for sensitive auth data
  static: { maxAge: 0, noCache: true },
} as const;

/**
 * Build Cache-Control header value from config
 * 
 * New strategy: max-age=0, no-cache for all APIs
 * This forces browsers to revalidate with server on every request
 * while still allowing 304 Not Modified responses via ETag
 */
export function buildCacheControl(config: CacheConfig): string {
  const parts: string[] = [];
  
  if (config.maxAge !== undefined) {
    parts.push(`max-age=${config.maxAge}`);
  }
  
  if (config.noStore) {
    parts.push('no-store');
  }
  
  if (config.noCache) {
    parts.push('no-cache');
  }
  
  if (config.mustRevalidate) {
    parts.push('must-revalidate');
  }
  
  // Always add private to prevent CDN caching of user-specific data
  parts.push('private');
  
  return parts.join(', ');
}

/**
 * Helper to add cache headers to a response
 */
export function withCacheHeaders(response: Response, config: CacheConfig): Response {
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', buildCacheControl(config));
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
