/**
 * Hono Cloudflare Workers adapter configuration
 * Creates a serverless-friendly Hono application for Workers runtime
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';

import type { Env } from './index';
import { CloudflareSessionStore } from './services/CloudflareSessionStore';
import { CloudflareUserRepository } from './services/CloudflareUserRepository';
import { AuthService } from '../backend/services/AuthService';
import { createHonoAuthRoutes } from '../backend/api/hono-auth';
import { createHonoAuthMiddleware } from '../api/middleware/hono-auth.js';
import { createErrorHandler } from '../api/middleware/error-handling.js';
import type { GitHubOAuthConfig } from '../backend/types/User';

export interface WorkersAppVariables {
  requestId: string;
  user?: {
    userId: string;
    username: string;
  };
  env: Env;
}

export function createWorkersApp(env: Env) {
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