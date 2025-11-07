/**
 * Comprehensive error handling and monitoring middleware for Hono
 * Consolidated from backend and workers middleware
 * Compatible with both Node.js and Cloudflare Workers environments
 */

import type { Context, Next } from 'hono';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

// Error types for structured error responses
export interface ApiError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  path: string;
  method: string;
  statusCode: number;
}

// Workers-compatible error response interface
export interface WorkersErrorResponse {
  error: string;
  message: string;
  requestId?: string;
  timestamp: string;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// Request metrics for monitoring
interface RequestMetrics {
  path: string;
  method: string;
  statusCode: number;
  duration: number;
  timestamp: Date;
  userAgent?: string;
  ip?: string;
}

// In-memory metrics store (in production, use external monitoring)
class MetricsStore {
  private requests: RequestMetrics[] = [];
  private readonly maxEntries = 1000;

  addRequest(metrics: RequestMetrics) {
    this.requests.push(metrics);
    
    // Keep only recent entries
    if (this.requests.length > this.maxEntries) {
      this.requests = this.requests.slice(-this.maxEntries);
    }
  }

  getMetrics(timeWindow: number = 3600000): {
    totalRequests: number;
    averageResponseTime: number;
    errorRate: number;
    statusCodes: Record<number, number>;
    topPaths: Array<{ path: string; count: number }>;
  } {
    const cutoff = new Date(Date.now() - timeWindow);
    const recentRequests = this.requests.filter(r => r.timestamp >= cutoff);

    if (recentRequests.length === 0) {
      return {
        totalRequests: 0,
        averageResponseTime: 0,
        errorRate: 0,
        statusCodes: {},
        topPaths: []
      };
    }

    const totalRequests = recentRequests.length;
    const averageResponseTime = recentRequests.reduce((sum, r) => sum + r.duration, 0) / totalRequests;
    const errorRequests = recentRequests.filter(r => r.statusCode >= 400).length;
    const errorRate = (errorRequests / totalRequests) * 100;

    // Count status codes
    const statusCodes: Record<number, number> = {};
    recentRequests.forEach(r => {
      statusCodes[r.statusCode] = (statusCodes[r.statusCode] || 0) + 1;
    });

    // Count paths
    const pathCounts: Record<string, number> = {};
    recentRequests.forEach(r => {
      pathCounts[r.path] = (pathCounts[r.path] || 0) + 1;
    });

    const topPaths = Object.entries(pathCounts)
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalRequests,
      averageResponseTime: Math.round(averageResponseTime * 100) / 100,
      errorRate: Math.round(errorRate * 100) / 100,
      statusCodes,
      topPaths
    };
  }

  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Record<string, { status: 'pass' | 'fail'; message?: string }>;
  } {
    const metrics = this.getMetrics(300000); // 5 minutes
    const checks: Record<string, { status: 'pass' | 'fail'; message?: string }> = {};

    // Check error rate
    if (metrics.errorRate > 50) {
      checks.errorRate = { status: 'fail', message: `High error rate: ${metrics.errorRate}%` };
    } else if (metrics.errorRate > 20) {
      checks.errorRate = { status: 'fail', message: `Elevated error rate: ${metrics.errorRate}%` };
    } else {
      checks.errorRate = { status: 'pass' };
    }

    // Check response time
    if (metrics.averageResponseTime > 2000) {
      checks.responseTime = { status: 'fail', message: `Slow response time: ${metrics.averageResponseTime}ms` };
    } else if (metrics.averageResponseTime > 1000) {
      checks.responseTime = { status: 'fail', message: `Elevated response time: ${metrics.averageResponseTime}ms` };
    } else {
      checks.responseTime = { status: 'pass' };
    }

    // Check memory usage (Node.js only, skip for Workers)
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memUsage = process.memoryUsage();
      const memUsageMB = memUsage.heapUsed / 1024 / 1024;
      if (memUsageMB > 1800) { // Close to 2GB limit
        checks.memory = { status: 'fail', message: `High memory usage: ${Math.round(memUsageMB)}MB` };
      } else if (memUsageMB > 1500) {
        checks.memory = { status: 'fail', message: `Elevated memory usage: ${Math.round(memUsageMB)}MB` };
      } else {
        checks.memory = { status: 'pass' };
      }
    }

    // Determine overall status
    const failedChecks = Object.values(checks).filter(c => c.status === 'fail').length;
    let status: 'healthy' | 'degraded' | 'unhealthy';
    
    if (failedChecks === 0) {
      status = 'healthy';
    } else if (failedChecks <= 1) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return { status, checks };
  }
}

const metricsStore = new MetricsStore();

/**
 * Create comprehensive error handling middleware
 */
