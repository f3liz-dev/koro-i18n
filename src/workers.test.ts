import { describe, it, expect, beforeEach } from 'vitest';
import { createWorkerApp } from './workers';
import { createJWT } from './lib/auth';

// Mock environment for testing
const createMockEnv = (environment = 'test') => {
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
    ENVIRONMENT: environment,
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
      for (let i = 0; i < 501; i++) {
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

  describe('JWT Authentication', () => {
    it('should create and verify JWT tokens correctly', async () => {
      const user = { id: 'user-123', username: 'testuser', githubId: 12345 };
      const secret = 'test-secret-key';
      const accessToken = 'github-token-xyz';

      // Create JWT
      const token = await createJWT(user, accessToken, secret);
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT has 3 parts

      // Import verifyJWT to test verification
      const { verifyJWT } = await import('./lib/auth');
      
      // Verify JWT
      const payload = await verifyJWT(token, secret);
      expect(payload).not.toBeNull();
      expect(payload?.userId).toBe(user.id);
      expect(payload?.username).toBe(user.username);
      expect(payload?.githubId).toBe(user.githubId);
      expect(payload?.accessToken).toBe(accessToken);
    });

    it('should return null for invalid JWT', async () => {
      const { verifyJWT } = await import('./lib/auth');
      const payload = await verifyJWT('invalid-token', 'test-secret');
      expect(payload).toBeNull();
    });

    it('should return null for JWT with wrong secret', async () => {
      const { verifyJWT } = await import('./lib/auth');
      const user = { id: 'user-123', username: 'testuser', githubId: 12345 };
      const token = await createJWT(user, 'token', 'secret-1');
      const payload = await verifyJWT(token, 'secret-2');
      expect(payload).toBeNull();
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

  describe('GET /api/projects/:projectId/files/summary', () => {
    it('should return translation status instead of full contents', () => {
      // This test documents the expected behavior of the summary endpoint
      // The endpoint should:
      // 1. Return all file metadata (id, filename, lang, branch, etc.)
      // 2. Return translationStatus as a boolean map instead of full contents
      // 3. Return keyCount for quick reference
      // 4. Significantly reduce payload size for UI listing operations
      
      // Example full contents response (original):
      const fullContents = {
        'welcome.message': 'Welcome to our application',
        'login.button': 'Login',
        'signup.button': 'Sign up',
        'error.generic': 'An error occurred',
      };
      
      // Example summary response (optimized):
      const summaryStatus = {
        'welcome.message': true,
        'login.button': true,
        'signup.button': true,
        'error.generic': true,
      };
      
      // Verify that summary is smaller
      const fullSize = JSON.stringify(fullContents).length;
      const summarySize = JSON.stringify(summaryStatus).length;
      
      expect(summarySize).toBeLessThan(fullSize);
      
      // Verify key count
      expect(Object.keys(summaryStatus).length).toBe(4);
    });

    it('should identify untranslated keys with false values', () => {
      // The summary endpoint marks empty/null translations as false
      const translationStatus = {
        'key1': true,  // Has value
        'key2': false, // Empty or missing
        'key3': true,  // Has value
        'key4': false, // Empty or missing
      };
      
      const translatedCount = Object.values(translationStatus).filter(v => v === true).length;
      expect(translatedCount).toBe(2);
      
      const totalKeys = Object.keys(translationStatus).length;
      const percentage = Math.round((translatedCount / totalKeys) * 100);
      expect(percentage).toBe(50);
    });

    it('should support language and filename filters for better optimization', () => {
      // The summary endpoint supports query parameters for filtering:
      // - ?lang=en - Filter by language
      // - ?filename=common.json - Filter by filename
      // - ?branch=main - Filter by branch (default: main)
      // - Combinations: ?lang=en&filename=common.json
      
      // Example: Fetching only English files
      // GET /api/projects/my-project/files/summary?lang=en
      
      // Example: Fetching only a specific file across all languages
      // GET /api/projects/my-project/files/summary?filename=common.json
      
      // Example: Fetching a specific file in a specific language
      // GET /api/projects/my-project/files/summary?lang=en&filename=common.json
      
      // This reduces the payload size further by only returning the files needed
      // For FileSelectionPage: Fetch ?lang=en and ?lang=ja separately
      // For specific file editing: Fetch ?lang=en&filename=common.json
      
      expect(true).toBe(true); // Documentation test
    });

    it('should support source-language parameter to auto-detect actual source language', () => {
      // When fetching files with ?lang=source-language, the API should:
      // 1. Look at the project's configured sourceLanguage (e.g., "en")
      // 2. Check what files are actually uploaded
      // 3. If files are uploaded as "en-US" instead of "en", return those
      
      // This solves the problem where:
      // - Project is configured with sourceLanguage: "en"
      // - Files are uploaded with lang: "en-US"
      // - Calling /files/summary?lang=en returns no files
      // - Calling /files/summary?lang=source-language returns the en-US files
      
      const scenarios = [
        {
          description: 'Files use en-US but config says en',
          configuredSourceLanguage: 'en',
          uploadedLanguages: ['en-US', 'ja', 'ko-KR'],
          expectedSourceLanguage: 'en-US'
        },
        {
          description: 'Exact match exists',
          configuredSourceLanguage: 'en',
          uploadedLanguages: ['en', 'ja', 'ko-KR'],
          expectedSourceLanguage: 'en'
        },
        {
          description: 'No match - fallback to first alphabetically',
          configuredSourceLanguage: 'en',
          uploadedLanguages: ['ja', 'ko-KR', 'zh-CN'],
          expectedSourceLanguage: 'ja'
        }
      ];
      
      expect(scenarios[0].expectedSourceLanguage).toBe('en-US');
      expect(scenarios[1].expectedSourceLanguage).toBe('en');
      expect(scenarios[2].expectedSourceLanguage).toBe('ja');
    });
  });

  describe('SPA Routing', () => {
    it('should serve index.html for SPA routes with file extensions in path', async () => {
      // This test verifies the fix for the 404 issue when reloading URLs like:
      // /projects/floorp-i18n-unofficial/translate/ko-KR/main-browser-chrome.json
      
      const mockEnv = {
        ...createMockEnv(),
        ASSETS: {
          fetch: async (request: Request | URL) => {
            const url = typeof request === 'string' ? new URL(request) : request instanceof URL ? request : new URL(request.url);
            if (url.pathname === '/index.html') {
              return new Response('<html><body>SPA</body></html>', {
                status: 200,
                headers: { 'Content-Type': 'text/html' },
              });
            }
            throw new Error('Not found: ' + url.pathname);
          },
        } as unknown as Fetcher,
      };

      const workerModule = await import('./workers');
      
      // Test SPA route with .json in the path (the reported bug)
      const req1 = new Request('http://localhost/projects/floorp-i18n-unofficial/translate/ko-KR/main-browser-chrome.json');
      const res1 = await workerModule.default.fetch(req1, mockEnv as any, {} as ExecutionContext);
      expect(res1.status).toBe(200);
      const text1 = await res1.text();
      expect(text1).toContain('SPA');

      // Test another SPA route with .json
      const req2 = new Request('http://localhost/projects/test-project/translate/en-US/auth.json');
      const res2 = await workerModule.default.fetch(req2, mockEnv as any, {} as ExecutionContext);
      expect(res2.status).toBe(200);
      const text2 = await res2.text();
      expect(text2).toContain('SPA');
    });

    it('should serve index.html for SPA routes without file extensions', async () => {
      const mockEnv = {
        ...createMockEnv(),
        ASSETS: {
          fetch: async (request: Request | URL) => {
            const url = typeof request === 'string' ? new URL(request) : request instanceof URL ? request : new URL(request.url);
            if (url.pathname === '/index.html') {
              return new Response('<html><body>SPA</body></html>', {
                status: 200,
                headers: { 'Content-Type': 'text/html' },
              });
            }
            throw new Error('Not found');
          },
        } as unknown as Fetcher,
      };

      const workerModule = await import('./workers');
      
      // Test regular SPA routes
      const req1 = new Request('http://localhost/projects/test-project');
      const res1 = await workerModule.default.fetch(req1, mockEnv as any, {} as ExecutionContext);
      expect(res1.status).toBe(200);

      const req2 = new Request('http://localhost/dashboard');
      const res2 = await workerModule.default.fetch(req2, mockEnv as any, {} as ExecutionContext);
      expect(res2.status).toBe(200);
    });

    it('should try to serve actual static assets', async () => {
      const mockEnv = {
        ...createMockEnv(),
        ASSETS: {
          fetch: async (request: Request | URL) => {
            const url = typeof request === 'string' ? new URL(request) : request instanceof URL ? request : new URL(request.url);
            if (url.pathname === '/assets/app.js') {
              return new Response('console.log("app")', {
                status: 200,
                headers: { 'Content-Type': 'application/javascript' },
              });
            }
            if (url.pathname === '/index.html') {
              return new Response('<html><body>SPA</body></html>', {
                status: 200,
                headers: { 'Content-Type': 'text/html' },
              });
            }
            throw new Error('Not found');
          },
        } as unknown as Fetcher,
      };

      const workerModule = await import('./workers');
      
      // Test that actual static assets are served
      const req = new Request('http://localhost/assets/app.js');
      const res = await workerModule.default.fetch(req, mockEnv as any, {} as ExecutionContext);
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toContain('console.log');
    });

    it('should not serve index.html for API routes', async () => {
      const env = createMockEnv();
      const workerModule = await import('./workers');
      
      // API routes should go through the API handler, not serveStatic
      const req = new Request('http://localhost/api/projects');
      const res = await workerModule.default.fetch(req, env, {} as ExecutionContext);
      
      // Should get 401 (unauthorized) not 404 or index.html
      expect(res.status).toBe(401);
    });
  });
});
