/**
 * Smart resource preloading using ForesightJS
 * 
 * This module uses the ForesightJS library to predict user interactions
 * and prefetch resources before they're needed, optimizing SPA performance.
 */

import { ForesightManager } from 'js.foresight';

/**
 * Initialize ForesightJS with optimal settings for the SPA
 */
export function initializeForesight() {
  if (typeof window === 'undefined') return;

  // Initialize ForesightJS with default settings
  // It works out of the box with no configuration needed
  ForesightManager.initialize({
    touchDeviceStrategy: 'viewport',
    defaultHitSlop: 20,
  });
}

/**
 * Legacy API - Add a prefetch link to the document head
 * @param url - The URL to prefetch
 * @param as - The resource type (fetch, script, style, etc.)
 */
export function addPrefetchLink(url: string, as: string = 'fetch'): void {
  if (typeof window === 'undefined') return;
  
  // Check if link already exists
  const existingLink = document.querySelector(`link[rel="prefetch"][href="${url}"]`);
  if (existingLink) {
    return;
  }

  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = url;
  link.as = as;
  
  // For fetch requests, add crossorigin attribute
  if (as === 'fetch') {
    link.crossOrigin = 'use-credentials';
  }
  
  document.head.appendChild(link);
}

/**
 * Prefetch multiple URLs
 * @param urls - Array of URLs to prefetch
 * @param as - The resource type (fetch, script, style, etc.)
 */
export function prefetchMultiple(urls: string[], as: string = 'fetch'): void {
  urls.forEach(url => addPrefetchLink(url, as));
}

/**
 * Smart prefetch based on route context
 * This creates prefetch links that ForesightJS will use to prefetch when user shows intent
 * @param route - Current route name
 * @param projectId - Optional project ID
 * @param language - Optional language code
 */
export function prefetchForRoute(route: string, projectId?: string, language?: string): void {
  const prefetchMap: Record<string, string[]> = {
    dashboard: ['/api/projects'],
    'project-languages': projectId ? [`/api/projects/${projectId}/files/summary`] : [],
    'project-files': projectId && language 
      ? [`/api/projects/${projectId}/files/summary?lang=${language}`]
      : [],
    'translation-editor': projectId && language
      ? [
          `/api/projects`,
          `/api/projects/${projectId}/files?lang=${language}`,
          `/api/translations?projectId=${projectId}&language=${language}`,
        ]
      : [],
  };

  const urls = prefetchMap[route] || [];
  prefetchMultiple(urls);
}

/**
 * Register a navigation element with ForesightJS for smart prefetching
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
      // Prefetch all URLs when ForesightJS predicts user will interact
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
 * Get the ForesightManager instance for advanced usage
 */
export { ForesightManager };


