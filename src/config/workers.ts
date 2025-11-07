/**
 * Cloudflare Workers configuration and setup
 * Consolidated from workers files
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';

import { CloudflareSessionStore } from '../api/services/CloudflareSessionStore.js';
import { CloudflareUserRepository } from '../api/services/CloudflareUserRepository.js';
import { AuthService } from '../api/services/AuthService.js';
import { createHonoAuthRoutes } from '../api/routes/hono-auth.js';
import { createHonoAuthMiddleware } from '../api/middleware/hono-auth.js';
import { createErrorHandler } from '../api/middleware/error-handling.js';
import type { GitHubOAuthConfig } from '@/lib/types/User.js';

export interface WorkersEnv {
  // KV Namespaces for serverless storage
  SESSIONS: KVNamespace;
  TRANSLATIONS: KVNamespace;
  
  // GitHub OAuth configuration
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  
  // JWT secret for token signing
  JWT_SECRET: string;
  
  // Environment configuration
  ENVIRONMENT: string;
  
  // Optional CORS origins (comma-separated)
  CORS_ORIGINS?: string;
}

export interface WorkersAppVariables {
  requestId: string;
  user?: {
    userId: string;
    username: string;
  };
  env: WorkersEnv;
}

export function createWorkersApp(env: WorkersEnv) {
  const app = new Hono<{ Variables: WorkersAppVariables }>();

  // Create error handler for Workers
  const { errorHandler } = createErrorHandler();

  // Add request ID middleware
  app.use('*', async (c, next) => {
    const requestId = crypto.randomUUID();
    c.set('requestId', requestId);
    c.set('env', env);
    await next();
  });

  // Add error handling middleware
  app.use('*', errorHandler);

  // Add request logging middleware (simplified for Workers)
  app.use('*', async (c, next) => {
    const startTime = Date.now();
    const method = c.req.method;
    const path = c.req.path;
    
    console.log(`${method} ${path} - Request started`);
    
    await next();
    
    const duration = Date.now() - startTime;
    const statusCode = c.res.status;
    
    console.log(`${method} ${path} - ${statusCode} (${duration}ms)`);
  });

  // Add other middleware
  app.use('*', honoLogger());
  app.use('*', secureHeaders());

  // CORS configuration for Workers
  app.use('*', cors({
    origin: env.ENVIRONMENT === 'development' 
      ? ['http://localhost:5173', 'http://localhost:3000']
      : ['https://i18n-platform.pages.dev'], // Adjust based on your domain
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
  }));

  // Initialize services with Cloudflare KV
  const userRepository = new CloudflareUserRepository(env.SESSIONS); // Using SESSIONS KV for users too
  const sessionStore = new CloudflareSessionStore(env.SESSIONS);
  
  const githubConfig: GitHubOAuthConfig = {
    clientId: env.GITHUB_CLIENT_ID,
    clientSecret: env.GITHUB_CLIENT_SECRET,
    redirectUri: env.ENVIRONMENT === 'development'
      ? 'http://localhost:8787/api/auth/callback'
      : 'https://i18n-platform.workers.dev/api/auth/callback' // Adjust based on your domain
  };

  const authService = new AuthService(
    githubConfig,
    env.JWT_SECRET,
    userRepository,
    sessionStore
  );

  // Create authentication middleware
  createHonoAuthMiddleware(authService);

  // Register authentication routes
  const authRoutes = createHonoAuthRoutes(authService);
  app.route('/api', authRoutes);

  // Register project routes (simplified for Workers)
  app.get('/api/projects', async (c) => {
    // TODO: Implement project listing for Workers
    return c.json({ projects: [], message: 'Project management coming soon' });
  });

  // Register translation routes (simplified for Workers)
  app.post('/api/translations', async (c) => {
    // TODO: Implement translation submission for Workers
    return c.json({ message: 'Translation submission coming soon' });
  });

  // Health check endpoint optimized for Workers
  app.get('/health', (c) => {
    return c.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: env.ENVIRONMENT,
      runtime: 'cloudflare-workers'
    });
  });

  // Root endpoint
  app.get('/', (c) => {
    return c.json({
      name: 'I18n Platform API (Workers)',
      version: '1.0.0',
      status: 'running',
      runtime: 'cloudflare-workers'
    });
  });

  // Serve static frontend files (placeholder)
  app.get('/*', (c) => {
    // TODO: Implement static file serving for Workers
    return c.html(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>I18n Platform</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body>
          <h1>I18n Platform</h1>
          <p>Frontend deployment coming soon...</p>
          <p>Environment: ${env.ENVIRONMENT}</p>
        </body>
      </html>
    `);
  });

  return app;
}

// Workers entry point handler
export default {
  async fetch(request: Request, env: WorkersEnv, ctx: ExecutionContext): Promise<Response> {
    try {
      const app = createWorkersApp(env);
      return await app.fetch(request, env, ctx);
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Internal Server Error',
          message: 'An unexpected error occurred'
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }
  },
} satisfies ExportedHandler<WorkersEnv>;