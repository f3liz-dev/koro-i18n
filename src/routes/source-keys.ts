/**
 * Source Keys API routes
 * 
 * Handles source key sync for koro push/pull CLI commands.
 * Source keys are stored in D1 for fast access (no GitHub API calls needed).
 */
import { Hono } from 'hono';
import { PrismaClient } from '../generated/prisma/';
import { authMiddleware } from '../lib/auth';
import { CACHE_CONFIGS, buildCacheControl } from '../lib/cache-headers';
import type { Env, AppEnv } from '../lib/context';
import { 
  SyncSourceKeysSchema, 
  ImportTranslationsSchema,
  validateJson,
} from '../lib/schemas';
import { canTranslate, parseLanguages } from '../lib/permissions';

// Batch size for operations to stay within Worker CPU limits
const BATCH_SIZE = 200;

export function createSourceKeysRoutes(prisma: PrismaClient, env: Env) {
  const app = new Hono<AppEnv>();

  // ============================================================================
  // Source Key Sync (for koro push)
  // ============================================================================

  /**
   * Get hash manifest for client-side diffing
   * Returns: { manifest: { [filename]: { [key]: hash } } }
   * 
   * Used by CLI to compute diff locally before uploading
   */
  app.get('/hash', authMiddleware, async (c) => {
    const projectName = c.req.param('projectName');
    
    // Get project
    const project = await prisma.project.findUnique({ 
      where: { name: projectName } 
    });
    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }

    // Get all source keys with their hashes
    const keys = await prisma.sourceKey.findMany({
      where: { projectId: project.id },
      select: { filename: true, key: true, hash: true },
    });

    // Build manifest: filename -> key -> hash
    const manifest: Record<string, Record<string, string>> = {};
    for (const k of keys) {
      if (!manifest[k.filename]) {
        manifest[k.filename] = {};
      }
      manifest[k.filename][k.key] = k.hash;
    }

    const response = c.json({ 
      success: true,
      manifest,
      totalKeys: keys.length,
    });
    response.headers.set('Cache-Control', buildCacheControl(CACHE_CONFIGS.translations));
    return response;
  });

  /**
   * Get all source keys (paginated)
   */
  app.get('/', authMiddleware, async (c) => {
    const projectName = c.req.param('projectName');
    const filename = c.req.query('filename');
    const limit = Math.min(parseInt(c.req.query('limit') || '100'), 500);
    const offset = parseInt(c.req.query('offset') || '0');

    const project = await prisma.project.findUnique({ 
      where: { name: projectName } 
    });
    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }

    const where: any = { projectId: project.id };
    if (filename) {
      where.filename = filename;
    }

    const [keys, total] = await Promise.all([
      prisma.sourceKey.findMany({
        where,
        orderBy: [{ filename: 'asc' }, { key: 'asc' }],
        take: limit,
        skip: offset,
      }),
      prisma.sourceKey.count({ where }),
    ]);

    return c.json({
      success: true,
      keys,
      pagination: { limit, offset, total },
    });
  });

  /**
   * Sync source keys (differential update)
   * Called by koro push - accepts batch of operations
   * 
   * Supports both JWT (web) and OIDC (GitHub Actions) authentication
   */
  app.post('/sync', authMiddleware, validateJson(SyncSourceKeysSchema), async (c) => {
    const projectName = c.req.param('projectName');
    const { commitSha, operations } = c.req.valid('json');

    const project = await prisma.project.findUnique({ 
      where: { name: projectName } 
    });
    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }

    // Process operations in batches
    const results = {
      added: 0,
      updated: 0,
      deleted: 0,
      errors: [] as string[],
    };

    // Group operations by type for batch processing
    const adds: typeof operations = [];
    const updates: typeof operations = [];
    const deletes: typeof operations = [];

    for (const op of operations) {
      if (op.op === 'add') adds.push(op);
      else if (op.op === 'update') updates.push(op);
      else if (op.op === 'delete') deletes.push(op);
    }

    // Process adds (upsert to handle race conditions)
    for (let i = 0; i < adds.length; i += BATCH_SIZE) {
      const batch = adds.slice(i, i + BATCH_SIZE);
      try {
        await Promise.all(batch.map(op => 
          prisma.sourceKey.upsert({
            where: {
              projectId_filename_key: {
                projectId: project.id,
                filename: op.filename,
                key: op.key,
              },
            },
            create: {
              id: crypto.randomUUID(),
              projectId: project.id,
              filename: op.filename,
              key: op.key,
              value: op.value || '',
              hash: op.hash || '',
            },
            update: {
              value: op.value || '',
              hash: op.hash || '',
              updatedAt: new Date(),
            },
          })
        ));
        results.added += batch.length;
      } catch (e: any) {
        results.errors.push(`Add batch ${i}: ${e.message}`);
      }
    }

    // Process updates
    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
      const batch = updates.slice(i, i + BATCH_SIZE);
      try {
        await Promise.all(batch.map(op =>
          prisma.sourceKey.updateMany({
            where: {
              projectId: project.id,
              filename: op.filename,
              key: op.key,
            },
            data: {
              value: op.value || '',
              hash: op.hash || '',
              updatedAt: new Date(),
            },
          })
        ));
        results.updated += batch.length;
      } catch (e: any) {
        results.errors.push(`Update batch ${i}: ${e.message}`);
      }
    }

    // Process deletes
    for (let i = 0; i < deletes.length; i += BATCH_SIZE) {
      const batch = deletes.slice(i, i + BATCH_SIZE);
      try {
        await prisma.sourceKey.deleteMany({
          where: {
            projectId: project.id,
            OR: batch.map(op => ({
              filename: op.filename,
              key: op.key,
            })),
          },
        });
        results.deleted += batch.length;
      } catch (e: any) {
        results.errors.push(`Delete batch ${i}: ${e.message}`);
      }
    }

    // Invalidate translations with changed source hashes
    if (updates.length > 0) {
      const updateHashes = updates.map(op => ({
        filename: op.filename,
        key: op.key,
        hash: op.hash,
      }));
      
      // Mark translations as invalid where source hash doesn't match
      // This is done asynchronously to not block the response
      c.executionCtx.waitUntil(
        invalidateStaleTranslations(prisma, project.id, updateHashes)
      );
    }

    return c.json({
      success: true,
      commitSha,
      results,
    });
  });

  // ============================================================================
  // Import Existing Translations (for koro push --import)
  // ============================================================================

  /**
   * Import existing translations from repository
   * Called by koro push when --import-translations flag is set (default)
   */
  app.post('/import-translations', authMiddleware, validateJson(ImportTranslationsSchema), async (c) => {
    const projectName = c.req.param('projectName');
    const { translations, autoApprove } = c.req.valid('json');

    const project = await prisma.project.findUnique({ 
      where: { name: projectName } 
    });
    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }

    const results = {
      imported: 0,
      skipped: 0,
      errors: [] as string[],
    };

    // Process in batches
    for (let i = 0; i < translations.length; i += BATCH_SIZE) {
      const batch = translations.slice(i, i + BATCH_SIZE);
      
      try {
        await Promise.all(batch.map(async (t) => {
          // Check if translation already exists
          const existing = await prisma.webTranslation.findUnique({
            where: {
              projectId_language_filename_key: {
                projectId: project.id,
                language: t.language,
                filename: t.filename,
                key: t.key,
              },
            },
          });

          if (existing) {
            // Skip if already exists (don't overwrite manual translations)
            results.skipped++;
            return;
          }

          // Create new translation
          await prisma.webTranslation.create({
            data: {
              id: crypto.randomUUID(),
              projectId: project.id,
              language: t.language,
              filename: t.filename,
              key: t.key,
              value: t.value,
              userId: 'system', // Special user ID for imports
              status: autoApprove ? 'approved' : 'draft',
              sourceHash: t.hash,
              isValid: true,
              approvedAt: autoApprove ? new Date() : null,
            },
          });
          results.imported++;
        }));
      } catch (e: any) {
        results.errors.push(`Import batch ${i}: ${e.message}`);
      }
    }

    return c.json({
      success: true,
      results,
    });
  });

  return app;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Invalidate translations where source hash has changed
 */
async function invalidateStaleTranslations(
  prisma: PrismaClient,
  projectId: string,
  updates: Array<{ filename: string; key: string; hash: string | undefined }>
): Promise<void> {
  for (const update of updates) {
    if (!update.hash) continue;
    
    // Mark translations as invalid where sourceHash doesn't match new hash
    await prisma.webTranslation.updateMany({
      where: {
        projectId,
        filename: update.filename,
        key: update.key,
        sourceHash: { not: update.hash },
        isValid: true,
      },
      data: {
        isValid: false,
        updatedAt: new Date(),
      },
    });
  }
}
