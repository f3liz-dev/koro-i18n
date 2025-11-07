/**
 * Hono authentication middleware for JWT token validation and CSRF protection
 */

import type { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import type { AuthService } from '../services/AuthService.js';

export function createHonoAuthMiddleware(authService: AuthService) {
  
  /**
   * JWT Authentication middleware with 24-hour session management
   */
  const authenticate = async (c: Context, next: Next) => {
    try {
      // Get token from cookie or Authorization header
      let token = getCookie(c, 'auth_token');
      
      if (!token) {
        const authHeader = c.req.header('Authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
          token = authHeader.substring(7);
        }
      }

      if (!token) {
        return c.json({
          error: 'Authentication required',
          message: 'No authentication token provided'
        }, 401);
      }

      // Validate token and get session
      const session = await authService.validateToken(token);
      if (!session) {
        // Clear invalid cookie if it exists
        if (getCookie(c, 'auth_token')) {
          c.header('Set-Cookie', 'auth_token=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax');
        }
        return c.json({
          error: 'Invalid authentication',
          message: 'Authentication token is invalid or expired'
        }, 401);
      }

      // Check if session is within 24-hour expiry
      const now = new Date();
      const sessionAge = now.getTime() - session.createdAt.getTime();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

      if (sessionAge > maxAge) {
        // Session expired, clean up
        await authService.logout(session.userId);
        c.header('Set-Cookie', 'auth_token=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax');
        return c.json({
          error: 'Session expired',
          message: 'Your session has expired. Please log in again.'
        }, 401);
      }

      // Attach session to context
      c.set('user', session);
      await next();
    } catch (error) {
      console.error('Authentication middleware error:', error);
      return c.json({
        error: 'Authentication error',
        message: 'Unable to validate authentication'
      }, 500);
    }
  };

  /**
   * Optional authentication middleware (doesn't fail if no token)
   */
  const optionalAuth = async (c: Context, next: Next) => {
    try {
      let token = getCookie(c, 'auth_token');
      
      if (!token) {
        const authHeader = c.req.header('Authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
          token = authHeader.substring(7);
        }
      }

      if (token) {
        const session = await authService.validateToken(token);
        if (session) {
          c.set('user', session);
        }
      }
      
      await next();
    } catch (error) {
      console.error('Optional auth middleware error:', error);
      // Don't fail the request for optional auth
      await next();
    }
  };

  /**
   * CSRF protection middleware for state-changing operations
   */
  const csrfProtection = async (c: Context, next: Next) => {
    try {
      // Only apply CSRF protection to state-changing methods
      const method = c.req.method;
      if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        await next();
        return;
      }

      // Skip CSRF for OAuth callback (has its own state validation)
      const path = c.req.path;
      if (path.includes('/auth/callback') || path.includes('/auth/github')) {
        await next();
        return;
      }

      // Get CSRF token from header or body
      let csrfToken = c.req.header('X-CSRF-Token');
      
      // If not in header, try to get from body (for form submissions)
      if (!csrfToken && c.req.header('content-type')?.includes('application/json')) {
        try {
          const body = await c.req.json();
          csrfToken = body.csrfToken;
        } catch {
          // Ignore JSON parsing errors
        }
      }
      
      // Get expected token from cookie
      const expectedToken = getCookie(c, 'csrf_token');

      if (!csrfToken || !expectedToken || csrfToken !== expectedToken) {
        return c.json({
          error: 'CSRF token validation failed',
          message: 'Invalid or missing CSRF token. Please refresh the page and try again.'
        }, 403);
      }

      // Attach token to context for potential use
      c.set('csrfToken', csrfToken);
      await next();
    } catch (error) {
      console.error('CSRF protection error:', error);
      return c.json({
        error: 'CSRF validation error',
        message: 'Unable to validate CSRF token'
      }, 500);
    }
  };

  /**
   * Rate limiting middleware
   */
  const createRateLimit = (maxRequests: number = 5, windowMs: number = 15 * 60 * 1000) => {
    const requests = new Map<string, { count: number; resetTime: number }>();

    return async (c: Context, next: Next) => {
      const clientId = c.req.header('x-forwarded-for') || 
                      c.req.header('x-real-ip') || 
                      'unknown';
      
      const now = Date.now();
      const windowStart = now - windowMs;
      
      // Clean up old entries
      for (const [key, value] of requests.entries()) {
        if (value.resetTime < windowStart) {
          requests.delete(key);
        }
      }
      
      const clientRequests = requests.get(clientId);
      
      if (!clientRequests) {
        requests.set(clientId, { count: 1, resetTime: now + windowMs });
        await next();
        return;
      }
      
      if (clientRequests.count >= maxRequests) {
        const retryAfter = Math.ceil((clientRequests.resetTime - now) / 1000);
        return c.json({
          error: 'Rate limit exceeded',
          message: `Too many requests. Try again in ${retryAfter} seconds.`,
          retryAfter
        }, 429);
      }
      
      clientRequests.count++;
      await next();
    };
  };

  /**
   * Security headers middleware
   */
  const securityHeaders = async (c: Context, next: Next) => {
    // Set security headers
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('X-Frame-Options', 'DENY');
    c.header('X-XSS-Protection', '1; mode=block');
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    if (process.env.NODE_ENV === 'production') {
      c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    
    await next();
  };

  return {
    authenticate,
    optionalAuth,
    csrfProtection,
    createRateLimit,
    securityHeaders
  };
}