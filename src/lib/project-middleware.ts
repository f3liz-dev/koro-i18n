import { createMiddleware } from 'hono/factory';
import { PrismaClient } from '../generated/prisma/';
import { findProjectWithAccessCheck } from './database';
import { getUserGitHubToken } from './github-repo-fetcher';
import { Octokit } from '@octokit/rest';
import type { AppEnv } from './context';

export interface ProjectMiddlewareOptions {
  requireAccess?: boolean;
  withOctokit?: boolean; // whether to attach octokit/githubToken and fail if missing
  requireValidRepo?: boolean; // validates owner/repo format
}

export function createProjectMiddleware(prisma: PrismaClient, opts: ProjectMiddlewareOptions = {}) {
  const { requireAccess = true, withOctokit = false, requireValidRepo = true } = opts;

  return createMiddleware<AppEnv>(async (c, next) => {
    const projectName = c.req.param('projectName');
    if (!projectName) return c.json({ error: 'Project name is required' }, 400);

    const user = c.get('user');
    
    // Optimize: fetch project and check access in a single query when possible
    // For OIDC users, we still need to do repository comparison separately
    const isOidcUser = user && user.userId === 'oidc-user';
    
    if (requireAccess && user && !isOidcUser) {
      // Single query: fetch project + check access
      const projectWithAccess = await findProjectWithAccessCheck(prisma, projectName, user.userId);
      
      if (!projectWithAccess) return c.json({ error: 'Project not found' }, 404);
      if (!projectWithAccess.hasAccess) return c.json({ error: 'Forbidden' }, 403);
      
      const project = {
        id: projectWithAccess.id,
        userId: projectWithAccess.userId,
        name: projectWithAccess.name,
        repository: projectWithAccess.repository,
        sourceLanguage: projectWithAccess.sourceLanguage,
      };
      
      c.set('project', project as any);
      
      // Parse repository into owner/repo if possible
      let owner = '';
      let repo = '';
      if (project.repository) {
        try {
          const parts = project.repository.trim().split('/');
          if (parts.length === 2 && parts[0] && parts[1]) {
            owner = parts[0];
            repo = parts[1];
          } else if (requireValidRepo) {
            return c.json({ error: 'Invalid repository format. Expected owner/repo' }, 400);
          }
        } catch {
          if (requireValidRepo) return c.json({ error: 'Invalid repository format' }, 400);
        }
      } else if (requireValidRepo) {
        return c.json({ error: 'Project repository not configured' }, 400);
      }
      
      // Attach Octokit if requested
      if (withOctokit) {
        const token = await getUserGitHubToken(prisma, user.userId);
        if (!token) {
          return c.json({ error: 'GitHub access token not found. Please re-authenticate with GitHub.' }, 401);
        }
        c.set('github', {
          octokit: new Octokit({ auth: token }),
          owner,
          repo,
          token,
        } as any);
      }
      
      await next();
      return;
    }

    // Fallback path for OIDC users or when access check is not required
    const project = await prisma.project.findUnique({
      where: { name: projectName },
      select: { id: true, userId: true, repository: true, sourceLanguage: true, name: true },
    });

    if (!project) return c.json({ error: 'Project not found' }, 404);

    c.set('project', project as any);

    // Parse repository into owner/repo if possible
    let owner = '';
    let repo = '';
    if (project.repository) {
      try {
        const parts = project.repository.trim().split('/');
        if (parts.length === 2 && parts[0] && parts[1]) {
          owner = parts[0];
          repo = parts[1];
        } else if (requireValidRepo) {
          return c.json({ error: 'Invalid repository format. Expected owner/repo' }, 400);
        }
      } catch {
        if (requireValidRepo) return c.json({ error: 'Invalid repository format' }, 400);
      }
    } else if (requireValidRepo) {
      return c.json({ error: 'Project repository not configured' }, 400);
    }

    // Access check: OIDC users check repository match
    if (requireAccess) {
      if (!user) return c.json({ error: 'Unauthorized' }, 401);

      // OIDC token may set user.repository
      if (isOidcUser && user.repository) {
        if (user.repository !== project.repository) {
          return c.json({ error: 'Forbidden' }, 403);
        }
      } else if (isOidcUser) {
        return c.json({ error: 'Forbidden' }, 403);
      }
    }

    // Attach Octokit if requested
    if (withOctokit) {
      if (!user) return c.json({ error: 'Unauthorized' }, 401);
      const token = await getUserGitHubToken(prisma, user.userId);
      if (!token) {
        return c.json({ error: 'GitHub access token not found. Please re-authenticate with GitHub.' }, 401);
      }
      c.set('github', {
        octokit: new Octokit({ auth: token }),
        owner,
        repo,
        token,
      } as any);
    }

    await next();
  });
}
