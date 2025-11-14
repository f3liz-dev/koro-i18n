import { Hono } from 'hono';
import { PrismaClient } from '../generated/prisma/';
import { requireAuth } from '../lib/auth';
import { logTranslationHistory } from '../lib/database';
import { CACHE_CONFIGS, buildCacheControl } from '../lib/cache-headers';
import { generateTranslationsETag, generateHistoryETag, checkETagMatch, create304Response } from '../lib/etag-db';

interface Env {
  JWT_SECRET: string;
}

export function createTranslationRoutes(prisma: PrismaClient, env: Env) {
  const app = new Hono();

  app.post('/', async (c) => {
    const payload = await requireAuth(c, env.JWT_SECRET);
    if (payload instanceof Response) return payload;

    const body = await c.req.json();
    const { projectId, language, key, value } = body;

    if (!projectId || !language || !key || !value) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const id = crypto.randomUUID();
    await prisma.translation.create({
      data: { id, projectId, language, key, value, userId: payload.userId, status: 'pending' },
    });

    await logTranslationHistory(prisma, id, projectId, language, key, value, payload.userId, 'submitted');
    return c.json({ success: true, id });
  });

  app.get('/', async (c) => {
    const payload = await requireAuth(c, env.JWT_SECRET);
    if (payload instanceof Response) return payload;

    const projectId = c.req.query('projectId');
    const language = c.req.query('language');
    const status = c.req.query('status') || 'pending';

    const where: any = { status };
    if (projectId) where.projectId = projectId;
    if (language) where.language = language;

    const translations = await prisma.translation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // Generate ETag from translation timestamps
    const translationTimestamps = translations.map(t => t.updatedAt);
    const etag = generateTranslationsETag(translationTimestamps);
    
    // Check if client has current version
    const cacheControl = buildCacheControl(CACHE_CONFIGS.translations);
    if (checkETagMatch(c.req.raw, etag)) {
      return create304Response(etag, cacheControl);
    }

    const response = c.json({ translations });
    response.headers.set('Cache-Control', cacheControl);
    response.headers.set('ETag', etag);
    return response;
  });

  app.get('/history', async (c) => {
    const payload = await requireAuth(c, env.JWT_SECRET);
    if (payload instanceof Response) return payload;

    const projectId = c.req.query('projectId');
    const language = c.req.query('language');
    const key = c.req.query('key');

    if (!projectId || !language || !key) {
      return c.json({ error: 'Missing required parameters' }, 400);
    }

    const history = await prisma.translationHistory.findMany({
      where: { projectId, language, key },
      include: {
        user: { select: { username: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Generate ETag from history timestamps
    const historyTimestamps = history.map(h => h.createdAt);
    const etag = generateHistoryETag(historyTimestamps);
    
    // Check if client has current version
    const cacheControl = buildCacheControl(CACHE_CONFIGS.translations);
    if (checkETagMatch(c.req.raw, etag)) {
      return create304Response(etag, cacheControl);
    }

    const response = c.json({ history });
    response.headers.set('Cache-Control', cacheControl);
    response.headers.set('ETag', etag);
    return response;
  });

  app.get('/suggestions', async (c) => {
    const payload = await requireAuth(c, env.JWT_SECRET);
    if (payload instanceof Response) return payload;

    const projectId = c.req.query('projectId');
    const language = c.req.query('language');
    const key = c.req.query('key');

    if (!projectId) {
      return c.json({ error: 'Missing projectId parameter' }, 400);
    }

    const where: any = { projectId, status: { not: 'deleted' } };
    if (language) where.language = language;
    if (key) where.key = key;

    const suggestions = await prisma.translation.findMany({
      where,
      include: {
        user: { select: { username: true, avatarUrl: true } },
        history: { 
          select: { action: true },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    // Generate ETag from suggestion timestamps
    const suggestionTimestamps = suggestions.map(s => s.updatedAt);
    const etag = generateTranslationsETag(suggestionTimestamps);
    
    // Check if client has current version
    const cacheControl = buildCacheControl(CACHE_CONFIGS.translationSuggestions);
    if (checkETagMatch(c.req.raw, etag)) {
      return create304Response(etag, cacheControl);
    }

    // Flatten user data for frontend compatibility
    const flattenedSuggestions = suggestions.map(s => ({
      id: s.id,
      projectId: s.projectId,
      language: s.language,
      key: s.key,
      value: s.value,
      userId: s.userId,
      username: s.user?.username,
      avatarUrl: s.user?.avatarUrl,
      status: s.status,
      isImported: s.history.length > 0 && s.history[0].action === 'imported',
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));

    const response = c.json({ suggestions: flattenedSuggestions });
    response.headers.set('Cache-Control', cacheControl);
    response.headers.set('ETag', etag);
    return response;
  });

  app.post('/:id/approve', async (c) => {
    const payload = await requireAuth(c, env.JWT_SECRET);
    if (payload instanceof Response) return payload;

    const id = c.req.param('id');
    const translation = await prisma.translation.findUnique({ where: { id } });

    if (!translation) return c.json({ error: 'Translation not found' }, 404);

    await prisma.translation.update({
      where: { id },
      data: { status: 'approved', updatedAt: new Date() },
    });

    await logTranslationHistory(
      prisma,
      id,
      translation.projectId,
      translation.language,
      translation.key,
      translation.value,
      payload.userId,
      'approved'
    );

    return c.json({ success: true });
  });

  app.delete('/:id', async (c) => {
    const payload = await requireAuth(c, env.JWT_SECRET);
    if (payload instanceof Response) return payload;

    const id = c.req.param('id');
    const translation = await prisma.translation.findUnique({ where: { id } });

    if (!translation) return c.json({ error: 'Translation not found' }, 404);

    await prisma.translation.update({
      where: { id },
      data: { status: 'deleted', updatedAt: new Date() },
    });

    await logTranslationHistory(
      prisma,
      id,
      translation.projectId,
      translation.language,
      translation.key,
      translation.value,
      payload.userId,
      'deleted'
    );

    return c.json({ success: true });
  });

  return app;
}
