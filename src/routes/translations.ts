import { Hono } from 'hono';
import { PrismaClient } from '@prisma/client';
import * as t from 'io-ts';
import { authMiddleware } from '../lib/auth';
import { validate } from '../lib/validator';

interface Env {
  JWT_SECRET: string;
  ENVIRONMENT: string;
  ALLOWED_PROJECT_CREATORS?: string;
  Variables: {
    user: any;
  };
}

const ApproveTranslationSchema = t.type({
  status: t.union([t.literal('approved'), t.literal('rejected')]),
});

export function createTranslationRoutes(prisma: PrismaClient, _env: Env) {
  const app = new Hono<{ Bindings: Env }>();
  // Deprecated: use project-scoped routes under /api/projects/:projectName/translations
  app.all('*', async (c) => {
    return c.json({ error: 'Deprecated. Use /api/projects/:projectName/translations' }, 410);
  });
  return app;
}
