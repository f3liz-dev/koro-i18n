/**
 * Error handling middleware tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { createErrorHandler, createRequestValidator } from '@/api/middleware/error-handling.js';

describe('Error Handling Middleware', () => {
  let app: Hono;
  let errorHandler: any;
  let asyncHandler: any;
  let validateRequest: any;
  let validators: any;

  beforeEach(() => {
    app = new Hono();
    const errorHandling = createErrorHandler();
    errorHandler = errorHandling.errorHandler;
    asyncHandler = errorHandling.asyncHandler;
    
    const validation = createRequestValidator();
    validateRequest = validation.validateRequest;
    validators = validation.validators;
  });

  it('should handle validation errors', async () => {
    app.use('*', errorHandler);
    app.get('/test', 
      validateRequest({
        query: {
          required: (value: string | undefined) => validators.required(value)
        }
      }),
      (c) => c.json({ success: true })
    );

    const res = await app.request('/test');
    expect(res.status).toBe(400);
    
    const body = await res.json();
    expect(body.error).toBeDefined();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should handle async errors', async () => {
    app.use('*', errorHandler);
    app.get('/test', asyncHandler(async () => {
      throw new Error('Test error');
    }));

    const res = await app.request('/test');
    expect(res.status).toBe(500);
    
    const body = await res.json();
    expect(body.error).toBeDefined();
    expect(body.error.code).toBe('INTERNAL_SERVER_ERROR');
  });

  it('should handle authentication errors', async () => {
    app.use('*', errorHandler);
    app.get('/test', asyncHandler(async () => {
      const error = new Error('Authentication failed');
      error.message = 'authentication failed';
      throw error;
    }));

    const res = await app.request('/test');
    expect(res.status).toBe(401);
    
    const body = await res.json();
    expect(body.error).toBeDefined();
    expect(body.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('should handle authorization errors', async () => {
    app.use('*', errorHandler);
    app.get('/test', asyncHandler(async () => {
      const error = new Error('Access denied');
      error.message = 'access denied';
      throw error;
    }));

    const res = await app.request('/test');
    expect(res.status).toBe(403);
    
    const body = await res.json();
    expect(body.error).toBeDefined();
    expect(body.error.code).toBe('AUTHORIZATION_ERROR');
  });

  it('should handle GitHub API errors', async () => {
    app.use('*', errorHandler);
    app.get('/test', asyncHandler(async () => {
      throw new Error('GitHub API rate limit exceeded');
    }));

    const res = await app.request('/test');
    expect(res.status).toBe(502);
    
    const body = await res.json();
    expect(body.error).toBeDefined();
    expect(body.error.code).toBe('GITHUB_API_ERROR');
  });

  it('should handle not found errors', async () => {
    app.use('*', errorHandler);
    app.get('/test', asyncHandler(async () => {
      const error = new Error('Resource not found');
      error.message = 'not found';
      throw error;
    }));

    const res = await app.request('/test');
    expect(res.status).toBe(404);
    
    const body = await res.json();
    expect(body.error).toBeDefined();
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('should validate request parameters', () => {
    expect(validators.required('test')).toBe(true);
    expect(validators.required('')).toBe(false);
    expect(validators.required(null)).toBe(false);
    expect(validators.required(undefined)).toBe(false);

    expect(validators.isString('test')).toBe(true);
    expect(validators.isString(123)).toBe(false);

    expect(validators.isNumber('123')).toBe(true);
    expect(validators.isNumber('abc')).toBe(false);

    expect(validators.isEmail('test@example.com')).toBe(true);
    expect(validators.isEmail('invalid-email')).toBe(false);

    expect(validators.isUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
    expect(validators.isUUID('invalid-uuid')).toBe(false);

    expect(validators.isProjectId('valid-project-123')).toBe(true);
    expect(validators.isProjectId('invalid project!')).toBe(false);

    expect(validators.isLanguageCode('en')).toBe(true);
    expect(validators.isLanguageCode('en-US')).toBe(true);
    expect(validators.isLanguageCode('invalid')).toBe(false);
  });

  it('should get metrics and health status', () => {
    const { getMetrics, getHealthStatus } = createErrorHandler();
    
    const metrics = getMetrics();
    expect(metrics).toBeDefined();
    expect(metrics.totalRequests).toBeDefined();
    expect(metrics.averageResponseTime).toBeDefined();
    expect(metrics.errorRate).toBeDefined();

    const health = getHealthStatus();
    expect(health).toBeDefined();
    expect(health.status).toBeDefined();
    expect(health.checks).toBeDefined();
  });
});