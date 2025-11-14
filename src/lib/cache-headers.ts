/**
 * Cache configuration for different types of API responses
 * 
 * This module provides cache configurations that leverage browser's native HTTP cache.
 * The frontend also uses SolidJS store for in-memory caching - both work together:
 * - HTTP cache: Reduces network requests via Cache-Control headers
 * - SolidJS store: Provides instant UI updates and optimistic rendering
 */

export interface CacheConfig {
  maxAge: number; // seconds
  swr?: number; // stale-while-revalidate seconds
  mustRevalidate?: boolean;
}

/**
 * Predefined cache configurations for different data types
 * 
 * Strategy:
 * - Cacheable (long TTL): Data that changes infrequently (projects, files)
 * - Short cache: Data that changes moderately (translations)
 * - No cache: Real-time data that must always be fresh (auth status, suggestions, logs)
 * - Mutations: POST/PUT/DELETE/PATCH operations never have cache headers
 */
export const CACHE_CONFIGS = {
  // Project data changes infrequently - safe to cache
  projects: { maxAge: 300, swr: 60 }, // 5 min cache, 1 min SWR
  
  // Project files are stable between uploads - safe to cache longer
  projectFiles: { maxAge: 600, swr: 120 }, // 10 min cache, 2 min SWR
  
  // Translation data may change more frequently during active editing
  translations: { maxAge: 60, swr: 30 }, // 1 min cache, 30 sec SWR
  
  // Translation suggestions need fresh data - always fetch latest
  // This shows pending/approved translations that change in real-time
  translationSuggestions: { maxAge: 0 }, // Always fresh
  
  // User data changes very infrequently
  user: { maxAge: 3600 }, // 1 hour cache
  
  // Real-time data - always fetch fresh (auth checks, logs, debug endpoints)
  noCache: { maxAge: 0, mustRevalidate: true }, // No cache, must revalidate
  
  // Static/reference data that rarely changes (health checks, system info)
  static: { maxAge: 86400 }, // 24 hours cache
} as const;

/**
 * Build Cache-Control header value from config
 */
export function buildCacheControl(config: CacheConfig): string {
  const parts: string[] = [];
  
  if (config.maxAge !== undefined) {
    parts.push(`max-age=${config.maxAge}`);
  }
  
  if (config.swr !== undefined) {
    parts.push(`stale-while-revalidate=${config.swr}`);
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
