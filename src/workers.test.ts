import { describe, it, expect, beforeEach } from 'vitest';
import { createWorkerApp } from './workers';

// Mock environment for testing
const createMockEnv = () => {
  const db = {
    prepare: (query: string) => ({
      bind: (...params: any[]) => ({
        first: async () => null,
        all: async () => ({ results: [] }),
        run: async () => ({ success: true }),
      }),
    }),
  };

  return {
    DB: db as unknown as D1Database,
    GITHUB_CLIENT_ID: 'test-client-id',
    GITHUB_CLIENT_SECRET: 'test-client-secret',
    JWT_SECRET: 'test-jwt-secret',
    ENVIRONMENT: 'test',
  };
};

describe('API Endpoints', () => {
  describe('POST /api/projects/:projectName/upload-json', () => {
    it('should require authorization token', async () => {
      const env = createMockEnv();
      const app = createWorkerApp(env);

      const req = new Request('http://localhost/api/projects/test-project/upload-json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          branch: 'main',
          commitSha: 'abc123',
          language: 'en',
          files: {
            'common.json': { welcome: 'Welcome' },
          },
        }),
      });

      const res = await app.fetch(req, env, {} as ExecutionContext);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data).toHaveProperty('error');
    });

    it('should require files field', async () => {
      const env = createMockEnv();
      const app = createWorkerApp(env);

      const req = new Request('http://localhost/api/projects/test-project/upload-json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer fake-token',
        },
        body: JSON.stringify({
          branch: 'main',
          commitSha: 'abc123',
          language: 'en',
        }),
      });

      const res = await app.fetch(req, env, {} as ExecutionContext);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('files');
    });

    it('should reject too many files', async () => {
      const env = createMockEnv();
      const app = createWorkerApp(env);

      const files: Record<string, any> = {};
      for (let i = 0; i < 101; i++) {
        files[`file${i}.json`] = { key: 'value' };
      }

      const req = new Request('http://localhost/api/projects/test-project/upload-json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer fake-token',
        },
        body: JSON.stringify({
          branch: 'main',
          commitSha: 'abc123',
          language: 'en',
          files,
        }),
      });

      const res = await app.fetch(req, env, {} as ExecutionContext);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('Too many files');
    });
  });

  describe('GET /api/projects/:projectName/download', () => {
    it('should require authorization token', async () => {
      const env = createMockEnv();
      const app = createWorkerApp(env);

      const req = new Request('http://localhost/api/projects/test-project/download?branch=main', {
        method: 'GET',
      });

      const res = await app.fetch(req, env, {} as ExecutionContext);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data).toHaveProperty('error');
    });
  });

  describe('JSON flattening', () => {
    it('should flatten nested objects correctly', () => {
      const flattenObject = (obj: any, prefix = ''): Record<string, string> => {
        const result: Record<string, string> = {};
        for (const [key, value] of Object.entries(obj)) {
          const newKey = prefix ? `${prefix}.${key}` : key;
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            Object.assign(result, flattenObject(value, newKey));
          } else {
            result[newKey] = String(value);
          }
        }
        return result;
      };

      const input = {
        welcome: 'Welcome',
        buttons: {
          save: 'Save',
          cancel: 'Cancel',
        },
        nested: {
          deep: {
            key: 'value',
          },
        },
      };

      const expected = {
        welcome: 'Welcome',
        'buttons.save': 'Save',
        'buttons.cancel': 'Cancel',
        'nested.deep.key': 'value',
      };

      const result = flattenObject(input);
      expect(result).toEqual(expected);
    });

    it('should handle arrays by converting to string', () => {
      const flattenObject = (obj: any, prefix = ''): Record<string, string> => {
        const result: Record<string, string> = {};
        for (const [key, value] of Object.entries(obj)) {
          const newKey = prefix ? `${prefix}.${key}` : key;
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            Object.assign(result, flattenObject(value, newKey));
          } else {
            result[newKey] = String(value);
          }
        }
        return result;
      };

      const input = {
        items: ['one', 'two', 'three'],
      };

      const result = flattenObject(input);
      expect(result.items).toBe('one,two,three');
    });
  });
});
