/**
 * Add a prefetch link to the document head
 * @param url - The URL to prefetch
 * @param as - The resource type (fetch, script, style, etc.)
 */
export function addPrefetchLink(url: string, as: string = 'fetch'): void {
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
