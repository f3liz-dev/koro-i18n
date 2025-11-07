/**
 * Tests for Hono authentication system
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createHonoApp } from '@/config/server.js';
import type { HonoServerConfig } from '@/config/server.js';

describe('Hono Authentication System', () => {
  let app: ReturnType<typeof createHonoApp>;
  let config: HonoServerConfig;

  beforeEach(() => {
    config = {
      github: {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        redirectUri: 'http://localhost:3000/api/auth/callback'
      },
      jwtSecret: 'test-jwt-secret-key-for-testing-purposes',
      corsOrigin: ['http://localhost:5173']
    };
    
    app = createHonoApp(config);
  });

  it('should create Hono app successfully', () => {
    expect(app).toBeDefined();
    expect(typeof app.fetch).toBe('function');
  });

  it('should respond to health check', async () => {
    const req = new Request('http://localhost:3000/health');
    const res = await app.fetch(req);
    
    expect(res.status).toBe(200);
    
    const data = await res.json();
    expect(data.status).toBe('ok');
    expect(data.timestamp).toBeDefined();
  });

  it('should respond to root endpoint', async () => {
    const req = new Request('http://localhost:3000/');
    const res = await app.fetch(req);
    
    expect(res.status).toBe(200);
    
    const data = await res.json();
    expect(data.name).toBe('I18n Platform API');
    expect(data.version).toBe('1.0.0');
    expect(data.status).toBe('running');
  });

  it('should redirect to GitHub OAuth on /api/auth/github', async () => {
    const req = new Request('http://localhost:3000/api/auth/github');
    const res = await app.fetch(req);
    
    expect(res.status).toBe(302);
    
    const location = res.headers.get('Location');
    expect(location).toContain('github.com/login/oauth/authorize');
    expect(location).toContain('client_id=test-client-id');
  });

  it('should require authentication for /api/auth/me', async () => {
    const req = new Request('http://localhost:3000/api/auth/me');
    const res = await app.fetch(req);
    
    expect(res.status).toBe(401);
    
    const data = await res.json();
    expect(data.error).toBe('Authentication required');
  });

  it('should generate CSRF token', async () => {
    const req = new Request('http://localhost:3000/api/auth/csrf-token');
    const res = await app.fetch(req);
    
    expect(res.status).toBe(200);
    
    const data = await res.json();
    expect(data.csrfToken).toBeDefined();
    expect(typeof data.csrfToken).toBe('string');
    
    // Check that CSRF cookie is set
    const setCookieHeader = res.headers.get('Set-Cookie');
    expect(setCookieHeader).toContain('csrf_token=');
  });

  it('should handle OAuth callback with missing parameters', async () => {
    const req = new Request('http://localhost:3000/api/auth/callback');
    const res = await app.fetch(req);
    
    expect(res.status).toBe(400);
    
    const data = await res.json();
    expect(data.error).toBe('Invalid OAuth callback');
  });
});