import { createMiddleware } from 'hono/factory';
import { PrismaClient } from '../generated/prisma/';
import { checkProjectAccess } from './database';
import { getUserGitHubToken } from './github-repo-fetcher';
import { Octokit } from '@octokit/rest';

interface ProjectMiddlewareOptions {
  requireAccess?: boolean;
  withOctokit?: boolean; // whether to attach octokit/githubToken and fail if missing
  requireValidRepo?: boolean; // validates owner/repo format
}

interface Env {
  Variables: { user: any };
  Bindings: { JWT_SECRET?: string; PLATFORM_URL?: string };
}

export function createProjectMiddleware(prisma: PrismaClient, opts: ProjectMiddlewareOptions = {}) {
  const { requireAccess = true, withOctokit = false, requireValidRepo = true } = opts;

  return createMiddleware<Env>(async (c, next) => {
    const projectName = c.req.param('projectName');
    if (!projectName) return c.json({ error: 'Project name is required' }, 400);

    const project = await prisma.project.findUnique({
      where: { name: projectName },
      select: { id: true, userId: true, repository: true, sourceLanguage: true, name: true },
    });

    if (!project) return c.json({ error: 'Project not found' }, 404);

    (c as any).set('project', project);

    // Parse repository into owner/repo if possible
    if (project.repository) {
      try {
        const parts = project.repository.trim().split('/');
        if (parts.length === 2) {
          const [owner, repo] = parts;
          (c as any).set('owner', owner);
          (c as any).set('repo', repo);
        } else if (requireValidRepo) {
          return c.json({ error: 'Invalid repository format. Expected owner/repo' }, 400);
        }
      } catch {
        if (requireValidRepo) return c.json({ error: 'Invalid repository format' }, 400);
      }
    } else if (requireValidRepo) {
      return c.json({ error: 'Project repository not configured' }, 400);
    }

    // Access check: supports JWT (userId) and OIDC (repository on token)
    if (requireAccess) {
      const user = (c as any).get('user');
      if (!user) return c.json({ error: 'Unauthorized' }, 401);

      let hasAccess = false;
      // OIDC token may set user.repository
      if (user.userId && user.userId !== 'oidc-user') {
        hasAccess = await checkProjectAccess(prisma, project.id, user.userId);
      } else if (user.repository) {
        hasAccess = user.repository === project.repository;
      }

      if (!hasAccess) return c.json({ error: 'Forbidden' }, 403);
    }

    // Attach Octokit if requested
    if (withOctokit) {
      const user = (c as any).get('user');
      if (!user) return c.json({ error: 'Unauthorized' }, 401);
      const token = await getUserGitHubToken(prisma, user.userId);
      if (!token) {
        return c.json({ error: 'GitHub access token not found. Please re-authenticate with GitHub.' }, 401);
      }
      (c as any).set('githubToken', token);
      (c as any).set('octokit', new Octokit({ auth: token }));
    }

    await next();
  });
}
