/**
 * Middleware for the koro-i18n backend
 * 
 * Provides authentication and project context loading
 * with proper typing throughout
 */
import { createMiddleware } from 'hono/factory';
import { getCookie, deleteCookie } from 'hono/cookie';
import { Octokit } from '@octokit/rest';
import { PrismaClient } from '../generated/prisma/';
import { AppEnv, AuthUser, ProjectContext, GitHubContext } from './context';
import { verifyJWT } from './auth';
import { verifyGitHubOIDCToken } from '../oidc';
import { unauthorized, forbidden, notFound, error } from './responses';

// ============================================================================
// Token Extraction
// ============================================================================

/**
 * Extract auth token from cookie or Authorization header
 */
function extractToken(c: any): string | undefined {
  // Try cookie first (web UI)
  const cookieToken = getCookie(c, 'auth_token');
  if (cookieToken) return cookieToken;
  
  // Try Authorization header (API clients)
  const authHeader = c.req.header('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  return undefined;
}

// ============================================================================
// Authentication Middleware
// ============================================================================

/**
 * Create authentication middleware
 * Sets c.var.user with authenticated user info
 */
export function createAuthMiddleware(prisma: PrismaClient) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const token = extractToken(c);
    if (!token) {
      return unauthorized(c);
    }
    
    const secret = c.env.JWT_SECRET;
    let payload = await verifyJWT(token, secret);
    
    // Try OIDC if JWT failed
    if (!payload) {
      try {
        const platformUrl = c.env.PLATFORM_URL || 'https://koro.f3liz.workers.dev';
        const oidc = await verifyGitHubOIDCToken(token, platformUrl);
        payload = {
          userId: 'oidc-user',
          username: oidc.actor,
          githubId: 0,
          repository: oidc.repository,
          actor: oidc.actor,
          workflow: oidc.workflow,
        };
      } catch {
        // OIDC also failed
      }
    }
    
    if (!payload) {
      deleteCookie(c as any, 'auth_token');
      return c.json({ error: 'Invalid token' }, 401);
    }
    
    c.set('user', payload as AuthUser);
    await next();
  });
}

// ============================================================================
// Project Middleware
// ============================================================================

export interface ProjectMiddlewareOptions {
  /** Require user to have access to the project (default: true) */
  requireAccess?: boolean;
  /** Load GitHub Octokit client (default: false) */
  withOctokit?: boolean;
}

/**
 * Create project context middleware
 * Loads project and optionally validates access and creates Octokit client
 */
export function createProjectMiddleware(
  prisma: PrismaClient,
  options: ProjectMiddlewareOptions = {}
) {
  const { requireAccess = true, withOctokit = false } = options;
  
  return createMiddleware<AppEnv>(async (c, next) => {
    const projectName = c.req.param('projectName');
    if (!projectName) {
      return error(c, 'Project name is required');
    }
    
    // Load project
    const project = await prisma.project.findUnique({
      where: { name: projectName },
      select: { 
        id: true, 
        userId: true, 
        repository: true, 
        sourceLanguage: true, 
        name: true 
      },
    });
    
    if (!project) {
      return notFound(c, 'Project not found');
    }
    
    // Parse repository into owner/repo
    const parts = project.repository.trim().split('/');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      return error(c, 'Invalid repository format. Expected owner/repo');
    }
    const [owner, repo] = parts;
    
    // Check access if required
    if (requireAccess) {
      const user = c.get('user');
      if (!user) {
        return unauthorized(c);
      }
      
      let hasAccess = false;
      
      // OIDC auth: check repository matches
      if (user.userId === 'oidc-user' && user.repository) {
        hasAccess = user.repository === project.repository;
      } else if (user.userId) {
        // JWT auth: check ownership or membership
        if (project.userId === user.userId) {
          hasAccess = true;
        } else {
          // Check project membership
          const member = await prisma.projectMember.findUnique({
            where: {
              projectId_userId: {
                projectId: project.id,
                userId: user.userId,
              },
            },
          });
          hasAccess = member?.status === 'approved';
        }
      }
      
      if (!hasAccess) {
        return forbidden(c);
      }
    }
    
    // Set project context
    c.set('project', {
      id: project.id,
      name: project.name,
      userId: project.userId,
      repository: project.repository,
      sourceLanguage: project.sourceLanguage,
    } as ProjectContext);
    
    // Load Octokit if requested
    if (withOctokit) {
      const user = c.get('user');
      if (!user || user.userId === 'oidc-user') {
        return unauthorized(c, 'GitHub access token required');
      }
      
      // Get user's GitHub token from database
      const dbUser = await prisma.user.findUnique({
        where: { id: user.userId },
        select: { githubAccessToken: true },
      });
      
      if (!dbUser?.githubAccessToken) {
        return unauthorized(c, 'GitHub access token not found. Please re-authenticate with GitHub.');
      }
      
      c.set('github', {
        octokit: new Octokit({ auth: dbUser.githubAccessToken }),
        owner,
        repo,
        token: dbUser.githubAccessToken,
      } as GitHubContext);
    }
    
    await next();
  });
}