export function createErrorHandler() {
  
  /**
   * Global error handler middleware
   */
  const errorHandler = async (c: Context, next: Next) => {
    const startTime = Date.now();
    let statusCode = 200;

    try {
      await next();
      statusCode = c.res.status;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Log error for debugging
      console.error('Request error:', {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        requestId: c.get('requestId'),
        timestamp: new Date().toISOString(),
        method: c.req.method,
        path: c.req.path
      });

      if (error instanceof HTTPException) {
        statusCode = error.status;
        
        const apiError: ApiError = {
          code: `HTTP_${error.status}`,
          message: error.message,
          timestamp: new Date().toISOString(),
          path: c.req.path,
          method: c.req.method,
          statusCode: error.status
        };

        return c.json({ error: apiError }, error.status);
      }

      // Handle validation errors
      if (error instanceof Error && error.name === 'ValidationError') {
        statusCode = 400;
        
        const apiError: ApiError = {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: error.message,
          timestamp: new Date().toISOString(),
          path: c.req.path,
          method: c.req.method,
          statusCode: 400
        };

        return c.json({ error: apiError }, 400);
      }

      // Handle GitHub API errors
      if (error instanceof Error && error.message.includes('GitHub API')) {
        statusCode = 502;
        
        const apiError: ApiError = {
          code: 'GITHUB_API_ERROR',
          message: 'GitHub service unavailable',
          details: error.message,
          timestamp: new Date().toISOString(),
          path: c.req.path,
          method: c.req.method,
          statusCode: 502
        };

        return c.json({ error: apiError }, 502);
      }

      // Handle authentication errors
      if (error instanceof Error && (
        error.message.includes('authentication') || 
        error.message.includes('unauthorized') ||
        error.message.includes('token') ||
        error.message.includes('Unauthorized')
      )) {
        statusCode = 401;
        
        const apiError: ApiError = {
          code: 'AUTHENTICATION_ERROR',
          message: 'Authentication failed',
          details: error.message,
          timestamp: new Date().toISOString(),
          path: c.req.path,
          method: c.req.method,
          statusCode: 401
        };

        return c.json({ error: apiError }, 401);
      }

      // Handle authorization errors
      if (error instanceof Error && (
        error.message.includes('access denied') || 
        error.message.includes('forbidden') ||
        error.message.includes('permission') ||
        error.message.includes('Forbidden')
      )) {
        statusCode = 403;
        
        const apiError: ApiError = {
          code: 'AUTHORIZATION_ERROR',
          message: 'Access denied',
          details: error.message,
          timestamp: new Date().toISOString(),
          path: c.req.path,
          method: c.req.method,
          statusCode: 403
        };

        return c.json({ error: apiError }, 403);
      }

      // Handle not found errors
      if (error instanceof Error && (
        error.message.includes('not found') || 
        error.message.includes('does not exist') ||
        error.message.includes('Not found')
      )) {
        statusCode = 404;
        
        const apiError: ApiError = {
          code: 'NOT_FOUND',
          message: 'Resource not found',
          details: error.message,
          timestamp: new Date().toISOString(),
          path: c.req.path,
          method: c.req.method,
          statusCode: 404
        };

        return c.json({ error: apiError }, 404);
      }

      // Handle bad request errors
      if (error instanceof Error && error.message.includes('Bad request')) {
        statusCode = 400;
        
        const apiError: ApiError = {
          code: 'BAD_REQUEST',
          message: 'Invalid request',
          details: error.message,
          timestamp: new Date().toISOString(),
          path: c.req.path,
          method: c.req.method,
          statusCode: 400
        };

        return c.json({ error: apiError }, 400);
      }

      // Generic server error
      statusCode = 500;
      
      const apiError: ApiError = {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
        details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : String(error) : undefined,
        timestamp: new Date().toISOString(),
        path: c.req.path,
        method: c.req.method,
        statusCode: 500
      };

      return c.json({ error: apiError }, 500);
    } finally {
      // Record metrics
      const duration = Date.now() - startTime;
      const metrics: RequestMetrics = {
        path: c.req.path,
        method: c.req.method,
        statusCode,
        duration,
        timestamp: new Date(),
        userAgent: c.req.header('user-agent'),
        ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip')
      };

      metricsStore.addRequest(metrics);
    }
  };

  /**
   * Async handler wrapper for better error handling
   */
  const asyncHandler = (handler: (c: Context) => Promise<Response | void>) => {
    return async (c: Context) => {
      try {
        return await handler(c);
      } catch (error) {
        throw error; // Let the error handler middleware catch it
      }
    };
  };

  /**
   * Get metrics for monitoring
   */
  const getMetrics = (timeWindow?: number) => metricsStore.getMetrics(timeWindow);

  /**
   * Get health status
   */
  const getHealthStatus = () => metricsStore.getHealthStatus();

  return {
    errorHandler,
    asyncHandler,
    getMetrics,
    getHealthStatus
  };
}

/**
 * Create request validation middleware
 */
