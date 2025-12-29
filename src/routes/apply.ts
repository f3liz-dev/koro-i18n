/**
 * Apply routes
 * 
 * Handles exporting approved translations for GitHub Actions to create PRs
 * 
 * Server Role Clarification:
 * The koro-i18n server acts as a DIFF MANAGEMENT system:
 * - GitHub repository: Holds actual translation files (source of truth)
 * - Koro-i18n database: Holds user-submitted DIFFS (suggestions pending commit)
 * - This endpoint exports approved diffs for GitHub Actions to apply to the repository
 */
import { Hono } from 'hono';
import { PrismaClient } from '../generated/prisma/';
import { authMiddleware } from '../lib/auth';
import { createProjectMiddleware } from '../lib/project-middleware';
import { getTranslationsDiff, exportApprovedTranslations, markTranslationsAsCommitted } from '../lib/github-pr-service';
import type { Env, AppEnv, AuthUser, ProjectContext } from '../lib/context';
import { hasProjectAccess } from '../lib/context';
import { MarkCommittedSchema, validateJson } from '../lib/schemas';

// ============================================================================
// Helper Types
// ============================================================================

interface ApplyContext {
  user: AuthUser;
  project: ProjectContext;
}

function getContext(c: any): ApplyContext {
  return {
    user: c.get('user') as AuthUser,
    project: c.get('project') as ProjectContext,
  };
}

// ============================================================================
// Route Factory
// ============================================================================

export function createApplyRoutes(prisma: PrismaClient, _env: Env) {
  const app = new Hono<AppEnv>();
  
  // Project context without access check (handled per-route for OIDC support)
  app.use('*', authMiddleware, createProjectMiddleware(prisma, { 
    requireAccess: false, 
    withOctokit: false 
  }));

  // ============================================================================
  // Preview
  // ============================================================================

  /**
   * Preview translations that would be applied
   * Returns summary of approved translations grouped by language and file
   */
  app.get('/preview', async (c) => {
    const { user, project } = getContext(c);

    if (!hasProjectAccess(user, project)) {
      return c.json({ 
        error: 'Access denied. Use project owner credentials or OIDC from matching repository.' 
      }, 403);
    }

    const diff = await getTranslationsDiff(prisma, project.id);

    return c.json({ success: true, preview: diff });
  });

  // ============================================================================
  // Export
  // ============================================================================

  /**
   * Export approved translations for GitHub Action to create PR
   * The API doesn't create the PR directly (OAuth token lacks write permissions)
   */
  app.get('/export', async (c) => {
    const { user, project } = getContext(c);

    if (!hasProjectAccess(user, project)) {
      return c.json({ 
        error: 'Access denied. Use project owner credentials or OIDC from matching repository.' 
      }, 403);
    }

    const exportData = await exportApprovedTranslations(prisma, project.id);

    if (!exportData) {
      return c.json({ error: 'Failed to export translations' }, 500);
    }

    if (exportData.translations.length === 0) {
      return c.json({ success: false, error: 'No approved translations to export' }, 400);
    }

    return c.json({ success: true, ...exportData });
  });

  // ============================================================================
  // Mark Committed
  // ============================================================================

  /**
   * Mark translations as committed after GitHub Action creates PR
   */
  app.post('/committed', validateJson(MarkCommittedSchema), async (c) => {
    const { user, project } = getContext(c);
    const { translationIds } = c.req.valid('json');

    if (!hasProjectAccess(user, project)) {
      return c.json({ 
        error: 'Access denied. Use project owner credentials or OIDC from matching repository.' 
      }, 403);
    }

    // For OIDC, use actor as userId for history logging
    const effectiveUserId = user.userId !== 'oidc-user' 
      ? user.userId 
      : `oidc:${user.actor || 'unknown'}`;

    const result = await markTranslationsAsCommitted(
      prisma,
      project.id,
      translationIds,
      effectiveUserId
    );

    if (!result.success) {
      return c.json({ success: false, error: 'No matching approved translations found' }, 400);
    }

    return c.json({ success: true, count: result.count });
  });

  return app;
}
