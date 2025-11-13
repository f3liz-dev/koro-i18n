/**
 * Cache configuration for different types of API responses
 */

export interface CacheConfig {
  maxAge: number; // seconds
  swr?: number; // stale-while-revalidate seconds
  mustRevalidate?: boolean;
}

/**
 * Predefined cache configurations for different data types
 */
export const CACHE_CONFIGS = {
  // Project list changes infrequently
  projects: { maxAge: 300, swr: 60 }, // 5 min cache, 1 min SWR
  
  // Project files can be cached longer as they're updated less frequently
  projectFiles: { maxAge: 600, swr: 120 }, // 10 min cache, 2 min SWR
  
  // Translation data may change more frequently
  translations: { maxAge: 60, swr: 30 }, // 1 min cache, 30 sec SWR
  
  // Translation suggestions need fresh data
  translationSuggestions: { maxAge: 0 }, // Always fresh
  
  // User data changes very infrequently
  user: { maxAge: 3600 }, // 1 hour cache
  
  // Static/reference data
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
