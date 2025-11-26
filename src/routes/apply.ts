import { Hono } from 'hono';
import * as t from 'io-ts';
import { PrismaClient } from '../generated/prisma/';
import { authMiddleware } from '../lib/auth';
import { validate } from '../lib/validator';
import { getTranslationsDiff, exportApprovedTranslations, markTranslationsAsCommitted } from '../lib/github-pr-service';

interface Env {
  JWT_SECRET: string;
  ENVIRONMENT: string;
  Variables: {
    user: any;
  };
}

const MarkCommittedSchema = t.type({
  translationIds: t.array(t.string),
});

export function createApplyRoutes(prisma: PrismaClient, env: Env) {
  const app = new Hono<{ Bindings: Env }>();

  /**
   * Preview the translations that would be applied
   * GET /api/projects/:projectName/apply/preview
   * 
   * Returns a summary of approved translations grouped by language and file.
   */
  app.get('/preview', authMiddleware, async (c) => {
    const user = c.get('user');
    const projectName = c.req.param('projectName');

    const project = await prisma.project.findUnique({
      where: { name: projectName },
      select: { id: true, userId: true },
    });

    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }

    // Check access - only owner can view export preview
    if (project.userId !== user.userId) {
      return c.json({ error: 'Only project owner can view translation export' }, 403);
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
   * Response:
   * - projectId: string
   * - projectName: string
   * - repository: string
   * - exportedAt: string (ISO date)
   * - translations: array of {id, language, filename, key, value}
   * - summary: {total, byLanguage, byFile}
   */
  app.get('/export', authMiddleware, async (c) => {
    const user = c.get('user');
    const projectName = c.req.param('projectName');

    const project = await prisma.project.findUnique({
      where: { name: projectName },
      select: { id: true, userId: true },
    });

    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }

    // Check access - only owner can export translations
    if (project.userId !== user.userId) {
      return c.json({ error: 'Only project owner can export translations' }, 403);
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
   * Request body:
   * - translationIds: string[] - IDs of translations that were applied
   * 
   * Response:
   * - success: boolean
   * - count: number - Number of translations marked as committed
   */
  app.post('/committed', authMiddleware, validate('json', MarkCommittedSchema), async (c) => {
    const user = c.get('user');
    const projectName = c.req.param('projectName');
    const { translationIds } = c.req.valid('json');

    const project = await prisma.project.findUnique({
      where: { name: projectName },
      select: { id: true, userId: true },
    });

    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }

    // Check access - only owner can mark translations as committed
    if (project.userId !== user.userId) {
      return c.json({ error: 'Only project owner can mark translations as committed' }, 403);
    }

    const result = await markTranslationsAsCommitted(
      prisma,
      project.id,
      translationIds,
      user.userId
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
