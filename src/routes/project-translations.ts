/**
 * Project translation routes
 * 
 * Handles translation CRUD, history, and suggestions
 * within the context of a specific project
 */
import { Hono } from 'hono';
import { Octokit } from '@octokit/rest';
import { PrismaClient } from '../generated/prisma/';
import { authMiddleware } from '../lib/auth';
import { createProjectMiddleware } from '../lib/project-middleware';
import { CACHE_CONFIGS, buildCacheControl } from '../lib/cache-headers';
import { generateTranslationsETag, generateHistoryETag, checkETagMatch, create304Response } from '../lib/etag-db';
import { getUserGitHubToken, fetchSingleFileFromGitHub, fetchGeneratedManifest } from '../lib/github-repo-fetcher';
import { ensureUserCanModerateTranslation } from '../lib/translation-access';
import type { Env, AppEnv, AuthUser, ProjectContext } from '../lib/context';
import { CreateTranslationSchema, validateJson } from '../lib/schemas';

// ============================================================================
// Helper Types and Functions
// ============================================================================

interface TranslationContext {
  user: AuthUser;
  project: ProjectContext;
}

function getContext(c: any): TranslationContext {
  return {
    user: c.get('user') as AuthUser,
    project: c.get('project') as ProjectContext,
  };
}

/**
 * Serialize a translation for API response
 */
