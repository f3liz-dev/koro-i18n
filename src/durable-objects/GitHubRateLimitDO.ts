/**
 * GitHub Rate Limit Durable Object
 * 
 * Coordinates GitHub API rate limiting across all workers.
 * Tracks API quota usage per user and prevents hitting rate limits.
 */

interface RateLimitState {
  remaining: number;
  limit: number;
  reset: number; // Unix timestamp when limit resets
  lastUpdated: number;
}

interface RequestQueueItem {
  id: string;
  timestamp: number;
  resolve: () => void;
  reject: (error: Error) => void;
}

export class GitHubRateLimitDO implements DurableObject {
  private storage: DurableObjectStorage;
  private state: DurableObjectState;
  private rateLimitState: RateLimitState | null = null;
  private queue: RequestQueueItem[] = [];
  private processingQueue = false;

  constructor(state: DurableObjectState, env: unknown) {
    this.state = state;
    this.storage = state.storage;
    this.initializeState();
  }

  private async initializeState(): Promise<void> {
    this.rateLimitState = await this.storage.get<RateLimitState>('rateLimit');
  }

  /**
   * Update rate limit state from GitHub API response headers
   */
  async updateFromHeaders(headers: Headers): Promise<void> {
    const remaining = headers.get('x-ratelimit-remaining');
    const limit = headers.get('x-ratelimit-limit');
    const reset = headers.get('x-ratelimit-reset');

    if (remaining && limit && reset) {
      this.rateLimitState = {
        remaining: parseInt(remaining, 10),
        limit: parseInt(limit, 10),
        reset: parseInt(reset, 10) * 1000, // Convert to milliseconds
        lastUpdated: Date.now(),
      };

      await this.storage.put('rateLimit', this.rateLimitState);

      // Set alarm to reset rate limit tracking
      await this.storage.setAlarm(this.rateLimitState.reset);
    }
  }

  /**
   * Check if a request can proceed without hitting rate limits
   */
  async canProceed(): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    if (!this.rateLimitState) {
      return { allowed: true, remaining: -1, resetAt: -1 };
    }

    const now = Date.now();

    // If reset time has passed, allow the request
    if (now >= this.rateLimitState.reset) {
      this.rateLimitState = null;
      await this.storage.delete('rateLimit');
      return { allowed: true, remaining: -1, resetAt: -1 };
    }

    // Check if we have remaining quota
    const allowed = this.rateLimitState.remaining > 10; // Keep 10 requests as buffer

    return {
      allowed,
      remaining: this.rateLimitState.remaining,
      resetAt: this.rateLimitState.reset,
    };
  }

  /**
   * Acquire permission to make a GitHub API request
   * Returns when it's safe to proceed
   */
  async acquire(): Promise<void> {
    const status = await this.canProceed();

    if (status.allowed) {
      return;
    }

    // Wait until reset time
    const waitTime = status.resetAt - Date.now();
    if (waitTime > 0 && waitTime < 60000) { // Max 1 minute wait
      await new Promise(resolve => setTimeout(resolve, waitTime));
    } else {
      throw new Error(`Rate limit exceeded. Resets at ${new Date(status.resetAt).toISOString()}`);
    }
  }

  /**
   * Get current rate limit status
   */
  async getStatus(): Promise<RateLimitState | null> {
    if (!this.rateLimitState) {
      return null;
    }

    // Check if expired
    if (Date.now() >= this.rateLimitState.reset) {
      this.rateLimitState = null;
      await this.storage.delete('rateLimit');
      return null;
    }

    return this.rateLimitState;
  }

  /**
   * Alarm handler to reset rate limit tracking
   */
  async alarm(): Promise<void> {
    this.rateLimitState = null;
    await this.storage.delete('rateLimit');
  }

  /**
   * HTTP fetch handler for REST-style access
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;

    try {
      if (method === 'POST' && url.pathname === '/update') {
        const body = await request.json() as { headers: Record<string, string> };
        const headers = new Headers(body.headers);
        await this.updateFromHeaders(headers);
        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (method === 'GET' && url.pathname === '/status') {
        const status = await this.getStatus();
        return new Response(JSON.stringify({ status }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (method === 'POST' && url.pathname === '/acquire') {
        try {
          await this.acquire();
          return new Response(JSON.stringify({ allowed: true }), {
            headers: { 'Content-Type': 'application/json' },
          });
        } catch (error) {
          return new Response(JSON.stringify({ 
            allowed: false,
            error: error instanceof Error ? error.message : 'Rate limit exceeded'
          }), {
            status: 429,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }

      return new Response('Not Found', { status: 404 });
    } catch (error) {
      return new Response(JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal error' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }
}
