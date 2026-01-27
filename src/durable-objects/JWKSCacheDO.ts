/**
 * JWKS Cache Durable Object
 * 
 * Singleton cache for GitHub's JSON Web Key Set (JWKS).
 * Reduces redundant fetches across multiple worker instances.
 */

import type { JWK } from 'jose';

interface JWKSCacheData {
  keys: JWK[];
  timestamp: number;
  expiresAt: number;
}

export class JWKSCacheDO implements DurableObject {
  private storage: DurableObjectStorage;
  private state: DurableObjectState;
  private cache: JWKSCacheData | null = null;
  private readonly CACHE_TTL = 3600000; // 1 hour in milliseconds
  private readonly GITHUB_JWKS_URL = 'https://token.actions.githubusercontent.com/.well-known/jwks';

  constructor(state: DurableObjectState, env: unknown) {
    this.state = state;
    this.storage = state.storage;
    this.initializeCache();
  }

  private async initializeCache(): Promise<void> {
    this.cache = await this.storage.get<JWKSCacheData>('jwks');
  }

  /**
   * Get JWKS, fetching from GitHub if cache is expired
   */
  async getKeys(): Promise<JWK[]> {
    const now = Date.now();

    // Return cached keys if still valid
    if (this.cache && now < this.cache.expiresAt) {
      return this.cache.keys;
    }

    // Fetch fresh keys from GitHub
    try {
      const response = await fetch(this.GITHUB_JWKS_URL);
      if (!response.ok) {
        throw new Error(`Failed to fetch JWKS: ${response.statusText}`);
      }

      const jwks = await response.json() as { keys: JWK[] };
      
      // Update cache
      this.cache = {
        keys: jwks.keys,
        timestamp: now,
        expiresAt: now + this.CACHE_TTL,
      };

      await this.storage.put('jwks', this.cache);
      
      // Set alarm for cache expiration
      await this.storage.setAlarm(this.cache.expiresAt);

      return jwks.keys;
    } catch (error) {
      // If fetch fails but we have stale cache, return it
      if (this.cache) {
        console.warn('Using stale JWKS cache due to fetch error:', error);
        return this.cache.keys;
      }
      throw error;
    }
  }

  /**
   * Find a specific key by kid (Key ID) and alg (Algorithm)
   */
  async findKey(kid: string | undefined, alg: string): Promise<JWK | null> {
    const keys = await this.getKeys();

    const key = keys.find(k => {
      if (kid && k.kid !== kid) return false;
      if (k.alg && k.alg !== alg) return false;
      return true;
    });

    return key || null;
  }

  /**
   * Manually invalidate the cache (useful for testing or forced refresh)
   */
  async invalidate(): Promise<void> {
    this.cache = null;
    await this.storage.delete('jwks');
    await this.storage.deleteAlarm();
  }

  /**
   * Get cache metadata (for debugging)
   */
  async getMetadata(): Promise<{ 
    cached: boolean; 
    timestamp?: number; 
    expiresAt?: number; 
    ttl?: number;
  }> {
    if (!this.cache) {
      return { cached: false };
    }

    const now = Date.now();
    return {
      cached: true,
      timestamp: this.cache.timestamp,
      expiresAt: this.cache.expiresAt,
      ttl: Math.max(0, this.cache.expiresAt - now),
    };
  }

  /**
   * Alarm handler for automatic cache cleanup
   */
  async alarm(): Promise<void> {
    // Just mark cache as needing refresh, don't delete
    // This way we keep stale cache as fallback
    if (this.cache) {
      this.cache.expiresAt = Date.now() - 1; // Mark as expired
      await this.storage.put('jwks', this.cache);
    }
  }

  /**
   * HTTP fetch handler for REST-style access
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;

    try {
      if (method === 'GET' && url.pathname === '/keys') {
        const keys = await this.getKeys();
        return new Response(JSON.stringify({ keys }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (method === 'POST' && url.pathname === '/find') {
        const body = await request.json() as { kid?: string; alg: string };
        const key = await this.findKey(body.kid, body.alg);
        
        if (!key) {
          return new Response(JSON.stringify({ 
            error: `No matching key found for kid: ${body.kid}, alg: ${body.alg}` 
          }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ key }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (method === 'POST' && url.pathname === '/invalidate') {
        await this.invalidate();
        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (method === 'GET' && url.pathname === '/metadata') {
        const metadata = await this.getMetadata();
        return new Response(JSON.stringify(metadata), {
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
