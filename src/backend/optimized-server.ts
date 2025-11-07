/**
 * Optimized Node.js server for 2GB RAM constraint
 * Implements containerized deployment with resource monitoring and graceful shutdown
 */

import dotenv from 'dotenv';
import { createHonoApp } from './hono-server.js';
import type { HonoServerConfig } from './hono-server.js';
import { serve } from '@hono/node-server';
import { logger } from './services/LoggingService.js';

// Load environment variables
dotenv.config();

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
  private sessionStore: any;

  constructor(
    private config: HonoServerConfig,
    private port: number = 3000,
    memoryLimitMB: number = 2048
  ) {
    this.memoryLimit = memoryLimitMB * 1024 * 1024; // Convert to bytes
    this.startTime = Date.now();
  }

  async start(): Promise<void> {
    try {
      // Validate memory constraint
      this.validateMemoryConstraint();

      // Create Hono app
      const app = await createHonoApp(this.config);
      
      // Store session store reference for metrics
      // This would need to be passed from the app creation
      
      // Add request tracking middleware
      app.use('*', async (c, next) => {
        this.activeRequests++;
        this.totalRequests++;
        
        const startTime = Date.now();
        
        try {
          await next();
        } catch (error) {
          this.recordError();
          throw error;
        } finally {
          this.activeRequests--;
          
          // Log slow requests (>1000ms)
          const duration = Date.now() - startTime;
          if (duration > 1000) {
            logger.warn(`Slow request detected: ${c.req.method} ${c.req.path} (${duration}ms)`);
          }
        }
      });

      // Start server with optimized settings
      this.server = serve({
        fetch: app.fetch,
        port: this.port,
        hostname: '0.0.0.0', // Allow external connections for containerized deployment
      });

      // Set up resource monitoring
      this.setupResourceMonitoring();

      // Set up graceful shutdown handlers
      this.setupGracefulShutdown();

      logger.info(`Optimized server started on port ${this.port}`, {
        memoryLimit: `${this.memoryLimit / 1024 / 1024}MB`,
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development'
      });

      console.log(`🚀 I18n Platform server running on http://localhost:${this.port}`);
      console.log(`📊 Memory limit: ${this.memoryLimit / 1024 / 1024}MB`);
      console.log(`🔍 Health check: http://localhost:${this.port}/health`);
      console.log(`📈 Metrics: http://localhost:${this.port}/api/monitoring/metrics`);

    } catch (error) {
      logger.error('Failed to start optimized server', error instanceof Error ? error : undefined);
      throw error;
    }
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

      // Clean up session store if available
      if (this.sessionStore && typeof this.sessionStore.destroy === 'function') {
        logger.info('Cleaning up session store...');
        await this.sessionStore.destroy();
      }

      logger.info('Graceful shutdown completed');
      clearTimeout(forceShutdownTimer);
      process.exit(0);

    } catch (error) {
      logger.error('Error during graceful shutdown', { 
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
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
        active: this.sessionStore?.getActiveSessionCount?.() || -1
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
  config: HonoServerConfig,
  port: number = 3000,
  memoryLimitMB: number = 2048
): Promise<OptimizedServer> {
  return new OptimizedServer(config, port, memoryLimitMB);
}