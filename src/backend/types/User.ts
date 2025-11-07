/**
 * User-related types for backend
 */

export * from '../../shared/types/auth.js';
import type { User, AuthSession } from '../../shared/types/auth.js';

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByGithubId(githubId: number): Promise<User | null>;
  create(userData: Omit<User, 'id' | 'lastActive'>): Promise<User>;
  update(id: string, updates: Partial<User>): Promise<User>;
  updateLastActive(id: string): Promise<void>;
}

export interface SessionStore {
  create(session: AuthSession): Promise<void>;
  get(userId: string): Promise<AuthSession | null>;
  delete(userId: string): Promise<void>;
  cleanup(): Promise<void>; // Remove expired sessions
}