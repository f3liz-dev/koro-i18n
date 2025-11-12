/**
 * Client-side cache wrapper for fetch requests
 * Supports cache invalidation on force reload and TTL-based expiration
 */

interface CacheEntry {
  data: any;
  timestamp: number;
  etag?: string;
}

class FetchCache {
  private cache = new Map<string, CacheEntry>();
  private defaultTTL = 300000; // 5 minutes in milliseconds
  
  constructor() {
    // Listen for force reload events (Ctrl+Shift+R or Cmd+Shift+R)
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'R') {
          this.clear();
        }
      });
      
      // Check if page was reloaded (either normal or hard reload)
      // Using performance.navigation API or performance.getEntriesByType
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation && navigation.type === 'reload') {
        // Clear cache on any reload
        this.clear();
      }
      
      // Also detect page visibility changes after being hidden (could indicate reload)
      let wasHidden = false;
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          wasHidden = true;
        } else if (wasHidden) {
          // Page became visible after being hidden - could be a reload scenario
          wasHidden = false;
        }
      });
    }
  }
  
  /**
   * Get cache key from URL and options
   */
  private getCacheKey(url: string, options?: RequestInit): string {
    const method = options?.method || 'GET';
    // Only cache GET requests by default
    if (method !== 'GET') return '';
    
    return `${method}:${url}`;
  }
  
  /**
   * Check if cache entry is still valid
   */
  private isValid(entry: CacheEntry, ttl: number): boolean {
    const age = Date.now() - entry.timestamp;
    return age < ttl;
  }
  
  /**
   * Fetch with caching support
   */
  async fetch(url: string, options?: RequestInit & { cacheTTL?: number; noCache?: boolean }): Promise<Response> {
    const { cacheTTL = this.defaultTTL, noCache = false, ...fetchOptions } = options || {};
    const cacheKey = this.getCacheKey(url, fetchOptions);
    
    // Skip cache for non-GET or if noCache is set
    if (!cacheKey || noCache) {
      return fetch(url, fetchOptions);
    }
    
    // Check if we have a valid cached entry
    const cached = this.cache.get(cacheKey);
    if (cached && this.isValid(cached, cacheTTL)) {
      console.log(`[Cache HIT] ${url}`);
      // Return cached response
      return new Response(JSON.stringify(cached.data), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Cache': 'HIT',
        },
      });
    }
    
    console.log(`[Cache MISS] ${url}`);
    
    // Make the request with conditional headers if we have a cached etag
    const headers = new Headers(fetchOptions.headers);
    if (cached?.etag) {
      headers.set('If-None-Match', cached.etag);
    }
    
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    });
    
    // If server returned 304 Not Modified, use cached data
    if (response.status === 304 && cached) {
      console.log(`[Cache 304] ${url}`);
      // Update timestamp but keep data
      this.cache.set(cacheKey, {
        ...cached,
        timestamp: Date.now(),
      });
      
      return new Response(JSON.stringify(cached.data), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Cache': '304',
        },
      });
    }
    
    // Clone the response so we can read it
    const clonedResponse = response.clone();
    
    // Only cache successful responses
    if (response.ok && response.headers.get('Content-Type')?.includes('application/json')) {
      try {
        const data = await clonedResponse.json();
        const etag = response.headers.get('ETag') || undefined;
        
        this.cache.set(cacheKey, {
          data,
          timestamp: Date.now(),
          etag,
        });
      } catch (e) {
        console.warn(`Failed to cache response for ${url}:`, e);
      }
    }
    
    return response;
  }
  
  /**
   * Invalidate specific cache entry
   */
  invalidate(url: string, options?: RequestInit): void {
    const cacheKey = this.getCacheKey(url, options);
    if (cacheKey) {
      this.cache.delete(cacheKey);
      console.log(`[Cache INVALIDATE] ${url}`);
    }
  }
  
  /**
   * Invalidate cache entries matching a pattern
   */
  invalidatePattern(pattern: string | RegExp): void {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    let count = 0;
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }
    
    console.log(`[Cache INVALIDATE PATTERN] ${pattern} - ${count} entries cleared`);
  }
  
  /**
   * Clear all cache entries
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`[Cache CLEAR] ${size} entries cleared`);
  }
  
  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        age: Date.now() - entry.timestamp,
        hasEtag: !!entry.etag,
      })),
    };
  }
}

// Export singleton instance
export const fetchCache = new FetchCache();

/**
 * Cached fetch function - drop-in replacement for fetch with caching
 */
export function cachedFetch(url: string, options?: RequestInit & { cacheTTL?: number; noCache?: boolean }): Promise<Response> {
  return fetchCache.fetch(url, options);
}

/**
 * Helper for mutation operations that should invalidate cache
 * Automatically invalidates related cache entries after successful mutation
 */
export async function mutate<T = any>(
  url: string, 
  options: RequestInit & { invalidatePatterns?: (string | RegExp)[] } = {}
): Promise<Response> {
  const { invalidatePatterns = [], ...fetchOptions } = options;
  
  // Perform the mutation
  const response = await fetch(url, fetchOptions);
  
  // If successful, invalidate related cache entries
  if (response.ok) {
    // Auto-invalidate patterns based on the URL
    const urlPatterns = extractInvalidationPatterns(url);
    const allPatterns = [...urlPatterns, ...invalidatePatterns];
    
    allPatterns.forEach(pattern => {
      fetchCache.invalidatePattern(pattern);
    });
  }
  
  return response;
}

/**
 * Extract cache invalidation patterns from a mutation URL
 */
function extractInvalidationPatterns(url: string): RegExp[] {
  const patterns: RegExp[] = [];
  
  // For project mutations, invalidate project-related caches
  if (url.includes('/api/projects')) {
    patterns.push(/GET:\/api\/projects/);
  }
  
  // For translation mutations, invalidate translation-related caches
  if (url.includes('/api/translations')) {
    patterns.push(/GET:\/api\/translations/);
  }
  
  // For file uploads, invalidate file-related caches
  if (url.includes('/upload') || url.includes('/files')) {
    patterns.push(/GET:\/api\/projects\/.*\/files/);
  }
  
  return patterns;
}

