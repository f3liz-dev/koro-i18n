import { Hono } from 'hono';
import { PrismaClient } from '../generated/prisma/';
import { requireAuth } from '../lib/auth';
import { logTranslationHistory } from '../lib/database';
import { CACHE_CONFIGS, buildCacheControl } from '../lib/cache-headers';

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

    const response = c.json({ translations });
    response.headers.set('Cache-Control', buildCacheControl(CACHE_CONFIGS.translations));
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

    const response = c.json({ history });
    response.headers.set('Cache-Control', buildCacheControl(CACHE_CONFIGS.translations));
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
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    const response = c.json({ suggestions });
    response.headers.set('Cache-Control', buildCacheControl(CACHE_CONFIGS.translations));
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
