/**
 * Smart resource preloading using ForesightJS
 * 
 * This module uses the ForesightJS library to predict user interactions
 * and prefetch resources before they're needed, optimizing SPA performance.
 * 
 * According to ForesightJS documentation, the callback should perform actual
 * data fetching, not just create <link> tags. This is crucial for SPAs.
 */

import { ForesightManager } from 'js.foresight';

// Cache to track which URLs have been prefetched to avoid duplicate requests
const prefetchCache = new Set<string>();

/**
 * Initialize ForesightJS with optimal settings for the SPA
 */
export function initializeForesight() {
  if (typeof window === 'undefined') return;

  // Initialize ForesightJS with default settings optimized for this SPA
  ForesightManager.initialize({
    touchDeviceStrategy: 'viewport',
    defaultHitSlop: 20,
    enableMousePrediction: true,
    enableTabPrediction: true,
    enableScrollPrediction: true,
  });
}

/**
 * Prefetch a single URL by actually fetching it
 * This is the correct approach for SPA data prefetching with ForesightJS
 * @param url - The URL to prefetch
 */
export async function prefetchData(url: string): Promise<void> {
  if (typeof window === 'undefined') return;
  
  // Skip if already prefetched or currently prefetching
  if (prefetchCache.has(url)) {
    return;
  }

  try {
    // Mark as prefetching to avoid duplicates
    prefetchCache.add(url);
    
    // Perform actual fetch - this will be cached by the browser
    // Don't await to prevent blocking navigation
    fetch(url, {
      credentials: 'include',
      cache: 'no-cache',
    })
      .then(() => {
        console.log(`[ForesightJS] Prefetched: ${url}`);
      })
      .catch((error) => {
        // Remove from cache on error so it can be retried
        prefetchCache.delete(url);
        console.warn(`[ForesightJS] Failed to prefetch ${url}:`, error);
      });
  } catch (error) {
    // Remove from cache on error so it can be retried
    prefetchCache.delete(url);
    console.warn(`[ForesightJS] Failed to prefetch ${url}:`, error);
  }
}

/**
 * Prefetch multiple URLs without blocking
 * @param urls - Array of URLs to prefetch
 */
export function prefetchMultiple(urls: string[]): void {
  // Prefetch in parallel without blocking
  urls.forEach(url => prefetchData(url));
}

/**
 * Smart prefetch based on route context
 * This performs actual data fetching when ForesightJS predicts user intent
 * Non-blocking to prevent navigation delays
 * @param route - Current route name
 * @param projectId - Optional project ID
 * @param language - Optional language code
 */
export function prefetchForRoute(route: string, projectId?: string, language?: string): void {
  const prefetchMap: Record<string, string[]> = {
    dashboard: ['/api/projects'],
    'project-languages': projectId ? [`/api/projects/${projectId}/files/summary`] : [],
    'project-files': projectId && language && /^[a-z]{2,3}(-[A-Z]{2})?$/.test(language)
      ? [`/api/projects/${projectId}/files/summary?lang=${language}`]
      : projectId
        ? [`/api/projects/${projectId}/files/summary`]
        : [],
  'translation-editor': projectId && language
      ? [
          `/api/projects`,
          `/api/projects/${projectId}/files?lang=${language}`,
          `/api/translations?projectName=${projectId}&language=${language}`,
        ]
      : [],
  };

  const urls = prefetchMap[route] || [];
  prefetchMultiple(urls);
}

/**
 * Register a navigation element with ForesightJS for smart prefetching
 * Non-blocking to prevent navigation delays
 * @param element - The DOM element to track (e.g., a link or button)
 * @param prefetchUrls - URLs to prefetch when user shows intent to interact
 * @param hitSlop - Optional hit slop in pixels (default uses global setting)
 */
export function registerNavigationElement(
  element: HTMLElement,
  prefetchUrls: string[],
  hitSlop?: number
): void {
  if (typeof window === 'undefined' || !element) return;

  ForesightManager.instance.register({
    element,
    callback: () => {
      // Perform actual data fetching when ForesightJS predicts interaction
      // Non-blocking to prevent navigation delays
      prefetchMultiple(prefetchUrls);
    },
    hitSlop,
  });
}

/**
 * Unregister an element from ForesightJS tracking
 * @param element - The DOM element to stop tracking
 */
export function unregisterNavigationElement(element: HTMLElement): void {
  if (typeof window === 'undefined' || !element) return;
  
  ForesightManager.instance.unregister(element);
}

/**
 * Clear the prefetch cache (useful for testing or when data changes)
 */
export function clearPrefetchCache(): void {
  prefetchCache.clear();
}

/**
 * Get the ForesightManager instance for advanced usage
 */
export { ForesightManager };
