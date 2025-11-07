/**
 * Hono-based authentication API endpoints
 */

import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import * as crypto from 'crypto';
import { logger } from '../services/LoggingService.js';
import { createErrorHandler, createRequestValidator } from '../middleware/error-handling.js';
import type { AuthService } from '../services/AuthService.js';



export function createHonoAuthRoutes(authService: AuthService) {
  const auth = new Hono();
  const { errorHandler, asyncHandler } = createErrorHandler();
  const { validateRequest, validators } = createRequestValidator();

  // Apply error handling middleware
  auth.use('*', errorHandler);

  // Initiate GitHub OAuth flow
  auth.get('/auth/github', 
    validateRequest({
      query: {
        redirect_url: (value: string | undefined) => !value || validators.isString(value)
      }
    }),
    asyncHandler(async (c) => {
      const requestId = c.get('requestId');
      const redirectUrl = c.req.query('redirect_url');
      
      logger.info('GitHub OAuth initiation requested', { redirectUrl }, requestId);
      
      const { url, state } = authService.generateAuthUrl(redirectUrl);

      // Set state in secure cookie for additional validation
      setCookie(c, 'oauth_state', state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Lax',
        maxAge: 600, // 10 minutes
        path: '/'
      });

      logger.info('GitHub OAuth URL generated', { state }, requestId);
      return c.redirect(url);
    })
  );

  // Handle OAuth callback
  auth.get('/auth/callback', 
    validateRequest({
      query: {
        code: (value: string | undefined) => validators.required(value),
        state: (value: string | undefined) => validators.required(value)
      }
    }),
    asyncHandler(async (c) => {
      const requestId = c.get('requestId');
      const code = c.req.query('code')!;
      const state = c.req.query('state')!;
      const error = c.req.query('error');
      const errorDescription = c.req.query('error_description');

      logger.info('OAuth callback received', { state, hasError: !!error }, requestId);

      // Handle OAuth errors
      if (error) {
        logger.error('OAuth error received', new Error(errorDescription || error), { error, errorDescription }, requestId);
        throw new Error(`OAuth authentication failed: ${errorDescription || error}`);
      }

      // Validate state matches cookie (CSRF protection)
      const cookieState = getCookie(c, 'oauth_state');
      if (!cookieState || cookieState !== state) {
        logger.error('OAuth state mismatch', new Error('CSRF protection triggered'), { 
          cookieState: !!cookieState, 
          stateMatch: cookieState === state 
        }, requestId);
        throw new Error('State parameter mismatch - possible CSRF attack');
      }

      // Exchange code for user and token
      const { user, token } = await authService.handleCallback(code, state);

      // Set JWT token in secure cookie
      setCookie(c, 'auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Lax',
        maxAge: 24 * 60 * 60, // 24 hours
        path: '/'
      });

      // Clear OAuth state cookie
      deleteCookie(c, 'oauth_state');

      logger.logAuth('login', user.id, { username: user.username }, requestId);

      // Return user info (without sensitive data)
      return c.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          avatarUrl: user.avatarUrl,
          preferences: user.preferences
        }
      });
    })
  );

  // Get current user info
  auth.get('/auth/me', asyncHandler(async (c) => {
    const requestId = c.get('requestId');
    
    // Get token from cookie or Authorization header
    let token = getCookie(c, 'auth_token');
    
    if (!token) {
      const authHeader = c.req.header('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      logger.warn('Authentication required - no token provided', {}, requestId);
      throw new Error('No authentication token provided');
    }

    // Validate token and get session
    const session = await authService.validateToken(token);
    if (!session) {
      // Clear invalid cookie
      deleteCookie(c, 'auth_token');
      logger.warn('Invalid authentication token', {}, requestId);
      throw new Error('Authentication token is invalid or expired');
    }

    logger.info('User info retrieved', { userId: session.userId, username: session.username }, requestId);

    return c.json({
      user: {
        id: session.userId,
        username: session.username,
        githubId: session.githubId
      }
    });
  }));

  // Logout
  auth.post('/auth/logout', asyncHandler(async (c) => {
    const requestId = c.get('requestId');
    
    // Get token from cookie or Authorization header
    let token = getCookie(c, 'auth_token');
    
    if (!token) {
      const authHeader = c.req.header('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      logger.warn('Logout attempted without token', {}, requestId);
      throw new Error('No authentication token provided');
    }

    // Validate token and get session
    const session = await authService.validateToken(token);
    if (!session) {
      // Clear invalid cookie anyway
      deleteCookie(c, 'auth_token');
      logger.warn('Logout attempted with invalid token', {}, requestId);
      throw new Error('Authentication token is invalid or expired');
    }

    await authService.logout(session.userId);
    
    // Clear auth cookie
    deleteCookie(c, 'auth_token');

    logger.logAuth('logout', session.userId, { username: session.username }, requestId);

    return c.json({ success: true, message: 'Logged out successfully' });
  }));

  // Generate CSRF token endpoint
  auth.get('/auth/csrf-token', asyncHandler(async (c) => {
    const requestId = c.get('requestId');
    const token = crypto.randomBytes(32).toString('hex');
    
    // Set CSRF token in cookie
    setCookie(c, 'csrf_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/'
    });

    logger.info('CSRF token generated', {}, requestId);
    return c.json({ csrfToken: token });
  }));

  return auth;
}