export function createRequestValidator() {
  
  /**
   * Validate request parameters
   */
  const validateRequest = (schema: {
    params?: Record<string, (value: string) => boolean>;
    query?: Record<string, (value: string | undefined) => boolean>;
    body?: (body: any) => ValidationError[];
  }) => {
    return async (c: Context, next: Next) => {
      const errors: ValidationError[] = [];

      // Validate path parameters
      if (schema.params) {
        for (const [param, validator] of Object.entries(schema.params)) {
          const value = c.req.param(param);
          if (!validator(value)) {
            errors.push({
              field: `params.${param}`,
              message: `Invalid parameter: ${param}`,
              value
            });
          }
        }
      }

      // Validate query parameters
      if (schema.query) {
        for (const [param, validator] of Object.entries(schema.query)) {
          const value = c.req.query(param);
          if (!validator(value)) {
            errors.push({
              field: `query.${param}`,
              message: `Invalid query parameter: ${param}`,
              value
            });
          }
        }
      }

      // Validate request body
      if (schema.body && ['POST', 'PUT', 'PATCH'].includes(c.req.method)) {
        try {
          const body = await c.req.json();
          const bodyErrors = schema.body(body);
          errors.push(...bodyErrors);
        } catch (error) {
          errors.push({
            field: 'body',
            message: 'Invalid JSON in request body'
          });
        }
      }

      if (errors.length > 0) {
        const validationError = new Error('Request validation failed');
        validationError.name = 'ValidationError';
        (validationError as any).details = errors;
        throw validationError;
      }

      await next();
    };
  };

  /**
   * Common validation functions
   */
  const validators = {
    required: (value: any) => value !== undefined && value !== null && value !== '',
    isString: (value: any) => typeof value === 'string',
    isNumber: (value: any) => !isNaN(Number(value)),
    isBoolean: (value: any) => value === 'true' || value === 'false' || typeof value === 'boolean',
    isEmail: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    minLength: (min: number) => (value: string) => value && value.length >= min,
    maxLength: (max: number) => (value: string) => value && value.length <= max,
    isUUID: (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value),
    isProjectId: (value: string) => /^[a-zA-Z0-9\-_]+$/.test(value) && value.length > 0,
    isLanguageCode: (value: string) => /^[a-z]{2}(-[A-Z]{2})?$/.test(value)
  };

  return {
    validateRequest,
    validators
  };
}

/**
 * Create monitoring endpoints
 */
export function createMonitoringRoutes() {
  const monitoringRoutes = new Hono();
  const { getMetrics, getHealthStatus } = createErrorHandler();

  /**
   * Health check endpoint
   * GET /health
   */
  monitoringRoutes.get('/health', (c: Context) => {
    const health = getHealthStatus();
    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'degraded' ? 200 : 503;

    const response: any = {
      status: health.status,
      timestamp: new Date().toISOString(),
      checks: health.checks
    };

    // Add Node.js specific info if available
    if (typeof process !== 'undefined') {
      response.uptime = process.uptime();
      response.memory = {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        limit: 2048 // 2GB limit
      };
    } else {
      // Workers environment
      response.runtime = 'cloudflare-workers';
      response.environment = c.env?.ENVIRONMENT || 'unknown';
    }

    return c.json(response, statusCode);
  });

  /**
   * Detailed health check endpoint
   * GET /health/detailed
   */
  monitoringRoutes.get('/health/detailed', (c: Context) => {
    const health = getHealthStatus();
    const metrics = getMetrics();

    const response: any = {
      status: health.status,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      metrics: {
        requests: metrics.totalRequests,
        averageResponseTime: metrics.averageResponseTime,
        errorRate: metrics.errorRate,
        statusCodes: metrics.statusCodes,
        topPaths: metrics.topPaths
      },
      checks: health.checks
    };

    // Add Node.js specific info if available
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memUsage = process.memoryUsage();
      response.uptime = process.uptime();
      response.memory = {
        used: Math.round(memUsage.heapUsed / 1024 / 1024),
        total: Math.round(memUsage.heapTotal / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024),
        rss: Math.round(memUsage.rss / 1024 / 1024),
        limit: 2048
      };
    } else {
      // Workers environment
      response.runtime = 'cloudflare-workers';
    }

    return c.json(response);
  });

  /**
   * Metrics endpoint
   * GET /metrics
   */
  monitoringRoutes.get('/metrics', (c: Context) => {
    const timeWindow = parseInt(c.req.query('window') || '3600000'); // Default 1 hour
    const metrics = getMetrics(timeWindow);

    return c.json({
      timeWindow,
      timestamp: new Date().toISOString(),
      ...metrics
    });
  });

  /**
   * Ready check endpoint (for Kubernetes readiness probes)
   * GET /ready
   */
  monitoringRoutes.get('/ready', (c: Context) => {
    const response: any = {
      status: 'ready',
      timestamp: new Date().toISOString()
    };

    // Add runtime info
    if (typeof process !== 'undefined') {
      response.runtime = 'nodejs';
    } else {
      response.runtime = 'cloudflare-workers';
    }

    return c.json(response);
  });

  return monitoringRoutes;
}