/**
 * Cloudflare Workers KV-based session store
 * Implements serverless-friendly session management compatible with Workers runtime
 */

import type { SessionStore, AuthSession } from '../../backend/types/User';

export class CloudflareSessionStore implements SessionStore {
  constructor(private kv: KVNamespace) {}

  async create(session: AuthSession): Promise<void> {
    // Store session in KV with TTL
    const ttlSeconds = Math.floor((session.expiresAt.getTime() - Date.now()) / 1000);
    await this.kv.put(
      `session:${session.userId}`,
      JSON.stringify(session),
      { expirationTtl: ttlSeconds }
    );
  }

  async get(userId: string): Promise<AuthSession | null> {
    const sessionData = await this.kv.get(`session:${userId}`);
    if (!sessionData) {
      return null;
    }

    const session: AuthSession = JSON.parse(sessionData);
    
    // Convert date strings back to Date objects
    session.expiresAt = new Date(session.expiresAt);
    session.createdAt = new Date(session.createdAt);
    
    // Check if session is expired
    if (session.expiresAt < new Date()) {
      await this.delete(userId);
      return null;
    }

    return session;
  }

  async delete(userId: string): Promise<void> {
    await this.kv.delete(`session:${userId}`);
  }

  async cleanup(): Promise<void> {
    // KV automatically handles TTL cleanup, no manual cleanup needed
    // This method is kept for interface compatibility
  }
}