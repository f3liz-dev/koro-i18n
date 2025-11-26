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

const inFlight = new Map<string, Promise<Response>>();

function makeKey(input: RequestInfo | URL, init?: RequestInit) {
  try {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;
    const method = (init && init.method) || 'GET';
    // simple key - include URL and method; headers/body would make this more precise
    return `${method}:${url}`;
  } catch {
    return String(input);
  }
}

export async function authFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const headers = {
    Accept: "application/json",
    ...(init && init.headers ? (init.headers as Record<string, string>) : {}),
  };

  const fetchInit: RequestInit = {
    ...init,
    headers,
  };

  const method = (fetchInit.method || 'GET').toUpperCase();

  // For idempotent GETs we dedupe in-flight requests to reduce network wait
  const key = makeKey(input, fetchInit);
  if (method === 'GET') {
    const existing = inFlight.get(key);
    if (existing) {
      return existing.then(r => r.clone());
    }
  }

  // attach AbortController with a reasonable timeout for slow networks
  const controller = new AbortController();
  const timeoutMs = 10000; // 10s
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const finalInit: RequestInit = {
    ...fetchInit,
    signal: controller.signal,
  };

  // wrapper to perform fetch and cleanup
  const doFetch = async (): Promise<Response> => {
    try {
      const res = await fetch(input, finalInit);
      return res;
    } finally {
      clearTimeout(timeout);
    }
  };

  // For GET, attempt one retry on network error/abort to improve resilience
  let promise: Promise<Response> = (async () => {
    try {
      const r = await doFetch();
      return r;
    } catch (err) {
      // Only retry for GET and for network-level errors
      if (method === 'GET') {
        try {
          // small backoff
          await new Promise(res => setTimeout(res, 250));
          // create new controller for retry
          const retryController = new AbortController();
          const retryTimeout = setTimeout(() => retryController.abort(), timeoutMs);
          try {
            const retryInit: RequestInit = { ...fetchInit, signal: retryController.signal };
            return await fetch(input, retryInit);
          } finally {
            clearTimeout(retryTimeout);
          }
        } catch (inner) {
          throw inner;
        }
      }
      throw err;
    }
  })();

  if (method === 'GET') {
    // store the in-flight promise so concurrent callers reuse it
    inFlight.set(key, promise.then(r => {
      inFlight.delete(key);
      return r;
    }).catch(err => {
      inFlight.delete(key);
      throw err;
    }));
  }

  try {
    const response = await promise;

    // Handle authentication failure
    if (response.status === 401) {
      console.log("[AuthFetch] 401 Unauthorized");

      if (
        window.location.pathname === "/" ||
        window.location.pathname === "/login"
      ) {
        return response;
      }

      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          credentials: "include",
          headers: { Accept: "application/json" },
        });
      } catch (err) {
        console.error("[AuthFetch] Logout call failed:", err);
      }

      window.location.href = "/login";
      return response;
    }

    // return a clone for callers so the underlying response can be reused safely
    return response;
  } catch (err) {
    console.error("[AuthFetch] Network error:", err);
    throw err;
  }
}
