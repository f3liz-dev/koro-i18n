/**
 * Authentication-aware fetch wrapper that automatically handles token expiration.
 *
 * This utility intercepts 401 Unauthorized responses and:
 * 1. Clears all caches (browser HTTP cache and dataStore)
 * 2. Logs out the user
 * 3. Redirects to the login page
 *
 * Use this for all API calls that require authentication.
 */

import { clearBrowserCache } from './cachedFetch';
import { clearAllCaches } from './dataStore';

/**
 * Enhanced fetch that handles authentication errors automatically.
 * When a 401 Unauthorized response is received, it triggers logout and redirects to login.
 *
 * @param input - URL or Request object
 * @param init - Fetch options
 * @returns Promise resolving to the Response
 *
 * @example
 * ```typescript
 * const response = await authFetch('/api/projects', { credentials: 'include' });
 * if (response.ok) {
 *   const data = await response.json();
 * }
 * ```
 */
export async function authFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const response = await fetch(input, init);

  // Check for 401 Unauthorized - token is invalid or expired
  if (response.status === 401) {
    // Clear all caches to prevent stale data from being used
    console.log("[AuthFetch] 401 Unauthorized - clearing caches");
    clearAllCaches(); // Clear dataStore caches
    await clearBrowserCache(); // Clear browser HTTP cache

    // If already on public pages, just return the response without redirecting
    if (
      window.location.pathname === "/" ||
      window.location.pathname === "/login"
    ) {
      return response;
    }

    console.log("[AuthFetch] Logging out and redirecting");

    // Clear auth state and redirect to login
    try {
      // Try to call logout endpoint to clear server-side cookie
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      // Ignore logout errors - cookie may already be invalid
      console.error("[AuthFetch] Logout call failed:", error);
    }

    // Redirect to login page
    window.location.href = "/login";

    // Return the 401 response for any code that might still process it
    return response;
  }

  return response;
}
