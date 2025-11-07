/**
 * In-memory session store implementation for development
 */

import type { AuthSession, SessionStore } from '@/lib/types/User.js';

export class MemorySessionStore implements SessionStore {
  private sessions = new Map<string, AuthSession>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired sessions every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  async create(session: AuthSession): Promise<void> {
    this.sessions.set(session.userId, session);
  }

  async get(userId: string): Promise<AuthSession | null> {
    const session = this.sessions.get(userId);
    
    // Check if session is expired
    if (session && session.expiresAt < new Date()) {
      this.sessions.delete(userId);
      return null;
    }

    return session || null;
  }

  async delete(userId: string): Promise<void> {
    this.sessions.delete(userId);
  }

  async cleanup(): Promise<void> {
    const now = new Date();
    const expiredSessions: string[] = [];

    for (const [userId, session] of this.sessions.entries()) {
      if (session.expiresAt < now) {
        expiredSessions.push(userId);
      }
    }

    for (const userId of expiredSessions) {
      this.sessions.delete(userId);
    }

    if (expiredSessions.length > 0) {
      console.log(`Cleaned up ${expiredSessions.length} expired sessions`);
    }
  }

  // Development helper methods
  getAllSessions(): AuthSession[] {
    return Array.from(this.sessions.values());
  }

  getActiveSessionCount(): number {
    const now = new Date();
    let count = 0;
    
    for (const session of this.sessions.values()) {
      if (session.expiresAt >= now) {
        count++;
      }
    }
    
    return count;
  }

  clear(): void {
    this.sessions.clear();
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}