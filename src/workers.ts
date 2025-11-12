/// <reference types="@cloudflare/workers-types" />
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { initializePrisma } from './lib/database';
import { createAuthRoutes } from './routes/auth';
import { createTranslationRoutes } from './routes/translations';
import { createProjectRoutes } from './routes/projects';
import { createProjectFileRoutes } from './routes/project-files';

interface Env {
  DB: D1Database;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  JWT_SECRET: string;
  ENVIRONMENT: string;
  PLATFORM_URL?: string;
  ASSETS?: Fetcher;
}

export function createWorkerApp(env: Env) {
  const app = new Hono();
  const prisma = initializePrisma(env.DB);

  app.use('*', logger());
  app.use('*', secureHeaders());
  app.use('*', cors({
    origin: env.ENVIRONMENT === 'development' 
      ? ['http://localhost:5173', 'http://localhost:8787', 'http://localhost:3000']
      : ['https://koro.f3liz.workers.dev'],
    credentials: true,
  }));

  app.route('/api/auth', createAuthRoutes(prisma, env));
  app.route('/api/translations', createTranslationRoutes(prisma, env));
  app.route('/api/projects', createProjectRoutes(prisma, env));
  app.route('/api/projects', createProjectFileRoutes(prisma, env));

  app.get('/api/logs/history', async (c) => {
    const projectId = c.req.query('projectId');
    const language = c.req.query('language');
    const key = c.req.query('key');

    if (!projectId || !language || !key) {
      return c.json({ error: 'Missing required parameters' }, 400);
    }

    const history = await prisma.translationHistory.findMany({
      where: { projectId, language, key },
      orderBy: { createdAt: 'desc' },
    });

    return c.json({ history });
  });

  app.get('/health', (c) => c.json({ status: 'ok', runtime: 'cloudflare-workers' }));

  app.get('/api/prisma/users', async (c) => {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          username: true,
          email: true,
          avatarUrl: true,
          createdAt: true,
        },
        take: 10,
      });
      return c.json({ users, source: 'prisma-orm' });
    } catch (error) {
      console.error('Prisma error:', error);
      return c.json({ error: 'Failed to fetch users' }, 500);
    }
  });

  return app;
}

async function serveStatic(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  let path = url.pathname;
  
  // Check if this is a request for a static asset (files with extensions in /assets or root-level static files)
  const isStaticAsset = path.startsWith('/assets/') || 
                        /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/i.test(path);
  
  // For SPA routes (non-static assets), serve index.html
  if (path === '/' || (!path.startsWith('/api') && !isStaticAsset)) {
    path = '/index.html';
  }

  try {
    // @ts-ignore
    const asset = await env.ASSETS.fetch(new URL(path, request.url));
    return asset;
  } catch {
    try {
      // @ts-ignore
      return await env.ASSETS.fetch(new URL('/index.html', request.url));
    } catch {
      return new Response('Not Found', { status: 404 });
    }
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      const url = new URL(request.url);
      
      if (url.pathname.startsWith('/api') || url.pathname === '/health') {
        const app = createWorkerApp(env);
        return await app.fetch(request, env, ctx);
      }
      
      if (env.ASSETS) {
        return await serveStatic(request, env);
      }
      
      return new Response('Frontend not built. Run in dev mode with separate Vite server.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain' },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Internal error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },
} satisfies ExportedHandler<Env>;
