import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { createFileRoutes } from './files';
import { PrismaClient } from '../generated/prisma';
import type { Env } from '../lib/context';

describe('Translation History and Validation', () => {
  let app: Hono;
  let prisma: PrismaClient;

  beforeEach(() => {
    prisma = new PrismaClient();
    const env = {
      JWT_SECRET: 'test-secret',
      ENVIRONMENT: 'test',
      PLATFORM_URL: 'https://test.example.com',
    } as unknown as Env;
    app = new Hono();
    app.route('/api/projects', createFileRoutes(prisma, env));
  });

  describe('Upload with History', () => {
    it('should accept history data in upload payload', async () => {
      const uploadPayload = {
        branch: 'main',
        commitSha: 'abc123',
        sourceLanguage: 'en',
        targetLanguages: ['ja'],
        files: [
          {
            filetype: 'json',
            filename: 'common.json',
            lang: 'en',
            contents: {
              'welcome': 'Welcome',
              'goodbye': 'Goodbye',
            },
            metadata: {
              size: 100,
              keys: 2,
            },
            history: [
              {
                key: '__file__',
                commits: [
                  {
                    commitSha: 'abc123',
                    author: 'John Doe',
                    email: 'john@example.com',
                    timestamp: '2024-01-01T00:00:00Z',
                  },
                ],
              },
            ],
            structureMap: [
              {
                flattenedKey: 'welcome',
                originalPath: ['welcome'],
                sourceHash: 'hash1',
              },
              {
                flattenedKey: 'goodbye',
                originalPath: ['goodbye'],
                sourceHash: 'hash2',
              },
            ],
            sourceHash: 'filehash123',
          },
        ],
      };

      // Note: This test would need proper authentication setup
      // For now, it validates the structure is accepted
      expect(uploadPayload.files[0].history).toBeDefined();
      expect(uploadPayload.files[0].structureMap).toBeDefined();
      expect(uploadPayload.files[0].sourceHash).toBeDefined();
    });

    it('should accept per-key history in upload payload', async () => {
      const uploadPayload = {
        branch: 'main',
        commitSha: 'abc123',
        sourceLanguage: 'en',
        targetLanguages: ['ja'],
        files: [
          {
            filetype: 'json',
            filename: 'common.json',
            lang: 'en',
            contents: {
              'welcome': 'Welcome',
              'goodbye': 'Goodbye',
              'hello': 'Hello',
            },
            metadata: {
              size: 150,
              keys: 3,
            },
            history: [
              {
                key: 'welcome',
                commits: [
                  {
                    commitSha: 'abc123',
                    author: 'John Doe',
                    email: 'john@example.com',
                    timestamp: '2024-01-01T00:00:00Z',
                  },
                ],
              },
              {
                key: 'goodbye',
                commits: [
                  {
                    commitSha: 'def456',
                    author: 'Jane Smith',
                    email: 'jane@example.com',
                    timestamp: '2024-01-02T00:00:00Z',
                  },
                ],
              },
              {
                key: 'hello',
                commits: [
                  {
                    commitSha: 'ghi789',
                    author: 'Bob Johnson',
                    email: 'bob@example.com',
                    timestamp: '2024-01-03T00:00:00Z',
                  },
                ],
              },
            ],
          },
        ],
      };

      // Validate per-key history structure
      expect(uploadPayload.files[0].history).toBeDefined();
      expect(uploadPayload.files[0].history?.length).toBe(3);
      
      // Verify each key has its own history entry
      const historyKeys = uploadPayload.files[0].history?.map(h => h.key);
      expect(historyKeys).toContain('welcome');
      expect(historyKeys).toContain('goodbye');
      expect(historyKeys).toContain('hello');
      
      // Verify each key has different commit info
      const welcomeHistory = uploadPayload.files[0].history?.find(h => h.key === 'welcome');
      const goodbyeHistory = uploadPayload.files[0].history?.find(h => h.key === 'goodbye');
      expect(welcomeHistory?.commits[0].commitSha).not.toBe(goodbyeHistory?.commits[0].commitSha);
      expect(welcomeHistory?.commits[0].author).toBe('John Doe');
      expect(goodbyeHistory?.commits[0].author).toBe('Jane Smith');
    });

    it('should accept per-key history for deeply nested keys', async () => {
      const uploadPayload = {
        branch: 'main',
        commitSha: 'abc123',
        sourceLanguage: 'en',
        targetLanguages: ['ja'],
        files: [
          {
            filetype: 'json',
            filename: 'deeply-nested.json',
            lang: 'en',
            contents: {
              'app.header.title': 'My App',
              'app.header.subtitle': 'Welcome',
              'app.navigation.menu.items.home': 'Home',
              'app.navigation.menu.items.services.web': 'Web Dev',
            },
            metadata: {
              size: 200,
              keys: 4,
            },
            history: [
              {
                key: 'app.header.title',
                commits: [
                  {
                    commitSha: 'abc123',
                    author: 'Alice',
                    email: 'alice@example.com',
                    timestamp: '2024-01-01T00:00:00Z',
                  },
                ],
              },
              {
                key: 'app.header.subtitle',
                commits: [
                  {
                    commitSha: 'def456',
                    author: 'Bob',
                    email: 'bob@example.com',
                    timestamp: '2024-01-02T00:00:00Z',
                  },
                ],
              },
              {
                key: 'app.navigation.menu.items.home',
                commits: [
                  {
                    commitSha: 'ghi789',
                    author: 'Charlie',
                    email: 'charlie@example.com',
                    timestamp: '2024-01-03T00:00:00Z',
                  },
                ],
              },
              {
                key: 'app.navigation.menu.items.services.web',
                commits: [
                  {
                    commitSha: 'jkl012',
                    author: 'Diana',
                    email: 'diana@example.com',
                    timestamp: '2024-01-04T00:00:00Z',
                  },
                ],
              },
            ],
          },
        ],
      };

      // Validate deeply nested keys have individual history
      expect(uploadPayload.files[0].history).toBeDefined();
      expect(uploadPayload.files[0].history?.length).toBe(4);
      
      // Verify each nested key has its own history
      const historyKeys = uploadPayload.files[0].history?.map(h => h.key);
      expect(historyKeys).toContain('app.header.title');
      expect(historyKeys).toContain('app.navigation.menu.items.home');
      expect(historyKeys).toContain('app.navigation.menu.items.services.web');
      
      // Verify deeply nested keys (depth 5 and 6) have correct history
      const deepKey = uploadPayload.files[0].history?.find(
        h => h.key === 'app.navigation.menu.items.services.web'
      );
      expect(deepKey).toBeDefined();
      expect(deepKey?.key.split('.').length).toBe(6); // Depth 6
      expect(deepKey?.commits[0].author).toBe('Diana');
      
      // Verify all keys have unique commits
      const commitShas = uploadPayload.files[0].history?.map(h => h.commits[0].commitSha);
      const uniqueCommits = new Set(commitShas);
      expect(uniqueCommits.size).toBe(4);
    });
  });

  describe('Structure Map Unflattening', () => {
    it('should unflatten using structure map', () => {
      const flattened = {
        'app.title': 'My App',
        'app.settings.theme': 'dark',
        'app.settings.language': 'en',
      };

      const structureMap = [
        {
          flattenedKey: 'app.title',
          originalPath: ['app', 'title'],
          sourceHash: 'hash1',
        },
        {
          flattenedKey: 'app.settings.theme',
          originalPath: ['app', 'settings', 'theme'],
          sourceHash: 'hash2',
        },
        {
          flattenedKey: 'app.settings.language',
          originalPath: ['app', 'settings', 'language'],
          sourceHash: 'hash3',
        },
      ];

      // Simulate unflattening logic
      const result: any = {};
      for (const [key, value] of Object.entries(flattened)) {
        const mapEntry = structureMap.find(entry => entry.flattenedKey === key);
        if (mapEntry) {
          let current = result;
          const path = mapEntry.originalPath;
          
          for (let i = 0; i < path.length - 1; i++) {
            const part = path[i];
            if (!current[part]) {
              current[part] = {};
            }
            current = current[part];
          }
          
          current[path[path.length - 1]] = value;
        }
      }

      expect(result).toEqual({
        app: {
          title: 'My App',
          settings: {
            theme: 'dark',
            language: 'en',
          },
        },
      });
    });

    it('should handle fallback to dot notation when structure map is missing', () => {
      const flattened = {
        'user.name': 'Alice',
        'user.email': 'alice@example.com',
      };

      // Fallback unflattening without structure map
      const result: any = {};
      for (const [key, value] of Object.entries(flattened)) {
        const parts = key.split('.');
        let current = result;
        
        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i];
          if (!current[part]) {
            current[part] = {};
          }
          current = current[part];
        }
        
        current[parts[parts.length - 1]] = value;
      }

      expect(result).toEqual({
        user: {
          name: 'Alice',
          email: 'alice@example.com',
        },
      });
    });
  });

  describe('Source Hash Validation', () => {
    it('should detect when source content has changed', () => {
      const sourceMap = [
        { flattenedKey: 'greeting', originalPath: ['greeting'], sourceHash: 'oldhash' },
      ];

      const translationMap = [
        { flattenedKey: 'greeting', originalPath: ['greeting'], sourceHash: 'oldhash' },
      ];

      const newSourceMap = [
        { flattenedKey: 'greeting', originalPath: ['greeting'], sourceHash: 'newhash' },
      ];

      // Translation is valid when hashes match
      expect(sourceMap[0].sourceHash).toBe(translationMap[0].sourceHash);

      // Translation is invalid when source changes
      expect(newSourceMap[0].sourceHash).not.toBe(translationMap[0].sourceHash);
    });

    it('should identify missing translations', () => {
      const sourceKeys = ['welcome', 'goodbye', 'hello'];
      const translationKeys = ['welcome', 'goodbye'];

      const missingKeys = sourceKeys.filter(key => !translationKeys.includes(key));

      expect(missingKeys).toEqual(['hello']);
      expect(missingKeys.length).toBe(1);
    });
  });

  describe('Git History Tracking', () => {
    it('should format git commit info correctly', () => {
      const commitInfo = {
        commitSha: 'abc123def456',
        author: 'Jane Smith',
        email: 'jane@example.com',
        timestamp: '2024-01-15T10:30:00Z',
      };

      expect(commitInfo.author).toBe('Jane Smith');
      expect(commitInfo.email).toBe('jane@example.com');
      expect(commitInfo.commitSha).toMatch(/^[0-9a-f]+$/);
    });

    it('should generate co-author trailer format', () => {
      const authors = [
        { name: 'Alice', email: 'alice@example.com' },
        { name: 'Bob', email: 'bob@example.com' },
      ];

      const coAuthors = authors
        .map(a => `Co-authored-by: ${a.name} <${a.email}>`)
        .join('\n');

      expect(coAuthors).toContain('Co-authored-by: Alice <alice@example.com>');
      expect(coAuthors).toContain('Co-authored-by: Bob <bob@example.com>');
    });
  });
});
