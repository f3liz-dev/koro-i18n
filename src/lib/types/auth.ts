/**
 * Authentication types for the I18n Platform
 */

export interface User {
  id: string;
  githubId: number;
  username: string;
  email: string;
  avatarUrl: string;
  accessToken: string; // encrypted
  refreshToken?: string; // encrypted
  lastActive: Date;
  preferences: UserPreferences;
}

export interface UserPreferences {
  language: string;
  theme: 'light' | 'dark' | 'auto';
  autoSave: boolean;
  notifications: boolean;
}

export interface GitHubOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface OAuthState {
  state: string;
  redirectUrl?: string;
  timestamp: number;
}

export interface GitHubUserProfile {
  id: number;
  login: string;
  email: string;
  avatar_url: string;
  name?: string;
}

export interface AuthSession {
  userId: string;
  username: string;
  githubId: number;
  accessToken: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface JWTPayload {
  userId: string;
  username: string;
  githubId: number;
  iat: number;
  exp: number;
}

// Repository and store interfaces (merged from backend types)
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