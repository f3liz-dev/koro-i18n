import { Hono } from 'hono';
import * as t from 'io-ts';
import { PrismaClient } from '../generated/prisma/';
import { authMiddleware } from '../lib/auth';
import { createProjectMiddleware } from '../lib/project-middleware';
import { validate } from '../lib/validator';
import { getTranslationsDiff, exportApprovedTranslations, markTranslationsAsCommitted } from '../lib/github-pr-service';

interface Env {
  JWT_SECRET: string;
  ENVIRONMENT: string;
  PLATFORM_URL?: string;
  Variables: {
    user: any;
  };
}

const MarkCommittedSchema = t.type({
  translationIds: t.array(t.string),
});

/**
 * Check if user has access to the project
 * Supports both JWT (userId check) and OIDC (repository check)
 */
function hasProjectAccess(user: any, project: { userId: string; repository: string }): boolean {
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

export function createApplyRoutes(prisma: PrismaClient, env: Env) {
  const app = new Hono<{ Bindings: Env }>();
  // Provide project context; access checks are handled per-route
  app.use('*', authMiddleware, createProjectMiddleware(prisma, { requireAccess: false, withOctokit: false }));

  /**
   * Preview the translations that would be applied
   * GET /api/projects/:projectName/apply/preview
   * 
   * Returns a summary of approved translations grouped by language and file.
   * 
   * Authentication:
   * - JWT: Project owner only
   * - OIDC: Repository must match project's repository
   */
  app.get('/preview', async (c) => {
    const user = (c as any).get('user');
    const project = (c as any).get('project');
    if (!project) return c.json({ error: 'Project not found' }, 404);

    // Check access - owner or matching repository (OIDC)
    if (!hasProjectAccess(user, project)) {
      return c.json({ error: 'Access denied. Use project owner credentials or OIDC from matching repository.' }, 403);
    }

    const diff = await getTranslationsDiff(prisma, project.id);

    return c.json({
      success: true,
      preview: diff,
    });
  });

  /**
   * Export approved translations for the GitHub Action to create a PR
   * GET /api/projects/:projectName/apply/export
   * 
   * This endpoint returns the full translation data that the client repository's
   * GitHub Action will use to create the PR. The API doesn't create the PR directly
   * because the OAuth token doesn't have write permissions to user repositories.
   * 
   * Authentication:
   * - JWT: Project owner only
   * - OIDC: Repository must match project's repository (recommended for GitHub Actions)
   * 
   * Response:
   * - projectId: string
   * - projectName: string
   * - repository: string
   * - exportedAt: string (ISO date)
   * - translations: array of {id, language, filename, key, value}
   * - summary: {total, byLanguage, byFile}
   */
  app.get('/export', async (c) => {
    const user = (c as any).get('user');
    const project = (c as any).get('project');
    if (!project) return c.json({ error: 'Project not found' }, 404);

    // Check access - owner or matching repository (OIDC)
    if (!hasProjectAccess(user, project)) {
      return c.json({ error: 'Access denied. Use project owner credentials or OIDC from matching repository.' }, 403);
    }

    const exportData = await exportApprovedTranslations(prisma, project.id);

    if (!exportData) {
      return c.json({ error: 'Failed to export translations' }, 500);
    }

    if (exportData.translations.length === 0) {
      return c.json({ 
        success: false, 
        error: 'No approved translations to export' 
      }, 400);
    }

    return c.json({
      success: true,
      ...exportData,
    });
  });

  /**
   * Mark translations as committed after the GitHub Action has applied them
   * POST /api/projects/:projectName/apply/committed
   * 
   * This endpoint should be called by the client repository's GitHub Action
   * after it has successfully created the PR with the translations.
   * 
   * Authentication:
   * - JWT: Project owner only
   * - OIDC: Repository must match project's repository (recommended for GitHub Actions)
   * 
   * Request body:
   * - translationIds: string[] - IDs of translations that were applied
   * 
   * Response:
   * - success: boolean
   * - count: number - Number of translations marked as committed
   */
  app.post('/committed', validate('json', MarkCommittedSchema), async (c) => {
    const user = (c as any).get('user');
    const { translationIds } = c.req.valid('json' as never) as t.TypeOf<typeof MarkCommittedSchema>;
    const project = (c as any).get('project');
    if (!project) return c.json({ error: 'Project not found' }, 404);

    // Check access - owner or matching repository (OIDC)
    if (!hasProjectAccess(user, project)) {
      return c.json({ error: 'Access denied. Use project owner credentials or OIDC from matching repository.' }, 403);
    }

    // For OIDC, use the actor as the userId for history logging
    const effectiveUserId = user.userId !== 'oidc-user' ? user.userId : `oidc:${user.actor || 'unknown'}`;

    const result = await markTranslationsAsCommitted(
      prisma,
      project.id,
      translationIds,
      effectiveUserId
    );

    if (!result.success) {
      return c.json({ 
        success: false, 
        error: 'No matching approved translations found' 
      }, 400);
    }

    return c.json({
      success: true,
      count: result.count,
    });
  });

  return app;
}
