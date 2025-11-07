/**
 * Node.js server configuration and setup
 * Consolidated from backend server files
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { serve } from '@hono/node-server';

import { createHonoAuthRoutes } from '../api/routes/hono-auth.js';
import { createProjectRoutes } from '../api/routes/projects.js';
import { createTranslationRoutes } from '../api/routes/translations.js';
import { createMonitoringRoutes } from '../api/routes/monitoring.js';
import { createHonoAuthMiddleware } from '../api/middleware/hono-auth.js';
import { createRequestIdMiddleware, createBusinessMetricsMiddleware } from '../api/middleware/telemetry.js';
import { createErrorHandler, createMonitoringRoutes as createHealthRoutes } from '../api/middleware/error-handling.js';
import { logger } from '../api/services/LoggingService.js';
import { AuthService } from '../api/services/AuthService.js';
import { MemoryUserRepository } from '../api/services/MemoryUserRepository.js';
import { MemorySessionStore } from '../api/services/MemorySessionStore.js';
import type { GitHubOAuthConfig } from '@/lib/types/User.js';

export interface ServerConfig {
  github: GitHubOAuthConfig;
  jwtSecret: string;
  corsOrigin?: string | string[];
  port?: number;
  memoryLimitMB?: number;
}

export interface ServerMetrics {
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
    limit: number;
  };
  cpu: {
    usage: number;
  };
  requests: {
    total: number;
    active: number;
    errorsLast5Min: number;
  };
  sessions: {
    active: number;
  };
}

export class OptimizedServer {
  private server: any;
  private isShuttingDown = false;
  private activeRequests = 0;
  private totalRequests = 0;
  private recentErrors: number[] = [];
  private memoryLimit: number;
  private startTime: number;
  private sessionStore: MemorySessionStore;

  constructor(
    private config: ServerConfig,
    port: number = 3000,
    memoryLimitMB: number = 2048
  ) {
    this.config.port = port;
    this.memoryLimit = memoryLimitMB * 1024 * 1024; // Convert to bytes
    this.startTime = Date.now();
    this.sessionStore = new MemorySessionStore();
  }

  async start(): Promise<void> {
    try {
      // Validate memory constraint
      this.validateMemoryConstraint();

      // Create Hono app
      const app = await this.createApp();
      
      // Start server with optimized settings
      this.server = serve({
        fetch: app.fetch,
        port: this.config.port!,
        hostname: '0.0.0.0', // Allow external connections for containerized deployment
      });

      // Set up resource monitoring
      this.setupResourceMonitoring();

      // Set up graceful shutdown handlers
      this.setupGracefulShutdown();

      logger.info(`Optimized server started on port ${this.config.port}`, {
        memoryLimit: `${this.memoryLimit / 1024 / 1024}MB`,
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development'
      });

      console.log(`🚀 I18n Platform server running on http://localhost:${this.config.port}`);
      console.log(`📊 Memory limit: ${this.memoryLimit / 1024 / 1024}MB`);
      console.log(`🔍 Health check: http://localhost:${this.config.port}/health`);
      console.log(`📈 Metrics: http://localhost:${this.config.port}/api/monitoring/metrics`);

    } catch (error) {
      logger.error('Failed to start optimized server', error instanceof Error ? error : undefined);
      throw error;
    }
  }

  private async createApp() {
    const app = new Hono();

    // Create error handler
    const { errorHandler } = createErrorHandler();

    // Add request ID middleware
    app.use('*', createRequestIdMiddleware());
    
    // Add comprehensive error handling middleware
    app.use('*', errorHandler);
    
    // Add business metrics middleware
    app.use('*', createBusinessMetricsMiddleware());

    // Add request tracking middleware
    app.use('*', async (c, next) => {
      this.activeRequests++;
      this.totalRequests++;
      
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
      
      try {
        await next();
      } catch (error) {
        this.recordError();
        throw error;
      } finally {
        this.activeRequests--;
        
        const duration = Date.now() - startTime;
        const statusCode = c.res.status;
        const session = c.get('user');

        logger.logRequest(method, path, statusCode, duration, session?.userId, requestId);
        
        // Log slow requests (>1000ms)
        if (duration > 1000) {
          logger.warn(`Slow request detected: ${method} ${path} (${duration}ms)`);
        }
      }
    });
    
    // Add other middleware
    app.use('*', honoLogger());
    app.use('*', secureHeaders());
    
    // CORS configuration
    app.use('*', cors({
      origin: this.config.corsOrigin || ['http://localhost:5173'],
      credentials: true,
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
    }));

    // Initialize services
    const userRepository = new MemoryUserRepository();
    const authService = new AuthService(
      this.config.github,
      this.config.jwtSecret,
      userRepository,
      this.sessionStore
    );

    // Create authentication middleware (available for use in routes)
    createHonoAuthMiddleware(authService);

    // Register authentication routes
    const authRoutes = createHonoAuthRoutes(authService);
    app.route('/api', authRoutes);

    // Register project routes
    const projectRoutes = createProjectRoutes(authService);
    app.route('/api/projects', projectRoutes);

    // Register translation routes
    const translationRoutes = createTranslationRoutes(authService);
    app.route('/api/translations', translationRoutes);

    // Register health check routes from error handling middleware
    const healthRoutes = createHealthRoutes();
    app.route('/', healthRoutes);

    // Register comprehensive monitoring routes
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
        activeSessions: this.sessionStore.getActiveSessionCount(),
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

    // Set up session cleanup interval (every hour)
    const cleanupInterval = setInterval(() => {
      this.sessionStore.cleanup().catch(error => {
        console.error('Session cleanup failed:', error);
      });
    }, 60 * 60 * 1000); // 1 hour

    // Graceful shutdown handler
    const gracefulShutdown = () => {
      console.log('Shutting down server...');
      clearInterval(cleanupInterval);
      this.sessionStore.destroy();
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

    return app;
  }

  private validateMemoryConstraint(): void {
    const currentMemory = process.memoryUsage().heapUsed;
    if (currentMemory > this.memoryLimit * 0.8) {
      logger.warn('Memory usage is high during startup', {
        current: Math.round(currentMemory / 1024 / 1024),
        limit: Math.round(this.memoryLimit / 1024 / 1024)
      });
    }
  }

  private setupResourceMonitoring(): void {
    // Monitor memory usage every 30 seconds
    const memoryMonitor = setInterval(() => {
      const memUsage = process.memoryUsage();
      const memoryPercentage = (memUsage.heapUsed / this.memoryLimit) * 100;

      if (memoryPercentage > 80) {
        logger.warn('High memory usage detected', {
          memoryUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
          memoryTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
          memoryPercentage: Math.round(memoryPercentage),
          memoryLimit: Math.round(this.memoryLimit / 1024 / 1024)
        });

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
          logger.info('Forced garbage collection executed');
        }
      }

      if (memoryPercentage > 95) {
        logger.error('Critical memory usage - initiating graceful shutdown', undefined, {
          memoryUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
          memoryLimit: Math.round(this.memoryLimit / 1024 / 1024)
        });
        this.gracefulShutdown('MEMORY_LIMIT_EXCEEDED');
      }
    }, 30000);

    // Clean up interval on shutdown
    process.on('beforeExit', () => {
      clearInterval(memoryMonitor);
    });

    // Clean up old error records every 5 minutes
    const errorCleanup = setInterval(() => {
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      this.recentErrors = this.recentErrors.filter(timestamp => timestamp > fiveMinutesAgo);
    }, 5 * 60 * 1000);

    process.on('beforeExit', () => {
      clearInterval(errorCleanup);
    });
  }

  private recordError(): void {
    this.recentErrors.push(Date.now());
  }

  private setupGracefulShutdown(): void {
    const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'] as const;
    
    signals.forEach(signal => {
      process.on(signal, () => {
        logger.info(`Received ${signal}, initiating graceful shutdown...`);
        this.gracefulShutdown(signal);
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', error);
      this.gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled promise rejection', undefined, { rejectionReason: reason, promiseInfo: promise });
      this.gracefulShutdown('UNHANDLED_REJECTION');
    });
  }

  private async gracefulShutdown(reason: string): Promise<void> {
    if (this.isShuttingDown) {
      logger.warn('Shutdown already in progress, forcing exit...');
      process.exit(1);
    }

    this.isShuttingDown = true;
    logger.info(`Starting graceful shutdown (reason: ${reason})...`);

    // Set a timeout for forced shutdown
    const forceShutdownTimer = setTimeout(() => {
      logger.error('Graceful shutdown timeout, forcing exit...');
      process.exit(1);
    }, 30000); // 30 seconds timeout

    try {
      // Stop accepting new requests
      if (this.server) {
        logger.info('Stopping server...');
        await new Promise<void>((resolve) => {
          this.server.close(() => {
            logger.info('Server stopped');
            resolve();
          });
        });
      }

      // Wait for active requests to complete
      logger.info(`Waiting for ${this.activeRequests} active requests to complete...`);
      while (this.activeRequests > 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Clean up session store
      logger.info('Cleaning up session store...');
      this.sessionStore.destroy();

      logger.info('Graceful shutdown completed');
      clearTimeout(forceShutdownTimer);
      process.exit(0);

    } catch (error) {
      logger.error('Error during graceful shutdown', error instanceof Error ? error : undefined);
      clearTimeout(forceShutdownTimer);
      process.exit(1);
    }
  }

  getMetrics(): ServerMetrics {
    const memUsage = process.memoryUsage();
    const uptime = (Date.now() - this.startTime) / 1000;
    
    // Calculate recent errors (last 5 minutes)
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const errorsLast5Min = this.recentErrors.filter(timestamp => timestamp > fiveMinutesAgo).length;

    return {
      uptime,
      memory: {
        used: Math.round(memUsage.heapUsed / 1024 / 1024),
        total: Math.round(memUsage.heapTotal / 1024 / 1024),
        percentage: Math.round((memUsage.heapUsed / this.memoryLimit) * 100),
        limit: Math.round(this.memoryLimit / 1024 / 1024)
      },
      cpu: {
        usage: process.cpuUsage().user / 1000000 // Convert to seconds
      },
      requests: {
        total: this.totalRequests,
        active: this.activeRequests,
        errorsLast5Min
      },
      sessions: {
        active: this.sessionStore.getActiveSessionCount()
      }
    };
  }

  isHealthy(): boolean {
    const metrics = this.getMetrics();
    
    // Check memory usage
    if (metrics.memory.percentage > 90) {
      return false;
    }

    // Check error rate
    if (metrics.requests.errorsLast5Min > 50) {
      return false;
    }

    // Check if shutting down
    if (this.isShuttingDown) {
      return false;
    }

    return true;
  }

  isReady(): boolean {
    return !this.isShuttingDown && this.server !== null;
  }
}

// Factory function for creating optimized server
export async function createOptimizedServer(
  config: ServerConfig,
  port: number = 3000,
  memoryLimitMB: number = 2048
): Promise<OptimizedServer> {
  return new OptimizedServer(config, port, memoryLimitMB);
}

// Legacy function for backward compatibility
export async function createHonoApp(config: ServerConfig) {
  const server = new OptimizedServer(config);
  return server.createApp();
}

// Legacy function for backward compatibility
export async function startHonoServer(config: ServerConfig, port: number = 3000) {
  const server = await createOptimizedServer(config, port);
  await server.start();
  return server;
}