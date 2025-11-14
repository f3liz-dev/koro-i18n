/**
 * Application state management for tracking initialization and reload events.
 * 
 * This module provides utilities to detect page reloads and ensure fresh data
 * is fetched on initial page load while allowing cached data for SPA navigation.
 */

// In-memory flag to track if the app has been initialized
// This resets on every page reload
let isInitialized = false;

/**
 * Check if this is the first load since page reload.
 * Returns true only once per page load, then false for subsequent calls.
 * 
 * Use this to determine if fresh data should be fetched (bypassing cache).
 * 
 * @returns true if this is the first time being called since page load
 * 
 * @example
 * ```typescript
 * if (isFirstLoad()) {
 *   // Fetch with cache: 'reload' to bypass cache
 *   fetch('/api/auth/me', { cache: 'reload' });
 * } else {
 *   // Normal fetch - use cache
 *   fetch('/api/auth/me');
 * }
 * ```
 */
export function isFirstLoad(): boolean {
  if (!isInitialized) {
    isInitialized = true;
    return true;
  }
  return false;
}

/**
 * Reset the initialization state.
 * Useful for testing or forcing a fresh fetch.
 */
export function resetInitializationState(): void {
  isInitialized = false;
}

/**
 * Get the current initialization state.
 * @returns true if the app has been initialized
 */
export function getInitializationState(): boolean {
  return isInitialized;
}
