/**
 * Typed context system for Hono middleware
 * 
 * This eliminates the need for (c as any).get() casts by providing
 * a properly typed environment and context variables.
 */
import { Hono, Context } from 'hono';
import { Octokit } from '@octokit/rest';

// ============================================================================
// Environment Types
// ============================================================================

/**
 * Environment bindings available from Cloudflare Workers
 */
export interface Env {
  // Cloudflare bindings
  DB: D1Database;
  ASSETS?: Fetcher;
  
  // Durable Objects
  OAUTH_STATE: DurableObjectNamespace;
  JWKS_CACHE: DurableObjectNamespace;
  GITHUB_RATE_LIMIT: DurableObjectNamespace;
  
  // Secrets
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  JWT_SECRET: string;
  
  // Config
  ENVIRONMENT: string;
  PLATFORM_URL?: string;
  ALLOWED_PROJECT_CREATORS?: string;
}

// ============================================================================
// Context Variables
// ============================================================================

/**
 * User information from authentication
 */
export interface AuthUser {
  userId: string;
  username: string;
  githubId: number;
  accessToken?: string;
  // OIDC-specific fields
  repository?: string;
  actor?: string;
  workflow?: string;
}

/**
 * Project information from project middleware
 */
export interface ProjectContext {
  id: string;
  name: string;
  userId: string;
  repository: string;
  sourceLanguage: string;
}

/**
 * GitHub context when withOctokit is enabled
 */
export interface GitHubContext {
  octokit: Octokit;
  owner: string;
  repo: string;
  token: string;
}

/**
 * All possible context variables
 */
export interface Variables {
  user: AuthUser;
  project: ProjectContext;
  github: GitHubContext;
}

// ============================================================================
// Typed App and Context
// ============================================================================

/**
 * Base app type with environment bindings
 */
export type AppEnv = {
  Bindings: Env;
  Variables: Variables;
};

/**
 * Create a typed Hono app
 */
export function createApp(): Hono<AppEnv> {
  return new Hono<AppEnv>();
}

/**
 * Typed context with all variables
 */
export type AppContext = Context<AppEnv>;

/**
 * Context with authenticated user
 */
export type AuthContext = Context<{
  Bindings: Env;
  Variables: Pick<Variables, 'user'>;
}>;

/**
 * Context with project loaded
 */
export type ProjectAppContext = Context<{
  Bindings: Env;
  Variables: Pick<Variables, 'user' | 'project'>;
}>;

/**
 * Context with GitHub access
 */
export type GitHubAppContext = Context<{
  Bindings: Env;
  Variables: Variables;
}>;

// ============================================================================
// Type Guards and Utilities
// ============================================================================

/**
 * Check if user is authenticated via OIDC
 */
export function isOIDCUser(user: AuthUser): boolean {
  return user.userId === 'oidc-user';
}

/**
 * Check if user has access to a project via OIDC or ownership
 */
export function hasProjectAccess(user: AuthUser, project: ProjectContext): boolean {
  // JWT auth: check userId
  if (user.userId && user.userId !== 'oidc-user') {
    return project.userId === user.userId;
  }
  
  // OIDC auth: check repository matches
  if (user.repository) {
    return project.repository === user.repository;
  }
  
  return false;
}
