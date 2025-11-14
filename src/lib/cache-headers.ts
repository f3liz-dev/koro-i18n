/**
 * Cache configuration for different types of API responses
 * 
 * SPA-OPTIMIZED STRATEGY: Aggressive browser caching with appropriate TTLs.
 * Caching is managed through:
 * - HTTP Cache-Control headers: Enable browser caching with reasonable TTLs
 * - ETag headers: Enable 304 Not Modified responses for unchanged content
 * - Frontend Store: SolidJS store provides instant UI updates and in-memory caching
 * 
 * This approach ensures:
 * 1. Browser caches responses for appropriate durations (SPA optimization)
 * 2. Server can respond with 304 if content unchanged (via ETag)
 * 3. Frontend provides instant UI from store cache
 * 4. Auth endpoints handled specially - cached but revalidated on 401
 */

export interface CacheConfig {
  maxAge: number; // seconds
  swr?: number; // stale-while-revalidate seconds
  noCache?: boolean; // add no-cache directive
  noStore?: boolean; // add no-store directive (prevents any caching)
  mustRevalidate?: boolean;
}

/**
 * SPA-optimized caching strategy with aggressive browser caching.
 * Each endpoint has a cache duration appropriate for its data volatility.
 * 
 * Benefits:
 * - Reduced network requests (browser serves from cache)
 * - Faster navigation (instant from cache)
 * - Lower server load
 * - 304 Not Modified responses (via ETag when revalidating)
 * - Frontend in-memory store (instant UI updates)
 * - Prefetching with ForesightJS (predictive loading)
 */
export const CACHE_CONFIGS = {
  // Auth endpoint - cache for 5 minutes, auth errors trigger refetch
  // This is safe because authFetch handles 401 by clearing cache and refetching
  auth: { maxAge: 300, swr: 60 }, // 5 min cache with 1 min SWR
  
  // Projects - changes infrequently
  projects: { maxAge: 300, swr: 60 }, // 5 min cache with 1 min SWR
  
  // Project files - updated less frequently
  projectFiles: { maxAge: 600, swr: 120 }, // 10 min cache with 2 min SWR
  
  // Translations - may change during active editing
  translations: { maxAge: 60, swr: 30 }, // 1 min cache with 30 sec SWR
  
  // Translation suggestions - real-time collaborative editing
  translationSuggestions: { maxAge: 30, swr: 10 }, // 30 sec cache with 10 sec SWR
  
  // User data - very stable
  user: { maxAge: 3600 }, // 1 hour cache
  
  // Generic API - moderate caching
  api: { maxAge: 60, swr: 30 }, // 1 min cache with 30 sec SWR
  
  // No cache - force revalidation
  noCache: { maxAge: 0, noCache: true, mustRevalidate: true },
  
  // No store - prevents any caching (use sparingly)
  noStore: { maxAge: 0, noStore: true },
  
  // Static resources - long cache
  static: { maxAge: 86400 }, // 24 hours
} as const;

/**
 * Build Cache-Control header value from config
 * 
 * SPA-optimized strategy: Aggressive browser caching with appropriate TTLs
 * Uses stale-while-revalidate for better UX during revalidation
 */
export function buildCacheControl(config: CacheConfig): string {
  const parts: string[] = [];
  
  if (config.maxAge !== undefined) {
    parts.push(`max-age=${config.maxAge}`);
  }
  
  if (config.swr !== undefined && config.swr > 0) {
    parts.push(`stale-while-revalidate=${config.swr}`);
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
