/**
 * Hono server setup with authentication and OpenTelemetry
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { httpInstrumentationMiddleware } from '@hono/otel';
import { initializeTelemetry, setupTelemetryShutdown, instrumentationConfig } from './telemetry/setup.js';
import type { AppVariables } from './types/HonoContext.js';

import { createHonoAuthRoutes } from './api/hono-auth.js';
import { createHonoAuthMiddleware } from '../api/middleware/hono-auth.js';
import { createRequestIdMiddleware, createBusinessMetricsMiddleware } from '../api/middleware/telemetry.js';
import { createErrorHandler } from '../api/middleware/error-handling.js';
import { logger } from './services/LoggingService.js';
import { AuthService } from './services/AuthService.js';
import { MemoryUserRepository } from './services/MemoryUserRepository.js';
import { MemorySessionStore } from './services/MemorySessionStore.js';
import type { GitHubOAuthConfig } from './types/User.js';

export interface HonoServerConfig {
  github: GitHubOAuthConfig;
  jwtSecret: string;
  corsOrigin?: string | string[];
}

export async function createHonoApp(config: HonoServerConfig) {
  // Initialize OpenTelemetry before creating the app
  const sdk = initializeTelemetry();
  setupTelemetryShutdown(sdk);

  const app = new Hono<{ Variables: AppVariables }>();

  // Create error handler
  const { errorHandler } = createErrorHandler();

  // Add OpenTelemetry instrumentation middleware first
  app.use('*', httpInstrumentationMiddleware(instrumentationConfig));
  
  // Add request ID middleware
  app.use('*', createRequestIdMiddleware());
  
  // Add comprehensive error handling middleware
  app.use('*', errorHandler);
  
  // Add business metrics middleware
  app.use('*', createBusinessMetricsMiddleware());

  // Add request logging middleware
  app.use('*', async (c, next) => {
    const startTime = Date.now();
    const requestId = c.get('requestId');
    const method = c.req.method;
    const path = c.req.path;
    const userAgent = c.req.header('user-agent');
    const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';

    logger.info(`${method} ${path} - Request started`, {
      method,
      path,
      userAgent,
      ip
    }, requestId);

    await next();

    const duration = Date.now() - startTime;
    const statusCode = c.res.status;
    const session = c.get('user');

    logger.logRequest(method, path, statusCode, duration, session?.userId, requestId);
  });
  
  // Add other middleware
  app.use('*', honoLogger());
  app.use('*', secureHeaders());
  
  // CORS configuration
  app.use('*', cors({
    origin: config.corsOrigin || ['http://localhost:5173'],
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
  }));

  // Initialize services
  const userRepository = new MemoryUserRepository();
  const sessionStore = new MemorySessionStore();
  const authService = new AuthService(
    config.github,
    config.jwtSecret,
    userRepository,
    sessionStore
  );

  // Create authentication middleware (available for use in routes)
  createHonoAuthMiddleware(authService);

  // Register authentication routes
  const authRoutes = createHonoAuthRoutes(authService);
  app.route('/api', authRoutes);

  // Register project routes
  const { createProjectRoutes } = await import('./api/projects.js');
  const projectRoutes = createProjectRoutes(authService);
  app.route('/api/projects', projectRoutes);

  // Register translation routes
  const { createTranslationRoutes } = await import('./api/translations.js');
  const translationRoutes = createTranslationRoutes(authService);
  app.route('/api/translations', translationRoutes);

  // Register health check routes from error handling middleware
  const { createMonitoringRoutes: createHealthRoutes } = await import('../api/middleware/error-handling.js');
  const healthRoutes = createHealthRoutes();
  app.route('/', healthRoutes);

  // Register comprehensive monitoring routes
  const { createMonitoringRoutes } = await import('./api/monitoring.js');
  const monitoringRoutes = createMonitoringRoutes(authService);
  app.route('/api/monitoring', monitoringRoutes);

  // Enhanced health check endpoint with session info
  app.get('/health', (c) => {
    const requestId = c.get('requestId');
    logger.info('Health check requested', { endpoint: '/health' }, requestId);
    
    return c.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      activeSessions: sessionStore.getActiveSessionCount(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
      }
    });
  });

  // Root endpoint
  app.get('/', (c) => {
    return c.json({
      name: 'I18n Platform API',
      version: '1.0.0',
      status: 'running'
    });
  });

  // Services are available through closure in the routes

  // Set up session cleanup interval (every hour)
  const cleanupInterval = setInterval(() => {
    sessionStore.cleanup().catch(error => {
      console.error('Session cleanup failed:', error);
    });
  }, 60 * 60 * 1000); // 1 hour

  // Graceful shutdown handler
  const gracefulShutdown = () => {
    console.log('Shutting down Hono server...');
    clearInterval(cleanupInterval);
    sessionStore.destroy();
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);

  return app;
}

export async function startHonoServer(config: HonoServerConfig, port: number = 3000) {
  const app = await createHonoApp(config);
  
  console.log(`Starting Hono server on port ${port}...`);
  
  // Use Node.js adapter
  const { serve } = await import('@hono/node-server');
  
  return serve({
    fetch: app.fetch,
    port,
  });
}