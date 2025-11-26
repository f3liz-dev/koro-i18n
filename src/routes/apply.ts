import { Hono } from 'hono';
import * as t from 'io-ts';
import { PrismaClient } from '../generated/prisma/';
import { authMiddleware } from '../lib/auth';
import { validate } from '../lib/validator';
import { applyTranslationsAndCreatePR, getTranslationsDiff } from '../lib/github-pr-service';

interface Env {
  JWT_SECRET: string;
  ENVIRONMENT: string;
  Variables: {
    user: any;
  };
}

const ApplyTranslationsSchema = t.partial({
  branch: t.string,
});

export function createApplyRoutes(prisma: PrismaClient, env: Env) {
  const app = new Hono<{ Bindings: Env }>();

  /**
   * Preview the translations that would be applied
   * GET /api/projects/:projectName/apply/preview
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

    // Check access - only owner can apply translations
    if (project.userId !== user.userId) {
      return c.json({ error: 'Only project owner can apply translations' }, 403);
    }

    const diff = await getTranslationsDiff(prisma, project.id);

    return c.json({
      success: true,
      preview: diff,
    });
  });

  /**
   * Apply approved translations and create a Pull Request
   * POST /api/projects/:projectName/apply
   * 
   * Request body:
   * - branch: string (optional, default: 'main')
   * 
   * Response:
   * - success: boolean
   * - pullRequestUrl: string
   * - pullRequestNumber: number
   * - branch: string
   * - filesUpdated: number
   * - translationsApplied: number
   */
  app.post('/', authMiddleware, validate('json', ApplyTranslationsSchema), async (c) => {
    const user = c.get('user');
    const projectName = c.req.param('projectName');
    const body = c.req.valid('json');
    const branch = body.branch || 'main';

    const project = await prisma.project.findUnique({
      where: { name: projectName },
      select: { id: true, userId: true, repository: true },
    });

    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }

    // Check access - only owner can apply translations
    if (project.userId !== user.userId) {
      return c.json({ error: 'Only project owner can apply translations' }, 403);
    }

    try {
      const result = await applyTranslationsAndCreatePR(
        prisma,
        user.userId,
        project.id,
        branch
      );

      if (!result.success) {
        return c.json({
          success: false,
          error: result.error,
          branch: result.branch,
          filesUpdated: result.filesUpdated,
          translationsApplied: result.translationsApplied,
        }, 400);
      }

      return c.json({
        success: true,
        pullRequestUrl: result.pullRequestUrl,
        pullRequestNumber: result.pullRequestNumber,
        branch: result.branch,
        filesUpdated: result.filesUpdated,
        translationsApplied: result.translationsApplied,
      });
    } catch (error) {
      console.error('Error applying translations:', error);
      return c.json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }, 500);
    }
  });

  return app;
}
