/**
 * In-memory user repository implementation for development
 */

import crypto from 'crypto';
import type { User, UserRepository } from '@/lib/types/User.js';

export class MemoryUserRepository implements UserRepository {
  private users = new Map<string, User>();
  private githubIdIndex = new Map<number, string>();

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async findByGithubId(githubId: number): Promise<User | null> {
    const userId = this.githubIdIndex.get(githubId);
    if (!userId) return null;
    return this.users.get(userId) || null;
  }

  async create(userData: Omit<User, 'id' | 'lastActive'>): Promise<User> {
    const id = crypto.randomUUID();
    const user: User = {
      ...userData,
      id,
      lastActive: new Date()
    };

    this.users.set(id, user);
    this.githubIdIndex.set(userData.githubId, id);

    return user;
  }

  async update(id: string, updates: Partial<User>): Promise<User> {
    const existingUser = this.users.get(id);
    if (!existingUser) {
      throw new Error(`User with id ${id} not found`);
    }

    const updatedUser: User = {
      ...existingUser,
      ...updates,
      id, // Ensure id cannot be changed
      lastActive: new Date()
    };

    this.users.set(id, updatedUser);

    // Update GitHub ID index if changed
    if (updates.githubId && updates.githubId !== existingUser.githubId) {
      this.githubIdIndex.delete(existingUser.githubId);
      this.githubIdIndex.set(updates.githubId, id);
    }

    return updatedUser;
  }

  async updateLastActive(id: string): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      user.lastActive = new Date();
      this.users.set(id, user);
    }
  }

  // Development helper methods
  getAllUsers(): User[] {
    return Array.from(this.users.values());
  }

  clear(): void {
    this.users.clear();
    this.githubIdIndex.clear();
  }
}