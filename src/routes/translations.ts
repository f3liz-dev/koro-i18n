import { Hono } from 'hono';
import { PrismaClient } from '../generated/prisma/';
import { requireAuth } from '../lib/auth';
import { CACHE_CONFIGS, buildCacheControl } from '../lib/cache-headers';
import { generateTranslationsETag, generateHistoryETag, checkETagMatch, create304Response } from '../lib/etag-db';
import { getFileByComponents } from '../lib/r2-storage';

interface Env {
  TRANSLATION_BUCKET: R2Bucket;
  JWT_SECRET: string;
}

export function createTranslationRoutes(prisma: PrismaClient, env: Env) {
  const app = new Hono();

  // Helpers
  const resolveProjectId = async (projectIdParam?: string) => {
    if (!projectIdParam) return undefined;
    const project = await prisma.project.findFirst({
      where: {
        OR: [
          { id: projectIdParam },
          { repository: projectIdParam },
        ],
      },
      select: { id: true },
    });
    return project ? project.id : projectIdParam;
  };

  const serializeTranslation = (t: any) => ({
    id: t.id,
    projectId: t.projectId,
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
  });

  // Create web translation
  app.post('/', async (c) => {
    const payload = await requireAuth(c, env.JWT_SECRET);
    if (payload instanceof Response) return payload;

    const body = await c.req.json();
    const { projectId, language, filename, key, value } = body;

    if (!projectId || !language || !filename || !key || !value) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    // Get project - projectId can be either the internal ID or repository name
    const project = await prisma.project.findFirst({
      where: {
        OR: [
          { id: projectId },
          { repository: projectId },
        ],
      },
      select: { id: true, repository: true, sourceLanguage: true },
    });

    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }

    let sourceHash: string | undefined;
    try {
      const sourceFile = await getFileByComponents(
        env.TRANSLATION_BUCKET,
        project.repository,
        project.sourceLanguage,
        filename
      );
      
      if (sourceFile) {
        sourceHash = sourceFile.metadata.sourceHashes?.[key];
      }
    } catch (error) {
      console.warn('[translation] Failed to get source hash:', error);
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
        userId: payload.userId,
        status: 'pending',
        sourceHash,
        isValid: true,
      },
    });

    // Log to history
    await prisma.webTranslationHistory.create({
      data: {
        id: crypto.randomUUID(),
        translationId: id,
        projectId: project.id,
        language,
        filename,
        key,
        value,
        userId: payload.userId,
        action: 'submitted',
        sourceHash,
      },
    });

    return c.json({ success: true, id });
  });

  // Get web translations
  app.get('/', async (c) => {
    const payload = await requireAuth(c, env.JWT_SECRET);
    if (payload instanceof Response) return payload;

    const projectIdParam = c.req.query('projectId');
    const language = c.req.query('language');
    const filename = c.req.query('filename');
    const status = c.req.query('status') || 'approved';
    const isValid = c.req.query('isValid');

    const where: any = { status };
    
    // Resolve projectId - can be either internal ID or repository name
    if (projectIdParam) {
      const project = await prisma.project.findFirst({
        where: {
          OR: [
            { id: projectIdParam },
            { repository: projectIdParam },
          ],
        },
        select: { id: true },
      });
      
      if (project) {
        where.projectId = project.id;
      } else {
        // If project not found, use the param as-is (will return empty results)
        where.projectId = projectIdParam;
      }
    }
    
    if (language) where.language = language;
    if (filename) where.filename = filename;
    if (isValid !== undefined) where.isValid = isValid === 'true';

    const translations = await prisma.webTranslation.findMany({
      where,
      include: {
        user: { select: { username: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    // Generate ETag
    const timestamps = translations.map(t => t.updatedAt);
    const etag = generateTranslationsETag(timestamps);

    if (checkETagMatch(c.req.raw, etag)) {
      return create304Response(etag, buildCacheControl(CACHE_CONFIGS.translations));
    }

    const response = c.json({
      translations: translations.map(serializeTranslation),
    });

    response.headers.set('Cache-Control', buildCacheControl(CACHE_CONFIGS.translations));
    response.headers.set('ETag', etag);
    return response;
  });

  // Get translation history
  app.get('/history', async (c) => {
    const payload = await requireAuth(c, env.JWT_SECRET);
    if (payload instanceof Response) return payload;

    const projectIdParam = c.req.query('projectId');
    const language = c.req.query('language');
    const filename = c.req.query('filename');
    const key = c.req.query('key');

    if (!projectIdParam || !language || !filename || !key) {
      return c.json({ error: 'Missing required parameters' }, 400);
    }

    // Resolve projectId - can be either internal ID or repository name
    const project = await prisma.project.findFirst({
      where: {
        OR: [
          { id: projectIdParam },
          { repository: projectIdParam },
        ],
      },
      select: { id: true },
    });
    
    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }

    const history = await prisma.webTranslationHistory.findMany({
      where: { projectId: project.id, language, filename, key },
      include: {
        user: { select: { username: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const timestamps = history.map(h => h.createdAt);
    const etag = generateHistoryETag(timestamps);
    
    if (checkETagMatch(c.req.raw, etag)) {
      return create304Response(etag, buildCacheControl(CACHE_CONFIGS.translations));
    }

    const response = c.json({ history });
    response.headers.set('Cache-Control', buildCacheControl(CACHE_CONFIGS.translations));
    response.headers.set('ETag', etag);
    return response;
  });

  // Get suggestions (pending/approved translations)
  app.get('/suggestions', async (c) => {
    const payload = await requireAuth(c, env.JWT_SECRET);
    if (payload instanceof Response) return payload;

    const projectIdParam = c.req.query('projectId');
    const language = c.req.query('language');
    const filename = c.req.query('filename');
    const key = c.req.query('key');

    if (!projectIdParam) {
      return c.json({ error: 'Missing projectId parameter' }, 400);
    }

    // Resolve projectId - can be either internal ID or repository name
    const project = await prisma.project.findFirst({
      where: {
        OR: [
          { id: projectIdParam },
          { repository: projectIdParam },
        ],
      },
      select: { id: true },
    });
    
    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }

    const where: any = { projectId: project.id, status: { not: 'deleted' } };
    if (language) where.language = language;
    if (filename) where.filename = filename;
    if (key) where.key = key;

    const suggestions = await prisma.webTranslation.findMany({
      where,
      include: {
        user: { select: { username: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    const timestamps = suggestions.map(s => s.updatedAt);
    const etag = generateTranslationsETag(timestamps);

    if (checkETagMatch(c.req.raw, etag)) {
      return create304Response(etag, buildCacheControl(CACHE_CONFIGS.translationSuggestions));
    }

    const response = c.json({
      suggestions: suggestions.map(serializeTranslation),
    });

    response.headers.set('Cache-Control', buildCacheControl(CACHE_CONFIGS.translationSuggestions));
    response.headers.set('ETag', etag);
    return response;
  });

  // Approve translation
  app.post('/:id/approve', async (c) => {
    const payload = await requireAuth(c, env.JWT_SECRET);
    if (payload instanceof Response) return payload;

    const id = c.req.param('id');
    const translation = await prisma.webTranslation.findUnique({ where: { id } });

    if (!translation) return c.json({ error: 'Translation not found' }, 404);

    // Reject other pending/approved translations for the same key
    await prisma.webTranslation.updateMany({
      where: {
        projectId: translation.projectId,
        language: translation.language,
        filename: translation.filename,
        key: translation.key,
        id: { not: id },
        status: { in: ['pending', 'approved'] },
      },
      data: { status: 'rejected', updatedAt: new Date() },
    });

    // Approve the selected translation
    await prisma.webTranslation.update({
      where: { id },
      data: { status: 'approved', updatedAt: new Date() },
    });

    // Log to history
    await prisma.webTranslationHistory.create({
      data: {
        id: crypto.randomUUID(),
        translationId: id,
        projectId: translation.projectId,
        language: translation.language,
        filename: translation.filename,
        key: translation.key,
        value: translation.value,
        userId: payload.userId,
        action: 'approved',
        sourceHash: translation.sourceHash,
      },
    });

    return c.json({ success: true });
  });

  // Delete translation
  app.delete('/:id', async (c) => {
    const payload = await requireAuth(c, env.JWT_SECRET);
    if (payload instanceof Response) return payload;

    const id = c.req.param('id');
    const translation = await prisma.webTranslation.findUnique({ where: { id } });

    if (!translation) return c.json({ error: 'Translation not found' }, 404);

    await prisma.webTranslation.update({
      where: { id },
      data: { status: 'deleted', updatedAt: new Date() },
    });

    // Log to history
    await prisma.webTranslationHistory.create({
      data: {
        id: crypto.randomUUID(),
        translationId: id,
        projectId: translation.projectId,
        language: translation.language,
        filename: translation.filename,
        key: translation.key,
        value: translation.value,
        userId: payload.userId,
        action: 'deleted',
        sourceHash: translation.sourceHash,
      },
    });

    return c.json({ success: true });
  });

  return app;
}
