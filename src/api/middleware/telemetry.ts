/**
 * Telemetry middleware for request ID generation and context
 */

import type { Next, Context } from 'hono';

/**
 * Generate request ID for tracing requests across services
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Middleware to add request ID to context and headers
 */
export function createRequestIdMiddleware() {
  return async (c: Context, next: Next) => {
    const requestId = generateRequestId();
    c.set('requestId', requestId);
    c.header('X-Request-ID', requestId);
    await next();
  };
}

/**
 * Middleware to record business metrics
 * Note: This is a simplified version that works without OpenTelemetry
 */
export function createBusinessMetricsMiddleware() {
  return async (c: Context, next: Next) => {
    try {
      await next();
      
      // Record successful operations based on path patterns
      const path = c.req.path;
      const method = c.req.method;
      
      // Log business operations for monitoring
      if (path.includes('/auth/')) {
        const operation = path.includes('/login') ? 'login' : 
                         path.includes('/logout') ? 'logout' : 
                         path.includes('/callback') ? 'token_refresh' : 'unknown';
        
        if (operation !== 'unknown') {
          const userId = c.get('user')?.userId;
          console.log(`Auth operation: ${operation}`, { userId, success: true });
        }
      }
      
      if (path.includes('/projects/')) {
        const operation = method === 'GET' ? 'get' : 
                         method === 'PUT' ? 'update' : 
                         method === 'POST' && path.includes('/refresh') ? 'refresh' : 'unknown';
        
        if (operation !== 'unknown') {
          const projectId = c.req.param('projectId');
          console.log(`Project operation: ${operation}`, { projectId, success: true });
        }
      }
      
      if (path.includes('/translations/')) {
        const operation = method === 'GET' ? 'extract' : 
                         method === 'POST' && path.includes('/validate') ? 'validate' : 
                         method === 'POST' ? 'submit' : 'unknown';
        
        if (operation !== 'unknown') {
          const projectId = c.req.param('projectId') || 'unknown';
          const language = c.req.query('language') || 'unknown';
          console.log(`Translation operation: ${operation}`, { projectId, language, success: true });
        }
      }
      
    } catch (error) {
      // Error recording is handled by the error handler middleware
      throw error;
    }
  };
}