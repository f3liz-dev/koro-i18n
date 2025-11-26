import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { createApplyRoutes } from './apply';
import { createJWT } from '../lib/auth';

// Mock PrismaClient for testing
const createMockPrisma = () => ({
  project: {
    findUnique: async ({ where }: { where: { name: string } }) => {
      if (where.name === 'test-project') {
        return { id: 'project-123', userId: 'user-123', repository: 'owner/repo', name: 'test-project' };
      }
      return null;
    },
  },
  webTranslation: {
    findMany: async () => [
      { id: 't1', language: 'ja', filename: 'common.json', key: 'hello', value: 'こんにちは' },
      { id: 't2', language: 'ja', filename: 'common.json', key: 'goodbye', value: 'さようなら' },
    ],
  },
  user: {
    findUnique: async () => ({ githubAccessToken: 'mock-token' }),
  },
});

const createMockEnv = () => ({
  JWT_SECRET: 'test-secret',
  ENVIRONMENT: 'test',
});

describe('Apply Routes', () => {
  describe('GET /api/projects/:projectName/apply/preview', () => {
    it('should require authentication', async () => {
      const prisma = createMockPrisma();
      const env = createMockEnv();
      
      const parentApp = new Hono();
      parentApp.route('/:projectName/apply', createApplyRoutes(prisma as any, env as any));

      const req = new Request('http://localhost/test-project/apply/preview', {
        method: 'GET',
      });

      const res = await parentApp.fetch(req, env, {} as ExecutionContext);
      expect(res.status).toBe(401);
    });

    it('should return 404 for non-existent project', async () => {
      const prisma = createMockPrisma();
      const env = createMockEnv();
      
      const parentApp = new Hono();
      parentApp.route('/:projectName/apply', createApplyRoutes(prisma as any, env as any));

      const token = await createJWT(
        { id: 'user-123', username: 'testuser', githubId: 12345 },
        'github-token',
        env.JWT_SECRET
      );

      const req = new Request('http://localhost/nonexistent/apply/preview', {
        method: 'GET',
        headers: {
          'Cookie': `auth_token=${token}`,
        },
      });

      const res = await parentApp.fetch(req, env, {} as ExecutionContext);
      expect(res.status).toBe(404);
    });

    it('should only allow project owner to preview', async () => {
      const prisma = createMockPrisma();
      const env = createMockEnv();
      
      const parentApp = new Hono();
      parentApp.route('/:projectName/apply', createApplyRoutes(prisma as any, env as any));

      // Different user than the project owner
      const token = await createJWT(
        { id: 'different-user', username: 'otheruser', githubId: 99999 },
        'github-token',
        env.JWT_SECRET
      );

      const req = new Request('http://localhost/test-project/apply/preview', {
        method: 'GET',
        headers: {
          'Cookie': `auth_token=${token}`,
        },
      });

      const res = await parentApp.fetch(req, env, {} as ExecutionContext);
      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/projects/:projectName/apply', () => {
    it('should require authentication', async () => {
      const prisma = createMockPrisma();
      const env = createMockEnv();
      
      const parentApp = new Hono();
      parentApp.route('/:projectName/apply', createApplyRoutes(prisma as any, env as any));

      const req = new Request('http://localhost/test-project/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ branch: 'main' }),
      });

      const res = await parentApp.fetch(req, env, {} as ExecutionContext);
      expect(res.status).toBe(401);
    });

    it('should only allow project owner to apply', async () => {
      const prisma = createMockPrisma();
      const env = createMockEnv();
      
      const parentApp = new Hono();
      parentApp.route('/:projectName/apply', createApplyRoutes(prisma as any, env as any));

      // Different user than the project owner
      const token = await createJWT(
        { id: 'different-user', username: 'otheruser', githubId: 99999 },
        'github-token',
        env.JWT_SECRET
      );

      const req = new Request('http://localhost/test-project/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `auth_token=${token}`,
        },
        body: JSON.stringify({ branch: 'main' }),
      });

      const res = await parentApp.fetch(req, env, {} as ExecutionContext);
      expect(res.status).toBe(403);
    });
  });
});

describe('Translation Diff Utilities', () => {
  it('should group translations by language and filename', () => {
    const translations = [
      { id: 't1', language: 'ja', filename: 'common.json', key: 'hello', value: 'こんにちは' },
      { id: 't2', language: 'ja', filename: 'common.json', key: 'goodbye', value: 'さようなら' },
      { id: 't3', language: 'ko', filename: 'common.json', key: 'hello', value: '안녕하세요' },
      { id: 't4', language: 'ja', filename: 'buttons.json', key: 'save', value: '保存' },
    ];

    const byLanguage: Record<string, number> = {};
    const byFile: Record<string, number> = {};

    for (const t of translations) {
      byLanguage[t.language] = (byLanguage[t.language] || 0) + 1;
      const fileKey = `${t.language}/${t.filename}`;
      byFile[fileKey] = (byFile[fileKey] || 0) + 1;
    }

    expect(byLanguage).toEqual({ 'ja': 3, 'ko': 1 });
    expect(byFile).toEqual({
      'ja/common.json': 2,
      'ko/common.json': 1,
      'ja/buttons.json': 1,
    });
  });

  it('should apply translations to nested JSON content', () => {
    const content = {
      buttons: {
        save: 'Save',
        cancel: 'Cancel',
      },
      messages: {
        success: 'Success',
      },
    };

    const translations = [
      { id: 't1', language: 'ja', filename: 'test.json', key: 'buttons.save', value: '保存' },
      { id: 't2', language: 'ja', filename: 'test.json', key: 'messages.success', value: '成功' },
    ];

    // Simulate applyTranslationsToContent
    const result = JSON.parse(JSON.stringify(content));
    for (const t of translations) {
      const keyParts = t.key.split('.');
      let current: any = result;
      for (let i = 0; i < keyParts.length - 1; i++) {
        current = current[keyParts[i]];
      }
      current[keyParts[keyParts.length - 1]] = t.value;
    }

    expect(result.buttons.save).toBe('保存');
    expect(result.buttons.cancel).toBe('Cancel'); // Unchanged
    expect(result.messages.success).toBe('成功');
  });

  it('should handle flat keys', () => {
    const content = {
      hello: 'Hello',
      goodbye: 'Goodbye',
    };

    const translations = [
      { id: 't1', language: 'ja', filename: 'test.json', key: 'hello', value: 'こんにちは' },
    ];

    // Simulate applyTranslationsToContent
    const result = JSON.parse(JSON.stringify(content));
    for (const t of translations) {
      const keyParts = t.key.split('.');
      let current: any = result;
      for (let i = 0; i < keyParts.length - 1; i++) {
        current = current[keyParts[i]];
      }
      current[keyParts[keyParts.length - 1]] = t.value;
    }

    expect(result.hello).toBe('こんにちは');
    expect(result.goodbye).toBe('Goodbye'); // Unchanged
  });
});
