/**
 * Cloudflare Workers KV-based user repository
 * Implements serverless-friendly user storage compatible with Workers runtime
 */

import type { UserRepository, User } from '@/lib/types/User.js';

export class CloudflareUserRepository implements UserRepository {
  constructor(private kv: KVNamespace) {}

  async findById(id: string): Promise<User | null> {
    const userData = await this.kv.get(`user:${id}`);
    if (!userData) {
      return null;
    }

    const user: User = JSON.parse(userData);
    // Convert date strings back to Date objects
    user.lastActive = new Date(user.lastActive);
    
    return user;
  }

  async findByGithubId(githubId: number): Promise<User | null> {
    const userId = await this.kv.get(`github_user:${githubId}`);
    if (!userId) {
      return null;
    }

    return this.findById(userId);
  }

  async create(userData: Omit<User, 'id' | 'lastActive'>): Promise<User> {
    const user: User = {
      ...userData,
      id: crypto.randomUUID(),
      lastActive: new Date()
    };

    // Store user by ID
    await this.kv.put(`user:${user.id}`, JSON.stringify(user));
    
    // Store GitHub ID -> User ID mapping for lookup
    await this.kv.put(`github_user:${userData.githubId}`, user.id);

    return user;
  }

  async update(id: string, updates: Partial<User>): Promise<User> {
    const existingUser = await this.findById(id);
    if (!existingUser) {
      throw new Error(`User with id ${id} not found`);
    }

    const updatedUser: User = {
      ...existingUser,
      ...updates,
      id: existingUser.id, // Ensure ID cannot be changed
      lastActive: new Date()
    };

    await this.kv.put(`user:${id}`, JSON.stringify(updatedUser));

    // Update GitHub ID index if changed
    if (updates.githubId && updates.githubId !== existingUser.githubId) {
      await this.kv.delete(`github_user:${existingUser.githubId}`);
      await this.kv.put(`github_user:${updates.githubId}`, id);
    }

    return updatedUser;
  }

  async updateLastActive(id: string): Promise<void> {
    const user = await this.findById(id);
    if (user) {
      user.lastActive = new Date();
      await this.kv.put(`user:${id}`, JSON.stringify(user));
    }
  }
}