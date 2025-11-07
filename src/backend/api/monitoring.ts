/**
 * Monitoring and logging API endpoints
 */

import { Hono, type Context } from 'hono';
import { createHonoAuthMiddleware } from '../../api/middleware/hono-auth.js';
import { createErrorHandler, createRequestValidator } from '../../api/middleware/error-handling.js';
import { logger, type LogFilter } from '../services/LoggingService.js';
import { AuthService } from '../services/AuthService.js';

export function createMonitoringRoutes(authService: AuthService) {
  const monitoringRoutes = new Hono();
  const { authenticate } = createHonoAuthMiddleware(authService);
  const { errorHandler, asyncHandler } = createErrorHandler();
  const { validateRequest, validators } = createRequestValidator();

  // Apply middleware to all routes
  monitoringRoutes.use('*', errorHandler);
  monitoringRoutes.use('*', authenticate);

  /**
   * Get system logs with filtering
   * GET /api/monitoring/logs
   */
  monitoringRoutes.get('/logs',
    validateRequest({
      query: {
        level: (value: string | undefined) => !value || ['debug', 'info', 'warn', 'error'].includes(value),
        limit: (value: string | undefined) => !value || validators.isNumber(value),
        startTime: (value: string | undefined) => !value || !isNaN(Date.parse(value)),
        endTime: (value: string | undefined) => !value || !isNaN(Date.parse(value)),
        userId: (value: string | undefined) => !value || validators.isString(value),
        path: (value: string | undefined) => !value || validators.isString(value),
        method: (value: string | undefined) => !value || validators.isString(value)
      }
    }),
    asyncHandler(async (c: Context) => {
      const requestId = c.get('requestId');
      const session = c.get('user');

      // Build filter from query parameters
      const filter: LogFilter = {};
      
      const level = c.req.query('level');
      if (level) filter.level = level as LogFilter['level'];
      
      const startTime = c.req.query('startTime');
      if (startTime) filter.startTime = new Date(startTime);
      
      const endTime = c.req.query('endTime');
      if (endTime) filter.endTime = new Date(endTime);
      
      const userId = c.req.query('userId');
      if (userId) filter.userId = userId;
      
      const path = c.req.query('path');
      if (path) filter.path = path;
      
      const method = c.req.query('method');
      if (method) filter.method = method;

      const limit = parseInt(c.req.query('limit') || '100');

      logger.info('System logs requested', { 
        filter, 
        limit, 
        requestedBy: session.username 
      }, requestId);

      const logs = logger.getLogs(filter, limit);

      return c.json({
        logs,
        count: logs.length,
        filter,
        timestamp: new Date().toISOString()
      });
    })
  );

  /**
   * Get log statistics
   * GET /api/monitoring/logs/stats
   */
  monitoringRoutes.get('/logs/stats',
    validateRequest({
      query: {
        timeWindow: (value: string | undefined) => !value || validators.isNumber(value)
      }
    }),
    asyncHandler(async (c: Context) => {
      const requestId = c.get('requestId');
      const session = c.get('user');
      
      const timeWindow = parseInt(c.req.query('timeWindow') || '3600000'); // Default 1 hour

      logger.info('Log statistics requested', { 
        timeWindow, 
        requestedBy: session.username 
      }, requestId);

      const stats = logger.getStats(timeWindow);

      return c.json({
        ...stats,
        timeWindow,
        timestamp: new Date().toISOString()
      });
    })
  );

  /**
   * Export logs for external analysis
   * GET /api/monitoring/logs/export
   */
  monitoringRoutes.get('/logs/export',
    validateRequest({
      query: {
        level: (value: string | undefined) => !value || ['debug', 'info', 'warn', 'error'].includes(value),
        startTime: (value: string | undefined) => !value || !isNaN(Date.parse(value)),
        endTime: (value: string | undefined) => !value || !isNaN(Date.parse(value)),
        format: (value: string | undefined) => !value || ['json', 'text'].includes(value)
      }
    }),
    asyncHandler(async (c: Context) => {
      const requestId = c.get('requestId');
      const session = c.get('user');

      // Build filter from query parameters
      const filter: LogFilter = {};
      
      const level = c.req.query('level');
      if (level) filter.level = level as LogFilter['level'];
      
      const startTime = c.req.query('startTime');
      if (startTime) filter.startTime = new Date(startTime);
      
      const endTime = c.req.query('endTime');
      if (endTime) filter.endTime = new Date(endTime);

      const format = c.req.query('format') || 'json';

      logger.info('Log export requested', { 
        filter, 
        format,
        requestedBy: session.username 
      }, requestId);

      const exportData = logger.exportLogs(filter);

      if (format === 'text') {
        c.header('Content-Type', 'text/plain');
        c.header('Content-Disposition', `attachment; filename="logs-${new Date().toISOString().split('T')[0]}.txt"`);
        return c.text(exportData);
      } else {
        c.header('Content-Type', 'application/json');
        c.header('Content-Disposition', `attachment; filename="logs-${new Date().toISOString().split('T')[0]}.json"`);
        return c.text(exportData);
      }
    })
  );

  /**
   * Clear old logs (cleanup endpoint)
   * POST /api/monitoring/logs/cleanup
   */
  monitoringRoutes.post('/logs/cleanup', asyncHandler(async (c: Context) => {
    const requestId = c.get('requestId');
    const session = c.get('user');

    logger.info('Log cleanup requested', { requestedBy: session.username }, requestId);
    
    logger.cleanup();

    return c.json({
      success: true,
      message: 'Log cleanup completed',
      timestamp: new Date().toISOString()
    });
  }));

  /**
   * Get system performance metrics
   * GET /api/monitoring/performance
   */
  monitoringRoutes.get('/performance', asyncHandler(async (c: Context) => {
    const requestId = c.get('requestId');
    const session = c.get('user');

    logger.info('Performance metrics requested', { requestedBy: session.username }, requestId);

    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return c.json({
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        used: Math.round(memUsage.heapUsed / 1024 / 1024),
        total: Math.round(memUsage.heapTotal / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024),
        rss: Math.round(memUsage.rss / 1024 / 1024),
        limit: 2048 // 2GB limit from requirements
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    });
  }));

  /**
   * Test error handling and logging
   * POST /api/monitoring/test-error
   */
  monitoringRoutes.post('/test-error',
    validateRequest({
      body: (body: any) => {
        const errors = [];
        if (!body || typeof body !== 'object') {
          errors.push({ field: 'body', message: 'Request body is required' });
          return errors;
        }
        if (!body.errorType || typeof body.errorType !== 'string') {
          errors.push({ field: 'errorType', message: 'errorType is required and must be a string' });
        }
        return errors;
      }
    }),
    asyncHandler(async (c: Context) => {
      const requestId = c.get('requestId');
      const session = c.get('user');
      const { errorType, message } = await c.req.json();

      logger.info('Test error requested', { 
        errorType, 
        message,
        requestedBy: session.username 
      }, requestId);

      // Generate different types of test errors
      switch (errorType) {
        case 'validation':
          throw new Error('Test validation error: ' + (message || 'Invalid input data'));
        
        case 'authentication':
          const authError = new Error('Test authentication error: ' + (message || 'Invalid credentials'));
          authError.message = 'authentication failed';
          throw authError;
        
        case 'authorization':
          const authzError = new Error('Test authorization error: ' + (message || 'Access denied'));
          authzError.message = 'access denied';
          throw authzError;
        
        case 'github_api':
          const githubError = new Error('Test GitHub API error: ' + (message || 'API rate limit exceeded'));
          githubError.message = 'GitHub API error';
          throw githubError;
        
        case 'not_found':
          const notFoundError = new Error('Test not found error: ' + (message || 'Resource not found'));
          notFoundError.message = 'not found';
          throw notFoundError;
        
        case 'internal':
        default:
          throw new Error('Test internal server error: ' + (message || 'Something went wrong'));
      }
    })
  );

  return monitoringRoutes;
}