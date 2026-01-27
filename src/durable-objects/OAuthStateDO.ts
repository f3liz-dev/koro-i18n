/**
 * OAuth State Durable Object
 * 
 * Manages transient OAuth state tokens with automatic expiration.
 * Replaces the OauthState table in D1 to avoid polluting the database
 * with temporary data that expires in minutes.
 */

export interface OAuthStateData {
  state: string;
  createdAt: number;
  expiresAt: number;
}

export class OAuthStateDO implements DurableObject {
  private storage: DurableObjectStorage;
  private state: DurableObjectState;

  constructor(state: DurableObjectState, env: unknown) {
    this.state = state;
    this.storage = state.storage;
  }

  /**
   * Store a new OAuth state with expiration
   */
  async create(state: string, expiresInMs: number = 600000): Promise<void> {
    const now = Date.now();
    const data: OAuthStateData = {
      state,
      createdAt: now,
      expiresAt: now + expiresInMs,
    };

    await this.storage.put('data', data);
    
    // Set an alarm to clean up after expiration
    await this.storage.setAlarm(data.expiresAt);
  }

  /**
   * Verify and consume an OAuth state (one-time use)
   */
  async verify(state: string): Promise<boolean> {
    const data = await this.storage.get<OAuthStateData>('data');
    
    if (!data) {
      return false;
    }

    // Check if expired
    if (Date.now() > data.expiresAt) {
      await this.storage.deleteAll();
      return false;
    }

    // Check if state matches
    if (data.state !== state) {
      return false;
    }

    // Consume the state (delete after verification)
    await this.storage.deleteAll();
    await this.storage.deleteAlarm();
    
    return true;
  }

  /**
   * Alarm handler for automatic cleanup
   */
  async alarm(): Promise<void> {
    await this.storage.deleteAll();
  }

  /**
   * HTTP fetch handler for REST-style access
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;

    try {
      if (method === 'POST' && url.pathname === '/create') {
        const body = await request.json() as { state: string; expiresInMs?: number };
        await this.create(body.state, body.expiresInMs);
        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (method === 'POST' && url.pathname === '/verify') {
        const body = await request.json() as { state: string };
        const valid = await this.verify(body.state);
        return new Response(JSON.stringify({ valid }), {
          headers: { 'Content-Type': 'application/json' },
        });
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
