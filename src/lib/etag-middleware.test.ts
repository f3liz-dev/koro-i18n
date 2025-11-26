/**
 * Integration tests for ETag middleware
 */
import { describe, it, expect } from 'vitest';
import { createWorkerApp } from '../workers';

// Mock environment
const mockEnv = {
  DB: {} as D1Database,
  GITHUB_CLIENT_ID: 'test_client_id',
  GITHUB_CLIENT_SECRET: 'test_client_secret',
  JWT_SECRET: 'test_jwt_secret',
  ENVIRONMENT: 'test',
};

describe('ETag Middleware Integration', () => {
  it('should add ETag header to /health endpoint', async () => {
    const app = createWorkerApp(mockEnv);
    const response = await app.request('/health');
    
    expect(response.status).toBe(200);
    expect(response.headers.get('ETag')).toBeTruthy();
    expect(response.headers.get('ETag')).toMatch(/^"[a-f0-9]+"$/);
  });

  it('should set correct cache headers for /health endpoint', async () => {
    const app = createWorkerApp(mockEnv);
    const response = await app.request('/health');
    
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('max-age=0, no-cache');
  });

  it('should return 304 Not Modified when ETag matches', async () => {
    const app = createWorkerApp(mockEnv);
    
    // First request to get the ETag
    const response1 = await app.request('/health');
    const etag = response1.headers.get('ETag');
    expect(etag).toBeTruthy();
    
    // Second request with If-None-Match header
    const response2 = await app.request('/health', {
      headers: {
        'If-None-Match': etag!,
      },
    });
    
    expect(response2.status).toBe(304);
    expect(response2.headers.get('ETag')).toBe(etag);
  });

  it('should return full response when ETag does not match', async () => {
    const app = createWorkerApp(mockEnv);
    
    const response = await app.request('/health', {
      headers: {
        'If-None-Match': '"different-etag"',
      },
    });
    
    expect(response.status).toBe(200);
    expect(response.headers.get('ETag')).toBeTruthy();
    
    const body = await response.json();
    expect(body).toEqual({ status: 'ok', runtime: 'cloudflare-workers' });
  });

  it('should generate consistent ETags for same content', async () => {
    const app = createWorkerApp(mockEnv);
    
    const response1 = await app.request('/health');
    const etag1 = response1.headers.get('ETag');
    
    const response2 = await app.request('/health');
    const etag2 = response2.headers.get('ETag');
    
    expect(etag1).toBe(etag2);
  });

  it('should not add ETag to POST requests', async () => {
    const app = createWorkerApp(mockEnv);
    
    // POST requests should not have ETags
    const response = await app.request('/api/projects/test/translations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectId: 'test',
        language: 'en',
        key: 'test',
        value: 'test',
      }),
    });
    
    // Will fail auth, but should not have ETag
    expect(response.headers.get('ETag')).toBeNull();
  });

  it('should not add ETag to non-JSON responses', async () => {
    const app = createWorkerApp(mockEnv);
    
    // Non-existent route will return text/plain error
    const response = await app.request('/api/nonexistent');
    
    // Should not have ETag for non-JSON responses
    expect(response.headers.get('ETag')).toBeNull();
  });
});