function serializeTranslation(t: any, projectName?: string) {
  return {
    id: t.id,
    projectName: projectName ?? null,
    language: t.language,
    filename: t.filename,
    key: t.key,
    value: t.value,
    userId: t.userId,
    username: t.user?.username,
    avatarUrl: t.user?.avatarUrl,
    status: t.status,
    sourceHash: t.sourceHash,
    isValid: t.isValid,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

// ============================================================================
// Route Factory
// ============================================================================

export function createProjectTranslationRoutes(prisma: PrismaClient, _env: Env) {
  const app = new Hono<AppEnv>();
  
  // All routes require authentication and project context
  app.use('*', authMiddleware, createProjectMiddleware(prisma, { 
    requireAccess: true, 
    withOctokit: false 
  }));

  // ============================================================================
  // Create Translation
  // ============================================================================

  app.post('/', validateJson(CreateTranslationSchema), async (c) => {
    const { user, project } = getContext(c);
    const { language, filename, key, value } = c.req.valid('json');

    // Get source hash and current repository value from GitHub for validation
    let sourceHash: string | undefined;
    let repositoryValue: string | undefined;
    try {
      const githubToken = await getUserGitHubToken(prisma, user.userId);
      if (githubToken) {
        const parts = project.repository.trim().split('/');
        if (parts.length === 2 && parts[0] && parts[1]) {
          const [owner, repo] = parts;
          const octokit = new Octokit({ auth: githubToken });
          
          // Fetch source file for source hash
          const sourceFile = await fetchSingleFileFromGitHub(
            octokit, owner, repo, project.sourceLanguage, filename, 'main'
          );
          if (sourceFile) {
            sourceHash = sourceFile.metadata.sourceHashes?.[key];
          }
          
          // Fetch target file to check current repository value (spam prevention)
          const targetFile = await fetchSingleFileFromGitHub(
            octokit, owner, repo, language, filename, 'main'
          );
          if (targetFile?.contents) {
            repositoryValue = targetFile.contents[key];
          }
        }
      }
    } catch (e) {
      console.warn('Failed to get source hash or repository value from GitHub', e);
    }

    // Spam Prevention: Prevent submitting a translation identical to repository content
    if (repositoryValue !== undefined && value === repositoryValue) {
      return c.json({ 
        success: false, 
        error: 'This translation already exists in the repository.' 
      }, 400);
    }

    const id = crypto.randomUUID();
    await prisma.webTranslation.create({
      data: {
        id,
        projectId: project.id,
        language,
        filename,
        key,
        value,
        userId: user.userId,
        status: 'pending',
        sourceHash,
        isValid: true,
      },
    });

    await prisma.webTranslationHistory.create({
      data: {
        id: crypto.randomUUID(),
        translationId: id,
        projectId: project.id,
        language,
        filename,
        key,
        value,
        userId: user.userId,
        action: 'submitted',
        sourceHash,
      },
    });

    return c.json({ success: true, id });
  });

  // ============================================================================
  // List Translations
  // ============================================================================

  app.get('/', async (c) => {
    const { project } = getContext(c);
    const language = c.req.query('language');
    const filename = c.req.query('filename');
    const status = c.req.query('status') || 'approved';
    const isValid = c.req.query('isValid');

    const where: any = { projectId: project.id, status };
    if (language) where.language = language;
    if (filename) where.filename = filename;
    if (isValid !== undefined) where.isValid = isValid === 'true';

    const translations = await prisma.webTranslation.findMany({
      where,
      include: { user: { select: { username: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    const etag = generateTranslationsETag(translations.map(t => t.updatedAt));
    if (checkETagMatch(c.req.raw, etag)) {
      return create304Response(etag, buildCacheControl(CACHE_CONFIGS.translations));
    }

    const response = c.json({ 
      translations: translations.map(t => serializeTranslation(t, project.name)) 
    });
    response.headers.set('ETag', etag);
    response.headers.set('Cache-Control', buildCacheControl(CACHE_CONFIGS.translations));
    return response;
  });

  // ============================================================================
  // Translation History
  // ============================================================================

  app.get('/history', async (c) => {
    const { project } = getContext(c);
    const language = c.req.query('language');
    const filename = c.req.query('filename');
    const key = c.req.query('key');

    if (!language || !filename || !key) {
      return c.json({ error: 'Missing required parameters' }, 400);
    }

    const history = await prisma.webTranslationHistory.findMany({
      where: { projectId: project.id, language, filename, key },
      include: { user: { select: { username: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const etag = generateHistoryETag(history.map(h => h.createdAt));
    if (checkETagMatch(c.req.raw, etag)) {
      return create304Response(etag, buildCacheControl(CACHE_CONFIGS.translations));
    }

    const response = c.json({ history });
    response.headers.set('ETag', etag);
    response.headers.set('Cache-Control', buildCacheControl(CACHE_CONFIGS.translations));
    return response;
  });

  // ============================================================================
  // Suggestions
  // ============================================================================

  app.get('/suggestions', async (c) => {
    const { project } = getContext(c);
    const language = c.req.query('language');
    const filename = c.req.query('filename');
    const key = c.req.query('key');

    const where: any = { projectId: project.id, status: { not: 'deleted' } };
    if (language) where.language = language;
    if (filename) where.filename = filename;
    if (key) where.key = key;

    const suggestions = await prisma.webTranslation.findMany({
      where,
      include: { user: { select: { username: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    const etag = generateTranslationsETag(suggestions.map(s => s.updatedAt));
    if (checkETagMatch(c.req.raw, etag)) {
      return create304Response(etag, buildCacheControl(CACHE_CONFIGS.translationSuggestions));
    }

    const response = c.json({ 
      suggestions: suggestions.map(t => serializeTranslation(t, project.name)) 
    });
    response.headers.set('ETag', etag);
    response.headers.set('Cache-Control', buildCacheControl(CACHE_CONFIGS.translationSuggestions));
    return response;
  });

  // ============================================================================
  // Translation Counts
  // ============================================================================

  app.get('/counts', async (c) => {
    const { project } = getContext(c);
    const language = c.req.query('language');

    const where: any = {
      projectId: project.id,
      status: 'approved',
      isValid: true,
    };
    if (language) where.language = language;

    const counts = await prisma.webTranslation.groupBy({
      by: ['language', 'filename'],
      where,
      _count: { id: true },
    });

    const result = counts.map(c => ({
      language: c.language,
      filename: c.filename,
      count: c._count.id,
    }));

    // Merge DB counts with repository manifest files (manifest takes precedence for listing files)
    // DB contains only diffs; to present a complete list of languages/files we merge manifest entries
    try {
      const { user } = getContext(c);
      const githubToken = await getUserGitHubToken(prisma, user.userId);
      const parts = project.repository?.trim().split('/');

      // Build quick lookup from DB counts
      const countMap = new Map<string, number>();
      for (const r of result) {
        countMap.set(`${r.language}:${r.filename}`, r.count);
      }

      if (parts && parts.length === 2) {
        const [owner, repo] = parts;
        const octokit = githubToken ? new Octokit({ auth: githubToken }) : new Octokit();
        const manifest = await fetchGeneratedManifest(octokit, owner, repo);
        if (manifest) {
          const merged: Array<{ language: string; filename: string; count: number }> = [];
          const seen = new Set<string>();

          // Use manifest files as the canonical list; attach DB counts when present
          for (const f of manifest.files) {
            const key = `${f.language}:${f.filename}`;
            seen.add(key);
            merged.push({
              language: f.language,
              filename: f.filename,
              count: countMap.get(key) || 0,
            });
          }

          // Include any DB-only entries that are not present in the manifest
          for (const [k, cnt] of countMap.entries()) {
            if (!seen.has(k)) {
              const [lang, ...rest] = k.split(':');
              const filename = rest.join(':');
              merged.push({ language: lang, filename, count: cnt });
            }
          }

          return c.json({ counts: merged });
        }
      }
    } catch (e) {
      console.warn('Failed to fetch/merge manifest for counts:', e);
      // Fall through to return DB counts only
    }

    return c.json({ counts: result });
  });

  // ============================================================================
  // Unified Translation Data (Simplified API)
  // ============================================================================

  /**
   * Reconciliation status for lazy sync (Phase 1: Hybrid Buffer)
   * Compares D1 (Database) vs Repo (GitHub) content
   * 
   * Status meanings:
   * - 'committed': D1 Approved + Repo matches D1 → Translation is live
   * - 'redundant': D1 Pending + Repo matches D1 → Marked as system redundant (no credit)
   * - 'waiting': D1 Approved + Repo differs → Waiting for GitHub Action sync
   * - 'conflict': D1 Approved + Repo has different value → External change, needs resolution
   * - 'external': No D1 record + Repo has value → Virtual suggestion from repository
   */
  type ReconciliationStatus = 'committed' | 'redundant' | 'waiting' | 'conflict' | 'external';

  interface ReconciliationInfo {
    status: ReconciliationStatus;
    repoValue?: string;
  }

  /**
   * Get all translation data for a file in one call
   * This is the primary endpoint for the translation editor
   * 
   * Returns:
   * - source: Array of source translations (from source language file)
   * - target: Array of target translations (from target language file)
   * - pending: Array of pending web translations
   * - approved: Array of approved web translations
   * - reconciliation: Lazy reconciliation info comparing D1 vs Repo
   * - virtualSuggestions: Repository values that differ from or don't exist in D1
   */
  app.get('/file/:language/:filename', async (c) => {
    const { user, project } = getContext(c);
    const language = c.req.param('language');
    const filename = decodeURIComponent(c.req.param('filename'));

    // Get user's GitHub token for fetching files
    const githubToken = await getUserGitHubToken(prisma, user.userId);
    if (!githubToken) {
      return c.json({ error: 'GitHub token not found. Please re-login.' }, 401);
    }

    const parts = project.repository.trim().split('/');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      return c.json({ error: 'Invalid repository format' }, 400);
    }
    const [owner, repo] = parts;
    const octokit = new Octokit({ auth: githubToken });

    try {
      // Determine source and target filenames
      const sourceFilename = filename.replace(
        new RegExp(language.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
        project.sourceLanguage
      );

      // Fetch source and target files in parallel
      const [sourceFile, targetFile, webTranslations] = await Promise.all([
        fetchSingleFileFromGitHub(octokit, owner, repo, project.sourceLanguage, sourceFilename, 'main'),
        language !== project.sourceLanguage 
          ? fetchSingleFileFromGitHub(octokit, owner, repo, language, filename, 'main')
          : null,
        prisma.webTranslation.findMany({
          where: { 
            projectId: project.id, 
            language, 
            filename,
            status: { in: ['pending', 'approved'] }
          },
          include: { user: { select: { username: true, avatarUrl: true } } },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      if (!sourceFile) {
        return c.json({ error: 'Source file not found' }, 404);
      }

      // Build unified response
      const source: Record<string, string> = {};
      const target: Record<string, string> = {};

      // Flatten nested object to dot notation
      const flattenToRecord = (obj: any, result: Record<string, string>, prefix = ''): void => {
        for (const [key, value] of Object.entries(obj)) {
          const newKey = prefix ? `${prefix}.${key}` : key;
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            flattenToRecord(value, result, newKey);
          } else {
            result[newKey] = String(value);
          }
        }
      };

      flattenToRecord(sourceFile.contents, source);
      if (targetFile) {
        flattenToRecord(targetFile.contents, target);
      }

      // Separate pending and approved translations
      const pending = webTranslations
        .filter(t => t.status === 'pending')
        .map(t => serializeTranslation(t, project.name));
      const approved = webTranslations
        .filter(t => t.status === 'approved')
        .map(t => serializeTranslation(t, project.name));

      // ========================================================================
      // Lazy Reconciliation Engine (Phase 1: Hybrid Buffer)
      // Compare D1 (Database) vs Repo (GitHub) content
      // ========================================================================
      const reconciliation: Record<string, ReconciliationInfo> = {};
      const virtualSuggestions: Array<{
        key: string;
        value: string;
        source: 'repository';
      }> = [];

      // Build a map of D1 translations by key
      const d1TranslationsByKey = new Map<string, { status: string; value: string }>();
      for (const trans of webTranslations) {
        d1TranslationsByKey.set(trans.key, { status: trans.status, value: trans.value });
      }

      // Compare each key
      for (const key of Object.keys(source)) {
        const repoValue = target[key];
        const d1Trans = d1TranslationsByKey.get(key);

        if (d1Trans) {
          // D1 has a record for this key
          if (d1Trans.status === 'approved') {
            if (repoValue === d1Trans.value) {
              // D1 Approved + Repo matches → Mark as committed
              reconciliation[key] = { status: 'committed', repoValue };
            } else if (repoValue === undefined || repoValue === '') {
              // D1 Approved + No Repo value → Waiting for sync
              reconciliation[key] = { status: 'waiting' };
            } else {
              // D1 Approved + Repo has different value → Conflict!
              reconciliation[key] = { status: 'conflict', repoValue };
              // Add as virtual suggestion so user can resolve
              virtualSuggestions.push({ key, value: repoValue, source: 'repository' });
            }
          } else if (d1Trans.status === 'pending') {
            if (repoValue === d1Trans.value) {
              // D1 Pending + Repo matches → System redundant (no credit)
              reconciliation[key] = { status: 'redundant', repoValue };
            }
          }
        } else {
          // No D1 record for this key
          const sourceValue = source[key];
          if (repoValue !== undefined && repoValue !== '' && sourceValue !== undefined && repoValue !== sourceValue) {
            // Repo has a value different from source → Virtual suggestion
            reconciliation[key] = { status: 'external', repoValue };
            virtualSuggestions.push({ key, value: repoValue, source: 'repository' });
          }
        }
      }

      return c.json({
        source,
        target,
        pending,
        approved,
        reconciliation,
        virtualSuggestions,
        sourceLanguage: project.sourceLanguage,
        targetLanguage: language,
        filename,
        commitSha: sourceFile.commitSha,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error fetching translation data:', msg);
      return c.json({ error: `Failed to fetch translation data: ${msg}` }, 500);
    }
  });

  // ============================================================================
  // Single Translation Operations
  // ============================================================================

  /**
   * Get single translation by ID
   */
  app.get('/:id', async (c) => {
    const { project } = getContext(c);
    const id = c.req.param('id');

    const translation = await prisma.webTranslation.findUnique({
      where: { id },
      include: { user: { select: { username: true, avatarUrl: true } } },
    });
    
    if (!translation || translation.projectId !== project.id) {
      return c.json({ error: 'Not found' }, 404);
    }
    
    return c.json({ translation: serializeTranslation(translation, project.name) });
  });

  /**
   * Approve or reject a translation
   */
  app.patch('/:id', async (c) => {
    const { user, project } = getContext(c);
    const id = c.req.param('id');
    const body = await c.req.json();
    const status = body?.status;
    
    if (!['approved', 'rejected'].includes(status)) {
      return c.json({ error: 'Invalid status' }, 400);
    }

    const translation = await prisma.webTranslation.findUnique({ where: { id } });
    if (!translation || translation.projectId !== project.id) {
      return c.json({ error: 'Not found' }, 404);
    }

    try {
      await ensureUserCanModerateTranslation(prisma, translation.projectId, user);
    } catch (_) {
      // Expected error when user doesn't have moderation permissions
      return c.json({ error: 'Forbidden' }, 403);
    }

    // When approving, reject other translations for the same key
    if (status === 'approved') {
      await prisma.webTranslation.updateMany({
        where: {
          projectId: translation.projectId,
          language: translation.language,
          key: translation.key,
          id: { not: translation.id },
          status: { in: ['pending', 'approved'] },
        },
        data: { status: 'rejected' },
      });
    }

    const updated = await prisma.webTranslation.update({ 
      where: { id }, 
      data: { status } 
    });
    
    await prisma.webTranslationHistory.create({
      data: {
        id: crypto.randomUUID(),
        translationId: updated.id,
        projectId: updated.projectId,
        language: updated.language,
        filename: updated.filename,
        key: updated.key,
        value: updated.value,
        userId: user.userId,
        action: status === 'approved' ? 'approved' : 'rejected',
        sourceHash: updated.sourceHash,
      },
    });

    return c.json({ success: true, translation: serializeTranslation(updated, project.name) });
  });

  /**
   * Delete a translation
   */
  app.delete('/:id', async (c) => {
    const { user, project } = getContext(c);
    const id = c.req.param('id');

    const translation = await prisma.webTranslation.findUnique({ where: { id } });
    if (!translation || translation.projectId !== project.id) {
      return c.json({ error: 'Not found' }, 404);
    }

    try {
      await ensureUserCanModerateTranslation(prisma, translation.projectId, user);
    } catch (_) {
      // Expected error when user doesn't have moderation permissions
      return c.json({ error: 'Forbidden' }, 403);
    }

    await prisma.webTranslation.delete({ where: { id } });
    
    await prisma.webTranslationHistory.create({
      data: {
        id: crypto.randomUUID(),
        translationId: translation.id,
        projectId: translation.projectId,
        language: translation.language,
        filename: translation.filename,
        key: translation.key,
        value: translation.value,
        userId: user.userId,
        action: 'deleted',
        sourceHash: translation.sourceHash,
      },
    });

    return c.json({ success: true });
  });

  return app;
}
