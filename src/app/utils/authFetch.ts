/**
 * Authentication-aware fetch wrapper that automatically handles token expiration
 * and provides sensible defaults for API calls to the BFF.
 *
 * Notes:
 * - Preserves caller-provided headers (including If-None-Match for ETag checks).
 * - Adds Accept: application/json by default so Cloudflare worker endpoints return JSON.
 * - On 401: attempts server-side logout, clears client state by redirecting to /login.
 * - Network errors are re-thrown so callers can handle them explicitly.
 */

export async function authFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  // Merge headers without clobbering user-provided headers
  const headers = {
    Accept: "application/json",
    ...(init && init.headers ? (init.headers as Record<string, string>) : {}),
  };

  const fetchInit: RequestInit = {
    ...init,
    headers,
  };

  try {
    const response = await fetch(input, fetchInit);

    // Handle authentication failure
    if (response.status === 401) {
      console.log("[AuthFetch] 401 Unauthorized");

      // If already on public pages, return the response so callers can decide
      if (
        window.location.pathname === "/" ||
        window.location.pathname === "/login"
      ) {
        return response;
      }

      // Attempt to clear server-side cookie; ignore errors
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          credentials: "include",
          headers: { Accept: "application/json" },
        });
      } catch (err) {
        console.error("[AuthFetch] Logout call failed:", err);
      }

      // Redirect to login to ensure user re-authenticates
      window.location.href = "/login";
      return response;
    }

    // For 304 Not Modified responses we return the response as-is so callers can
    // handle conditional requests (ETag / If-None-Match) correctly.
    return response;
  } catch (err) {
    console.error("[AuthFetch] Network error:", err);
    // Re-throw so callers can react (UI error state, retry logic, etc.)
    throw err;
  }
}
